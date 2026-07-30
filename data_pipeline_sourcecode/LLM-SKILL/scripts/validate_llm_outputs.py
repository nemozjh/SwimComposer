#!/usr/bin/env python3
"""Validate SwimComposer LLM commentary-processing artifacts."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

DEFAULT_CATEGORIES = {
    "lead_change",
    "lead_status",
    "record_watch",
    "tech_review",
    "chase",
    "result",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def slug(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", " ", ascii_text).strip()
    return re.sub(r"\s+", " ", ascii_text)


def is_number(value: Any) -> bool:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return not (math.isnan(number) or math.isinf(number))


def in_unit_interval(value: Any) -> bool:
    if value is None:
        return True
    if not is_number(value):
        return False
    number = float(value)
    return 0.0 <= number <= 1.0


def get_official_names(snapshot: Dict[str, Any]) -> Tuple[Set[str], Dict[str, Dict[str, Any]]]:
    athletes = snapshot.get("athletes") if isinstance(snapshot.get("athletes"), list) else []
    names: Set[str] = set()
    by_slug: Dict[str, Dict[str, Any]] = {}
    for row in athletes:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        names.add(name)
        by_slug[slug(name)] = row
    return names, by_slug


def load_taxonomy(path: Optional[Path]) -> Set[str]:
    if path is None:
        return set(DEFAULT_CATEGORIES)
    data = load_json(path)
    categories = data.get("categories") if isinstance(data, dict) else None
    if not isinstance(categories, list):
        raise ValueError("taxonomy must contain categories[].")
    out = set()
    for row in categories:
        if isinstance(row, dict):
            value = str(row.get("id") or "").strip()
        else:
            value = str(row or "").strip()
        if value:
            out.add(value)
    if not out:
        raise ValueError("taxonomy categories are empty.")
    return out


def check_time_range(row: Dict[str, Any], label: str, errors: List[str]) -> None:
    start = row.get("start_sec")
    end = row.get("end_sec")
    if not is_number(start) or not is_number(end):
        errors.append(f"{label}: start_sec and end_sec must be numeric.")
        return
    if float(end) < float(start):
        errors.append(f"{label}: end_sec is earlier than start_sec.")


def validate_normalized_transcript(
    normalized: Dict[str, Any],
    official_by_slug: Dict[str, Dict[str, Any]],
    errors: List[str],
    warnings: List[str],
) -> Set[int]:
    segments = normalized.get("segments") if isinstance(normalized.get("segments"), list) else []
    segment_ids: Set[int] = set()
    for idx, seg in enumerate(segments):
        if not isinstance(seg, dict):
            errors.append(f"normalized.segments[{idx}] must be an object.")
            continue
        segment_id = seg.get("segment_id")
        if not isinstance(segment_id, int):
            errors.append(f"normalized.segments[{idx}]: segment_id must be an integer.")
        else:
            segment_ids.add(segment_id)
        check_time_range(seg, f"normalized.segments[{idx}]", errors)
        mentions = seg.get("mentions") if isinstance(seg.get("mentions"), list) else []
        for midx, mention in enumerate(mentions):
            if not isinstance(mention, dict):
                errors.append(f"normalized.segments[{idx}].mentions[{midx}] must be an object.")
                continue
            name = str(mention.get("normalized_name") or "").strip()
            if not name:
                errors.append(f"normalized.segments[{idx}].mentions[{midx}]: normalized_name is empty.")
            elif slug(name) not in official_by_slug:
                errors.append(f"normalized.segments[{idx}].mentions[{midx}]: '{name}' is not in the official roster.")
            if not in_unit_interval(mention.get("confidence")):
                errors.append(f"normalized.segments[{idx}].mentions[{midx}]: confidence must be in [0, 1].")
    if not segments:
        warnings.append("normalized transcript has no segments.")
    return segment_ids


def iter_named_entities(row: Dict[str, Any], field: str) -> Iterable[Tuple[int, str]]:
    values = row.get(field) if isinstance(row.get(field), list) else []
    for idx, item in enumerate(values):
        if isinstance(item, dict):
            name = str(item.get("name") or item.get("normalized_name") or "").strip()
        else:
            name = str(item or "").strip()
        if name:
            yield idx, name


def validate_insights(
    insights_artifact: Dict[str, Any],
    official_by_slug: Dict[str, Dict[str, Any]],
    allowed_categories: Set[str],
    segment_ids: Optional[Set[int]],
    errors: List[str],
    warnings: List[str],
) -> None:
    rows = insights_artifact.get("insights") if isinstance(insights_artifact.get("insights"), list) else []
    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"insights[{idx}] must be an object.")
            continue
        category = str(row.get("category") or "").strip()
        if category not in allowed_categories:
            errors.append(f"insights[{idx}]: category '{category}' is not in the taxonomy.")
        check_time_range(row, f"insights[{idx}]", errors)
        source_segment_id = row.get("source_segment_id")
        if segment_ids is not None and source_segment_id is not None and source_segment_id not in segment_ids:
            errors.append(f"insights[{idx}]: source_segment_id {source_segment_id} is not in normalized transcript segments.")
        if not str(row.get("summary") or "").strip():
            errors.append(f"insights[{idx}]: summary is empty.")
        if not in_unit_interval(row.get("confidence")):
            errors.append(f"insights[{idx}]: confidence must be in [0, 1].")
        for field in ("athletes", "targets", "athlete_names", "target_names"):
            for entity_idx, name in iter_named_entities(row, field):
                if slug(name) not in official_by_slug:
                    errors.append(f"insights[{idx}].{field}[{entity_idx}]: '{name}' is not in the official roster.")
    if not rows:
        warnings.append("insight artifact has no insights.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SwimComposer LLM artifacts.")
    parser.add_argument("--official-snapshot", required=True, help="Official metadata JSON with athletes[].")
    parser.add_argument("--normalized-transcript", help="Normalized transcript artifact JSON.")
    parser.add_argument("--insights", help="Insight artifact JSON.")
    parser.add_argument("--taxonomy", help="Insight taxonomy JSON.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable validation output.")
    args = parser.parse_args()

    errors: List[str] = []
    warnings: List[str] = []
    official = load_json(Path(args.official_snapshot))
    official_names, official_by_slug = get_official_names(official if isinstance(official, dict) else {})
    if not official_names:
        errors.append("official snapshot has no athletes[].name entries.")

    segment_ids: Optional[Set[int]] = None
    normalized_count = 0
    if args.normalized_transcript:
        normalized = load_json(Path(args.normalized_transcript))
        if not isinstance(normalized, dict):
            errors.append("normalized transcript must be a JSON object.")
        else:
            normalized_count = len(normalized.get("segments") or []) if isinstance(normalized.get("segments"), list) else 0
            segment_ids = validate_normalized_transcript(normalized, official_by_slug, errors, warnings)

    insight_count = 0
    if args.insights:
        allowed_categories = load_taxonomy(Path(args.taxonomy) if args.taxonomy else None)
        insights = load_json(Path(args.insights))
        if not isinstance(insights, dict):
            errors.append("insight artifact must be a JSON object.")
        else:
            insight_count = len(insights.get("insights") or []) if isinstance(insights.get("insights"), list) else 0
            validate_insights(insights, official_by_slug, allowed_categories, segment_ids, errors, warnings)

    result = {
        "ok": not errors,
        "official_athletes": len(official_names),
        "normalized_segments": normalized_count,
        "insights": insight_count,
        "errors": errors,
        "warnings": warnings,
    }
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("OK" if result["ok"] else "FAILED")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
