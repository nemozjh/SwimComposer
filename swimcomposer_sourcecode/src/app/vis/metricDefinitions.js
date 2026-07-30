import { getCurrentSpeedValue } from './metricRuntime.js';

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function resolveInsightAthleteText(segment, athleteId) {
  if (!segment || athleteId == null) return null;
  const athleteTexts = segment?.athlete_texts;
  if (!athleteTexts || typeof athleteTexts !== 'object') return null;
  const raw = athleteTexts[String(athleteId)] ?? athleteTexts[athleteId];
  if (raw == null) return null;
  if (typeof raw === 'string') {
    return { text: raw };
  }
  if (typeof raw === 'object') {
    return {
      text: typeof raw.text === 'string' ? raw.text : '',
      tone: typeof raw.tone === 'string' ? raw.tone : '',
      kind: typeof raw.kind === 'string' ? raw.kind : '',
      emphasis: typeof raw.emphasis === 'string' ? raw.emphasis : ''
    };
  }
  return null;
}

function insightColorForPayload(payload, fallbackColor) {
  const tone = String(payload?.tone || payload?.kind || '').toLowerCase();
  switch (tone) {
    case 'gold':
    case 'result_gold':
      return 0xfcd34d;
    case 'silver':
    case 'result_silver':
      return 0xd1d5db;
    case 'bronze':
    case 'result_bronze':
      return 0xcd7f32;
    case 'lead_change':
      return 0xfb923c;
    case 'lead_status':
      return 0xfacc15;
    case 'chase':
      return 0x93c5fd;
    case 'record_watch':
      return 0xc084fc;
    case 'tech_review':
      return 0x67e8f9;
    case 'result':
      return 0x34d399;
    default:
      return fallbackColor;
  }
}

function buildAwardBucket(code, label, gold = 0, silver = 0, bronze = 0) {
  const g = Number.isFinite(Number(gold)) ? Number(gold) : 0;
  const s = Number.isFinite(Number(silver)) ? Number(silver) : 0;
  const b = Number.isFinite(Number(bronze)) ? Number(bronze) : 0;
  return {
    code,
    label,
    gold: g,
    silver: s,
    bronze: b,
    total: g + s + b,
    summary: `${code} ${g}G-${s}S-${b}B`
  };
}

function buildEmptyMajorAwardsValue() {
  return {
    olympic_games: buildAwardBucket('OG', 'Olympic Games', 0, 0, 0),
    world_championships: buildAwardBucket('WCH', 'World Championships', 0, 0, 0)
  };
}

function normalizeAwardBucket(raw, fallbackCode, fallbackLabel) {
  if (!raw || typeof raw !== 'object') {
    return buildAwardBucket(fallbackCode, fallbackLabel, 0, 0, 0);
  }
  return buildAwardBucket(
    String(raw.code || fallbackCode),
    String(raw.label || fallbackLabel),
    raw.gold,
    raw.silver,
    raw.bronze
  );
}

function parseMajorAwardsSummary(raw) {
  const text = String(raw || '');
  if (!text.trim()) return null;
  const ogMatch = text.match(/OG\s+(\d+)G-(\d+)S-(\d+)B/i);
  const wchMatch = text.match(/WCH\s+(\d+)G-(\d+)S-(\d+)B/i);
  if (!ogMatch && !wchMatch) return null;
  return {
    olympic_games: buildAwardBucket(
      'OG',
      'Olympic Games',
      ogMatch?.[1] ?? 0,
      ogMatch?.[2] ?? 0,
      ogMatch?.[3] ?? 0
    ),
    world_championships: buildAwardBucket(
      'WCH',
      'World Championships',
      wchMatch?.[1] ?? 0,
      wchMatch?.[2] ?? 0,
      wchMatch?.[3] ?? 0
    )
  };
}

function resolveMajorAwardsValue(value, meta) {
  const detail = value && typeof value === 'object' && !Array.isArray(value) && (value.olympic_games || value.world_championships)
    ? value
    : (meta?.major_awards_detail || meta?.athlete_history?.major_awards || null);
  if (detail) {
    return {
      olympic_games: normalizeAwardBucket(detail.olympic_games, 'OG', 'Olympic Games'),
      world_championships: normalizeAwardBucket(detail.world_championships, 'WCH', 'World Championships')
    };
  }
  const parsed = parseMajorAwardsSummary(
    typeof value === 'string'
      ? value
      : (typeof meta?.major_awards === 'string' ? meta.major_awards : '')
  );
  return parsed || null;
}

function formatMajorAwardsSummary(awards) {
  if (!awards) return '';
  const og = awards.olympic_games?.summary || buildAwardBucket('OG', 'Olympic Games').summary;
  const wch = awards.world_championships?.summary || buildAwardBucket('WCH', 'World Championships').summary;
  return `${og}; ${wch}`;
}

function resolveOlympicAppearancesValue(value, meta) {
  const detail = value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, 'count')
    ? value
    : (meta?.olympic_appearances_detail || meta?.athlete_history?.olympic_appearances || null);
  if (detail && Number.isFinite(Number(detail.count))) {
    const count = Number(detail.count);
    return {
      count,
      first_games: detail.first_games || null,
      summary: detail.summary || `${count} Olympic appearances`
    };
  }
  if (Number.isFinite(Number(value))) {
    const count = Number(value);
    return {
      count,
      first_games: null,
      summary: `${count} Olympic appearances`
    };
  }
  if (Number.isFinite(Number(meta?.olympic_appearances))) {
    const count = Number(meta.olympic_appearances);
    return {
      count,
      first_games: null,
      summary: `${count} Olympic appearances`
    };
  }
  const summaryText = typeof value === 'string'
    ? value
    : (typeof detail?.summary === 'string' ? detail.summary : '');
  const match = summaryText.match(/(\d+)/);
  if (match) {
    const count = Number(match[1]);
    return {
      count,
      first_games: null,
      summary: summaryText || `${count} Olympic appearances`
    };
  }
  return null;
}

