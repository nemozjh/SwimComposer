
function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function normalizeMovingAverageWindowSec(value, fallback = 0.5) {
  const numeric = Number(value);
  if (!isFiniteNumber(numeric)) return Math.max(0, Number(fallback) || 0);
  return Math.max(0, numeric);
}

function getWindowedMovingAverage(sampleMap, key, rawValue, frameTimeSec, windowSec) {
  if (!(sampleMap instanceof Map) || !isFiniteNumber(key)) return rawValue;
  const timeSec = isFiniteNumber(frameTimeSec) ? Number(frameTimeSec) : null;
  if (!isFiniteNumber(timeSec) || !(windowSec > 0)) return rawValue;
  const prev = sampleMap.get(key);
  const resetGapSec = Math.max(1.25, windowSec * 2);
  const shouldReset = (
    !prev
    || !isFiniteNumber(prev.t)
    || !Array.isArray(prev.samples)
    || timeSec < prev.t
    || (timeSec - prev.t) > resetGapSec
  );
  const minTime = timeSec - windowSec - 1e-6;
  const samples = shouldReset
    ? []
    : prev.samples.filter((sample) => (
      isFiniteNumber(sample?.t)
      && isFiniteNumber(sample?.v)
      && sample.t >= minTime
    ));
  const lastSample = samples[samples.length - 1];
  if (lastSample && Math.abs(lastSample.t - timeSec) < 1e-6) {
    lastSample.v = rawValue;
  } else {
    samples.push({ t: timeSec, v: rawValue });
  }
  const average = samples.reduce((sum, sample) => sum + sample.v, 0) / Math.max(1, samples.length);
  sampleMap.set(key, { t: timeSec, samples });
  return average;
}

function getFallbackAverageSpeed(dist, frameTimeSec, speedFallback) {
  if (isFiniteNumber(dist) && isFiniteNumber(frameTimeSec) && frameTimeSec >= 1) {
    const avg = dist / frameTimeSec;
    if (isFiniteNumber(avg) && avg > 0) return avg;
  }
  return isFiniteNumber(speedFallback) ? speedFallback : null;
}

export function createMetricRuntimeState() {
  return {
    maxSpeedSeen: 1,
    maxAccelSeen: 1,
    maxDistanceSeen: 1,
    maxDistDiffSeen: 1,
    maxSpeedDiffSwimmerSeen: 1,
    maxPositionDiffSwimmerSeen: 1,
    maxEstTimeSeen: 1,
    maxRemainingDistanceSeen: 1,
    prevDistanceById: new Map(),
    prevSpeedDerivedById: new Map(),
    prevSpeedDataById: new Map(),
    displaySpeedById: new Map(),
    displaySpeedTimeById: new Map(),
    displaySpeedSamplesById: new Map(),
    displaySpeedMovingAverageSec: 0.5
  };
}

export function getFrameTimeSec(frame, fps = 50, fallbackTimeSec = 0) {
  if (frame && isFiniteNumber(frame.elapsed_time_sec)) return frame.elapsed_time_sec;
  if (frame && isFiniteNumber(frame.time_sec)) return frame.time_sec;
  if (frame && isFiniteNumber(frame.frame)) {
    const safeFps = isFiniteNumber(fps) && fps > 0 ? fps : 50;
    return frame.frame / safeFps;
  }
  return isFiniteNumber(fallbackTimeSec) ? fallbackTimeSec : 0;
}

export function getCurrentSpeedValue(athlete) {
  if (!athlete || typeof athlete !== 'object') return null;
  if (isFiniteNumber(athlete.speed_smooth)) return athlete.speed_smooth;
  if (isFiniteNumber(athlete.speed_mps)) return athlete.speed_mps;
  if (isFiniteNumber(athlete.speed)) return athlete.speed;
  if (isFiniteNumber(athlete.speed_px_per_s)) return athlete.speed_px_per_s;
  return null;
}

function getDisplaySpeedValue(athlete, runtimeState, frameTimeSec) {
  const rawSpeed = getCurrentSpeedValue(athlete);
  if (!isFiniteNumber(rawSpeed)) return null;
  const laneId = isFiniteNumber(athlete?.id) ? Number(athlete.id) : null;
  if (!isFiniteNumber(laneId) || !runtimeState) return rawSpeed;
  const movingAverageSec = normalizeMovingAverageWindowSec(runtimeState.displaySpeedMovingAverageSec, 0.5);
  const timeSec = isFiniteNumber(frameTimeSec) ? Number(frameTimeSec) : null;
  const nextSpeed = movingAverageSec > 0
    ? getWindowedMovingAverage(
        runtimeState.displaySpeedSamplesById,
        laneId,
        rawSpeed,
        timeSec,
        movingAverageSec
      )
    : rawSpeed;
  runtimeState.displaySpeedById.set(laneId, nextSpeed);
  if (isFiniteNumber(timeSec)) runtimeState.displaySpeedTimeById.set(laneId, timeSec);
  return nextSpeed;
}

