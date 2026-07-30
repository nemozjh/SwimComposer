

export async function loadInsight(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load insight data: ${res.status}`);
  }
  const data = await res.json();

  const segments = Array.isArray(data.segments) ? data.segments.slice() : [];
  segments.sort((a, b) => {
    const sa = a.start_sec ?? 0;
    const sb = b.start_sec ?? 0;
    return sa - sb;
  });

  return {
    raw: data,
    segments
  };
}


export function findSegmentAtTime(segments, t) {
  if (!segments || !segments.length) return null;
  const time = t || 0;
  for (const seg of segments) {
    const s = seg.start_sec ?? 0;
    const e = seg.end_sec ?? (s + 1e-3);
    if (time >= s && time < e) return seg;
  }
  return null;
}


export function getLeaderIdAtTime(segments, t) {
  const seg = findSegmentAtTime(segments, t);
  if (!seg) return null;
  return seg.leader_id ?? null;
}


export function getChaseIdAtTime(segments, t) {
  const seg = findSegmentAtTime(segments, t);
  if (!seg) return null;
  return seg.chase_id ?? null;
}
