#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import unicodedata
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests


BASE_API = "https://api.worldaquatics.com/fina"
COMPETITIONS_API = f"{BASE_API}/competitions"
RANKINGS_API = f"{BASE_API}/rankings/swimming"
RANKINGS_REPORT_PDF_API = f"{RANKINGS_API}/report/pdf"
ATHLETE_RESULTS_API = f"{BASE_API}/athletes"
IOC_OG2024_SWM_PDF_PREFIX = "https://olympics.com/OG2024/pdf/OG2024/SWM"
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

IOC_PHASE_CONFIG = {
    "final": ("C73A1", "FNL-000100--"),
    "heat": ("C73A2", "HEAT--------"),
    "heats": ("C73A2", "HEAT--------"),
    "semifinal": ("C73A2", "SFNL--------"),
    "semi-final": ("C73A2", "SFNL--------"),
    "semifinals": ("C73A2", "SFNL--------"),
}

LOCAL_OG2024_SWM_EVENT_CODE_MAP = {
    "men 50m freestyle": "SWMM50MFR",
    "men 100m freestyle": "SWMM100MFR",
    "men 200m freestyle": "SWMM200MFR",
    "men 400m freestyle": "SWMM400MFR",
    "men 800m freestyle": "SWMM800MFR",
    "men 1500m freestyle": "SWMM1500MFR",
    "men 100m backstroke": "SWMM100MBA",
    "men 200m backstroke": "SWMM200MBA",
    "men 100m breaststroke": "SWMM100MBR",
    "men 200m breaststroke": "SWMM200MBR",
    "men 100m butterfly": "SWMM100MBF",
    "men 200m butterfly": "SWMM200MBF",
    "men 200m individual medley": "SWMM200MIM",
    "men 400m individual medley": "SWMM400MIM",
    "women 50m freestyle": "SWMW50MFR",
    "women 100m freestyle": "SWMW100MFR",
    "women 200m freestyle": "SWMW200MFR",
    "women 400m freestyle": "SWMW400MFR",
    "women 800m freestyle": "SWMW800MFR",
    "women 1500m freestyle": "SWMW1500MFR",
    "women 100m backstroke": "SWMW100MBA",
    "women 200m backstroke": "SWMW200MBA",
    "women 100m breaststroke": "SWMW100MBR",
    "women 200m breaststroke": "SWMW200MBR",
    "women 100m butterfly": "SWMW100MBF",
    "women 200m butterfly": "SWMW200MBF",
    "women 200m individual medley": "SWMW200MIM",
    "women 400m individual medley": "SWMW400MIM",
    "men 4 x 100m freestyle relay": "SWMM4X100MFR",
    "men 4 x 200m freestyle relay": "SWMM4X200MFR",
    "men 4 x 100m medley relay": "SWMM4X100MMED",
    "women 4 x 100m freestyle relay": "SWMW4X100MFR",
    "women 4 x 200m freestyle relay": "SWMW4X200MFR",
    "women 4 x 100m medley relay": "SWMW4X100MMED",
    "mixed 4 x 100m medley relay": "SWMX4X100MMED",
    "mixed 4 x 100m freestyle relay": "SWMX4X100MFR",
}