const REP_LABELS = {
  text: 'Text',
  bar: 'Bar',
  glyph: 'Glyph',
  circular: 'Speedometer',
  line: 'Line',
  arrow: 'Arrow',
  badge: 'Badge',
  medalSummary: 'Medals',
  medal: 'Medal',
  ringsCount: 'Glyph',
  flag: 'Flag',
  pie: 'Pie',
  progressBar: 'Progress Bar'
};

export const LEGACY_REP_ALIASES = {
  currentSpeed: { glyph: 'circular' },
  avgSpeed: { glyph: 'circular' },
  rank: { glyph: 'badge' },
  acceleration: { glyph: 'arrow' },
  speedDiffSwimmer: { glyph: 'arrow' },
  timeDiffRecord: { glyph: 'arrow' },
  speedDiffRecord: { glyph: 'arrow' }
};

function buildSpeedMetricSpec(repType, ctx) {
  const val = isFiniteNumber(ctx.value) ? ctx.value : null;
  if (repType === 'text') {
    return {
      text: val != null ? `${val.toFixed(2)} m/s` : '--',
      color: ctx.color
    };
  }
  if (repType === 'bar') {
    const minValue = 0;
    const maxValue = 3;
    const clampedValue = val != null ? Math.max(minValue, Math.min(maxValue, val)) : null;
    return {
      width: 196,
      height: 10,
      radius: 5,
      value: clampedValue ?? minValue,
      minValue,
      maxValue,
      majorTickStep: 1,
      minorTickStep: 0.5,
      showTicks: true,
      showScaleText: true,
      unitLabel: 'm/s',
      tickColor: 0xf8fafc,
      tickAlpha: 0.42,
      minorTickAlpha: 0.22,
      endpointTickAlpha: 0.82,
      tickWidth: 2.2,
      tickInset: 0.8,
      labelColor: 0xe2e8f0,
      labelFontSize: 11,
      labelOffsetY: 7,
      unitGap: 6,
      fillColor: ctx.color,
      fillAlpha: 0.95,
      backgroundColor: 0x0f172a,
      backgroundAlpha: 0.88,
      strokeColor: 0x334155,
      strokeAlpha: 0.42,
      strokeWidth: 1
    };
  }
  return {
    variant: 'speedometer',
    value: val,
    minValue: 0,
    maxValue: 3,
    radius: 32,
    bgStrokeColor: 0x334155,
    bgStrokeAlpha: 0.92,
    bgStrokeWidth: 5,
    strokeColor: ctx.color,
    strokeAlpha: 1,
    strokeWidth: 4,
    tickColor: 0x94a3b8,
    labelColor: 0xe5e7eb,
    valueColor: ctx.color,
    unitColor: 0xe5e7eb,
    unitLabel: 'm/s',
    showText: true,
    showUnit: true,
    valueFontSize: 13,
    unitFontSize: 10,
    textOffsetY: 12,
    valueUnitGap: 6
  };
}

const BROADCAST_BAR_FRAME = {
  width: 146,
  height: 21,
  radius: 2,
  maxLen: 71,
  baseLen: 0,
  backgroundColor: 0x0f172a,
  backgroundAlpha: 0.88,
  strokeColor: 0x334155,
  strokeAlpha: 0.42,
  strokeWidth: 1
};

const BROADCAST_BAR_SCALE = {
  tickColor: 0xf8fafc,
  tickAlpha: 0.82,
  minorTickAlpha: 0.52,
  endpointTickAlpha: 0.32,
  tickWidth: 3.2,
  tickInset: 3.8,
  labelColor: 0xe2e8f0,
  labelFontSize: 15,
  labelOffsetY: 9,
  unitGap: 6
};