export function getAthleteProgressValue(athlete) {
  if (!athlete || typeof athlete !== 'object') return null;
  if (isFiniteNumber(athlete.distance)) return athlete.distance;
  if (isFiniteNumber(athlete.x)) return athlete.x;
  return null;
}

export function buildAheadSwimmerById(athletes) {
  const arr = Array.isArray(athletes) ? athletes : [];
  const byRank = new Map();
  const withProgress = [];

  arr.forEach((a) => {
    if (!isFiniteNumber(a?.id)) return;
    const rank = isFiniteNumber(a?.rank) ? Math.round(a.rank) : null;
    if (rank != null && rank > 0 && !byRank.has(rank)) {
      byRank.set(rank, a);
    }
    const progress = getAthleteProgressValue(a);
    if (isFiniteNumber(progress)) {
      withProgress.push({ athlete: a, progress });
    }
  });

  const sortedByProgressDesc = withProgress.sort((p, q) => q.progress - p.progress);
  const aheadById = new Map();

  arr.forEach((a) => {
    if (!isFiniteNumber(a?.id)) return;
    const id = Number(a.id);
    const rank = isFiniteNumber(a?.rank) ? Math.round(a.rank) : null;
    let ahead = null;

    if (rank != null && rank > 1) {
      const byRankAhead = byRank.get(rank - 1);
      if (byRankAhead && Number(byRankAhead.id) !== id) {
        ahead = byRankAhead;
      }
    }

    if (!ahead) {
      const progress = getAthleteProgressValue(a);
      if (isFiniteNumber(progress)) {
        let minDelta = Infinity;
        sortedByProgressDesc.forEach(({ athlete: cand, progress: candProgress }) => {
          const candId = Number(cand?.id);
          if (!isFiniteNumber(candId) || candId === id) return;
          const delta = candProgress - progress;
          if (delta > 1e-6 && delta < minDelta) {
            minDelta = delta;
            ahead = cand;
          }
        });
      }
    }

    aheadById.set(id, ahead || null);
  });

  return aheadById;
}