def normalize_text(text: str) -> str:
    s = unicodedata.normalize("NFKD", text or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokenize(text: str) -> List[str]:
    return [t for t in normalize_text(text).split(" ") if t]


def parse_time_seconds(v: Any) -> Optional[float]:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    if ":" in s:
        parts = s.split(":")
        try:
            nums = [float(p) for p in parts]
        except ValueError:
            return None
        total = 0.0
        for n in nums:
            total = total * 60.0 + n
        return total if total > 0 else None
    try:
        n = float(s)
    except ValueError:
        return None
    return n if n > 0 else None


def parse_iso_date(v: Optional[str]) -> Optional[datetime]:
    if not v:
        return None
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_ddmmyyyy_to_iso(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    try:
        dt = datetime.strptime(v, "%d/%m/%Y")
    except ValueError:
        return None
    return dt.strftime("%Y-%m-%dT00:00:00")


def request_json(url: str, *, params: Optional[Dict[str, Any]] = None, timeout: int = 30) -> Any:
    last_exc: Optional[Exception] = None
    for attempt in range(3):
        try:
            resp = requests.get(url, params=params, timeout=timeout, headers=DEFAULT_HEADERS)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < 2:
                time.sleep(1.0 + attempt)
    raise RuntimeError(f"Request failed: {url} params={params} err={last_exc}")


def request_bytes(url: str, *, timeout: int = 30) -> bytes:
    last_exc: Optional[Exception] = None
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=timeout, headers=DEFAULT_HEADERS)
            resp.raise_for_status()
            return resp.content
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < 2:
                time.sleep(1.0 + attempt)
    raise RuntimeError(f"Request failed: {url} err={last_exc}")


def sha256_bytes(content: bytes) -> str:
    h = hashlib.sha256()
    h.update(content)
    return h.hexdigest()


def is_pdf_bytes(content: bytes) -> bool:
    return content.startswith(b"%PDF")


def slugify_path_part(text: str) -> str:
    s = normalize_text(text).replace(" ", "-")
    return s.strip("-")


def resolve_artifact_dir(out_path: str, artifact_dir_arg: str) -> Optional[Path]:
    if artifact_dir_arg.strip():
        path = Path(artifact_dir_arg).expanduser().resolve()
    elif out_path.strip():
        path = Path(out_path).expanduser().resolve().parent / "artifacts"
    else:
        return None
    path.mkdir(parents=True, exist_ok=True)
    return path


def normalize_event_label(text: str) -> str:
    s = normalize_text(text)
    s = re.sub(r"\bwomen s\b", "women", s)
    s = re.sub(r"\bmen s\b", "men", s)
    return s.strip()


def score_name_match(query: str, candidate: str) -> int:
    qn = normalize_text(query)
    cn = normalize_text(candidate)
    if not qn or not cn:
        return 0
    if qn == cn:
        return 1000
    if qn in cn or cn in qn:
        return 700
    qt = set(tokenize(query))
    ct = set(tokenize(candidate))
    overlap = len(qt.intersection(ct))
    if not overlap:
        return 0
    return overlap * 100


def competition_date_score(comp: Dict[str, Any]) -> int:
    dt = parse_iso_date(comp.get("dateFrom") or comp.get("venueDateFrom"))
    if not dt:
        return 0
    return int(dt.timestamp())


def select_competition_by_name(
    competition_name: str,
    *,
    max_pages: int,
    timeout: int,
) -> Dict[str, Any]:
    first = request_json(COMPETITIONS_API, params={"page": 0, "pageSize": 100}, timeout=timeout)
    num_pages = int((first.get("pageInfo") or {}).get("numPages") or 1)
    page_limit = min(max_pages, max(1, num_pages))

    candidates: List[Dict[str, Any]] = []

    def collect_from_page(doc: Dict[str, Any]) -> None:
        for comp in doc.get("content") or []:
            # Keep competitions that include swimming.
            disciplines = comp.get("disciplines") or []
            if "SW" not in disciplines:
                continue
            name_score = max(
                score_name_match(competition_name, str(comp.get("officialName") or "")),
                score_name_match(competition_name, str(comp.get("name") or "")),
            )
            if name_score <= 0:
                continue
            row = dict(comp)
            row["_name_score"] = name_score
            row["_date_score"] = competition_date_score(comp)
            candidates.append(row)

    collect_from_page(first)
    for page in range(1, page_limit):
        doc = request_json(COMPETITIONS_API, params={"page": page, "pageSize": 100}, timeout=timeout)
        collect_from_page(doc)

    if not candidates:
        raise RuntimeError(f"No competition matched name: {competition_name}")

    candidates.sort(key=lambda c: (c["_name_score"], c["_date_score"]), reverse=True)
    return candidates[0]


def select_event_from_competition_events(comp_events: Dict[str, Any], event_name: str) -> Dict[str, Any]:
    sports = comp_events.get("Sports") or []
    swim = next((s for s in sports if s.get("Code") == "SW"), None)
    if not swim:
        raise RuntimeError("Competition has no swimming discipline list")

    candidates: List[Dict[str, Any]] = []
    for item in swim.get("DisciplineList") or []:
        dn = str(item.get("DisciplineName") or "")
        score = score_name_match(event_name, dn)
        if score <= 0:
            continue
        row = dict(item)
        row["_event_score"] = score
        candidates.append(row)

    if not candidates:
        raise RuntimeError(f"No event matched name: {event_name}")

    candidates.sort(key=lambda x: x["_event_score"], reverse=True)
    return candidates[0]


def phase_match_score(phase_query: str, heat: Dict[str, Any]) -> int:
    pq = normalize_text(phase_query)
    phase_name = normalize_text(str(heat.get("PhaseName") or ""))
    unit_name = normalize_text(str(heat.get("Name") or ""))
    is_summary = bool(heat.get("IsSummary"))
    if is_summary:
        return -1

    if pq in {"final", "finals"}:
        score = 0
        if phase_name == "finals":
            score += 100
        if "final" in unit_name:
            score += 60
        return score

    if pq in {"semi", "semifinal", "semifinals"}:
        score = 0
        if phase_name == "semifinals":
            score += 100
        if "semifinal" in unit_name:
            score += 60
        return score

    if pq in {"heat", "heats"}:
        score = 0
        if phase_name == "heats":
            score += 100
        if "heat" in unit_name:
            score += 60
        return score

    return max(
        score_name_match(phase_query, str(heat.get("PhaseName") or "")),
        score_name_match(phase_query, str(heat.get("Name") or "")),
    )


def select_heat(event_doc: Dict[str, Any], phase_query: str) -> Dict[str, Any]:
    heats = event_doc.get("Heats") or []
    if not heats:
        raise RuntimeError("Event has no heats/units")

    scored: List[Tuple[int, Dict[str, Any]]] = []
    for h in heats:
        sc = phase_match_score(phase_query, h)
        if sc > 0:
            scored.append((sc, h))

    if not scored:
        raise RuntimeError(f"No unit matched phase: {phase_query}")

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


def detect_pool_code(comp_events: Dict[str, Any]) -> str:
    pool = str(comp_events.get("PoolConfiguration") or "").strip().lower()
    if pool == "50m":
        return "LCM"
    if pool == "25m":
        return "SCM"
    return "LCM"


def gender_code_from_event(event_doc: Dict[str, Any]) -> str:
    g = normalize_text(str(event_doc.get("Gender") or ""))
    if g.startswith("women"):
        return "F"
    if g.startswith("men"):
        return "M"
    return "X"


def normalize_name(text: str) -> str:
    s = unicodedata.normalize("NFKD", str(text or ""))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.upper()
    s = re.sub(r"[^A-Z ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def phase_order(phase_name: Optional[str]) -> int:
    name = normalize_text(str(phase_name or ""))
    if "heat" in name:
        return 1
    if "semi" in name:
        return 2
    if "final" in name:
        return 3
    return 0


def extract_target_event_context(event_doc: Dict[str, Any], heat: Dict[str, Any]) -> Dict[str, Any]:
    target_date = str(
        heat.get("Date")
        or heat.get("EndDate")
        or event_doc.get("EventResultDate")
        or event_doc.get("DisciplineEndDate")
        or ""
    ).strip() or None

    target_utc = str(
        heat.get("UtcDateTime")
        or heat.get("EndUtcDateTime")
        or event_doc.get("EventResultUtcDateTime")
        or ""
    ).strip() or None

    return {
        "date": target_date,
        "datetime": parse_iso_date(target_utc) if target_utc else None,
        "utc": target_utc,
        "phase_name": str(heat.get("PhaseName") or ""),
    }


def parse_event_spec(event_name: str) -> Optional[Dict[str, Any]]:
    name = normalize_text(event_name)
    distance_match = re.search(r"(\d+)\s*m", name)
    if not distance_match:
        return None

    relay = "relay" in name
    stroke: Optional[str] = None
    if "freestyle" in name:
        stroke = "FREESTYLE_RELAY" if relay else "FREESTYLE"
    elif "backstroke" in name:
        stroke = "BACKSTROKE"
    elif "breaststroke" in name:
        stroke = "BREASTSTROKE"
    elif "butterfly" in name:
        stroke = "BUTTERFLY"
    elif "medley" in name:
        stroke = "MEDLEY_RELAY" if relay else "MEDLEY"

    return {
        "distance": int(distance_match.group(1)),
        "stroke": stroke,
        "relay": relay,
    }


def build_ioc_pdf_url(event_code: str, phase_key: str) -> Optional[str]:
    phase_key = normalize_text(phase_key)
    if phase_key not in IOC_PHASE_CONFIG:
        return None
    report_code, phase_suffix = IOC_PHASE_CONFIG[phase_key]
    event_unit_block = event_code.ljust(22, "-")
    filename = f"OG2024_SWM_{report_code}_{event_unit_block}{phase_suffix}.pdf"
    return f"{IOC_OG2024_SWM_PDF_PREFIX}/{filename}"


def try_extract_pdf_text_from_bytes(pdf_bytes: bytes) -> Optional[str]:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return None

    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        chunks: List[str] = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            if txt:
                chunks.append(txt)
        out = "\n".join(chunks).strip()
        return out or None
    except Exception:
        return None


def extract_record_hints_from_text(raw_text: Optional[str]) -> Dict[str, Optional[str]]:
    out = {
        "world_record_hint": None,
        "olympic_record_hint": None,
    }
    if not raw_text:
        return out

    wr = re.search(r"\bWR\b[^\d]{0,8}(\d{1,2}[:.]\d{2}(?:\.\d{1,2})?)", raw_text)
    orr = re.search(r"\bOR\b[^\d]{0,8}(\d{1,2}[:.]\d{2}(?:\.\d{1,2})?)", raw_text)
    if wr:
        out["world_record_hint"] = wr.group(1)
    if orr:
        out["olympic_record_hint"] = orr.group(1)
    return out


def extract_top_rankings_row_from_text(raw_text: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw_text:
        return None

    row_re = re.compile(
        r"^\s*1\s+"
        r"(?P<time>\d{1,2}(?::\d{2})?\.\d{2})\s+"
        r"(?:(?P<points>\d+)\s+)?"
        r"(?P<name>.+?)\s+"
        r"(?P<yob>\d{4})\s+"
        r"(?P<country>[A-Z]{3})\s+"
        r"(?:Yes|No)\s+"
        r"(?P<meet>.+?)\s+"
        r"(?P<meet_country>[A-Z]{3})\s+"
        r"(?P<date>\d{2}/\d{2}/\d{4})"
        r"(?:\s+(?P<tag>[A-Z]+))?\s*$",
        flags=re.MULTILINE,
    )
    match = row_re.search(raw_text)
    if not match:
        return None

    meet = str(match.group("meet") or "").strip()
    meet_country = str(match.group("meet_country") or "").strip()
    competition = f"{meet} {meet_country}".strip() if meet_country else meet
    return {
        "time": str(match.group("time") or "").strip() or None,
        "holder": str(match.group("name") or "").strip() or None,
        "country": str(match.group("country") or "").strip() or None,
        "competition": competition or None,
        "date": parse_ddmmyyyy_to_iso(match.group("date")),
        "recordAdditional": str(match.group("tag") or "").strip() or "",
    }


def try_fetch_pdf_via_playwright(url: str, *, timeout: int) -> bytes:
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Playwright unavailable: {exc}") from exc

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            response = page.goto(url, wait_until="load", timeout=max(1000, timeout * 1000))
            if response is None:
                raise RuntimeError("No response from Playwright page.goto")
            status = int(response.status)
            body = response.body()
            browser.close()
            if status >= 400:
                raise RuntimeError(f"Playwright HTTP {status}")
            if not body or not is_pdf_bytes(body):
                raise RuntimeError(f"Playwright response was not a PDF (len={len(body)})")
            return body
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Playwright PDF fetch failed: {exc}") from exc


def fetch_pdf_artifact(
    url: str,
    *,
    artifact_path: Optional[Path],
    timeout: int,
    direct_source_label: str = "pdf_direct",
    playwright_source_label: str = "pdf_playwright",
    cached_source_label: str = "cached_pdf_artifact",
    allow_playwright: bool = True,
) -> Tuple[Optional[bytes], Optional[str], Optional[str], List[str]]:
    warnings: List[str] = []

    if artifact_path and artifact_path.exists():
        cached = artifact_path.read_bytes()
        if is_pdf_bytes(cached):
            return cached, cached_source_label, sha256_bytes(cached), warnings
        warnings.append(f"Cached artifact exists but is not a valid PDF: {artifact_path}")

    try:
        direct = request_bytes(url, timeout=max(45, timeout))
        if is_pdf_bytes(direct):
            if artifact_path:
                artifact_path.write_bytes(direct)
            return direct, direct_source_label, sha256_bytes(direct), warnings
        warnings.append(f"Direct PDF fetch returned non-PDF bytes for {url}")
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"Direct PDF fetch failed for {url}: {exc}")

    if allow_playwright:
        try:
            via_browser = try_fetch_pdf_via_playwright(url, timeout=max(45, timeout))
            if artifact_path:
                artifact_path.write_bytes(via_browser)
            return via_browser, playwright_source_label, sha256_bytes(via_browser), warnings
        except Exception as exc:  # noqa: BLE001
            warnings.append(str(exc))

    return None, None, None, warnings


def build_wa_rankings_report_pdf_url(
    *,
    distance: int,
    stroke: str,
    gender: str,
    pool: str,
    end_date: str,
) -> str:
    params = {
        "countryId": "",
        "distance": distance,
        "endDate": end_date,
        "gender": gender,
        "pageSize": 5,
        "poolConfiguration": pool,
        "regionId": "",
        "startDate": "",
        "stroke": stroke,
        "timesMode": "ALL_TIMES",
        "year": "",
    }
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return f"{RANKINGS_REPORT_PDF_API}?{query}"


def fetch_wa_rankings_record_as_of_event(
    event_name: str,
    *,
    gender: str,
    pool: str,
    target_event_date: Optional[str],
    artifact_dir: Optional[Path],
    timeout: int,
) -> Dict[str, Any]:
    spec = parse_event_spec(event_name)
    if not spec or not spec.get("stroke") or spec.get("relay") or not target_event_date:
        return {
            "report_url": None,
            "artifact_path": None,
            "artifact_sha256": None,
            "artifact_fetch_source": None,
            "top_row": None,
            "warnings": [f"World Aquatics rankings PDF not supported for {event_name}"],
        }

    report_url = build_wa_rankings_report_pdf_url(
        distance=int(spec["distance"]),
        stroke=str(spec["stroke"]),
        gender=gender,
        pool=pool,
        end_date=target_event_date,
    )
    rankings_dir = artifact_dir / "wa_rankings" if artifact_dir else None
    if rankings_dir:
        rankings_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = (
        rankings_dir / f"{slugify_path_part(event_name)}_{target_event_date}_{gender}_{pool}.pdf"
        if rankings_dir
        else None
    )

    pdf_bytes, artifact_fetch_source, artifact_sha256, warnings = fetch_pdf_artifact(
        report_url,
        artifact_path=artifact_path,
        timeout=timeout,
        direct_source_label="wa_rankings_pdf_direct",
        cached_source_label="wa_rankings_pdf_cached",
        allow_playwright=False,
    )
    raw_text = try_extract_pdf_text_from_bytes(pdf_bytes) if pdf_bytes else None
    top_row = extract_top_rankings_row_from_text(raw_text)
    if not top_row:
        warnings.append(f"Could not extract top rankings row from World Aquatics PDF for {event_name}")

    return {
        "report_url": report_url,
        "artifact_path": str(artifact_path) if artifact_path and artifact_path.exists() else None,
        "artifact_sha256": artifact_sha256,
        "artifact_fetch_source": artifact_fetch_source,
        "top_row": top_row,
        "warnings": warnings,
    }


def parse_row_datetime(row: Dict[str, Any]) -> Optional[datetime]:
    return parse_iso_date(str(row.get("UtcDateTime") or row.get("Date") or "") or None)


def is_row_before_target_event(
    row: Dict[str, Any],
    *,
    target_event_datetime: Optional[datetime],
    target_event_date: Optional[str],
    target_phase_name: Optional[str],
) -> bool:
    row_dt = parse_row_datetime(row)
    if target_event_datetime and row_dt:
        return row_dt < target_event_datetime

    row_date = str(row.get("Date") or "").strip()
    if not target_event_date or not row_date:
        return False
    if row_date < target_event_date:
        return True
    if row_date > target_event_date:
        return False
    return phase_order(row.get("PhaseName")) < phase_order(target_phase_name)


def is_open_olympic_games_result(row: Dict[str, Any]) -> bool:
    competition_type = str(row.get("CompetitionType") or "")
    competition_name = str(row.get("CompetitionName") or "")
    if competition_type == "Olympic Games":
        return True
    if "Youth Olympic" in competition_name or "Youth Olympic" in competition_type:
        return False
    return competition_name.startswith("Olympic Games ")


def is_world_championship_result(row: Dict[str, Any]) -> bool:
    competition_type = str(row.get("CompetitionType") or "")
    competition_name = str(row.get("CompetitionName") or "")
    if competition_type == "World Championships":
        return True
    if "World Aquatics Championships" in competition_name and "Junior" not in competition_name and "Short Course" not in competition_name:
        return True
    return False


def fetch_rankings_for_event(
    *,
    distance: int,
    stroke: str,
    gender: str,
    pool: str,
    timeout: int,
    page_size: int,
) -> List[Dict[str, Any]]:
    payload = request_json(
        RANKINGS_API,
        params={
            "gender": gender,
            "distance": distance,
            "stroke": stroke,
            "poolConfiguration": pool,
            "pageSize": min(max(page_size, 1), 200),
        },
        timeout=timeout,
    )
    return payload.get("swimmingWorldRankings") or []


def ranking_candidate_name(rec: Dict[str, Any]) -> str:
    first = str(rec.get("firstName") or rec.get("preferredFirstName") or "").strip()
    last = str(rec.get("lastName") or rec.get("preferredLastName") or "").strip()
    return " ".join(part for part in (first, last) if part).strip()


def athlete_profile_id_from_result_id(result_id: Any) -> Optional[str]:
    digits = re.sub(r"\D+", "", str(result_id or ""))
    return digits or None


def match_ranking_row(
    athlete_name: str,
    athlete_country: Optional[str],
    rankings: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    target = normalize_name(athlete_name)
    tokens = target.split()
    surname = tokens[-1] if tokens else ""
    first = tokens[0] if tokens else ""
    country_code = str(athlete_country or "").strip().upper()

    candidates: List[Tuple[int, Dict[str, Any]]] = []
    for rec in rankings:
        rec_country = str(rec.get("participantCountryCode") or "").upper()
        if country_code and rec_country != country_code:
            continue

        name = normalize_name(ranking_candidate_name(rec))
        score = 0
        if not name:
            continue
        if name == target:
            score += 10
        if surname and surname == normalize_name(rec.get("lastName", "")):
            score += 6
        if surname and surname in name:
            score += 3
        if first and name.startswith(first):
            score += 2
        if first and first in name:
            score += 1
        if score > 0:
            candidates.append((score, rec))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    best = candidates[0][1]
    return {
        "profile_name": ranking_candidate_name(best) or athlete_name,
        "country": best.get("participantCountryCode") or athlete_country,
        "result_id": best.get("resultId"),
        "result_ref": best.get("resultRef"),
        "person_id": best.get("personId"),
        "athlete_id": athlete_profile_id_from_result_id(best.get("resultId")),
    }


def build_empty_award_bucket(code: str, label: str) -> Dict[str, Any]:
    return {
        "code": code,
        "label": label,
        "gold": None,
        "silver": None,
        "bronze": None,
        "total": None,
        "summary": None,
    }


def build_award_bucket(code: str, label: str, counts: Optional[Tuple[int, int, int, int]], *, resolved: bool) -> Dict[str, Any]:
    if counts is None and not resolved:
        return build_empty_award_bucket(code, label)

    gold, silver, bronze, total = counts or (0, 0, 0, 0)
    return {
        "code": code,
        "label": label,
        "gold": gold,
        "silver": silver,
        "bronze": bronze,
        "total": total,
        "summary": f"{code} {gold}G-{silver}S-{bronze}B",
    }


def extract_olympic_cycle_name(competition_name: str) -> Optional[str]:
    match = re.search(r"Olympic Games\s+([A-Za-z]+)\s+(\d{4})", competition_name)
    if not match:
        return None
    return f"{match.group(1)} {match.group(2)}"


def fetch_athlete_results_rows(athlete_id: str, *, timeout: int) -> Tuple[List[Dict[str, Any]], str]:
    results_url = f"{ATHLETE_RESULTS_API}/{athlete_id}/results"
    payload = request_json(results_url, timeout=timeout)
    return payload.get("Results") or [], results_url


def match_target_event_result_row(
    rows: List[Dict[str, Any]],
    *,
    competition_name: str,
    event_name: str,
    phase_name: str,
    target_event_datetime: Optional[datetime],
    target_event_date: Optional[str],
) -> Optional[Dict[str, Any]]:
    candidates: List[Tuple[int, float, Dict[str, Any]]] = []
    for row in rows:
        if str(row.get("SportCode") or "") != "SW":
            continue
        if normalize_text(str(row.get("CompetitionName") or "")) != normalize_text(competition_name):
            continue
        if score_name_match(event_name, str(row.get("DisciplineName") or "")) <= 0:
            continue

        score = 0
        if normalize_text(str(row.get("PhaseName") or "")) == normalize_text(phase_name):
            score += 20
        if target_event_date and str(row.get("Date") or "") == target_event_date:
            score += 10

        row_dt = parse_row_datetime(row)
        delta = 10**18
        if target_event_datetime and row_dt:
            delta = abs((row_dt - target_event_datetime).total_seconds())
        candidates.append((score, delta, row))

    if not candidates:
        return None

    candidates.sort(key=lambda item: (-item[0], item[1]))
    return candidates[0][2]


def build_major_awards_from_results(
    rows: List[Dict[str, Any]],
    *,
    target_event_datetime: Optional[datetime],
    target_event_date: Optional[str],
    target_phase_name: Optional[str],
) -> Dict[str, Any]:
    og_counts = {"G": 0, "S": 0, "B": 0}
    wch_counts = {"G": 0, "S": 0, "B": 0}

    for row in rows:
        if str(row.get("SportCode") or "") != "SW":
            continue
        medal = str(row.get("MedalTag") or "").strip().upper()
        if medal not in {"G", "S", "B"}:
            continue
        if not is_row_before_target_event(
            row,
            target_event_datetime=target_event_datetime,
            target_event_date=target_event_date,
            target_phase_name=target_phase_name,
        ):
            continue

        if is_open_olympic_games_result(row):
            og_counts[medal] += 1
        elif is_world_championship_result(row):
            wch_counts[medal] += 1

    og_tuple = (og_counts["G"], og_counts["S"], og_counts["B"], sum(og_counts.values()))
    wch_tuple = (wch_counts["G"], wch_counts["S"], wch_counts["B"], sum(wch_counts.values()))
    return {
        "olympic_games": build_award_bucket("OG", "Olympic Games", og_tuple, resolved=True),
        "world_championships": build_award_bucket("WCH", "World Championships", wch_tuple, resolved=True),
    }


def build_olympic_appearances_from_results(
    rows: List[Dict[str, Any]],
    *,
    target_event_datetime: Optional[datetime],
    target_event_date: Optional[str],
    target_phase_name: Optional[str],
) -> Dict[str, Any]:
    cycles: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        if not is_open_olympic_games_result(row):
            continue
        if not is_row_before_target_event(
            row,
            target_event_datetime=target_event_datetime,
            target_event_date=target_event_date,
            target_phase_name=target_phase_name,
        ):
            continue

        cycle = extract_olympic_cycle_name(str(row.get("CompetitionName") or ""))
        if not cycle:
            continue

        row_date = str(row.get("Date") or "")
        existing = cycles.get(cycle)
        if existing is None or row_date < str(existing.get("date") or ""):
            cycles[cycle] = {
                "date": row_date,
                "age": row.get("AthleteResultAge"),
            }

    if not cycles:
        return {
            "count": 0,
            "first_games": None,
            "first_games_age": None,
            "summary": "0 Olympic appearances",
        }

    ordered_cycles = sorted(cycles.items(), key=lambda item: item[1].get("date") or "9999-99-99")
    first_games = ordered_cycles[0][0]
    first_age = ordered_cycles[0][1].get("age")
    count = len(ordered_cycles)
    return {
        "count": count,
        "first_games": first_games,
        "first_games_age": first_age,
        "summary": f"{count} Olympic appearances",
    }


def extract_result_time_from_row(row: Dict[str, Any]) -> Tuple[Optional[float], Optional[str]]:
    for key in ("Time", "ResultTime", "AthleteResultTime", "AthleteResult", "TimeFormatted", "Mark"):
        raw = row.get(key)
        parsed = parse_time_seconds(raw)
        if parsed is not None:
            return parsed, str(raw)
    return None, None


def build_personal_record_from_results(
    rows: List[Dict[str, Any]],
    *,
    event_name: str,
    target_event_datetime: Optional[datetime],
    target_event_date: Optional[str],
    target_phase_name: Optional[str],
) -> Optional[Dict[str, Any]]:
    best: Optional[Dict[str, Any]] = None
    best_seconds: Optional[float] = None

    for row in rows:
        if str(row.get("SportCode") or "") != "SW":
            continue
        if score_name_match(event_name, str(row.get("DisciplineName") or "")) <= 0:
            continue
        if not is_row_before_target_event(
            row,
            target_event_datetime=target_event_datetime,
            target_event_date=target_event_date,
            target_phase_name=target_phase_name,
        ):
            continue

        seconds, raw = extract_result_time_from_row(row)
        if seconds is None or raw is None:
            continue
        if best_seconds is None or seconds < best_seconds:
            best_seconds = seconds
            best = {
                "time": raw,
                "seconds": seconds,
                "competition": row.get("CompetitionName"),
                "date": row.get("Date"),
                "phase_name": row.get("PhaseName"),
            }

    return best


def build_empty_history(reason: str) -> Dict[str, Any]:
    return {
        "status": reason,
        "profile_name": None,
        "major_awards": {
            "olympic_games": build_empty_award_bucket("OG", "Olympic Games"),
            "world_championships": build_empty_award_bucket("WCH", "World Championships"),
        },
        "olympic_appearances": {
            "count": None,
            "first_games": None,
            "first_games_age": None,
            "summary": None,
        },
        "sources": {
            "rankings_match": None,
            "world_aquatics_medals_url": None,
            "world_aquatics_results_url": None,
            "target_event_result": None,
            "personal_record": None,
        },
    }


def enrich_athletes_with_history(
    rows: List[Dict[str, Any]],
    *,
    competition_name: str,
    event_name: str,
    phase_name: str,
    target_event_context: Dict[str, Any],
    gender: str,
    pool: str,
    timeout: int,
    page_size: int,
) -> Dict[str, Any]:
    spec = parse_event_spec(event_name)
    if not spec or not spec.get("stroke") or spec.get("relay"):
        for row in rows:
            row["athlete_history"] = build_empty_history("skipped")
        return {
            "enabled": False,
            "reason": "Event is not a supported individual stroke event",
        }

    rankings = fetch_rankings_for_event(
        distance=int(spec["distance"]),
        stroke=str(spec["stroke"]),
        gender=gender,
        pool=pool,
        timeout=timeout,
        page_size=page_size,
    )

    resolved = 0
    partial = 0
    unresolved = 0
    warnings: List[str] = []
    target_event_datetime = target_event_context.get("datetime")
    target_event_date = target_event_context.get("date")
    target_phase_name = target_event_context.get("phase_name") or phase_name

    for row in rows:
        history = build_empty_history("unresolved")
        row["age_at_event"] = None
        match = match_ranking_row(str(row.get("name") or ""), row.get("country"), rankings)
        if not match or not match.get("athlete_id"):
            row["athlete_history"] = history
            unresolved += 1
            warnings.append(f"No World Aquatics athlete profile match for {row.get('name')}")
            continue

        profile_name = str(match.get("profile_name") or row.get("name") or "")
        history["profile_name"] = profile_name
        history["sources"]["rankings_match"] = {
            "endpoint": RANKINGS_API,
            "result_id": match.get("result_id"),
            "result_ref": match.get("result_ref"),
            "person_id": match.get("person_id"),
            "matched_name": profile_name,
            "country": match.get("country"),
        }

        results_ok = False
        target_row_ok = False

        try:
            results_rows, results_url = fetch_athlete_results_rows(str(match["athlete_id"]), timeout=timeout)
            history["major_awards"] = build_major_awards_from_results(
                results_rows,
                target_event_datetime=target_event_datetime,
                target_event_date=target_event_date,
                target_phase_name=target_phase_name,
            )
            history["olympic_appearances"] = build_olympic_appearances_from_results(
                results_rows,
                target_event_datetime=target_event_datetime,
                target_event_date=target_event_date,
                target_phase_name=target_phase_name,
            )
            personal_record = build_personal_record_from_results(
                results_rows,
                event_name=event_name,
                target_event_datetime=target_event_datetime,
                target_event_date=target_event_date,
                target_phase_name=target_phase_name,
            )
            if personal_record:
                row["personal_record"] = personal_record.get("time")
                history["sources"]["personal_record"] = personal_record
            history["sources"]["world_aquatics_results_url"] = results_url

            target_row = match_target_event_result_row(
                results_rows,
                competition_name=competition_name,
                event_name=event_name,
                phase_name=phase_name,
                target_event_datetime=target_event_datetime,
                target_event_date=target_event_date,
            )
            if target_row:
                row["age_at_event"] = target_row.get("AthleteResultAge")
                history["sources"]["target_event_result"] = {
                    "date": target_row.get("Date"),
                    "utc": target_row.get("UtcDateTime"),
                    "phase_name": target_row.get("PhaseName"),
                    "age_at_result": target_row.get("AthleteResultAge"),
                }
                target_row_ok = row.get("age_at_event") is not None
                if not target_row_ok:
                    warnings.append(f"Matched target result row but age was empty for {profile_name}")
            else:
                warnings.append(f"Could not match target result row for {profile_name}")
            results_ok = True
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"Historical results fetch failed for {profile_name}: {exc}")

        if results_ok and target_row_ok:
            history["status"] = "ok"
            resolved += 1
        elif results_ok:
            history["status"] = "partial"
            partial += 1
        else:
            history["status"] = "unresolved"
            unresolved += 1

        row["athlete_history"] = history

    return {
        "enabled": True,
        "reason": None,
        "rankings_endpoint": RANKINGS_API,
        "distance": spec["distance"],
        "stroke": spec["stroke"],
        "resolved": resolved,
        "partial": partial,
        "unresolved": unresolved,
        "warnings": warnings,
    }


def pick_best_record_for_event(records: List[Dict[str, Any]], event_name: str) -> Optional[Dict[str, Any]]:
    best: Optional[Dict[str, Any]] = None
    best_score = -1
    best_time = float("inf")
    for rec in records:
        dn = str(rec.get("eventDisciplineName") or "")
        score = score_name_match(event_name, dn)
        if score <= 0:
            continue
        t = parse_time_seconds(rec.get("time") or rec.get("timeFormatted"))
        if t is None:
            t = 1e18
        if score > best_score or (score == best_score and t < best_time):
            best = rec
            best_score = score
            best_time = t
    return best


def build_record_row_from_api(rec: Dict[str, Any], code: str, *, source_url: str, semantics: str) -> Dict[str, Any]:
    return {
        "code": code,
        "event": rec.get("eventDisciplineName"),
        "time": rec.get("timeFormatted") or rec.get("time"),
        "holder": rec.get("fullName"),
        "country": rec.get("nationalityCode"),
        "competition": rec.get("officialName"),
        "date": rec.get("date"),
        "recordAdditional": rec.get("recordAdditional"),
        "source_url": source_url,
        "historical_scope": semantics,
        "source_kind": "wa_records_api",
        "artifact_path": None,
        "artifact_sha256": None,
    }


def build_record_row_from_hint(
    code: str,
    *,
    event_name: str,
    time_value: str,
    competition_name: str,
    target_event_date: Optional[str],
    source_url: Optional[str],
    source_kind: str,
    artifact_path: Optional[str] = None,
    artifact_sha256: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "code": code,
        "event": event_name,
        "time": time_value,
        "holder": None,
        "country": None,
        "competition": competition_name,
        "date": target_event_date,
        "recordAdditional": "time_only",
        "source_url": source_url,
        "historical_scope": "as_of_event",
        "source_kind": source_kind,
        "artifact_path": artifact_path,
        "artifact_sha256": artifact_sha256,
    }


def build_record_row_from_rankings_report(
    code: str,
    *,
    event_name: str,
    row: Dict[str, Any],
    source_url: str,
    source_kind: str,
    artifact_path: Optional[str],
    artifact_sha256: Optional[str],
) -> Dict[str, Any]:
    return {
        "code": code,
        "event": event_name,
        "time": row.get("time"),
        "holder": row.get("holder"),
        "country": row.get("country"),
        "competition": row.get("competition"),
        "date": row.get("date"),
        "recordAdditional": row.get("recordAdditional") or "",
        "source_url": source_url,
        "historical_scope": "as_of_event",
        "source_kind": source_kind,
        "artifact_path": artifact_path,
        "artifact_sha256": artifact_sha256,
    }


def reconcile_record_rows(records: Dict[str, Any], warnings: List[str]) -> None:
    wr = records.get("WR")
    orr = records.get("OR")
    wr_time = parse_time_seconds((wr or {}).get("time") if isinstance(wr, dict) else None)
    or_time = parse_time_seconds((orr or {}).get("time") if isinstance(orr, dict) else None)
    if wr_time is None or or_time is None or wr_time <= or_time:
        return

    warnings.append(
        f"Inconsistent records detected: WR {wr.get('time')} is slower than OR {orr.get('time')}; dropping WR"
    )
    records["WR"] = None


def fetch_ioc_record_hints_for_paris2024(
    event_name: str,
    phase_query: str,
    *,
    timeout: int,
    artifact_dir: Optional[Path],
) -> Dict[str, Any]:
    normalized = normalize_event_label(event_name)
    event_code = LOCAL_OG2024_SWM_EVENT_CODE_MAP.get(normalized)
    if not event_code:
        return {
            "event_code": None,
            "pdf_url": None,
            "record_hint_source": None,
            "world_record_hint": None,
            "olympic_record_hint": None,
            "artifact_path": None,
            "artifact_sha256": None,
            "artifact_fetch_source": None,
            "warnings": [f"No IOC Paris 2024 event code mapping for {event_name}"],
        }

    pdf_url = build_ioc_pdf_url(event_code, phase_query)
    warnings: List[str] = []
    raw_text: Optional[str] = None
    artifact_path = artifact_dir / f"{event_code}_{slugify_path_part(phase_query or 'final')}.pdf" if artifact_dir else None
    hints = {
        "world_record_hint": None,
        "olympic_record_hint": None,
    }
    record_hint_source: Optional[str] = None
    artifact_sha256: Optional[str] = None
    artifact_fetch_source: Optional[str] = None

    if pdf_url:
        pdf_bytes, artifact_fetch_source, artifact_sha256, pdf_warnings = fetch_pdf_artifact(
            pdf_url,
            artifact_path=artifact_path,
            timeout=timeout,
            direct_source_label="ioc_pdf_direct",
            playwright_source_label="ioc_pdf_playwright",
            cached_source_label="ioc_pdf_cached",
        )
        warnings.extend(pdf_warnings)
        if pdf_bytes:
            raw_text = try_extract_pdf_text_from_bytes(pdf_bytes)
            hints = extract_record_hints_from_text(raw_text)
            if hints.get("world_record_hint") or hints.get("olympic_record_hint"):
                record_hint_source = "ioc_pdf_text"

    if not hints.get("world_record_hint") or not hints.get("olympic_record_hint"):
        warnings.append(
            f"No artifact-backed IOC record hint available for {event_name}"
        )

    return {
        "event_code": event_code,
        "pdf_url": pdf_url,
        "record_hint_source": record_hint_source,
        "world_record_hint": hints.get("world_record_hint"),
        "olympic_record_hint": hints.get("olympic_record_hint"),
        "artifact_path": str(artifact_path) if artifact_path and artifact_path.exists() else None,
        "artifact_sha256": artifact_sha256,
        "artifact_fetch_source": artifact_fetch_source,
        "warnings": warnings,
    }


def fetch_records_as_of_event(
    event_name: str,
    *,
    competition_name: str,
    phase_query: str,
    target_event_context: Dict[str, Any],
    gender: str,
    pool: str,
    timeout: int,
    artifact_dir: Optional[Path],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    out: Dict[str, Any] = {}
    warnings: List[str] = []
    target_event_date = str(target_event_context.get("date") or "").strip() or None
    is_paris_2024_olympics = normalize_text(competition_name) == normalize_text("Olympic Games Paris 2024")
    ioc_hints: Optional[Dict[str, Any]] = None
    wa_rankings_hint: Optional[Dict[str, Any]] = None

    for code in ("WR", "OR"):
        records_url = f"{BASE_API}/records/SW"
        payload = request_json(
            records_url,
            params={"recordCode": code, "gender": gender, "pool": pool},
            timeout=timeout,
        )
        records = payload.get("records") or []
        rec = pick_best_record_for_event(records, event_name)
        record_date = str((rec or {}).get("date") or "").strip()
        if rec and target_event_date and record_date and record_date <= target_event_date:
            out[code] = build_record_row_from_api(rec, code, source_url=records_url, semantics="as_of_event")
            continue
        if rec and not target_event_date:
            out[code] = build_record_row_from_api(rec, code, source_url=records_url, semantics="current_fallback_unknown_event_date")
            warnings.append(f"Using current {code} because target event date was unavailable for {event_name}")
            continue

        if is_paris_2024_olympics:
            if ioc_hints is None:
                ioc_hints = fetch_ioc_record_hints_for_paris2024(
                    event_name,
                    phase_query,
                    timeout=timeout,
                    artifact_dir=artifact_dir,
                )
                warnings.extend(ioc_hints.get("warnings") or [])
            hint_time = ioc_hints.get("world_record_hint") if code == "WR" else ioc_hints.get("olympic_record_hint")
            if hint_time:
                out[code] = build_record_row_from_hint(
                    code,
                    event_name=event_name,
                    time_value=str(hint_time),
                    competition_name=competition_name,
                    target_event_date=target_event_date,
                    source_url=ioc_hints.get("pdf_url"),
                    source_kind=str(ioc_hints.get("record_hint_source") or "ioc_hint"),
                    artifact_path=ioc_hints.get("artifact_path"),
                    artifact_sha256=ioc_hints.get("artifact_sha256"),
                )
                continue

        if code == "WR":
            if wa_rankings_hint is None:
                wa_rankings_hint = fetch_wa_rankings_record_as_of_event(
                    event_name,
                    gender=gender,
                    pool=pool,
                    target_event_date=target_event_date,
                    artifact_dir=artifact_dir,
                    timeout=timeout,
                )
                warnings.extend(wa_rankings_hint.get("warnings") or [])
            top_row = wa_rankings_hint.get("top_row") if isinstance(wa_rankings_hint, dict) else None
            if top_row and top_row.get("time"):
                out[code] = build_record_row_from_rankings_report(
                    code,
                    event_name=event_name,
                    row=top_row,
                    source_url=str(wa_rankings_hint.get("report_url") or RANKINGS_REPORT_PDF_API),
                    source_kind=str(wa_rankings_hint.get("artifact_fetch_source") or "wa_rankings_pdf"),
                    artifact_path=wa_rankings_hint.get("artifact_path"),
                    artifact_sha256=wa_rankings_hint.get("artifact_sha256"),
                )
                continue

        if rec:
            warnings.append(
                f"Current {code} date {record_date or 'unknown'} is after target event date {target_event_date or 'unknown'} for {event_name}; left unresolved"
            )
        else:
            warnings.append(f"No {code} row matched event name {event_name}")
        out[code] = None

    reconcile_record_rows(out, warnings)

    return out, {
        "semantics": "as_of_event",
        "target_event_date": target_event_date,
        "policy": {
            "artifact_dir": str(artifact_dir) if artifact_dir else None,
        },
        "ioc_hint_context": ioc_hints,
        "wa_rankings_context": wa_rankings_hint,
        "warnings": warnings,
    }


def build_athlete_rows(heat: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    results = heat.get("Results") or []

    def rank_key(r: Dict[str, Any]) -> int:
        try:
            return int(r.get("Rank"))
        except Exception:  # noqa: BLE001
            return 10**9

    for r in sorted(results, key=rank_key):
        splits = sorted(r.get("Splits") or [], key=lambda x: int(x.get("Order") or 0))
        rows.append(
            {
                "rank": r.get("Rank"),
                "lane": r.get("Lane"),
                "name": r.get("FullName"),
                "country": r.get("NAT"),
                "age_at_event": None,
                "personal_record": None,
                "reaction_time": r.get("RT"),
                "final_time": r.get("Time"),
                "splits": [
                    {
                        "distance": s.get("Distance"),
                        "split_time": s.get("Time"),
                        "lap_time": s.get("DifferentialTime"),
                        "order": s.get("Order"),
                    }
                    for s in splits
                ],
            }
        )
    return rows


def common_split_distances(rows: List[Dict[str, Any]]) -> List[str]:
    all_sets: List[List[str]] = []
    for row in rows:
        all_sets.append([str(s.get("distance")) for s in row.get("splits") or [] if s.get("distance")])
    if not all_sets:
        return []
    first = all_sets[0]
    return [d for d in first if all(d in s for s in all_sets)]


def print_text_report(report: Dict[str, Any]) -> None:
    meta = report["meta"]
    def format_record(rec: Optional[Dict[str, Any]]) -> str:
        if not rec:
            return "N/A"
        bits = [str(rec.get("time") or "N/A")]
        holder = str(rec.get("holder") or "").strip()
        country = str(rec.get("country") or "").strip()
        if holder and country:
            bits.append(f"({holder}, {country})")
        elif holder:
            bits.append(f"({holder})")
        return " ".join(bits)

    print(f"Competition: {meta['competition_name']} (id={meta['competition_id']})")
    print(f"Event: {meta['event_name']} (id={meta['event_id']})")
    print(f"Phase: {meta['phase_name']} / Unit: {meta['unit_name']}")
    print(f"Pool: {meta['pool_code']} | Gender: {meta['gender_code']}")
    print("")
    print("Records:")
    wr = report["records"].get("WR")
    orr = report["records"].get("OR")
    print(f"- WR: {format_record(wr)}")
    print(f"- OR: {format_record(orr)}")
    print("")

    rows = report["athletes"]
    split_cols = common_split_distances(rows)
    headers = ["Rank", "Lane", "Athlete", "NOC", "Age", "RT", "PB", "OG Apps", "OG Awards", "WCH Awards"] + [f"{d} split" for d in split_cols] + [
        f"{d} lap" for d in split_cols
    ] + ["Final"]
    print("\t".join(headers))

    for row in rows:
        by_dist = {str(s.get("distance")): s for s in row.get("splits") or []}
        history = row.get("athlete_history") or {}
        apps = (history.get("olympic_appearances") or {}).get("summary") or ""
        major_awards = history.get("major_awards") or {}
        og_awards = (major_awards.get("olympic_games") or {}).get("summary") or ""
        wch_awards = (major_awards.get("world_championships") or {}).get("summary") or ""
        values = [
            str(row.get("rank") or ""),
            str(row.get("lane") or ""),
            str(row.get("name") or ""),
            str(row.get("country") or ""),
            str(row.get("age_at_event") or ""),
            str(row.get("reaction_time") or ""),
            str(row.get("personal_record") or ""),
            str(apps),
            str(og_awards),
            str(wch_awards),
        ]
        values.extend(str((by_dist.get(d) or {}).get("split_time") or "") for d in split_cols)
        values.extend(str((by_dist.get(d) or {}).get("lap_time") or "") for d in split_cols)
        values.append(str(row.get("final_time") or ""))
        print("\t".join(values))


def build_report(args: argparse.Namespace) -> Dict[str, Any]:
    comp = select_competition_by_name(args.competition, max_pages=args.max_pages, timeout=args.timeout)
    comp_id = int(comp["id"])

    comp_events = request_json(f"{BASE_API}/competitions/{comp_id}/events", timeout=args.timeout)
    event = select_event_from_competition_events(comp_events, args.event)
    event_id = str(event["Id"])

    event_doc = request_json(f"{BASE_API}/events/{event_id}", timeout=args.timeout)
    heat = select_heat(event_doc, args.phase)
    target_event_context = extract_target_event_context(event_doc, heat)

    pool_code = detect_pool_code(comp_events)
    gender_code = gender_code_from_event(event_doc)
    artifact_dir = resolve_artifact_dir(args.out, args.artifact_dir)
    records, records_meta = fetch_records_as_of_event(
        event_doc.get("DisciplineName") or args.event,
        competition_name=str(comp.get("officialName") or comp.get("name") or args.competition),
        phase_query=args.phase,
        target_event_context=target_event_context,
        gender=gender_code,
        pool=pool_code,
        timeout=args.timeout,
        artifact_dir=artifact_dir,
    )
    athletes = build_athlete_rows(heat)
    history = {"enabled": False, "reason": "Skipped by flag"}
    if not args.skip_athlete_history:
        history = enrich_athletes_with_history(
            athletes,
            competition_name=str(comp.get("officialName") or comp.get("name") or args.competition),
            event_name=str(event_doc.get("DisciplineName") or args.event),
            phase_name=str(heat.get("PhaseName") or args.phase),
            target_event_context=target_event_context,
            gender=gender_code,
            pool=pool_code,
            timeout=args.timeout,
            page_size=args.rankings_page_size,
        )

    return {
        "meta": {
            "competition_id": comp_id,
            "competition_name": comp.get("officialName") or comp.get("name"),
            "event_id": event_id,
            "event_name": event_doc.get("DisciplineName") or args.event,
            "phase_query": args.phase,
            "phase_name": heat.get("PhaseName"),
            "unit_name": heat.get("Name"),
            "pool_code": pool_code,
            "gender_code": gender_code,
            "historical_semantics": "as_of_event",
            "target_event_date": target_event_context.get("date"),
            "target_event_utc": target_event_context.get("utc"),
            "source": {
                "competition_events": f"{BASE_API}/competitions/{comp_id}/events",
                "event": f"{BASE_API}/events/{event_id}",
                "records": f"{BASE_API}/records/SW",
                "rankings": RANKINGS_API,
                "athlete_results": f"{ATHLETE_RESULTS_API}/<athleteId>/results",
                "ioc_og2024_pdf_prefix": IOC_OG2024_SWM_PDF_PREFIX,
                "artifact_dir": str(artifact_dir) if artifact_dir else None,
            },
            "records_context": records_meta,
            "athlete_history": history,
        },
        "records": records,
        "athletes": athletes,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch official swim event snapshot (records, splits, athlete core fields, and athlete history).")
    parser.add_argument("--competition", required=True, help='Competition name, e.g. "Olympic Games Paris 2024"')
    parser.add_argument("--event", required=True, help='Event name, e.g. "Men\'s 100m Freestyle"')
    parser.add_argument("--phase", default="final", help='Phase selector: final|semifinal|heat or free text (default: final)')
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout in seconds (default: 30)")
    parser.add_argument("--max-pages", type=int, default=50, help="Max pages to scan in competitions list (default: 50)")
    parser.add_argument("--rankings-page-size", type=int, default=200, help="World Aquatics rankings page size for athlete matching (default: 200)")
    parser.add_argument("--skip-athlete-history", action="store_true", help="Skip athlete history enrichment from World Aquatics/Olympics pages")
    parser.add_argument("--artifact-dir", default="", help="Optional cache directory for official record artifacts such as Olympics PDFs")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    parser.add_argument("--out", default="", help="Optional JSON output file path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        report = build_report(args)
    except Exception as exc:  # noqa: BLE001
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_text_report(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
