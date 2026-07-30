

export async function loadOverlay(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load overlay data: ${res.status}`);
  }
  const data = await res.json();

  const frames = Array.isArray(data.frames) ? data.frames : [];
  const athletes = Array.isArray(data.athletes) ? data.athletes : [];
  const fps =
    (data.video && typeof data.video.fps === 'number' && data.video.fps > 0)
      ? data.video.fps
      : (data.fps || 50);
  const hasTimeSec = frames.length > 0 && typeof frames[0].time_sec === 'number';
  const minTimeSec = hasTimeSec ? frames[0].time_sec || 0 : 0;
  const maxTimeSec = hasTimeSec ? (frames[frames.length - 1]?.time_sec ?? minTimeSec) : null;

  function clampFrameIndex(idx) {
    if (!frames.length) return 0;
    if (idx < 0) return 0;
    if (idx >= frames.length) return frames.length - 1;
    return idx;
  }

  function getFrameByIndex(idx) {
    if (!frames.length) return null;
    return frames[clampFrameIndex(idx)] || null;
  }

  function getFrameByTime(timeSec) {
    if (!frames.length) return null;
    const t = Math.max(0, timeSec || 0);

    if (hasTimeSec) {
      if (t < minTimeSec) return null;
      if (maxTimeSec != null && t > maxTimeSec) return null;
      let lo = 0;
      let hi = frames.length - 1;
      let best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const f = frames[mid];
        const ft = typeof f.time_sec === 'number' ? f.time_sec : 0;
        if (ft <= t) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      if (best >= 0) return frames[best];
      return null;
    }

    const approxIndex = Math.round(t * fps);
    return getFrameByIndex(approxIndex);
  }

  return {
    raw: data,
    frames,
    athletes,
    fps,
    hasTimeSec,
    minTimeSec,
    maxTimeSec,
    getFrameByIndex,
    getFrameByTime
  };
}

export default loadOverlay;
