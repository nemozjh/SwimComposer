#!/usr/bin/env python3
"""
Video pipeline for lane partitioning, text-prompt SAM3 tracking, and overlay generation.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

try:
    import torch
except Exception:  # pragma: no cover
    torch = None

try:
    from ultralytics.models.sam.predict import SAM3VideoSemanticPredictor
except Exception:  # pragma: no cover
    SAM3VideoSemanticPredictor = None


COUNTRY_META_BY_CODE3: Dict[str, Dict[str, str]] = {
    "AUS": {"country": "Australia", "country_code": "au"},
    "CAN": {"country": "Canada", "country_code": "ca"},
    "CAY": {"country": "Cayman Islands", "country_code": "ky"},
    "CHN": {"country": "China", "country_code": "cn"},
    "FRA": {"country": "France", "country_code": "fr"},
    "GBR": {"country": "Great Britain", "country_code": "gb"},
    "GER": {"country": "Germany", "country_code": "de"},
    "GRE": {"country": "Greece", "country_code": "gr"},
    "ITA": {"country": "Italy", "country_code": "it"},
    "JPN": {"country": "Japan", "country_code": "jp"},
    "SWE": {"country": "Sweden", "country_code": "se"},
    "USA": {"country": "United States", "country_code": "us"},
}


@dataclass
class LaneRegion:
    lane_id: int
    y0: int
    y1: int


@dataclass
class DirectionSegment:
    start_frame: int
    end_frame: int
    direction: str
    base_distance_m: float


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
        result = float(value)
        if math.isnan(result) or math.isinf(result):
            return None
        return result
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


def parse_percent(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if text.endswith("%"):
            text = text[:-1]
            try:
                return float(text) / 100.0
            except ValueError:
                return None
    number = to_float(value)
    if number is None:
        return None
    if number > 1.0:
        number = number / 100.0
    return max(0.0, min(1.0, number))


def summarize_major_awards(raw: Any) -> Optional[str]:
    if not isinstance(raw, dict):
        return None
    parts: List[str] = []
    for value in raw.values():
        if not isinstance(value, dict):
            continue
        summary = str(value.get("summary") or "").strip()
        if summary:
            parts.append(summary)
    return "; ".join(parts) if parts else None


def normalize_splits(raw: Any) -> Optional[List[Dict[str, Any]]]:
    if not isinstance(raw, list):
        return None
    out: List[Dict[str, Any]] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        split = {
            "distance": str(row.get("distance") or "").strip() or None,
            "split_time": round_num(to_float(row.get("split_time")), 6),
            "lap_time": round_num(to_float(row.get("lap_time")), 6),
            "order": to_int(row.get("order")),
        }
        split = {k: v for k, v in split.items() if v is not None}
        if split:
            out.append(split)
    return out or None


def extract_record_time(source: Any, preferred_key: str, fallback_key: str) -> Optional[float]:
    if not isinstance(source, dict):
        return round_num(to_float(source), 6)
    preferred = source.get(preferred_key)
    if isinstance(preferred, dict):
        return round_num(to_float(preferred.get("time")), 6)
    fallback = source.get(fallback_key)
    if isinstance(fallback, dict):
        return round_num(to_float(fallback.get("time")), 6)
    return round_num(to_float(preferred if preferred is not None else fallback), 6)


def load_lane_regions(path: Path, frame_h: int) -> List[LaneRegion]:
    doc = load_json(path)
    lanes = doc.get("lanes") if isinstance(doc, dict) else None
    if not isinstance(lanes, dict):
        raise ValueError(f"lane_regions file must include lanes[]: {path}")

    out: List[LaneRegion] = []
    for lane_key, row in lanes.items():
        if not isinstance(row, dict):
            continue
        lane_id = to_int(lane_key)
        y0 = parse_percent(row.get("y0"))
        y1 = parse_percent(row.get("y1"))
        if lane_id is None or y0 is None or y1 is None:
            continue
        py0 = max(0, min(frame_h - 1, int(round(y0 * frame_h))))
        py1 = max(py0 + 1, min(frame_h, int(round(y1 * frame_h))))
        out.append(LaneRegion(lane_id=lane_id, y0=py0, y1=py1))
    if not out:
        raise ValueError(f"No valid lane regions found in {path}")
    return sorted(out, key=lambda item: item.y0)


def split_video_into_lanes(
    *,
    video_path: Path,
    lane_regions_path: Path,
    output_dir: Path,
    codec: str = "MJPG",
    ext: str = "avi",
    start_frame: int = 0,
    max_frames: int = 0,
) -> Dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_dir = output_dir
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open video: {video_path}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0) or 25.0
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    regions = load_lane_regions(lane_regions_path, frame_h)

    start_frame = max(0, int(start_frame))
    if start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    fourcc = cv2.VideoWriter_fourcc(*str(codec))
    lane_specs: List[Dict[str, Any]] = []
    writers: Dict[int, cv2.VideoWriter] = {}
    for region in regions:
        lane_h = max(1, region.y1 - region.y0)
        lane_path = output_dir / f"lane_{region.lane_id}.{ext}"
        writer = cv2.VideoWriter(str(lane_path), fourcc, fps, (frame_w, lane_h))
        if not writer.isOpened():
            raise RuntimeError(f"Failed to open writer for {lane_path}")
        writers[region.lane_id] = writer
        lane_specs.append({
            "lane_id": region.lane_id,
            "path": public_path_ref(lane_path, relative_to=manifest_dir),
            "width": frame_w,
            "height": lane_h,
            "y0": region.y0,
            "y1": region.y1,
        })

    written_frames = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        for region in regions:
            spec = next(item for item in lane_specs if int(item["lane_id"]) == region.lane_id)
            crop = frame[spec["y0"]:spec["y1"], :, :]
            writers[region.lane_id].write(crop)
        written_frames += 1
        if max_frames > 0 and written_frames >= int(max_frames):
            break

    cap.release()
    for writer in writers.values():
        writer.release()

    manifest = {
        "schema_version": "1.0",
        "source_video": public_path_ref(video_path),
        "lane_regions": public_path_ref(lane_regions_path),
        "video": {
            "width": frame_w,
            "height": frame_h,
            "fps": round_num(fps, 6),
            "total_frames": total_frames,
            "start_frame": start_frame,
            "written_frames": written_frames,
        },
        "lanes": lane_specs,
    }
    write_json(output_dir / "lane_manifest.json", manifest)
    return manifest


def parse_text_prompts(values: Optional[Sequence[str]]) -> List[str]:
    prompts = [str(value).strip() for value in (values or []) if str(value).strip()]
    return prompts or ["person"]


def choose_detection_indices(result: Any, top_k: int) -> List[int]:
    if result.boxes is None or result.masks is None or len(result.boxes) == 0:
        return []
    confs = (
        result.boxes.conf.detach().float().cpu().numpy()
        if result.boxes.conf is not None
        else np.ones((len(result.boxes),), dtype=np.float32)
    )
    masks = result.masks.data.detach().float().cpu().numpy()
    areas = masks.reshape(masks.shape[0], -1).sum(axis=1)
    indices = list(range(len(confs)))
    indices.sort(key=lambda idx: (float(confs[idx]), float(areas[idx])), reverse=True)
    return indices[: max(1, int(top_k))]


def reset_predictor_state(predictor: Any) -> None:
    predictor.inference_state = {}
    predictor.prompts = {}
    if hasattr(predictor, "tracker") and predictor.tracker is not None:
        predictor.tracker.inference_state = {}
        predictor.tracker.prompts = {}


def mask_to_polygon(mask_bool: np.ndarray) -> Optional[List[List[float]]]:
    if mask_bool.dtype != np.uint8:
        mask_bool = mask_bool.astype(np.uint8)
    contours, _ = cv2.findContours(mask_bool, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) <= 0:
        return None
    epsilon = max(1.0, 0.003 * cv2.arcLength(contour, True))
    approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
    return [[round(float(x), 2), round(float(y), 2)] for x, y in approx]


def class_name(names: Any, cls_idx: int) -> str:
    if isinstance(names, dict):
        return str(names.get(int(cls_idx), cls_idx))
    if isinstance(names, (list, tuple)) and 0 <= int(cls_idx) < len(names):
        return str(names[int(cls_idx)])
    return str(cls_idx)


def run_text_prompt_sam3(
    *,
    manifest_path: Path,
    output_path: Path,
    weights: Path,
    text_prompts: Sequence[str],
    imgsz: int,
    conf: float,
    top_k: int,
) -> Dict[str, Any]:
    if SAM3VideoSemanticPredictor is None:
        raise RuntimeError("SAM3VideoSemanticPredictor is unavailable in this environment.")

    manifest = load_json(manifest_path)
    fps = float((manifest.get("video") or {}).get("fps") or 25.0)
    video_w = int((manifest.get("video") or {}).get("width") or 0)
    video_h = int((manifest.get("video") or {}).get("height") or 0)
    start_frame = int((manifest.get("video") or {}).get("start_frame") or 0)

    predictor = SAM3VideoSemanticPredictor(
        overrides={
            "model": str(weights),
            "conf": float(conf),
            "imgsz": int(imgsz),
            "verbose": False,
        }
    )

    merged_frames: Dict[int, Dict[str, Any]] = {}
    tracks: List[Dict[str, Any]] = []
    for lane in sorted(manifest.get("lanes") or [], key=lambda row: int(row["lane_id"])):
        lane_id = int(lane["lane_id"])
        lane_path = (manifest_path.parent / lane["path"]).resolve()
        y0 = int(lane["y0"])
        reset_predictor_state(predictor)
        tracks.append({
            "track_id": f"lane_{lane_id}",
            "lane_id": lane_id,
            "name": f"Athlete {lane_id}",
        })

        results = predictor(source=str(lane_path), stream=True, text=list(text_prompts))
        for local_frame_idx, result in enumerate(results):
            frame_id = start_frame + local_frame_idx
            row = merged_frames.setdefault(
                frame_id,
                {
                    "frame": frame_id,
                    "time_sec": round_num(frame_id / fps, 6),
                    "detections": [],
                },
            )
            chosen = choose_detection_indices(result, top_k=top_k)
            for det_idx in chosen:
                box = result.boxes.xyxy[det_idx].detach().float().cpu().numpy()
                x1, y1, x2, y2 = [float(v) for v in box.tolist()]
                score = float(result.boxes.conf[det_idx]) if result.boxes.conf is not None else 1.0
                cls_idx = int(result.boxes.cls[det_idx]) if result.boxes.cls is not None else 0
                mask_bool = result.masks.data[det_idx].detach().cpu().numpy() > 0.5
                polygon = mask_to_polygon(mask_bool)
                det = {
                    "track_id": f"lane_{lane_id}",
                    "lane_id": lane_id,
                    "label": class_name(result.names, cls_idx),
                    "score": round_num(score, 6),
                    "bbox": [
                        round_num(x1, 3),
                        round_num(y1 + y0, 3),
                        round_num(max(0.0, x2 - x1), 3),
                        round_num(max(0.0, y2 - y1), 3),
                    ],
                }
                if polygon:
                    det["mask"] = {
                        "type": "polygon",
                        "points": [[round_num(px, 2), round_num(py + y0, 2)] for px, py in polygon],
                    }
                row["detections"].append(det)

        if torch is not None and torch.cuda.is_available():
            torch.cuda.empty_cache()

    output = {
        "schema_version": "1.0",
        "video": {
            "width": video_w,
            "height": video_h,
            "fps": round_num(fps, 6),
        },
        "lane_regions": str(manifest.get("lane_regions") or "lane_regions.json"),
        "text_prompts": list(text_prompts),
        "tracks": tracks,
        "frames": [merged_frames[frame_id] for frame_id in sorted(merged_frames.keys())],
    }
    write_json(output_path, output)
    return output


def parse_bbox(det: Dict[str, Any]) -> Optional[Tuple[float, float, float, float]]:
    bbox = det.get("bbox")
    if not isinstance(bbox, list) or len(bbox) != 4:
        return None
    x = to_float(bbox[0])
    y = to_float(bbox[1])
    w = to_float(bbox[2])
    h = to_float(bbox[3])
    if None in (x, y, w, h) or w <= 0 or h <= 0:
        return None
    return float(x), float(y), float(x + w), float(y + h)


def percentile(values: List[float], p: float) -> Optional[float]:
    if not values:
        return None
    ordered = sorted(values)
    idx = int(round((len(ordered) - 1) * p))
    idx = max(0, min(len(ordered) - 1, idx))
    return ordered[idx]


def median_abs_dev(values: List[float], center: Optional[float] = None) -> float:
    if not values:
        return 0.0
    if center is None:
        center = statistics.median(values)
    deviations = [abs(v - center) for v in values]
    return statistics.median(deviations) if deviations else 0.0


def local_stat(values: List[Optional[float]], index: int, radius: int, fn) -> Optional[float]:
    lo = max(0, index - radius)
    hi = min(len(values), index + radius + 1)
    sample = [values[i] for i in range(lo, hi) if values[i] is not None]
    if not sample:
        return None
    return fn(sample)


def interpolate_series(values: List[Optional[float]]) -> List[Optional[float]]:
    if not values:
        return []
    out = list(values)
    valid = [idx for idx, value in enumerate(out) if value is not None]
    if not valid:
        return out
    first = valid[0]
    last = valid[-1]
    for idx in range(0, first):
        out[idx] = out[first]
    for idx in range(last + 1, len(out)):
        out[idx] = out[last]
    for left, right in zip(valid, valid[1:]):
        if right == left + 1:
            continue
        start = out[left]
        end = out[right]
        if start is None or end is None:
            continue
        span = right - left
        for idx in range(left + 1, right):
            alpha = (idx - left) / span
            out[idx] = (1.0 - alpha) * start + alpha * end
    return out


def rolling_median(values: List[Optional[float]], radius: int) -> List[Optional[float]]:
    return [local_stat(values, idx, radius, statistics.median) or values[idx] for idx in range(len(values))]


def rolling_mean(values: List[Optional[float]], radius: int) -> List[Optional[float]]:
    return [local_stat(values, idx, radius, lambda xs: sum(xs) / len(xs)) or values[idx] for idx in range(len(values))]


def smooth_series(values: List[Optional[float]], radius: int) -> List[Optional[float]]:
    return rolling_mean(rolling_median(values, radius), radius)


def front_edge_progress_px(box: Tuple[float, float, float, float], direction: str, video_w: int) -> float:
    x1, _, x2, _ = box
    edge = x1 if direction == "rtl" else x2
    return float(video_w) - edge if direction == "rtl" else edge


def build_raw_lane_boxes(source: Dict[str, Any]) -> Dict[int, Dict[int, Tuple[float, float, float, float]]]:
    out: Dict[int, Dict[int, Tuple[float, float, float, float]]] = {}
    for frame in source.get("frames", []) if isinstance(source.get("frames"), list) else []:
        frame_id = to_int(frame.get("frame"))
        if frame_id is None:
            continue
        frame_boxes: Dict[int, Tuple[float, float, float, float]] = {}
        frame_scores: Dict[int, float] = {}
        for det in frame.get("detections", []) if isinstance(frame.get("detections"), list) else []:
            if not isinstance(det, dict):
                continue
            lane_id = to_int(det.get("lane_id"))
            box = parse_bbox(det)
            score = to_float(det.get("score")) or 0.0
            if lane_id is None or box is None:
                continue
            if lane_id not in frame_scores or score > frame_scores[lane_id]:
                frame_scores[lane_id] = score
                frame_boxes[lane_id] = box
        for lane_id, box in frame_boxes.items():
            out.setdefault(lane_id, {})[frame_id] = box
    return out


def clean_lane_boxes(
    lane_boxes: Dict[int, Tuple[float, float, float, float]],
    *,
    total_frames: int,
    start_frame: int,
    smooth_radius: int,
) -> Dict[int, Tuple[float, float, float, float]]:
    frame_ids = list(range(start_frame, total_frames))
    raw_boxes = [lane_boxes.get(frame_id) for frame_id in frame_ids]
    valid_boxes = [box for box in raw_boxes if box is not None]
    if not valid_boxes:
        return {}

    cy_values = [((box[1] + box[3]) / 2.0) for box in valid_boxes]
    areas = [max(1.0, (box[2] - box[0]) * (box[3] - box[1])) for box in valid_boxes]
    widths = [max(1.0, box[2] - box[0]) for box in valid_boxes]
    cy_med = statistics.median(cy_values)
    cy_mad = median_abs_dev(cy_values, cy_med)
    area_med = statistics.median(areas)
    width_med = statistics.median(widths)

    x1_series: List[Optional[float]] = []
    y1_series: List[Optional[float]] = []
    x2_series: List[Optional[float]] = []
    y2_series: List[Optional[float]] = []
    prev_center: Optional[Tuple[float, float]] = None
    max_jump = max(40.0, width_med * 2.5)
    max_cy_dev = max(24.0, cy_mad * 3.5)
    min_area = max(16.0, area_med * 0.2)
    max_area = max(min_area * 2.0, area_med * 4.5)

    for box in raw_boxes:
        if box is None:
            x1_series.append(None)
            y1_series.append(None)
            x2_series.append(None)
            y2_series.append(None)
            continue

        x1, y1, x2, y2 = box
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        area = max(1.0, (x2 - x1) * (y2 - y1))
        keep = True
        if abs(cy - cy_med) > max_cy_dev:
            keep = False
        if area < min_area or area > max_area:
            keep = False
        if prev_center is not None:
            dx = cx - prev_center[0]
            dy = cy - prev_center[1]
            if math.hypot(dx, dy) > max_jump:
                keep = False
        if keep:
            prev_center = (cx, cy)
            x1_series.append(x1)
            y1_series.append(y1)
            x2_series.append(x2)
            y2_series.append(y2)
        else:
            x1_series.append(None)
            y1_series.append(None)
            x2_series.append(None)
            y2_series.append(None)

    x1_series = smooth_series(interpolate_series(x1_series), smooth_radius)
    y1_series = smooth_series(interpolate_series(y1_series), smooth_radius)
    x2_series = smooth_series(interpolate_series(x2_series), smooth_radius)
    y2_series = smooth_series(interpolate_series(y2_series), smooth_radius)

    out: Dict[int, Tuple[float, float, float, float]] = {}
    for frame_id, x1, y1, x2, y2 in zip(frame_ids, x1_series, y1_series, x2_series, y2_series):
        if None in (x1, y1, x2, y2):
            continue
        if x2 <= x1 or y2 <= y1:
            continue
        out[frame_id] = (float(x1), float(y1), float(x2), float(y2))
    return out


def parse_direction_segments(doc: Dict[str, Any]) -> List[DirectionSegment]:
    rows = doc.get("direction_segments")
    if not isinstance(rows, list):
        raise ValueError("Config must define direction_segments[]")
    out: List[DirectionSegment] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        start_frame = to_int(row.get("start_frame"))
        end_frame = to_int(row.get("end_frame"))
        direction = str(row.get("direction") or "").strip().lower()
        base_distance = to_float(row.get("base_distance_m"))
        if None in (start_frame, end_frame, base_distance) or direction not in {"rtl", "ltr"}:
            continue
        out.append(DirectionSegment(start_frame=start_frame, end_frame=end_frame, direction=direction, base_distance_m=float(base_distance)))
    if not out:
        raise ValueError("No valid direction_segments found")
    return out


def build_bucket_metrics(
    lane_boxes: Dict[int, Tuple[float, float, float, float]],
    *,
    segment: DirectionSegment,
    bucket_size_frames: int,
    fps: float,
    video_w: int,
    px_to_m: float,
    race_length_m: float,
    smoothing_radius_frames: int,
) -> Dict[int, Dict[str, Optional[float]]]:
    out: Dict[int, Dict[str, Optional[float]]] = {}
    frame_ids = list(range(segment.start_frame, segment.end_frame + 1))
    progress_values: List[Optional[float]] = []
    for frame_id in frame_ids:
        box = lane_boxes.get(frame_id)
        if box is None:
            progress_values.append(None)
        else:
            progress_values.append(front_edge_progress_px(box, segment.direction, video_w))

    progress_values = smooth_series(interpolate_series(progress_values), smoothing_radius_frames)
    monotonic_progress: List[Optional[float]] = []
    current_max: Optional[float] = None
    for value in progress_values:
        if value is None:
            monotonic_progress.append(current_max)
            continue
        current_max = value if current_max is None else max(current_max, value)
        monotonic_progress.append(current_max)

    bucket_rows: List[Dict[str, Any]] = []
    step = max(1, int(bucket_size_frames))
    for bucket_start in range(segment.start_frame, segment.end_frame + 1, step):
        bucket_end = min(segment.end_frame, bucket_start + step - 1)
        idx_lo = bucket_start - segment.start_frame
        idx_hi = bucket_end - segment.start_frame + 1
        bucket_progress = [value for value in monotonic_progress[idx_lo:idx_hi] if value is not None]
        if not bucket_progress:
            continue
        progress = bucket_progress[-1]
        distance = max(segment.base_distance_m, min(race_length_m, segment.base_distance_m + progress * px_to_m))
        bucket_rows.append({
            "start": bucket_start,
            "end": bucket_end,
            "distance": distance,
            "speed_mps": None,
            "acceleration": None,
            "bucket_end_frame": bucket_end,
        })

    prev_row: Optional[Dict[str, Any]] = None
    for row in bucket_rows:
        if prev_row is None:
            prev_row = row
            continue
        dt = max(1.0 / fps, (row["end"] - prev_row["end"]) / fps)
        row["speed_mps"] = (row["distance"] - prev_row["distance"]) / dt
        prev_row = row

    smoothed_speeds = rolling_mean([row["speed_mps"] for row in bucket_rows], 1)
    prev_speed: Optional[float] = None
    prev_end: Optional[int] = None
    for row, speed_mps in zip(bucket_rows, smoothed_speeds):
        row["speed_mps"] = speed_mps
        if speed_mps is not None and prev_speed is not None and prev_end is not None:
            dt = max(1.0 / fps, (row["end"] - prev_end) / fps)
            row["acceleration"] = (speed_mps - prev_speed) / dt
        if speed_mps is not None:
            prev_speed = speed_mps
            prev_end = row["end"]

    for row in bucket_rows:
        for frame_id in range(row["start"], row["end"] + 1):
            out[frame_id] = {
                "distance": row["distance"],
                "speed_mps": row["speed_mps"],
                "acceleration": row["acceleration"],
                "metric_bucket_end_frame": row["bucket_end_frame"],
            }
    return out


def build_rank_maps(frame_rows: List[Dict[str, Any]]) -> Dict[int, Dict[int, int]]:
    out: Dict[int, Dict[int, int]] = {}
    for frame in frame_rows:
        ranked = []
        for athlete in frame.get("athletes", []):
            athlete_id = to_int(athlete.get("id"))
            distance = to_float(athlete.get("distance"))
            if athlete_id is None or distance is None:
                continue
            ranked.append((athlete_id, distance))
        ranked.sort(key=lambda row: (-row[1], row[0]))
        out[int(frame["frame"])] = {athlete_id: idx + 1 for idx, (athlete_id, _) in enumerate(ranked)}
    return out


def build_official_meta(
    *,
    snapshot_path: Optional[Path],
    athlete_records_path: Optional[Path],
    record_pack_path: Optional[Path],
    official_metadata_path: Optional[Path] = None,
) -> Tuple[Dict[int, Dict[str, Any]], Dict[str, Any]]:
    if official_metadata_path is not None and official_metadata_path.exists():
        bundle = load_json(official_metadata_path)
        athletes = bundle.get("athletes") if isinstance(bundle.get("athletes"), list) else []
        raw_records = bundle.get("records") if isinstance(bundle.get("records"), dict) else {}
        bundle_meta = bundle.get("meta") if isinstance(bundle.get("meta"), dict) else {}

        world = extract_record_time(raw_records, "WR", "world")
        olympic = extract_record_time(raw_records, "OR", "olympic")

        meta_by_lane: Dict[int, Dict[str, Any]] = {}
        for athlete in athletes:
            if not isinstance(athlete, dict):
                continue
            lane_id = to_int(athlete.get("lane"))
            rank = to_int(athlete.get("rank"))
            if lane_id is None:
                continue
            history = athlete.get("athlete_history") if isinstance(athlete.get("athlete_history"), dict) else {}
            country_code3 = str(athlete.get("country") or "").strip().upper()
            country_meta = COUNTRY_META_BY_CODE3.get(country_code3, {})
            splits = normalize_splits(athlete.get("splits"))
            entry = {
                "id": lane_id,
                "name": str(athlete.get("name") or f"Athlete {lane_id}"),
                "country": country_meta.get("country") or country_code3 or None,
                "country_code": country_meta.get("country_code"),
                "age": to_int(athlete.get("age_at_event")),
                "age_at_event": to_int(athlete.get("age_at_event")),
                "official_rank": rank,
                "reaction_time": round_num(to_float(athlete.get("reaction_time")), 6),
                "final_time": round_num(to_float(athlete.get("final_time")), 6),
                "splits": splits,
                "split_times": [split["split_time"] for split in splits or [] if split.get("split_time") is not None] or None,
                "major_awards": summarize_major_awards(history.get("major_awards")),
                "major_awards_detail": history.get("major_awards") if isinstance(history.get("major_awards"), dict) else None,
                "olympic_appearances": to_int((history.get("olympic_appearances") or {}).get("count")),
                "olympic_appearances_detail": history.get("olympic_appearances") if isinstance(history.get("olympic_appearances"), dict) else None,
                "world_record": world,
                "olympics_record": olympic,
                "personal_record": None,
                "world": world,
                "olympic": olympic,
                "personal": None,
            }
            meta_by_lane[lane_id] = {k: v for k, v in entry.items() if v is not None}

        if athlete_records_path is not None and athlete_records_path.exists():
            athlete_records = load_json(athlete_records_path)
            by_rank = athlete_records.get("by_id") if isinstance(athlete_records.get("by_id"), dict) else {}
            for lane_id, entry in meta_by_lane.items():
                rank = to_int(entry.get("official_rank"))
                rank_records = by_rank.get(str(rank)) if rank is not None and isinstance(by_rank.get(str(rank)), dict) else {}
                personal = round_num(to_float(rank_records.get("personal")), 6)
                if personal is not None:
                    entry["personal_record"] = personal
                    entry["personal"] = personal

        record_context: Dict[str, Any] = {
            "records": {"world": world, "olympic": olympic},
            "selected_record": "world" if world is not None else ("olympic" if olympic is not None else "world"),
            "semantics": str(bundle_meta.get("historical_semantics") or "as_of_event"),
            "target_event_date": bundle_meta.get("target_event_date"),
            "target_event_utc": bundle_meta.get("target_event_utc"),
            "source_bundle": public_path_ref(official_metadata_path),
        }
        if record_pack_path is not None and record_pack_path.exists():
            record_pack = load_json(record_pack_path)
            if isinstance(record_pack.get("records"), dict):
                records = record_pack.get("records")
                world_override = round_num(to_float(records.get("world")), 6)
                olympic_override = round_num(to_float(records.get("olympic")), 6)
                if world_override is not None:
                    record_context["records"]["world"] = world_override
                if olympic_override is not None:
                    record_context["records"]["olympic"] = olympic_override
            if record_pack.get("selected_record"):
                record_context["selected_record"] = str(record_pack.get("selected_record"))
            if record_pack.get("historical_semantics"):
                record_context["semantics"] = str(record_pack.get("historical_semantics"))
            if record_pack.get("target_event_date"):
                record_context["target_event_date"] = record_pack.get("target_event_date")
            if record_pack.get("target_event_utc"):
                record_context["target_event_utc"] = record_pack.get("target_event_utc")
            record_context["source_record_pack"] = public_path_ref(record_pack_path)
        return meta_by_lane, record_context

    if snapshot_path is None or not snapshot_path.exists():
        return {}, {}
    snapshot = load_json(snapshot_path)
    athlete_records = load_json(athlete_records_path) if athlete_records_path and athlete_records_path.exists() else {}
    record_pack = load_json(record_pack_path) if record_pack_path and record_pack_path.exists() else {}
    by_rank = athlete_records.get("by_id") if isinstance(athlete_records.get("by_id"), dict) else {}
    record_values = record_pack.get("records") if isinstance(record_pack.get("records"), dict) else {}

    meta_by_lane: Dict[int, Dict[str, Any]] = {}
    for athlete in snapshot.get("athletes", []) if isinstance(snapshot.get("athletes"), list) else []:
        if not isinstance(athlete, dict):
            continue
        lane_id = to_int(athlete.get("lane"))
        rank = to_int(athlete.get("rank"))
        if lane_id is None:
            continue
        history = athlete.get("athlete_history") if isinstance(athlete.get("athlete_history"), dict) else {}
        country_code3 = str(athlete.get("country") or "").strip().upper()
        country_meta = COUNTRY_META_BY_CODE3.get(country_code3, {})
        rank_records = by_rank.get(str(rank)) if rank is not None and isinstance(by_rank.get(str(rank)), dict) else {}
        personal = round_num(to_float(rank_records.get("personal")), 6)
        splits = normalize_splits(athlete.get("splits"))
        world = round_num(to_float(record_values.get("world")), 6)
        olympic = round_num(to_float(record_values.get("olympic")), 6)
        meta_by_lane[lane_id] = {
            "id": lane_id,
            "name": str(athlete.get("name") or f"Athlete {lane_id}"),
            "country": country_meta.get("country") or country_code3 or None,
            "country_code": country_meta.get("country_code"),
            "age": to_int(athlete.get("age_at_event")),
            "age_at_event": to_int(athlete.get("age_at_event")),
            "official_rank": rank,
            "reaction_time": round_num(to_float(athlete.get("reaction_time")), 6),
            "final_time": round_num(to_float(athlete.get("final_time")), 6),
            "splits": splits,
            "split_times": [split["split_time"] for split in splits or [] if split.get("split_time") is not None] or None,
            "major_awards": summarize_major_awards(history.get("major_awards")),
            "major_awards_detail": history.get("major_awards") if isinstance(history.get("major_awards"), dict) else None,
            "olympic_appearances": to_int((history.get("olympic_appearances") or {}).get("count")),
            "olympic_appearances_detail": history.get("olympic_appearances") if isinstance(history.get("olympic_appearances"), dict) else None,
            "world_record": world,
            "olympics_record": olympic,
            "personal_record": personal,
            "world": world,
            "olympic": olympic,
            "personal": personal,
        }
        meta_by_lane[lane_id] = {k: v for k, v in meta_by_lane[lane_id].items() if v is not None}
    return meta_by_lane, record_pack if isinstance(record_pack, dict) else {}


def enrich_live_fields(frame_rows: List[Dict[str, Any]], race_length_m: float) -> None:
    rank_maps = build_rank_maps(frame_rows)
    for frame in frame_rows:
        athletes = frame.get("athletes") or []
        by_id = {int(a["id"]): a for a in athletes if to_int(a.get("id")) is not None}
        rank_map = rank_maps.get(int(frame["frame"]), {})
        leader_distance = max((to_float(a.get("distance")) for a in athletes if to_float(a.get("distance")) is not None), default=None)
        for athlete in athletes:
            athlete_id = to_int(athlete.get("id"))
            if athlete_id is None:
                continue
            distance = to_float(athlete.get("distance"))
            speed = to_float(athlete.get("speed_mps"))
            elapsed = to_float(athlete.get("metric_bucket_elapsed_time_sec")) or to_float(frame.get("elapsed_time_sec")) or 0.0
            rank = rank_map.get(athlete_id)
            athlete["rank"] = rank
            athlete["remaining_distance"] = round_num(max(0.0, race_length_m - distance), 6) if distance is not None else None
            athlete["average_speed"] = round_num(distance / elapsed, 9) if distance is not None and elapsed > 1e-8 else None
            athlete["estimated_completion_time"] = (
                round_num(race_length_m / athlete["average_speed"], 6)
                if athlete.get("average_speed") not in (None, 0) else None
            )
            athlete["distance_differences_leader"] = (
                round_num(leader_distance - distance, 6)
                if leader_distance is not None and distance is not None else None
            )
            if rank is None or distance is None:
                athlete["target_swimmer_id"] = None
                athlete["position_differences_swimmer"] = None
                athlete["time_differences_swimmer"] = None
                athlete["speed_differences_swimmer"] = None
                continue
            ahead_id = next((other_id for other_id, other_rank in rank_map.items() if other_rank == rank - 1), None)
            athlete["target_swimmer_id"] = ahead_id if ahead_id is not None else 0
            if ahead_id is None:
                athlete["position_differences_swimmer"] = 0.0
                athlete["time_differences_swimmer"] = 0.0
                athlete["speed_differences_swimmer"] = 0.0
                continue
            ahead = by_id.get(ahead_id)
            ahead_distance = to_float((ahead or {}).get("distance"))
            ahead_speed = to_float((ahead or {}).get("speed_mps"))
            athlete["position_differences_swimmer"] = (
                round_num(distance - ahead_distance, 6)
                if ahead_distance is not None else None
            )
            athlete["speed_differences_swimmer"] = (
                round_num(speed - ahead_speed, 9)
                if speed is not None and ahead_speed is not None else None
            )
            delta_dist = (ahead_distance - distance) if ahead_distance is not None else None
            ref_speed = ahead_speed if ahead_speed is not None and ahead_speed > 1e-8 else speed
            athlete["time_differences_swimmer"] = (
                round_num(delta_dist / ref_speed, 6)
                if delta_dist is not None and ref_speed is not None and ref_speed > 1e-8 else None
            )


def enrich_record_fields(
    frame_rows: List[Dict[str, Any]],
    athlete_meta: List[Dict[str, Any]],
    *,
    record_context: Dict[str, Any],
    race_length_m: float,
) -> None:
    records = record_context.get("records") if isinstance(record_context.get("records"), dict) else {}
    world = round_num(to_float(records.get("world")), 6)
    olympic = round_num(to_float(records.get("olympic")), 6)
    meta_by_id = {int(meta["id"]): meta for meta in athlete_meta if to_int(meta.get("id")) is not None}

    for meta in athlete_meta:
        if world is not None:
            meta["world_record"] = world
            meta["world"] = world
        if olympic is not None:
            meta["olympics_record"] = olympic
            meta["olympic"] = olympic

    selected_key = str(record_context.get("selected_record") or "world").strip().lower()
    if selected_key not in {"world", "olympic", "personal"}:
        selected_key = "world"

    for frame in frame_rows:
        elapsed = to_float(frame.get("elapsed_time_sec")) or 0.0
        for athlete in frame.get("athletes", []):
            athlete_id = int(athlete["id"])
            meta = meta_by_id.get(athlete_id, {})
            personal = round_num(to_float(meta.get("personal_record")), 6)
            athlete["world_record"] = world
            athlete["olympics_record"] = olympic
            athlete["personal_record"] = personal
            athlete["world"] = world
            athlete["olympic"] = olympic
            athlete["personal"] = personal
            record_times = {"world": world, "olympic": olympic, "personal": personal}
            for key, value in record_times.items():
                speed_key = f"speed_{key}"
                pos_key = f"x_{key}"
                record_speed = round_num(race_length_m / value, 9) if value not in (None, 0) else None
                athlete[speed_key] = record_speed
                athlete[pos_key] = round_num(min(race_length_m, record_speed * elapsed), 6) if record_speed is not None else None
            selected_time = record_times.get(selected_key)
            selected_speed = athlete.get(f"speed_{selected_key}")
            selected_x = athlete.get(f"x_{selected_key}")
            distance = to_float(athlete.get("distance"))
            speed = to_float(athlete.get("speed_mps"))
            athlete["record_reference"] = selected_key
            athlete["speed_differences_record"] = (
                round_num(speed - selected_speed, 9)
                if speed is not None and selected_speed is not None else None
            )
            athlete["position_differences_record"] = (
                round_num(selected_x - distance, 6)
                if selected_x is not None and distance is not None else None
            )
            athlete["time_differences_record"] = (
                round_num(elapsed - (distance / selected_speed), 6)
                if distance is not None and selected_speed not in (None, 0) else None
            )
            est_completion = to_float(athlete.get("estimated_completion_time"))
            athlete["record_break"] = (
                1 if est_completion is not None and selected_time is not None and est_completion < selected_time else 0
            ) if selected_time is not None else None


def build_metric_validity(config: Dict[str, Any]) -> Dict[str, Any]:
    windows = config.get("metric_validity_windows")
    rows = []
    for row in windows if isinstance(windows, list) else []:
        if not isinstance(row, dict):
            continue
        start = to_float(row.get("start"))
        end = to_float(row.get("end"))
        if start is None or end is None or end <= start:
            continue
        rows.append({
            "start": round_num(start, 6),
            "end": round_num(end, 6),
            "reason": str(row.get("reason") or "masked"),
        })
    notes = [
        "Generated by the video pipeline.",
        "These windows mark intervals where live-data metrics should be hidden in the visualization."
    ]
    return {"globalInvalidWindows": rows, "notes": notes}


def build_overlay(
    *,
    detections_path: Path,
    config_path: Path,
    output_overlay_path: Path,
    output_validity_path: Optional[Path],
    official_metadata_path: Optional[Path] = None,
    snapshot_path: Optional[Path],
    athlete_records_path: Optional[Path],
    record_pack_path: Optional[Path],
) -> Dict[str, Any]:
    source = load_json(detections_path)
    config = load_json(config_path)
    video = source.get("video") if isinstance(source.get("video"), dict) else {}
    total_frames = int(config.get("total_frames") or max((to_int(frame.get("frame")) or 0) for frame in source.get("frames", [])) + 1)
    fps = float(video.get("fps") or config.get("fps") or 50.0)
    video_w = int(video.get("width") or config.get("video_width") or 1920)
    video_h = int(video.get("height") or config.get("video_height") or 1080)
    start_frame = int(config.get("detection_start_frame") or 0)
    bucket_size_frames = int(config.get("bucket_size_frames") or 30)
    smoothing_radius_frames = int(config.get("smoothing_radius_frames") or 2)
    px_to_m = float(config.get("pixels_to_meters") or 0.0258)
    race_length_m = float(config.get("race_length_m") or 50.0)
    elapsed_offset_sec = float(config.get("elapsed_offset_sec") or 0.0)
    direction_segments = parse_direction_segments(config)

    raw_lane_boxes = build_raw_lane_boxes(source)
    clean_lane_box_map: Dict[int, Dict[int, Tuple[float, float, float, float]]] = {}
    for lane_id in sorted(raw_lane_boxes.keys()):
        clean_lane_box_map[lane_id] = clean_lane_boxes(
            raw_lane_boxes[lane_id],
            total_frames=total_frames,
            start_frame=start_frame,
            smooth_radius=smoothing_radius_frames,
        )

    lane_metric_map: Dict[int, Dict[int, Dict[str, Optional[float]]]] = {}
    for lane_id, lane_boxes in clean_lane_box_map.items():
        merged: Dict[int, Dict[str, Optional[float]]] = {}
        for segment in direction_segments:
            merged.update(
                build_bucket_metrics(
                    lane_boxes,
                    segment=segment,
                    bucket_size_frames=bucket_size_frames,
                    fps=fps,
                    video_w=video_w,
                    px_to_m=px_to_m,
                    race_length_m=race_length_m,
                    smoothing_radius_frames=smoothing_radius_frames,
                )
            )
        lane_metric_map[lane_id] = merged

    official_meta_by_lane, record_context = build_official_meta(
        official_metadata_path=official_metadata_path,
        snapshot_path=snapshot_path,
        athlete_records_path=athlete_records_path,
        record_pack_path=record_pack_path,
    )
    if record_context and "selected_record" not in record_context:
        record_context["selected_record"] = "world"

    athlete_meta: List[Dict[str, Any]] = []
    lane_ids = sorted({*clean_lane_box_map.keys(), *official_meta_by_lane.keys()}, reverse=True)
    for lane_id in lane_ids:
        row = {"id": lane_id, "name": f"Athlete {lane_id}"}
        row.update(official_meta_by_lane.get(lane_id, {}))
        athlete_meta.append(row)

    segment_by_frame: Dict[int, DirectionSegment] = {}
    for segment in direction_segments:
        for frame_id in range(segment.start_frame, segment.end_frame + 1):
            segment_by_frame[frame_id] = segment

    frame_rows: List[Dict[str, Any]] = []
    for frame_id in range(total_frames):
        time_sec = round_num(frame_id / fps, 6)
        frame_row: Dict[str, Any] = {
            "frame": frame_id,
            "time_sec": time_sec,
            "elapsed_time_sec": round_num(max(0.0, time_sec - elapsed_offset_sec), 6),
            "athletes": [],
        }
        segment = segment_by_frame.get(frame_id)
        if segment is not None:
            frame_row["direction"] = segment.direction
        for lane_id in lane_ids:
            box = clean_lane_box_map.get(lane_id, {}).get(frame_id)
            if box is None:
                continue
            x1, y1, x2, y2 = box
            athlete = {
                "id": lane_id,
                "x": round_num(x1, 6),
                "y": round_num(y1, 6),
                "w": round_num(x2 - x1, 6),
                "h": round_num(y2 - y1, 6),
                "cx": round_num((x1 + x2) / 2.0, 6),
                "cy": round_num((y1 + y2) / 2.0, 6),
                "area": round_num((x2 - x1) * (y2 - y1), 6),
            }
            metrics = lane_metric_map.get(lane_id, {}).get(frame_id)
            if metrics and segment is not None:
                athlete["distance"] = round_num(metrics["distance"], 6)
                athlete["speed_mps"] = round_num(metrics["speed_mps"], 9)
                athlete["acceleration"] = round_num(metrics["acceleration"], 9)
                athlete["metric_bucket_end_frame"] = int(metrics["metric_bucket_end_frame"]) if metrics.get("metric_bucket_end_frame") is not None else None
                athlete["metric_bucket_elapsed_time_sec"] = round_num(
                    max(0.0, ((metrics["metric_bucket_end_frame"] or frame_id) / fps) - elapsed_offset_sec),
                    6,
                )
            else:
                athlete["distance"] = None
                athlete["speed_mps"] = None
                athlete["acceleration"] = None
                athlete["metric_bucket_end_frame"] = None
                athlete["metric_bucket_elapsed_time_sec"] = None
            frame_row["athletes"].append(athlete)
        frame_rows.append(frame_row)

    enrich_live_fields(frame_rows, race_length_m)
    if record_context:
        enrich_record_fields(frame_rows, athlete_meta, record_context=record_context, race_length_m=race_length_m)

    overlay = {
        "video": {
            "fps": fps,
            "width": video_w,
            "height": video_h,
            "distance_px_to_m": px_to_m,
            "race_length": race_length_m,
        },
        "athletes": athlete_meta,
        "frames": frame_rows,
        "race_length": race_length_m,
        "official_record_context": record_context,
    }
    write_json(output_overlay_path, overlay)
    if output_validity_path is not None:
        write_json(output_validity_path, build_metric_validity(config))
    return overlay


def cmd_lane_partition(args: argparse.Namespace) -> None:
    manifest = split_video_into_lanes(
        video_path=Path(args.video).resolve(),
        lane_regions_path=Path(args.lane_regions).resolve(),
        output_dir=Path(args.output_dir).resolve(),
        codec=str(args.codec),
        ext=str(args.ext),
        start_frame=int(args.start_frame),
        max_frames=int(args.max_frames),
    )
    print(json.dumps({
        "ok": True,
        "manifest": public_path_ref(Path(args.output_dir) / "lane_manifest.json"),
        "lane_count": len(manifest["lanes"]),
    }, ensure_ascii=False, indent=2))


def cmd_sam3_track(args: argparse.Namespace) -> None:
    output = run_text_prompt_sam3(
        manifest_path=Path(args.manifest).resolve(),
        output_path=Path(args.output).resolve(),
        weights=Path(args.weights).resolve(),
        text_prompts=parse_text_prompts(args.text),
        imgsz=int(args.imgsz),
        conf=float(args.conf),
        top_k=int(args.top_k),
    )
    print(json.dumps({
        "ok": True,
        "output": public_path_ref(Path(args.output)),
        "frames": len(output["frames"]),
        "tracks": len(output["tracks"]),
    }, ensure_ascii=False, indent=2))


def cmd_build_overlay(args: argparse.Namespace) -> None:
    overlay = build_overlay(
        detections_path=Path(args.detections).resolve(),
        config_path=Path(args.config).resolve(),
        output_overlay_path=Path(args.output_overlay).resolve(),
        output_validity_path=Path(args.output_validity).resolve() if args.output_validity else None,
        official_metadata_path=Path(args.official_metadata).resolve() if args.official_metadata else None,
        snapshot_path=Path(args.snapshot).resolve() if args.snapshot else None,
        athlete_records_path=Path(args.athlete_records).resolve() if args.athlete_records else None,
        record_pack_path=Path(args.record_pack).resolve() if args.record_pack else None,
    )
    print(json.dumps({
        "ok": True,
        "overlay": public_path_ref(Path(args.output_overlay)),
        "frames": len(overlay["frames"]),
        "athletes": len(overlay["athletes"]),
    }, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Video pipeline.")
    sub = parser.add_subparsers(dest="command", required=True)

    lane_partition = sub.add_parser("lane-partition", help="Split a source video into per-lane videos.")
    lane_partition.add_argument("--video", required=True)
    lane_partition.add_argument("--lane-regions", required=True)
    lane_partition.add_argument("--output-dir", required=True)
    lane_partition.add_argument("--codec", default="MJPG")
    lane_partition.add_argument("--ext", default="avi")
    lane_partition.add_argument("--start-frame", type=int, default=0)
    lane_partition.add_argument("--max-frames", type=int, default=0)
    lane_partition.set_defaults(func=cmd_lane_partition)

    sam3_track = sub.add_parser("sam3-track", help="Run pure text-prompt SAM3 on lane videos.")
    sam3_track.add_argument("--manifest", required=True)
    sam3_track.add_argument("--weights", required=True)
    sam3_track.add_argument("--output", required=True)
    sam3_track.add_argument("--text", action="append", default=["person"])
    sam3_track.add_argument("--imgsz", type=int, default=1036)
    sam3_track.add_argument("--conf", type=float, default=0.25)
    sam3_track.add_argument("--top-k", type=int, default=1)
    sam3_track.set_defaults(func=cmd_sam3_track)

    build_overlay_parser = sub.add_parser("build-overlay", help="Clean trajectories and build overlay.json.")
    build_overlay_parser.add_argument("--detections", required=True)
    build_overlay_parser.add_argument("--config", required=True)
    build_overlay_parser.add_argument("--official-metadata", default="")
    build_overlay_parser.add_argument("--snapshot", default="")
    build_overlay_parser.add_argument("--athlete-records", default="")
    build_overlay_parser.add_argument("--record-pack", default="")
    build_overlay_parser.add_argument("--output-overlay", required=True)
    build_overlay_parser.add_argument("--output-validity", default="")
    build_overlay_parser.set_defaults(func=cmd_build_overlay)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