export function buildDerivedMetricsForFrame({
  athletes,
  frameTimeSec,
  fps,
  raceLength,
  runtimeState
}) {
  const arr = Array.isArray(athletes) ? athletes : [];
  const state = runtimeState || createMetricRuntimeState();
  const dt = isFiniteNumber(fps) && fps > 0 ? 1 / fps : 1 / 50;
  const raceLen = isFiniteNumber(raceLength) && raceLength > 0 ? raceLength : 50;
  const derivedById = new Map();

  let leaderDistance = null;
  arr.forEach((a) => {
    const dist = isFiniteNumber(a?.distance) ? a.distance : null;
    if (dist == null) return;
    leaderDistance = leaderDistance == null ? dist : Math.max(leaderDistance, dist);
  });
  const aheadById = buildAheadSwimmerById(arr);

  let slowestEstTime = null;
  arr.forEach((a) => {
    const rawSpeedVal = getCurrentSpeedValue(a);
    const speedVal = getDisplaySpeedValue(a, state, frameTimeSec);
    const dist = isFiniteNumber(a?.distance) ? a.distance : null;
    const providedAcc = isFiniteNumber(a?.acceleration) ? a.acceleration : null;
    const avgSpeed = isFiniteNumber(a?.average_speed)
      ? a.average_speed
      : getFallbackAverageSpeed(dist, frameTimeSec, speedVal);
    const estTime = isFiniteNumber(a?.estimated_completion_time)
      ? a.estimated_completion_time
      : (avgSpeed != null && avgSpeed > 0 ? raceLen / avgSpeed : null);

    if (isFiniteNumber(estTime)) {
      state.maxEstTimeSeen = Math.max(state.maxEstTimeSeen, estTime);
      slowestEstTime = slowestEstTime == null ? estTime : Math.max(slowestEstTime, estTime);
    }
    if (speedVal != null) {
      if (providedAcc != null) {
        derivedById.set(a.id, {
          speedD: speedVal,
          displaySpeed: speedVal,
          rawSpeed: rawSpeedVal,
          acc: providedAcc
        });
        state.prevSpeedDataById.set(a.id, speedVal);
        state.maxAccelSeen = Math.max(state.maxAccelSeen, Math.abs(providedAcc));
        state.maxSpeedSeen = Math.max(state.maxSpeedSeen, speedVal);
        if (dist != null) {
          state.maxDistanceSeen = Math.max(state.maxDistanceSeen, dist);
        }
        return;
      }
      const prevSpeed = state.prevSpeedDataById.get(a.id);
      if (isFiniteNumber(prevSpeed)) {
        const acc = (speedVal - prevSpeed) / dt;
        derivedById.set(a.id, {
          speedD: speedVal,
          displaySpeed: speedVal,
          rawSpeed: rawSpeedVal,
          acc
        });
        if (isFiniteNumber(acc)) {
          state.maxAccelSeen = Math.max(state.maxAccelSeen, Math.abs(acc));
        }
      } else {
        derivedById.set(a.id, {
          speedD: speedVal,
          displaySpeed: speedVal,
          rawSpeed: rawSpeedVal,
          acc: null
        });
      }
      state.prevSpeedDataById.set(a.id, speedVal);
      if (isFiniteNumber(speedVal)) {
        state.maxSpeedSeen = Math.max(state.maxSpeedSeen, speedVal);
      }
    } else if (dist != null) {
      const prevDist = state.prevDistanceById.get(a.id);
      if (isFiniteNumber(prevDist)) {
        const speedD = (dist - prevDist) / dt;
        const prevDerivedSpeed = state.prevSpeedDerivedById.get(a.id);
        if (isFiniteNumber(prevDerivedSpeed)) {
          const acc = (speedD - prevDerivedSpeed) / dt;
          derivedById.set(a.id, { speedD, acc });
          if (isFiniteNumber(acc)) {
            state.maxAccelSeen = Math.max(state.maxAccelSeen, Math.abs(acc));
          }
        } else {
          derivedById.set(a.id, { speedD, acc: null });
        }
        state.prevSpeedDerivedById.set(a.id, speedD);
        if (isFiniteNumber(speedD)) {
          state.maxSpeedSeen = Math.max(state.maxSpeedSeen, speedD);
        }
      }
      state.prevDistanceById.set(a.id, dist);
    }

    if (dist != null) {
      state.maxDistanceSeen = Math.max(state.maxDistanceSeen, dist);
    }
  });
  arr.forEach((a) => {
    const laneId = isFiniteNumber(a?.id) ? Number(a.id) : null;
    if (laneId == null) return;
    const dist = isFiniteNumber(a?.distance) ? a.distance : null;
    const base = derivedById.get(a.id) || {};
    const avgSpeed = isFiniteNumber(a?.average_speed)
      ? a.average_speed
      : (
        getFallbackAverageSpeed(dist, frameTimeSec, base.speedD)
      );
    const estTime = isFiniteNumber(a?.estimated_completion_time)
      ? a.estimated_completion_time
      : (avgSpeed != null && avgSpeed > 0 ? raceLen / avgSpeed : null);
    const distDiff = isFiniteNumber(a?.distance_differences_leader)
      ? a.distance_differences_leader
      : (leaderDistance != null && dist != null ? leaderDistance - dist : null);
    const remainingDistance = isFiniteNumber(a?.remaining_distance)
      ? a.remaining_distance
      : (dist != null ? Math.max(0, raceLen - dist) : null);
    const ahead = aheadById.get(laneId);
    const aheadBase = ahead ? (derivedById.get(ahead.id) || {}) : {};
    const aheadId = isFiniteNumber(ahead?.id) ? Number(ahead.id) : null;
    const rank = isFiniteNumber(a?.rank) ? Math.round(a.rank) : null;
    const isLeaderRank = rank != null && rank <= 1;
    const hasAhead = !isLeaderRank && aheadId != null && aheadId !== laneId;
    const speedCurr = isFiniteNumber(base?.displaySpeed) ? base.displaySpeed : getCurrentSpeedValue(a);
    const speedAhead = isFiniteNumber(aheadBase?.displaySpeed) ? aheadBase.displaySpeed : getCurrentSpeedValue(ahead);
    const speedDiffSwimmer = isFiniteNumber(a?.speed_differences_swimmer)
      ? a.speed_differences_swimmer
      : (
        !hasAhead
          ? 0
          : (isFiniteNumber(speedCurr) && isFiniteNumber(speedAhead)
          ? (speedCurr - speedAhead)
          : null)
      );
    const posCurr = getAthleteProgressValue(a);
    const posAhead = getAthleteProgressValue(ahead);
    const positionDiffSwimmer = isFiniteNumber(a?.position_differences_swimmer)
      ? a.position_differences_swimmer
      : (
        !hasAhead
          ? 0
          : (isFiniteNumber(posCurr) && isFiniteNumber(posAhead)
          ? (posCurr - posAhead)
          : null)
      );
    const targetSwimmerId = isFiniteNumber(a?.target_swimmer_id)
      ? (Number(a.target_swimmer_id) > 0 ? Number(a.target_swimmer_id) : 0)
      : (hasAhead ? aheadId : 0);

    if (isFiniteNumber(distDiff)) {
      state.maxDistDiffSeen = Math.max(state.maxDistDiffSeen, distDiff);
    }
    if (isFiniteNumber(speedDiffSwimmer)) {
      state.maxSpeedDiffSwimmerSeen = Math.max(state.maxSpeedDiffSwimmerSeen, Math.abs(speedDiffSwimmer));
    }
    if (isFiniteNumber(positionDiffSwimmer)) {
      state.maxPositionDiffSwimmerSeen = Math.max(state.maxPositionDiffSwimmerSeen, Math.abs(positionDiffSwimmer));
    }
    if (isFiniteNumber(remainingDistance)) {
      state.maxRemainingDistanceSeen = Math.max(state.maxRemainingDistanceSeen, remainingDistance);
    }
    derivedById.set(a.id, {
      ...base,
      avgSpeed,
      estTime,
      distDiff,
      remainingDistance,
      speedDiffSwimmer,
      positionDiffSwimmer,
      targetSwimmerId,
      slowestEstTime
    });
  });

  return { derivedById, slowestEstTime };
}