function formatSignedMetricText(value, unit, decimals = 2, options = {}) {
  if (!isFiniteNumber(value)) return '--';
  const {
    zeroSign = 'plus',
    preserveZeroSign = false
  } = options;
  const absValue = Math.abs(value);
  const zeroThreshold = Math.pow(10, -decimals) * 0.5;
  if (absValue < zeroThreshold) {
    let sign = '+';
    if (preserveZeroSign) {
      sign = Object.is(value, -0) ? '-' : '+';
    } else if (zeroSign === 'minus') {
      sign = '-';
    }
    return `${sign}${absValue.toFixed(decimals)} ${unit}`;
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)} ${unit}`;
}

function formatSplitClock(valueSec) {
  if (!isFiniteNumber(valueSec)) return '--';
  const safeValueSec = Math.max(0, Number(valueSec));
  const minutes = Math.floor(safeValueSec / 60);
  const seconds = safeValueSec - (minutes * 60);
  if (minutes <= 0) return safeValueSec.toFixed(2);
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

function resolveSplitTimeValue(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const rawSplits = Array.isArray(meta?.splits) ? meta.splits : [];
  const normalizedSplits = rawSplits
    .map((split, index) => {
      const splitTimeSec = isFiniteNumber(split?.split_time)
        ? Number(split.split_time)
        : (isFiniteNumber(split?.lap_time) ? Number(split.lap_time) : null);
      if (!isFiniteNumber(splitTimeSec)) return null;
      const order = Number.isFinite(Number(split?.order)) ? Number(split.order) : (index + 1);
      return {
        order,
        distanceLabel: typeof split?.distance === 'string' ? split.distance : '',
        splitTimeSec,
        lapTimeSec: isFiniteNumber(split?.lap_time) ? Number(split.lap_time) : splitTimeSec
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  if (normalizedSplits.length) {
    const intermediateSplits = normalizedSplits.length > 1
      ? normalizedSplits.slice(0, -1)
      : normalizedSplits;
    return intermediateSplits[0] || normalizedSplits[0] || null;
  }

  const rawSplitTimes = Array.isArray(meta?.split_times) ? meta.split_times : [];
  const numericSplitTimes = rawSplitTimes
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!numericSplitTimes.length) return null;
  const targetIndex = numericSplitTimes.length > 1 ? 0 : (numericSplitTimes.length - 1);
  const splitTimeSec = numericSplitTimes[Math.max(0, targetIndex)];
  return {
    order: targetIndex + 1,
    distanceLabel: '',
    splitTimeSec,
    lapTimeSec: splitTimeSec
  };
}

function resolveDirectionalArrowFlip(direction, value, positiveAlongMovement = true) {
  const movingLeft = direction === 'rtl';
  const pointsAlongMovement = Number(value) < 0
    ? !positiveAlongMovement
    : positiveAlongMovement;
  return pointsAlongMovement ? movingLeft : !movingLeft;
}

function buildBroadcastSignedBarSpec(diff, ctx, options = {}) {
  const maxAbs = Math.max(0.01, Number(options.maxAbs ?? 1));
  const clampedDiff = diff == null ? 0 : Math.max(-maxAbs, Math.min(maxAbs, diff));
  return {
    mode: 'centerSigned',
    reverseScale: options.reverseByDirection ? ctx.direction === 'rtl' : false,
    ...BROADCAST_BAR_FRAME,
    signedValue: clampedDiff,
    minValue: -maxAbs,
    maxValue: maxAbs,
    majorTickStep: Number(options.majorTickStep ?? maxAbs),
    minorTickStep: Number(options.minorTickStep ?? (maxAbs / 2)),
    showTicks: options.showTicks !== false,
    showScaleText: options.showScaleText !== false,
    unitLabel: String(options.unitLabel || ''),
    ...BROADCAST_BAR_SCALE,
    fillColor: Number(options.fillColor ?? ctx.color),
    fillAlpha: Number(options.fillAlpha ?? 0.95)
  };
}

function buildBroadcastLinearBarSpec(value, options = {}) {
  const minValue = Number(options.minValue ?? 0);
  const maxValue = Math.max(minValue + 1e-6, Number(options.maxValue ?? 100));
  const numericValue = isFiniteNumber(value) ? value : minValue;
  return {
    ...BROADCAST_BAR_FRAME,
    value: numericValue,
    minValue,
    maxValue,
    majorTickStep: Number(options.majorTickStep ?? (maxValue - minValue)),
    minorTickStep: Number(options.minorTickStep ?? ((maxValue - minValue) / 2)),
    showTicks: options.showTicks !== false,
    showScaleText: options.showScaleText !== false,
    unitLabel: String(options.unitLabel || ''),
    ...BROADCAST_BAR_SCALE,
    fillColor: Number(options.fillColor ?? 0x7dd3fc),
    fillAlpha: Number(options.fillAlpha ?? 0.95)
  };
}

function buildBroadcastPieSpec(ratio, options = {}) {
  return {
    ratio: clamp01(ratio),
    radius: Number(options.radius ?? 24),
    strokeWidth: Number(options.strokeWidth ?? 1),
    backgroundColor: Number(options.backgroundColor ?? 0x0f172a),
    backgroundAlpha: Number(options.backgroundAlpha ?? 0.92),
    fillColor: Number(options.fillColor ?? 0x7dd3fc),
    fillAlpha: Number(options.fillAlpha ?? 0.95),
    strokeColor: Number(options.strokeColor ?? 0x334155),
    strokeAlpha: Number(options.strokeAlpha ?? 0.52)
  };
}

function buildBaselineDeltaArrowSpec(value, ctx, options = {}) {
  const diff = isFiniteNumber(value) ? value : null;
  const maxAbs = Math.max(0.01, Number(options.maxAbs ?? 1));
  const magnitudeRatio = diff != null ? clamp01(Math.abs(diff) / maxAbs) : 0;
  return {
    variant: 'baselineDelta',
    showArrow: diff != null && Math.abs(diff) > Number(options.threshold ?? 0.015),
    tailLen: Number(options.tailMin ?? 6) + magnitudeRatio * Number(options.tailMax ?? 68),
    headLen: Number(options.headLen ?? 13),
    halfHeight: Number(options.halfHeight ?? 7.2),
    tailRatio: Number(options.tailRatio ?? 0.44),
    color: Number(options.color ?? ctx.color),
    alpha: Number(options.alpha ?? 0.95),
    strokeWidth: Number(options.strokeWidth ?? 1.2),
    strokeColor: Number(options.strokeColor ?? 0x0f172a),
    strokeAlpha: Number(options.strokeAlpha ?? 0.68),
    originRadius: Number(options.originRadius ?? 5.2),
    originInnerRadius: Number(options.originInnerRadius ?? 2.1),
    originGap: Number(options.originGap ?? 0),
    originFillColor: Number(options.originFillColor ?? 0x0f172a),
    originFillAlpha: Number(options.originFillAlpha ?? 0.96),
    originStrokeColor: Number(options.originStrokeColor ?? 0xf8fafc),
    originStrokeAlpha: Number(options.originStrokeAlpha ?? 0.9),
    originStrokeWidth: Number(options.originStrokeWidth ?? 1.6),
    originCoreColor: Number(options.originCoreColor ?? 0xfacc15),
    originCoreAlpha: Number(options.originCoreAlpha ?? 0.96),
    flipX: resolveDirectionalArrowFlip(
      ctx.direction,
      diff ?? 0,
      options.positiveAlongMovement !== false
    )
  };
}

export const METRIC_DEFINITIONS = {
  currentSpeed: {
    id: 'currentSpeed',
    label: 'Current Speed',
    scope: 'perAthlete',
    reps: ['circular', 'bar', 'text'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete, derived }) => (
      isFiniteNumber(derived?.displaySpeed)
        ? derived.displaySpeed
        : getCurrentSpeedValue(athlete)
    ),
    buildSpec: (repType, ctx) => buildSpeedMetricSpec(repType, ctx)
  },
  avgSpeed: {
    id: 'avgSpeed',
    label: 'Current Average Speed',
    scope: 'perAthlete',
    reps: ['circular', 'bar', 'text'],
    defaultColor: '#d3d3d3',
    getValue: ({ derived }) => (isFiniteNumber(derived?.avgSpeed) ? derived.avgSpeed : null),
    buildSpec: (repType, ctx) => buildSpeedMetricSpec(repType, ctx)
  },
  acceleration: {
    id: 'acceleration',
    label: 'Acceleration',
    scope: 'perAthlete',
    reps: ['text', 'bar', 'arrow'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete, derived }) => (
      isFiniteNumber(athlete?.acceleration)
        ? athlete.acceleration
        : (isFiniteNumber(derived?.acc) ? derived.acc : null)
    ),
    buildSpec: (repType, ctx) => {
      const val = isFiniteNumber(ctx.value) ? ctx.value : null;
      const posColor = 0x4ade80;
      const negColor = 0xf87171;
      const color = val != null && val < 0 ? negColor : posColor;

      if (repType === 'text') {
        return { text: formatSignedMetricText(val, 'm/s²', 2), color };
      }
      if (repType === 'bar') {
        return buildBroadcastSignedBarSpec(val, ctx, {
          maxAbs: 1,
          unitLabel: 'm/s²',
          fillColor: color,
          reverseByDirection: true
        });
      }
      return {
        lockLength: true,
        length: 16 + clamp01(Math.abs(val ?? 0) / 1) * 26,
        headLen: 10,
        halfHeight: 7,
        tailRatio: 0.5,
        color,
        alpha: 0.95,
        strokeWidth: 0.8,
        strokeColor: 0x111827,
        strokeAlpha: 0.62,
        flipX: resolveDirectionalArrowFlip(ctx.direction, val ?? 0, true)
      };
    }
  },
  elapsed: {
    id: 'elapsed',
    label: 'Elapsed Time',
    scope: 'global',
    reps: ['text'],
    defaultColor: '#d3d3d3',
    getValue: ({ frameTimeSec }) => frameTimeSec,
    buildSpec: (_repType, ctx) => {
      const tsec = isFiniteNumber(ctx.value) ? ctx.value : 0;
      const formatted = ctx.formatTime ? ctx.formatTime(tsec) : `${tsec.toFixed(2)}s`;
      return {
        text: formatted,
        color: ctx.color
      };
    }
  },
  splitTime: {
    id: 'splitTime',
    label: 'Split Time',
    scope: 'perAthlete',
    reps: ['text'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => resolveSplitTimeValue(meta),
    buildSpec: (_repType, ctx) => {
      const split = ctx.value && typeof ctx.value === 'object' ? ctx.value : null;
      const sec = isFiniteNumber(split?.splitTimeSec) ? split.splitTimeSec : null;
      return {
        text: sec != null ? formatSplitClock(sec) : '',
        color: ctx.color
      };
    }
  },
  finalTime: {
    id: 'finalTime',
    label: 'Final Time',
    scope: 'perAthlete',
    reps: ['text'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => (
      isFiniteNumber(meta?.final_time)
        ? Number(meta.final_time)
        : (isFiniteNumber(meta?.final) ? Number(meta.final) : null)
    ),
    buildSpec: (_repType, ctx) => {
      const sec = isFiniteNumber(ctx.value) ? ctx.value : null;
      return {
        text: sec != null ? formatSplitClock(sec) : '',
        color: ctx.color
      };
    }
  },
  distanceSwam: {
    id: 'distanceSwam',
    label: 'Distance Swam',
    scope: 'perAthlete',
    reps: ['text', 'bar', 'pie'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete }) => (isFiniteNumber(athlete?.distance) ? athlete.distance : null),
    buildSpec: (repType, ctx) => {
      const dist = isFiniteNumber(ctx.value) ? ctx.value : null;
      const maxDistance = 100;
      const ratio = dist != null ? clamp01(dist / maxDistance) : 0;
      if (repType === 'text') {
        return { text: dist != null ? `${dist.toFixed(1)} m` : '--', color: ctx.color };
      }
      if (repType === 'pie') {
        return buildBroadcastPieSpec(ratio, { fillColor: ctx.color });
      }
      return buildBroadcastLinearBarSpec(dist ?? 0, {
        maxValue: maxDistance,
        majorTickStep: 50,
        minorTickStep: 25,
        unitLabel: 'm',
        fillColor: ctx.color
      });
    }
  },
  remainingDistance: {
    id: 'remainingDistance',
    label: 'Remaining Distance',
    scope: 'perAthlete',
    reps: ['text', 'bar', 'pie'],
    defaultColor: '#d3d3d3',
    getValue: ({ derived, athlete, raceLength }) => {
      if (isFiniteNumber(derived?.remainingDistance)) return derived.remainingDistance;
      if (isFiniteNumber(athlete?.distance) && isFiniteNumber(raceLength)) {
        return Math.max(0, raceLength - athlete.distance);
      }
      return null;
    },
    buildSpec: (repType, ctx) => {
      const rem = isFiniteNumber(ctx.value) ? ctx.value : null;
      const maxDistance = 100;
      const ratio = rem != null ? clamp01(rem / maxDistance) : 0;
      if (repType === 'text') {
        return { text: rem != null ? `${rem.toFixed(1)} m` : '--', color: ctx.color };
      }
      if (repType === 'pie') {
        return buildBroadcastPieSpec(ratio, { fillColor: ctx.color });
      }
      return buildBroadcastLinearBarSpec(rem ?? 0, {
        maxValue: maxDistance,
        majorTickStep: 50,
        minorTickStep: 25,
        unitLabel: 'm',
        fillColor: ctx.color
      });
    }
  },
  distanceDiffLeader: {
    id: 'distanceDiffLeader',
    label: 'Distance Diff to Leader',
    scope: 'perAthlete',
    reps: ['text', 'line', 'arrow'],
    defaultColor: '#2b2b2b',
    getValue: ({ derived }) => (isFiniteNumber(derived?.distDiff) ? derived.distDiff : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;
      if (repType === 'text') {
        return { text: formatSignedMetricText(diff, 'm', 2), color: ctx.color };
      }
      if (repType === 'line') {
        return {
          variant: 'compareLine',
          comparisonMode: 'leader'
        };
      }
      return buildBaselineDeltaArrowSpec(diff, ctx, {
        maxAbs: 3,
        positiveAlongMovement: false,
        color: ctx.color,
        threshold: 0.02,
        tailMin: 4,
        tailMax: 62,
        headLen: 12,
        halfHeight: 6.2,
        tailRatio: 0.48,
        originRadius: 5.1,
        originInnerRadius: 1.8,
        originFillColor: 0x0f172a,
        originStrokeColor: 0x000000,
        originCoreColor: 0xf8fafc
      });
    }
  },
  positionDiffSwimmer: {
    id: 'positionDiffSwimmer',
    label: 'Position Diff to Swimmer',
    scope: 'perAthlete',
    reps: ['text', 'line'],
    defaultColor: '#d3d3d3',
    getValue: ({ derived }) => (isFiniteNumber(derived?.positionDiffSwimmer) ? derived.positionDiffSwimmer : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;

      if (repType === 'text') {
        const aheadColor = 0x4ade80;
        const behindColor = 0xf59e0b;
        const color = diff != null && diff > 0 ? aheadColor : behindColor;
        if (diff == null) return { text: '--', color: ctx.color };
        return { text: formatSignedMetricText(diff, 'm', 2, { preserveZeroSign: true }), color };
      }
      return {
        variant: 'compareLine',
        comparisonMode: 'swimmer',
        omitTargetLane: true
      };
    }
  },
  speedDiffSwimmer: {
    id: 'speedDiffSwimmer',
    label: 'Speed Diff to Swimmer',
    scope: 'perAthlete',
    reps: ['text', 'bar', 'arrow'],
    defaultColor: '#d3d3d3',
    getValue: ({ derived }) => (isFiniteNumber(derived?.speedDiffSwimmer) ? derived.speedDiffSwimmer : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;
      const absDiff = diff != null ? Math.abs(diff) : 0;
      const visualRange = 0.3;
      const ratio = diff != null ? clamp01(absDiff / visualRange) : 0;
      const posColor = 0x4ade80;
      const negColor = 0xf87171;
      const color = diff != null && diff < 0 ? negColor : posColor;

      if (repType === 'text') {
        if (diff == null) return { text: '--', color: ctx.color };
        const sign = diff >= 0 ? '+' : '';
        return { text: `${sign}${diff.toFixed(2)} m/s`, color };
      }
      if (repType === 'bar') {
        const rangeMax = 1;
        const clampedDiff = diff == null ? 0 : Math.max(-rangeMax, Math.min(rangeMax, diff));
        const centerRatio = clamp01(Math.abs(clampedDiff) / rangeMax);
        return {
          mode: 'centerSigned',
          reverseScale: ctx.direction === 'rtl',
          width: 146,
          height: 21,
          radius: 2,
          ratio: centerRatio,
          signedValue: clampedDiff,
          maxLen: 71,
          baseLen: 0,
          minValue: -1,
          maxValue: 1,
          majorTickStep: 1,
          minorTickStep: 0.5,
          showTicks: true,
          showScaleText: true,
          unitLabel: 'm/s',
          tickColor: 0xf8fafc,
          tickAlpha: 0.82,
          minorTickAlpha: 0.52,
          endpointTickAlpha: 0.32,
          tickWidth: 3.2,
          tickInset: 3.8,
          labelColor: 0xe2e8f0,
          labelFontSize: 15,
          labelOffsetY: 9,
          unitGap: 6,
          fillColor: color,
          fillAlpha: 0.95,
          backgroundColor: 0x0f172a,
          backgroundAlpha: 0.88,
          strokeColor: 0x334155,
          strokeAlpha: 0.42,
          strokeWidth: 1
        };
      }
      return {
        variant: 'baselineDelta',
        showArrow: absDiff > 0.015,
        tailLen: 6 + ratio * 68,
        headLen: 13,
        halfHeight: 7.2,
        tailRatio: 0.44,
        color,
        alpha: 0.95,
        strokeWidth: 1.2,
        strokeColor: 0x0f172a,
        strokeAlpha: 0.68,
        originRadius: 5.2,
        originInnerRadius: 2.1,
        originGap: 0,
        originFillColor: 0x0f172a,
        originFillAlpha: 0.96,
        originStrokeColor: 0xf8fafc,
        originStrokeAlpha: 0.9,
        originStrokeWidth: 1.6,
        originCoreColor: 0xfacc15,
        originCoreAlpha: 0.96,
        flipX: diff == null
          ? (ctx.direction === 'rtl')
          : (diff >= 0 ? (ctx.direction === 'rtl') : (ctx.direction !== 'rtl'))
      };
    }
  },
  timeDiffRecord: {
    id: 'timeDiffRecord',
    label: 'Time Diff to Record',
    scope: 'perAthlete',
    reps: ['text', 'bar', 'arrow'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete }) => (isFiniteNumber(athlete?.time_differences_record) ? athlete.time_differences_record : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;
      const absDiff = diff != null ? Math.abs(diff) : 0;
      const aheadColor = 0x4ade80;
      const behindColor = 0xf59e0b;
      const color = diff != null && diff > 0 ? behindColor : aheadColor;

      if (repType === 'text') {
        return { text: formatSignedMetricText(diff, 's', 2), color };
      }
      if (repType === 'bar') {
        return buildBroadcastSignedBarSpec(diff, ctx, {
          maxAbs: 3,
          majorTickStep: 1,
          minorTickStep: 0.5,
          unitLabel: 's',
          fillColor: color,
          reverseByDirection: true
        });
      }
      return buildBaselineDeltaArrowSpec(diff, ctx, {
        maxAbs: 1,
        positiveAlongMovement: false,
        color,
        tailMin: 6,
        tailMax: 68,
        headLen: 13,
        halfHeight: 7.2,
        tailRatio: 0.44,
        originRadius: 5.2,
        originInnerRadius: 2.1,
        originFillColor: 0x0f172a,
        originStrokeColor: 0x000000,
        originCoreColor: 0xfacc15
      });
    }
  },
  timeDiffSwimmer: {
    id: 'timeDiffSwimmer',
    label: 'Time Diff to Swimmer',
    scope: 'perAthlete',
    reps: ['text', 'bar'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete }) => (isFiniteNumber(athlete?.time_differences_swimmer) ? athlete.time_differences_swimmer : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;
      const absDiff = diff != null ? Math.abs(diff) : 0;
      const ratio = diff != null ? clamp01(absDiff / 1.5) : 0;
      const aheadColor = 0x4ade80;
      const behindColor = 0xf59e0b;
      const color = diff != null && diff > 0 ? behindColor : aheadColor;

      if (repType === 'text') {
        if (diff == null) return { text: '--', color: ctx.color };
        return { text: formatSignedMetricText(diff, 's', 2, { preserveZeroSign: true }), color };
      }
      return buildBroadcastSignedBarSpec(diff, ctx, {
        maxAbs: 1,
        unitLabel: 's',
        fillColor: color,
        reverseByDirection: true
      });
    }
  },
  speedDiffRecord: {
    id: 'speedDiffRecord',
    label: 'Speed Diff to Record',
    scope: 'perAthlete',
    reps: ['text', 'bar', 'arrow'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete }) => (isFiniteNumber(athlete?.speed_differences_record) ? athlete.speed_differences_record : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;
      const aheadColor = 0x4ade80;
      const behindColor = 0xf87171;
      const color = diff != null && diff < 0 ? behindColor : aheadColor;

      if (repType === 'text') {
        return { text: formatSignedMetricText(diff, 'm/s', 2), color };
      }
      if (repType === 'bar') {
        return buildBroadcastSignedBarSpec(diff, ctx, {
          maxAbs: 1,
          unitLabel: 'm/s',
          fillColor: color,
          reverseByDirection: true
        });
      }
      return buildBaselineDeltaArrowSpec(diff, ctx, {
        maxAbs: 1,
        positiveAlongMovement: true,
        color,
        tailMin: 6,
        tailMax: 68,
        headLen: 13,
        halfHeight: 7.2,
        tailRatio: 0.44,
        originRadius: 5.2,
        originInnerRadius: 2.1,
        originFillColor: 0x0f172a,
        originStrokeColor: 0x000000,
        originCoreColor: 0xfacc15
      });
    }
  },
  positionDiffRecord: {
    id: 'positionDiffRecord',
    label: 'Position Diff to Record',
    scope: 'perAthlete',
    reps: ['text', 'line'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete }) => (isFiniteNumber(athlete?.position_differences_record) ? athlete.position_differences_record : null),
    buildSpec: (repType, ctx) => {
      const diff = isFiniteNumber(ctx.value) ? ctx.value : null;

      if (repType === 'text') {
        const aheadColor = 0x4ade80;
        const behindColor = 0xf59e0b;
        const color = diff != null && diff > 0 ? behindColor : aheadColor;
        if (diff == null) return { text: '--', color: ctx.color };
        return { text: formatSignedMetricText(diff, 'm', 2), color };
      }
      return {
        variant: 'compareLine',
        comparisonMode: 'record'
      };
    }
  },
  worldRecord: {
    id: 'worldRecord',
    label: 'World Record',
    scope: 'global',
    reps: ['text'],
    defaultColor: '#93c5fd',
    getValue: ({ athlete, meta }) => (
      isFiniteNumber(meta?.world_record)
        ? meta.world_record
        : (
          isFiniteNumber(athlete?.world_record)
            ? athlete.world_record
            : (isFiniteNumber(athlete?.world) ? athlete.world : null)
        )
    ),
    buildSpec: (_repType, ctx) => {
      const sec = isFiniteNumber(ctx.value) ? ctx.value : null;
      if (sec == null) return { text: 'WR --', color: ctx.color };
      const formatted = ctx.formatTime ? ctx.formatTime(sec) : `${sec.toFixed(2)} s`;
      return { text: `WR ${formatted}`, color: ctx.color };
    }
  },
  olympicsRecord: {
    id: 'olympicsRecord',
    label: 'Olympic Record',
    scope: 'global',
    reps: ['text'],
    defaultColor: '#a7f3d0',
    getValue: ({ athlete, meta }) => (
      isFiniteNumber(meta?.olympics_record)
        ? meta.olympics_record
        : (
          isFiniteNumber(athlete?.olympics_record)
            ? athlete.olympics_record
            : (isFiniteNumber(athlete?.olympic) ? athlete.olympic : null)
        )
    ),
    buildSpec: (_repType, ctx) => {
      const sec = isFiniteNumber(ctx.value) ? ctx.value : null;
      if (sec == null) return { text: 'OR --', color: ctx.color };
      const formatted = ctx.formatTime ? ctx.formatTime(sec) : `${sec.toFixed(2)} s`;
      return { text: `OR ${formatted}`, color: ctx.color };
    }
  },
  personalRecord: {
    id: 'personalRecord',
    label: 'Personal Record',
    scope: 'perAthlete',
    reps: ['text'],
    defaultColor: '#fde68a',
    getValue: ({ athlete, meta }) => (
      isFiniteNumber(athlete?.personal_record)
        ? athlete.personal_record
        : (
            isFiniteNumber(athlete?.personal)
              ? athlete.personal
              : (
                  isFiniteNumber(meta?.personal_record)
                    ? meta.personal_record
                    : (isFiniteNumber(meta?.personal) ? meta.personal : null)
                )
          )
    ),
    buildSpec: (_repType, ctx) => {
      const sec = isFiniteNumber(ctx.value) ? ctx.value : null;
      if (sec == null) return { text: 'PR --', color: ctx.color };
      const formatted = ctx.formatTime ? ctx.formatTime(sec) : `${sec.toFixed(2)} s`;
      return { text: `PR ${formatted}`, color: ctx.color };
    }
  },
  estCompletion: {
    id: 'estCompletion',
    label: 'Estimated Completion Time',
    scope: 'perAthlete',
    reps: ['text', 'bar'],
    defaultColor: '#d3d3d3',
    getValue: ({ derived }) => (isFiniteNumber(derived?.estTime) ? derived.estTime : null),
    buildSpec: (repType, ctx) => {
      const est = isFiniteNumber(ctx.value) ? ctx.value : null;
      const formatted = est != null
        ? (ctx.formatTime ? ctx.formatTime(est) : `${est.toFixed(2)}s`)
        : '--';
      if (repType === 'text') {
        return { text: formatted, color: ctx.color };
      }
      const slowest = isFiniteNumber(ctx.derived?.slowestEstTime) ? ctx.derived.slowestEstTime : null;
      const ratio = est != null && slowest != null && slowest > 0 ? clamp01(est / slowest) : 0;
      return {
        ...BROADCAST_BAR_FRAME,
        ratio,
        fillColor: ctx.color,
        fillAlpha: 0.95
      };
    }
  },
  rank: {
    id: 'rank',
    label: 'Rank',
    scope: 'perAthlete',
    reps: ['text', 'badge'],
    defaultColor: '#fcd34d',
    getValue: ({ athlete }) => (isFiniteNumber(athlete?.rank) ? athlete.rank : null),
    buildSpec: (repType, ctx) => {
      const rank = isFiniteNumber(ctx.value) ? Math.round(ctx.value) : null;
      if (repType === 'text') {
        return {
          text: rank != null ? `#${rank}` : '#-',
          color: ctx.color
        };
      }
      return {
        variant: 'badge',
        radius: 20,
        fillColor: ctx.color,
        fillAlpha: 0.95,
        text: rank != null ? String(rank) : '-',
        textColor: 0x0b0b0b
      };
    }
  },
  leaderStatus: {
    id: 'leaderStatus',
    label: 'Leader Status',
    scope: 'perAthlete',
    reps: ['text', 'arrow'],
    defaultColor: '#facc15',
    getValue: ({ athlete, insightState }) => {
      const leaderId = Number(insightState?.leaderId);
      if (!Number.isFinite(leaderId) || !athlete || athlete.id !== leaderId) return null;
      return { role: 'leader' };
    },
    buildSpec: (repType, ctx) => {
      if (!ctx.value) {
        if (repType === 'text') return { text: '', color: ctx.color };
        return { variant: 'tripleChevron', alpha: 0, length: 0 };
      }
      if (repType === 'text') {
        return {
          text: 'Leader',
          color: ctx.color
        };
      }
      return {
        variant: 'tripleChevron',
        length: 24,
        halfHeight: 6,
        gap: 4,
        color: ctx.color,
        alpha: 0.98,
        strokeWidth: 1.2,
        strokeColor: 0x0f172a,
        strokeAlpha: 0.34,
        flipX: ctx.direction === 'rtl'
      };
    }
  },
  chaseStatus: {
    id: 'chaseStatus',
    label: 'Chase Status',
    scope: 'perAthlete',
    reps: ['text', 'arrow'],
    defaultColor: '#93c5fd',
    getValue: ({ athlete, insightState }) => {
      const chaseId = Number(insightState?.chaseId);
      if (!Number.isFinite(chaseId) || !athlete || athlete.id !== chaseId) return null;
      return { role: 'chase' };
    },
    buildSpec: (repType, ctx) => {
      if (!ctx.value) {
        if (repType === 'text') return { text: '', color: ctx.color };
        return { variant: 'tripleChevron', alpha: 0, length: 0 };
      }
      if (repType === 'text') {
        return {
          text: 'Chasing',
          color: ctx.color
        };
      }
      return {
        variant: 'tripleChevron',
        length: 20,
        halfHeight: 5,
        gap: 4,
        color: ctx.color,
        alpha: 0.96,
        strokeWidth: 1.1,
        strokeColor: 0x0f172a,
        strokeAlpha: 0.34,
        visibleCount: 1 + (Math.floor(((isFiniteNumber(ctx.frameTimeSec) ? ctx.frameTimeSec : 0) * 4.5) % 3)),
        flipX: ctx.direction === 'rtl'
      };
    }
  },
  insightText: {
    id: 'insightText',
    label: 'Tech Review',
    scope: 'perAthlete',
    reps: ['text'],
    defaultColor: '#d3d3d3',
    getValue: ({ athlete, insightState }) => {
      if (!athlete) return null;
      const payload = resolveInsightAthleteText(insightState?.segment, athlete.id);
      if (!payload?.text) return null;
      const category = String(insightState?.segment?.category || '').toLowerCase();
      return {
        ...payload,
        category
      };
    },
    buildSpec: (_repType, ctx) => {
      const payload = ctx.value;
      if (!payload?.text) {
        return {
          text: '',
          color: ctx.color
        };
      }
      return {
        text: payload.text,
        color: insightColorForPayload(payload, ctx.color)
      };
    }
  },
  resultStatus: {
    id: 'resultStatus',
    label: 'Result',
    scope: 'perAthlete',
    reps: ['medal', 'text'],
    defaultColor: '#fcd34d',
    getValue: ({ athlete, insightState }) => {
      const results = insightState?.results;
      if (!athlete || !results || typeof results !== 'object') return null;
      if (results.gold != null && athlete.id === results.gold) {
        return { medal: 'gold', place: 1, text: 'Gold Medal', color: 0xfcd34d, textColor: 0x111827 };
      }
      if (results.silver != null && athlete.id === results.silver) {
        return { medal: 'silver', place: 2, text: 'Silver Medal', color: 0xd1d5db, textColor: 0x111827 };
      }
      if (results.bronze != null && athlete.id === results.bronze) {
        return { medal: 'bronze', place: 3, text: 'Bronze Medal', color: 0xcd7f32, textColor: 0xffffff };
      }
      return null;
    },
    buildSpec: (repType, ctx) => {
      const status = ctx.value;
      if (!status) {
        if (repType === 'text') return { text: '', color: ctx.color };
        return { variant: 'medal', radius: 0, fillAlpha: 0, text: '', medal: 'gold' };
      }
      if (repType === 'text') {
        return {
          text: status.text,
          color: status.color ?? ctx.color
        };
      }
      return {
        variant: 'medal',
        medal: status.medal,
        radius: 22,
        fillAlpha: 0.98,
        text: String(status.place ?? ''),
        strokeColor: 0x0f172a,
        strokeAlpha: 0.26,
        strokeWidth: 1.2
      };
    }
  },
  name: {
    id: 'name',
    label: 'Athlete Name',
    scope: 'perAthlete',
    reps: ['text'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => meta?.name || null,
    buildSpec: (_repType, ctx) => {
      return {
        text: ctx.value || '',
        color: ctx.color
      };
    }
  },
  country: {
    id: 'country',
    label: 'Country',
    scope: 'perAthlete',
    reps: ['text', 'flag'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => meta?.country || meta?.country_code || null,
    buildSpec: (repType, ctx) => {
      if (repType === 'text') {
        return {
          text: ctx.value || '',
          color: ctx.color
        };
      }
      const code = (ctx.meta?.country_code || ctx.meta?.country || '').toLowerCase();
      return {
        countryCode: code,
        width: ctx.flagWidth || 64,
        height: ctx.flagHeight || 40
      };
    }
  },
  age: {
    id: 'age',
    label: 'Age',
    scope: 'perAthlete',
    reps: ['text'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => (meta?.age != null ? meta.age : null),
    buildSpec: (_repType, ctx) => ({
      text: ctx.value != null ? `${ctx.value}` : '',
      color: ctx.color
    })
  },
  awardsInfo: {
    id: 'awardsInfo',
    label: 'Major Awards',
    scope: 'perAthlete',
    reps: ['medalSummary', 'text'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => meta?.major_awards_detail || meta?.athlete_history?.major_awards || meta?.major_awards || null,
    buildSpec: (repType, ctx) => {
      const awards = resolveMajorAwardsValue(ctx.value, ctx.meta);
      if (!awards) {
        return repType === 'medalSummary'
          ? { awards: buildEmptyMajorAwardsValue(), color: ctx.color }
          : { text: '', color: ctx.color };
      }
      if (repType === 'medalSummary') {
        return {
          awards,
          color: ctx.color
        };
      }
      return {
        text: formatMajorAwardsSummary(awards),
        color: ctx.color
      };
    }
  },
  appearancesInfo: {
    id: 'appearancesInfo',
    label: 'Olympic Appearances',
    scope: 'perAthlete',
    reps: ['ringsCount', 'text'],
    defaultColor: '#d3d3d3',
    getValue: ({ meta }) => meta?.olympic_appearances_detail || meta?.athlete_history?.olympic_appearances || meta?.olympic_appearances || null,
    buildSpec: (repType, ctx) => {
      const appearances = resolveOlympicAppearancesValue(ctx.value, ctx.meta);
      if (!appearances) {
        return repType === 'ringsCount'
          ? { count: 0, summary: '', color: ctx.color }
          : { text: '', color: ctx.color };
      }
      if (repType === 'ringsCount') {
        return {
          count: appearances.count,
          summary: appearances.summary,
          color: ctx.color
        };
      }
      return {
        text: appearances.summary || `Olympic Appearances: ${appearances.count}`,
        color: ctx.color
      };
    }
  }
};

export function buildVisLibraryFromDefinitions(defs = METRIC_DEFINITIONS) {
  const out = {};
  Object.values(defs).forEach((def) => {
    out[def.id] = {
      id: def.id,
      label: def.label,
      scope: def.scope,
      reps: (def.reps || []).map((id) => ({ id, label: REP_LABELS[id] || id })),
      defaultColor: def.defaultColor || '#d3d3d3'
    };
  });
  return out;
}

export function normalizeMetricRepType(typeId, repType, defs = METRIC_DEFINITIONS) {
  const def = defs[typeId];
  if (!def) return repType || 'text';
  const aliases = LEGACY_REP_ALIASES[typeId] || {};
  const mapped = aliases[repType] || repType;
  if ((def.reps || []).includes(mapped)) return mapped;
  return def.reps?.[0] || 'text';
}
