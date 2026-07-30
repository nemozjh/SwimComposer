#!/usr/bin/env python3
"""
Audio pipeline for transcription, name normalization, and insight extraction.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


ALLOWED_INSIGHT_TYPES = [
    "lead_change",
    "lead_status",
    "record_watch",
    "tech_review",
    "chase",
    "result",
]


def public_path_ref(path: Path, *, relative_to: Optional[Path] = None) -> str:
    base = relative_to or Path.cwd()
    try:
        return str(path.relative_to(base))
    except ValueError:
        return path.name


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return None
        return number
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> Optional[int]:
    number = to_float(value)
    if number is None:
        return None
    return int(round(number))


def round_num(value: Optional[float], digits: int = 6) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), digits)


def slug_name(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", " ", ascii_text).strip()
    return re.sub(r"\s+", " ", ascii_text)


def chunked(rows: Sequence[Any], size: int) -> Iterable[Sequence[Any]]:
    step = max(1, int(size))
    for idx in range(0, len(rows), step):
        yield rows[idx:idx + step]


def load_official_athletes(snapshot_path: Path) -> List[Dict[str, Any]]:
    snapshot = load_json(snapshot_path)
    athletes = snapshot.get("athletes") if isinstance(snapshot.get("athletes"), list) else []
    out: List[Dict[str, Any]] = []
    for athlete in athletes:
        if not isinstance(athlete, dict):
            continue
        lane_id = to_int(athlete.get("lane"))
        name = str(athlete.get("name") or "").strip()
        if lane_id is None or not name:
            continue
        out.append({
            "lane_id": lane_id,
            "rank": to_int(athlete.get("rank")),
            "name": name,
            "country": str(athlete.get("country") or "").strip() or None,
            "age_at_event": to_int(athlete.get("age_at_event")),
            "final_time": round_num(to_float(athlete.get("final_time")), 6),
            "reaction_time": round_num(to_float(athlete.get("reaction_time")), 6),
        })
    return out


def build_aliases(official_athletes: Sequence[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    alias_map: Dict[str, Dict[str, Any]] = {}
    for athlete in official_athletes:
        full_name = str(athlete.get("name") or "").strip()
        if not full_name:
            continue
        parts = full_name.split()
        aliases = {full_name}
        if len(parts) >= 2:
            aliases.add(parts[0])
            aliases.add(parts[-1])
            aliases.add(" ".join(parts))
            aliases.add(" ".join(reversed(parts)))
        profile_name = str((athlete.get("profile_name") or "")).strip()
        if profile_name:
            aliases.add(profile_name)
        for alias in aliases:
            key = slug_name(alias)
            if key:
                alias_map[key] = athlete
    return alias_map


def extract_json_payload(text: str) -> Any:
    stripped = text.strip()
    if not stripped:
        raise ValueError("Empty model output.")
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```json\s*(.*?)```", stripped, flags=re.S | re.I)
    if match:
        return json.loads(match.group(1).strip())

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(stripped[start:end + 1])

    start = stripped.find("[")
    end = stripped.rfind("]")
    if start != -1 and end != -1 and end > start:
        return json.loads(stripped[start:end + 1])

    raise ValueError("Failed to parse JSON from model output.")


def call_openai_json(*, model: str, system_prompt: str, user_payload: Dict[str, Any]) -> Any:
    from openai import OpenAI

    client = OpenAI()
    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": [{"type": "input_text", "text": system_prompt}],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": json.dumps(user_payload, ensure_ascii=False)}],
            },
        ],
    )
    return extract_json_payload(response.output_text)


def transcribe_with_whisperx(
    *,
    audio_path: Path,
    output_path: Path,
    model_name: str,
    batch_size: int,
    device: str,
    compute_type: str,
    language: Optional[str],
) -> Dict[str, Any]:
    import whisperx

    device_value = device
    if device_value == "auto":
        try:
            import torch
            device_value = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device_value = "cpu"

    model = whisperx.load_model(model_name, device_value, compute_type=compute_type, language=language)
    audio = whisperx.load_audio(str(audio_path))
    transcript = model.transcribe(audio, batch_size=int(batch_size))

    detected_language = str(transcript.get("language") or language or "en")
    align_model, metadata = whisperx.load_align_model(language_code=detected_language, device=device_value)
    aligned = whisperx.align(
        transcript.get("segments") or [],
        align_model,
        metadata,
        audio,
        device_value,
        return_char_alignments=False,
    )

    out_segments: List[Dict[str, Any]] = []
    for idx, seg in enumerate(aligned.get("segments") or []):
        if not isinstance(seg, dict):
            continue
        words = []
        for word in seg.get("words") or []:
            if not isinstance(word, dict):
                continue
            token = {
                "word": str(word.get("word") or "").strip(),
                "start_sec": round_num(to_float(word.get("start")), 6),
                "end_sec": round_num(to_float(word.get("end")), 6),
                "score": round_num(to_float(word.get("score")), 6),
            }
            token = {k: v for k, v in token.items() if v not in (None, "")}
            if token:
                words.append(token)
        row = {
            "segment_id": idx,
            "start_sec": round_num(to_float(seg.get("start")), 6),
            "end_sec": round_num(to_float(seg.get("end")), 6),
            "text": str(seg.get("text") or "").strip(),
            "words": words,
        }
        out_segments.append(row)

    output = {
        "schema_version": "1.0",
        "audio": public_path_ref(audio_path),
        "language": detected_language,
        "segments": out_segments,
    }
    write_json(output_path, output)
    return output


def normalize_names_with_llm(
    *,
    transcript_path: Path,
    snapshot_path: Path,
    output_path: Path,
    model: str,
    batch_size: int,
) -> Dict[str, Any]:
    transcript = load_json(transcript_path)
    official_athletes = load_official_athletes(snapshot_path)
    alias_map = build_aliases(official_athletes)
    official_roster = [
        {
            "lane_id": athlete["lane_id"],
            "name": athlete["name"],
            "country": athlete.get("country"),
            "rank": athlete.get("rank"),
        }
        for athlete in official_athletes
    ]

    system_prompt = (
        "You normalize athlete mentions in swimming race commentary.\n"
        "Input is a batch of transcript segments and the official athlete roster.\n"
        "Return JSON only. For each segment, preserve start/end times and raw text.\n"
        "Add normalized_text and mentions[].\n"
        "Each mention must include spoken_form and normalized_name.\n"
        "Only use official athlete names when a mention is plausibly referring to an athlete in the roster.\n"
        "If no athlete is mentioned, return mentions as an empty list.\n"
        "Do not invent names outside the official roster.\n"
        "Output schema: {\"segments\":[{\"segment_id\":int,\"normalized_text\":str,"
        "\"mentions\":[{\"spoken_form\":str,\"normalized_name\":str,\"confidence\":float,"
        "\"rationale\":str}]}]}"
    )

    normalized_by_id: Dict[int, Dict[str, Any]] = {}
    transcript_segments = transcript.get("segments") if isinstance(transcript.get("segments"), list) else []

    for batch in chunked(transcript_segments, int(batch_size)):
        compact_segments = [
            {
                "segment_id": to_int(seg.get("segment_id")),
                "start_sec": round_num(to_float(seg.get("start_sec")), 6),
                "end_sec": round_num(to_float(seg.get("end_sec")), 6),
                "text": str(seg.get("text") or "").strip(),
            }
            for seg in batch
            if isinstance(seg, dict)
        ]
        payload = {
            "official_athletes": official_roster,
            "segments": compact_segments,
        }
        response = call_openai_json(model=model, system_prompt=system_prompt, user_payload=payload)
        rows = response.get("segments") if isinstance(response, dict) else None
        if not isinstance(rows, list):
            raise ValueError("LLM name-normalization output must contain segments[].")
        for row in rows:
            if not isinstance(row, dict):
                continue
            segment_id = to_int(row.get("segment_id"))
            if segment_id is None:
                continue
            normalized_by_id[segment_id] = row

    output_segments: List[Dict[str, Any]] = []
    for seg in transcript_segments:
        if not isinstance(seg, dict):
            continue
        segment_id = to_int(seg.get("segment_id"))
        llm_row = normalized_by_id.get(segment_id or -1, {})
        mentions_out: List[Dict[str, Any]] = []
        for mention in llm_row.get("mentions") if isinstance(llm_row.get("mentions"), list) else []:
            if not isinstance(mention, dict):
                continue
            normalized_name = str(mention.get("normalized_name") or "").strip()
            athlete = alias_map.get(slug_name(normalized_name))
            mention_row = {
                "spoken_form": str(mention.get("spoken_form") or "").strip(),
                "normalized_name": athlete.get("name") if athlete else (normalized_name or None),
                "lane_id": athlete.get("lane_id") if athlete else None,
                "country": athlete.get("country") if athlete else None,
                "official_rank": athlete.get("rank") if athlete else None,
                "confidence": round_num(to_float(mention.get("confidence")), 6),
                "rationale": str(mention.get("rationale") or "").strip() or None,
            }
            mention_row = {k: v for k, v in mention_row.items() if v not in (None, "")}
            if mention_row.get("normalized_name"):
                mentions_out.append(mention_row)
        row = {
            "segment_id": segment_id,
            "start_sec": round_num(to_float(seg.get("start_sec")), 6),
            "end_sec": round_num(to_float(seg.get("end_sec")), 6),
            "text": str(seg.get("text") or "").strip(),
            "normalized_text": str(llm_row.get("normalized_text") or seg.get("text") or "").strip(),
            "mentions": mentions_out,
        }
        output_segments.append(row)

    output = {
        "schema_version": "1.0",
        "source_transcript": public_path_ref(transcript_path),
        "official_snapshot": public_path_ref(snapshot_path),
        "official_athletes": official_roster,
        "segments": output_segments,
    }
    write_json(output_path, output)
    return output


def extract_insights_with_llm(
    *,
    normalized_path: Path,
    snapshot_path: Path,
    output_path: Path,
    model: str,
    batch_size: int,
) -> Dict[str, Any]:
    normalized = load_json(normalized_path)
    official_athletes = load_official_athletes(snapshot_path)
    alias_map = build_aliases(official_athletes)
    official_roster = [
        {
            "lane_id": athlete["lane_id"],
            "name": athlete["name"],
            "country": athlete.get("country"),
            "rank": athlete.get("rank"),
        }
        for athlete in official_athletes
    ]

    system_prompt = (
        "You extract structured swimming-race insights from normalized commentary segments.\n"
        "Use only the following categories: lead_change, lead_status, record_watch, tech_review, chase, result.\n"
        "Return JSON only. A single transcript segment may yield zero, one, or multiple insights.\n"
        "Each insight must include: source_segment_id, category, start_sec, end_sec, summary,\n"
        "athlete_names (list), optional target_names (list), and confidence.\n"
        "Use result for final placements or medal outcomes.\n"
        "Use tech_review for commentary on turns, underwater phases, stroke execution, or finish technique.\n"
        "Use chase for close pursuit narratives between swimmers.\n"
        "Do not reproduce the full commentary. Produce short analytical summaries.\n"
        "Output schema: {\"insights\":[{...}]}"
    )

    segments = normalized.get("segments") if isinstance(normalized.get("segments"), list) else []
    insight_rows: List[Dict[str, Any]] = []
    next_id = 0

    for batch in chunked(segments, int(batch_size)):
        payload_segments = []
        for seg in batch:
            if not isinstance(seg, dict):
                continue
            payload_segments.append({
                "segment_id": to_int(seg.get("segment_id")),
                "start_sec": round_num(to_float(seg.get("start_sec")), 6),
                "end_sec": round_num(to_float(seg.get("end_sec")), 6),
                "text": str(seg.get("normalized_text") or seg.get("text") or "").strip(),
                "mentions": [
                    {
                        "normalized_name": str(m.get("normalized_name") or "").strip(),
                        "lane_id": to_int(m.get("lane_id")),
                    }
                    for m in (seg.get("mentions") if isinstance(seg.get("mentions"), list) else [])
                    if isinstance(m, dict)
                ],
            })
        payload = {
            "official_athletes": official_roster,
            "allowed_categories": ALLOWED_INSIGHT_TYPES,
            "segments": payload_segments,
        }
        response = call_openai_json(model=model, system_prompt=system_prompt, user_payload=payload)
        insights = response.get("insights") if isinstance(response, dict) else None
        if not isinstance(insights, list):
            raise ValueError("LLM insight output must contain insights[].")
        for row in insights:
            if not isinstance(row, dict):
                continue
            category = str(row.get("category") or "").strip()
            if category not in ALLOWED_INSIGHT_TYPES:
                continue
            athlete_names = [
                str(name).strip()
                for name in (row.get("athlete_names") if isinstance(row.get("athlete_names"), list) else [])
                if str(name).strip()
            ]
            target_names = [
                str(name).strip()
                for name in (row.get("target_names") if isinstance(row.get("target_names"), list) else [])
                if str(name).strip()
            ]
            mapped_athletes = []
            for name in athlete_names:
                athlete = alias_map.get(slug_name(name))
                mapped_athletes.append({
                    "name": athlete.get("name") if athlete else name,
                    "lane_id": athlete.get("lane_id") if athlete else None,
                    "country": athlete.get("country") if athlete else None,
                    "official_rank": athlete.get("rank") if athlete else None,
                })
            mapped_targets = []
            for name in target_names:
                athlete = alias_map.get(slug_name(name))
                mapped_targets.append({
                    "name": athlete.get("name") if athlete else name,
                    "lane_id": athlete.get("lane_id") if athlete else None,
                    "country": athlete.get("country") if athlete else None,
                    "official_rank": athlete.get("rank") if athlete else None,
                })
            insight_rows.append({
                "insight_id": next_id,
                "source_segment_id": to_int(row.get("source_segment_id")),
                "category": category,
                "start_sec": round_num(to_float(row.get("start_sec")), 6),
                "end_sec": round_num(to_float(row.get("end_sec")), 6),
                "summary": str(row.get("summary") or "").strip(),
                "athletes": mapped_athletes,
                "targets": mapped_targets,
                "confidence": round_num(to_float(row.get("confidence")), 6),
            })
            next_id += 1

    insight_rows = [
        row for row in insight_rows
        if row.get("start_sec") is not None
        and row.get("end_sec") is not None
        and row.get("summary")
    ]
    insight_rows.sort(key=lambda row: (row["start_sec"], row["end_sec"], row["insight_id"]))

    output = {
        "schema_version": "1.0",
        "source_normalized_transcript": public_path_ref(normalized_path),
        "official_snapshot": public_path_ref(snapshot_path),
        "allowed_categories": list(ALLOWED_INSIGHT_TYPES),
        "insights": insight_rows,
    }
    write_json(output_path, output)
    return output


def cmd_transcribe(args: argparse.Namespace) -> None:
    output = transcribe_with_whisperx(
        audio_path=Path(args.audio).resolve(),
        output_path=Path(args.output).resolve(),
        model_name=str(args.model_name),
        batch_size=int(args.batch_size),
        device=str(args.device),
        compute_type=str(args.compute_type),
        language=str(args.language).strip() if args.language else None,
    )
    print(json.dumps({
        "ok": True,
        "output": public_path_ref(Path(args.output)),
        "segments": len(output.get("segments") or []),
        "language": output.get("language"),
    }, ensure_ascii=False, indent=2))


def cmd_normalize_names(args: argparse.Namespace) -> None:
    output = normalize_names_with_llm(
        transcript_path=Path(args.transcript).resolve(),
        snapshot_path=Path(args.snapshot).resolve(),
        output_path=Path(args.output).resolve(),
        model=str(args.model),
        batch_size=int(args.batch_size),
    )
    mention_count = sum(len(seg.get("mentions") or []) for seg in output.get("segments") or [])
    print(json.dumps({
        "ok": True,
        "output": public_path_ref(Path(args.output)),
        "segments": len(output.get("segments") or []),
        "mentions": mention_count,
    }, ensure_ascii=False, indent=2))


def cmd_extract_insights(args: argparse.Namespace) -> None:
    output = extract_insights_with_llm(
        normalized_path=Path(args.normalized_transcript).resolve(),
        snapshot_path=Path(args.snapshot).resolve(),
        output_path=Path(args.output).resolve(),
        model=str(args.model),
        batch_size=int(args.batch_size),
    )
    counts: Dict[str, int] = {}
    for insight in output.get("insights") or []:
        category = str(insight.get("category") or "")
        counts[category] = counts.get(category, 0) + 1
    print(json.dumps({
        "ok": True,
        "output": public_path_ref(Path(args.output)),
        "insights": len(output.get("insights") or []),
        "by_category": counts,
    }, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Audio pipeline.")
    sub = parser.add_subparsers(dest="command", required=True)

    transcribe = sub.add_parser("transcribe", help="Run WhisperX transcription with timestamps.")
    transcribe.add_argument("--audio", required=True)
    transcribe.add_argument("--output", required=True)
    transcribe.add_argument("--model-name", default="large-v3")
    transcribe.add_argument("--batch-size", type=int, default=16)
    transcribe.add_argument("--device", default="auto")
    transcribe.add_argument("--compute-type", default="float16")
    transcribe.add_argument("--language", default="en")
    transcribe.set_defaults(func=cmd_transcribe)

    normalize = sub.add_parser("normalize-names", help="Normalize athlete names against official metadata.")
    normalize.add_argument("--transcript", required=True)
    normalize.add_argument("--snapshot", required=True)
    normalize.add_argument("--output", required=True)
    normalize.add_argument("--model", default="gpt-5.4")
    normalize.add_argument("--batch-size", type=int, default=24)
    normalize.set_defaults(func=cmd_normalize_names)

    insights = sub.add_parser("extract-insights", help="Extract structured insights from normalized commentary.")
    insights.add_argument("--normalized-transcript", required=True)
    insights.add_argument("--snapshot", required=True)
    insights.add_argument("--output", required=True)
    insights.add_argument("--model", default="gpt-5.4")
    insights.add_argument("--batch-size", type=int, default=24)
    insights.set_defaults(func=cmd_extract_insights)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
