
const SWIMFLOW_COLOR_SET = {
  black: '#000000',
  grey_dark3: '#2D2D2D',
  grey_dark2: '#424242',
  grey_dark1: '#696969',
  grey_middle: '#9D9D9D',
  grey_light1: '#BDBDBD',
  grey_light2: '#D3D3D3',
  grey_light3: '#F6F6F6',
  white: '#FFFFFF'
};

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHexColor(value, fallback = SWIMFLOW_COLOR_SET.grey_light2) {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.slice(1).split('').map((ch) => ch + ch).join('').toLowerCase()}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toLowerCase()}`;
  return fallback;
}

export function colorToPixi(value, fallback = 0xd3d3d3) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const hex = normalizeHexColor(String(value || ''), null);
  if (!hex) return fallback;
  const parsed = Number.parseInt(hex.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function kebabToCamel(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+([a-z0-9])/g, (_, ch) => ch.toUpperCase());
}

const STYLE_KEY_ALIAS = {
  fill: 'fillColor',
  color: 'fillColor',
  stroke: 'strokeColor',
  bg: 'backgroundColor',
  background: 'backgroundColor',
  opacity: 'fillAlpha',
  alpha: 'fillAlpha',
  lineWidth: 'strokeWidth',
  fontWeightPx: 'strokeWidth'
};

function parseStyleValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (/^(true|false)$/i.test(value)) return /^true$/i.test(value);
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  if (/^0x[0-9a-f]{6}$/i.test(value)) return value;
  if (/^-?\d+(\.\d+)?(px|deg|%)?$/i.test(value)) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

export function parseCssLikeStyleText(raw = '') {
  const text = String(raw || '');
  const out = {};
  text.split(';').forEach((pair) => {
    const idx = pair.indexOf(':');
    if (idx <= 0) return;
    const left = pair.slice(0, idx).trim();
    const right = pair.slice(idx + 1).trim();
    if (!left || !right) return;
    const normalized = kebabToCamel(left);
    const key = STYLE_KEY_ALIAS[normalized] || normalized;
    out[key] = parseStyleValue(right);
  });
  return out;
}

export const REP_STYLE_SCHEMAS = {
  text: [
    { key: 'strokeWidth', label: 'Stroke Weight', type: 'range', min: 0, max: 10, step: 0.5, suffix: 'px' },
    { key: 'fontSize', label: 'Font Size', type: 'range', min: 10, max: 160, step: 1, suffix: 'px' },
    { key: 'fontFamily', label: 'Font Family', type: 'font' },
    { key: 'fillColor', label: 'Fill Color', type: 'color' },
    { key: 'strokeColor', label: 'Stroke Color', type: 'color' },
    { key: 'fillAlpha', label: 'Fill Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeAlpha', label: 'Stroke Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'showBackground', label: 'Background', type: 'checkbox' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Background Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'backgroundPaddingX', label: 'BG Padding X', type: 'range', min: 0, max: 40, step: 1, suffix: 'px' },
    { key: 'backgroundPaddingY', label: 'BG Padding Y', type: 'range', min: 0, max: 28, step: 1, suffix: 'px' },
    { key: 'backgroundRadius', label: 'BG Radius', type: 'range', min: 0, max: 24, step: 1, suffix: 'px' },
    { key: 'fixedBackground', label: 'Fixed Background', type: 'checkbox' }
  ],
  medalSummary: [
    {
      key: 'awardSet',
      label: 'Awards Set',
      type: 'select',
      options: [
        { value: 'olympic', label: 'Olympics' },
        { value: 'world', label: 'WCH' }
      ]
    },
    { key: 'fontSize', label: 'Count Size', type: 'range', min: 8, max: 72, step: 1, suffix: 'px' },
    { key: 'iconSize', label: 'Icon Size', type: 'range', min: 8, max: 48, step: 1, suffix: 'px' },
    { key: 'fontFamily', label: 'Font Family', type: 'font' },
    { key: 'countPrefix', label: 'Count Prefix', type: 'text' },
    { key: 'medalGap', label: 'Medal Gap', type: 'range', min: 0, max: 120, step: 1, suffix: 'px' },
    { key: 'countGap', label: 'Icon-Text Gap', type: 'range', min: 0, max: 48, step: 1, suffix: 'px' },
    { key: 'fillColor', label: 'Count Color', type: 'color' },
    { key: 'goldColor', label: 'Gold Color', type: 'color' },
    { key: 'silverColor', label: 'Silver Color', type: 'color' },
    { key: 'bronzeColor', label: 'Bronze Color', type: 'color' },
    { key: 'showBackground', label: 'Background', type: 'checkbox' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Background Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'backgroundPaddingX', label: 'BG Padding X', type: 'range', min: 0, max: 40, step: 1, suffix: 'px' },
    { key: 'backgroundPaddingY', label: 'BG Padding Y', type: 'range', min: 0, max: 28, step: 1, suffix: 'px' },
    { key: 'backgroundRadius', label: 'BG Radius', type: 'range', min: 0, max: 24, step: 1, suffix: 'px' }
  ],
  ringsCount: [
    { key: 'fontSize', label: 'Count Size', type: 'range', min: 8, max: 72, step: 1, suffix: 'px' },
    { key: 'iconSize', label: 'Icon Size', type: 'range', min: 8, max: 48, step: 1, suffix: 'px' },
    { key: 'fontFamily', label: 'Font Family', type: 'font' },
    { key: 'countPrefix', label: 'Count Prefix', type: 'text' },
    { key: 'textGap', label: 'Ring-Text Gap', type: 'range', min: 0, max: 48, step: 1, suffix: 'px' },
    { key: 'fillColor', label: 'Text Color', type: 'color' },
    { key: 'showBackground', label: 'Background', type: 'checkbox' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Background Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'backgroundPaddingX', label: 'BG Padding X', type: 'range', min: 0, max: 40, step: 1, suffix: 'px' },
    { key: 'backgroundPaddingY', label: 'BG Padding Y', type: 'range', min: 0, max: 28, step: 1, suffix: 'px' },
    { key: 'backgroundRadius', label: 'BG Radius', type: 'range', min: 0, max: 24, step: 1, suffix: 'px' }
  ],
  bar: [
    { key: 'height', label: 'Height', type: 'range', min: 4, max: 60, step: 1, suffix: 'px' },
    { key: 'width', label: 'Width', type: 'range', min: 40, max: 360, step: 2, suffix: 'px' },
    { key: 'radius', label: 'Corner Radius', type: 'range', min: 0, max: 30, step: 1, suffix: 'px' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'fillColor', label: 'Fill Color', type: 'color' },
    { key: 'strokeColor', label: 'Stroke Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Background Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'fillAlpha', label: 'Fill Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeWidth', label: 'Stroke Weight', type: 'range', min: 0, max: 8, step: 0.5, suffix: 'px' },
    { key: 'showTicks', label: 'Show Ticks', type: 'checkbox', requiresRepProp: true },
    { key: 'showScaleText', label: 'Show Scale Text', type: 'checkbox', requiresRepProp: true }
  ],
  glyph: [
    { key: 'height', label: 'Stroke Weight', type: 'range', min: 1, max: 16, step: 1, suffix: 'px' },
    { key: 'width', label: 'Primary Size', type: 'range', min: 8, max: 120, step: 1, suffix: 'px' },
    { key: 'radius', label: 'Radius', type: 'range', min: 4, max: 80, step: 1, suffix: 'px' },
    { key: 'headLen', label: 'Arrow Head', type: 'range', min: 4, max: 40, step: 1, suffix: 'px' },
    { key: 'halfHeight', label: 'Half Height', type: 'range', min: 2, max: 20, step: 1, suffix: 'px' },
    { key: 'tailRatio', label: 'Tail Thickness', type: 'range', min: 0.2, max: 1, step: 0.01 },
    { key: 'fillColor', label: 'Primary Color', type: 'color' },
    { key: 'strokeColor', label: 'Secondary Color', type: 'color' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'fillAlpha', label: 'Fill Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeWidth', label: 'Stroke Weight', type: 'range', min: 0, max: 12, step: 0.5, suffix: 'px' }
  ],
  circular: [
    { key: 'height', label: 'Stroke Weight', type: 'range', min: 1, max: 16, step: 0.5, suffix: 'px' },
    { key: 'radius', label: 'Radius', type: 'range', min: 4, max: 80, step: 1, suffix: 'px' },
    { key: 'fillColor', label: 'Arc Color', type: 'color' },
    { key: 'backgroundColor', label: 'Ring Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Ring Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'fillAlpha', label: 'Arc Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'showText', label: 'Show Text', type: 'checkbox', requiresRepProp: true },
    { key: 'showUnit', label: 'Show Unit', type: 'checkbox', requiresRepProp: true }
  ],
  line: [
    { key: 'mainLineWidth', label: 'Reference Weight', type: 'range', min: 1, max: 24, step: 0.5, suffix: 'px' },
    { key: 'childLineWidth', label: 'Lane Line Weight', type: 'range', min: 1, max: 24, step: 0.5, suffix: 'px' },
    { key: 'mainStrokeWidth', label: 'Reference Stroke Weight', type: 'range', min: 0, max: 40, step: 0.5, suffix: 'px' },
    { key: 'childStrokeWidth', label: 'Lane Stroke Weight', type: 'range', min: 0, max: 40, step: 0.5, suffix: 'px' },
    { key: 'mainLineColor', label: 'Reference Color', type: 'color' },
    { key: 'childLineColor', label: 'Lane Line Color', type: 'color' },
    { key: 'mainStrokeColor', label: 'Reference Stroke Color', type: 'color' },
    { key: 'childStrokeColor', label: 'Lane Stroke Color', type: 'color' },
    { key: 'mainLineAlpha', label: 'Reference Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'childLineAlpha', label: 'Lane Line Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'mainStrokeAlpha', label: 'Reference Stroke Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'childStrokeAlpha', label: 'Lane Stroke Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'showDebugOverlay', label: 'Debug Overlay', type: 'checkbox', requiresRepProp: true },
    { key: 'debugColor', label: 'Debug Color', type: 'color', requiresRepProp: true },
    { key: 'debugAlpha', label: 'Debug Opacity', type: 'range', min: 0, max: 1, step: 0.01, requiresRepProp: true },
    { key: 'height', label: 'Height', type: 'range', min: 10, max: 240, step: 2, suffix: 'px' },
    { key: 'width', label: 'Stroke Weight', type: 'range', min: 1, max: 24, step: 1, suffix: 'px' },
    { key: 'fillColor', label: 'Line Color', type: 'color' },
    { key: 'strokeColor', label: 'Secondary Color', type: 'color' },
    { key: 'fillAlpha', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 }
  ],
  arrow: [
    { key: 'width', label: 'Max Length', type: 'range', min: 8, max: 220, step: 2, suffix: 'px' },
    { key: 'headLen', label: 'Head Length', type: 'range', min: 4, max: 48, step: 1, suffix: 'px' },
    { key: 'halfHeight', label: 'Half Height', type: 'range', min: 2, max: 24, step: 1, suffix: 'px' },
    { key: 'tailRatio', label: 'Tail Thickness', type: 'range', min: 0.2, max: 1, step: 0.01 },
    { key: 'originRadius', label: 'Point Size', type: 'range', min: 2, max: 20, step: 0.5, suffix: 'px' },
    { key: 'fillColor', label: 'Fill Color', type: 'color' },
    { key: 'strokeColor', label: 'Stroke Color', type: 'color' },
    { key: 'originStrokeColor', label: 'Point Color', type: 'color' },
    { key: 'originCoreColor', label: 'Point Core Color', type: 'color' },
    { key: 'fillAlpha', label: 'Fill Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeWidth', label: 'Stroke Weight', type: 'range', min: 0, max: 8, step: 0.5, suffix: 'px' }
  ],
  badge: [
    { key: 'radius', label: 'Radius', type: 'range', min: 6, max: 60, step: 1, suffix: 'px' },
    { key: 'fontSize', label: 'Font Size', type: 'range', min: 8, max: 72, step: 1, suffix: 'px' },
    { key: 'fontWeight', label: 'Font Weight', type: 'range', min: 400, max: 900, step: 100 },
    { key: 'fontFamily', label: 'Font Family', type: 'font' },
    { key: 'fillColor', label: 'Badge Color', type: 'color' },
    { key: 'strokeColor', label: 'Text Color', type: 'color' },
    { key: 'fillAlpha', label: 'Badge Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeWidth', label: 'Outline Weight', type: 'range', min: 0, max: 8, step: 0.5, suffix: 'px' },
    { key: 'strokeAlpha', label: 'Outline Opacity', type: 'range', min: 0, max: 1, step: 0.01 }
  ],
  medal: [
    { key: 'radius', label: 'Size', type: 'range', min: 8, max: 72, step: 1, suffix: 'px' },
    { key: 'fillAlpha', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeColor', label: 'Outline Color', type: 'color' },
    { key: 'strokeWidth', label: 'Outline Weight', type: 'range', min: 0, max: 8, step: 0.5, suffix: 'px' },
    { key: 'strokeAlpha', label: 'Outline Opacity', type: 'range', min: 0, max: 1, step: 0.01 }
  ],
  flag: [
    { key: 'height', label: 'Height', type: 'range', min: 20, max: 100, step: 1, suffix: 'px' },
    { key: 'width', label: 'Width', type: 'range', min: 32, max: 200, step: 2, suffix: 'px' },
    { key: 'fillAlpha', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 }
  ],
  pie: [
    { key: 'height', label: 'Stroke Weight', type: 'range', min: 1, max: 12, step: 0.5, suffix: 'px' },
    { key: 'radius', label: 'Radius', type: 'range', min: 6, max: 90, step: 1, suffix: 'px' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'fillColor', label: 'Fill Color', type: 'color' },
    { key: 'strokeColor', label: 'Stroke Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Background Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'fillAlpha', label: 'Fill Opacity', type: 'range', min: 0, max: 1, step: 0.01 }
  ],
  progressBar: [
    { key: 'height', label: 'Height', type: 'range', min: 4, max: 60, step: 1, suffix: 'px' },
    { key: 'width', label: 'Width', type: 'range', min: 80, max: 400, step: 2, suffix: 'px' },
    { key: 'radius', label: 'Corner Radius', type: 'range', min: 0, max: 30, step: 1, suffix: 'px' },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'fillColor', label: 'Fill Color', type: 'color' },
    { key: 'strokeColor', label: 'Stroke Color', type: 'color' },
    { key: 'backgroundAlpha', label: 'Background Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'fillAlpha', label: 'Fill Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'strokeWidth', label: 'Stroke Weight', type: 'range', min: 0, max: 8, step: 0.5, suffix: 'px' }
  ]
};

export function getRepStyleSchema(repType) {
  return REP_STYLE_SCHEMAS[String(repType || '')] || [];
}

export function createDefaultRepProps(repType, layerColorHex = SWIMFLOW_COLOR_SET.grey_light2) {
  const layerHex = normalizeHexColor(layerColorHex, SWIMFLOW_COLOR_SET.grey_light2);
  switch (repType) {
    case 'text':
      return {
        fontSize: 22,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        strokeWidth: 0,
        fillColor: SWIMFLOW_COLOR_SET.grey_light2,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        fillAlpha: 1,
        strokeAlpha: 1,
        showBackground: false,
        backgroundColor: SWIMFLOW_COLOR_SET.black,
        backgroundAlpha: 0.45,
        backgroundPaddingX: 12,
        backgroundPaddingY: 6,
        backgroundRadius: 8,
        fixedBackground: true
      };
    case 'medalSummary':
      return {
        awardSet: 'olympic',
        fontSize: 24,
        iconSize: 30,
        fontFamily: 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace',
        countPrefix: '',
        medalGap: 96,
        countGap: 17,
        fillColor: SWIMFLOW_COLOR_SET.grey_light2,
        goldColor: '#f5c84c',
        silverColor: '#cfd6e0',
        bronzeColor: '#c98a57',
        showBackground: false,
        backgroundColor: SWIMFLOW_COLOR_SET.black,
        backgroundAlpha: 0.45,
        backgroundPaddingX: 12,
        backgroundPaddingY: 8,
        backgroundRadius: 8
      };
    case 'ringsCount':
      return {
        fontSize: 28,
        iconSize: 36,
        fontFamily: 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace',
        countPrefix: '',
        textGap: 9,
        fillColor: SWIMFLOW_COLOR_SET.grey_light2,
        showBackground: false,
        backgroundColor: SWIMFLOW_COLOR_SET.black,
        backgroundAlpha: 0.45,
        backgroundPaddingX: 12,
        backgroundPaddingY: 6,
        backgroundRadius: 8
      };
    case 'bar':
      return {
        width: 200,
        height: 12,
        radius: 6,
        backgroundColor: SWIMFLOW_COLOR_SET.grey_middle,
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        backgroundAlpha: 0.9,
        fillAlpha: 0.95,
        strokeAlpha: 1,
        strokeWidth: 0
      };
    case 'glyph':
      return {
        width: 24,
        height: 4,
        radius: 18,
        headLen: 10,
        halfHeight: 7,
        tailRatio: 0.54,
        backgroundColor: SWIMFLOW_COLOR_SET.grey_middle,
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        fillAlpha: 0.95,
        strokeAlpha: 1,
        strokeWidth: 4
      };
    case 'circular':
      return {
        radius: 18,
        height: 4,
        backgroundColor: SWIMFLOW_COLOR_SET.grey_dark2,
        fillColor: layerHex,
        backgroundAlpha: 0.9,
        fillAlpha: 0.95
      };
    case 'line':
      return {
        width: 6,
        height: 100,
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        fillAlpha: 0.95
      };
    case 'arrow':
      return {
        width: 36,
        headLen: 12,
        halfHeight: 6,
        tailRatio: 0.54,
        originRadius: 5,
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        originStrokeColor: SWIMFLOW_COLOR_SET.grey_light3,
        originCoreColor: layerHex,
        fillAlpha: 0.95,
        strokeAlpha: 0.62,
        strokeWidth: 0.8
      };
    case 'badge':
      return {
        radius: 12,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark3,
        fillAlpha: 0.95,
        strokeAlpha: 1,
        strokeWidth: 0
      };
    case 'medal':
      return {
        radius: 22,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark3,
        fillAlpha: 0.98,
        strokeAlpha: 0.26,
        strokeWidth: 1.2
      };
    case 'flag':
      return {
        width: 64,
        height: 40,
        fillAlpha: 1
      };
    case 'pie':
      return {
        radius: 18,
        height: 3,
        backgroundColor: SWIMFLOW_COLOR_SET.grey_middle,
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        backgroundAlpha: 0.9,
        fillAlpha: 0.95
      };
    case 'progressBar':
      return {
        width: 200,
        height: 10,
        radius: 5,
        backgroundColor: SWIMFLOW_COLOR_SET.grey_middle,
        fillColor: layerHex,
        strokeColor: SWIMFLOW_COLOR_SET.grey_dark2,
        backgroundAlpha: 0.9,
        fillAlpha: 0.95,
        strokeWidth: 0
      };
    default:
      return {};
  }
}

export function ensureRepProps(repType, repProps, layerColorHex) {
  const defaults = createDefaultRepProps(repType, layerColorHex);
  const merged = { ...defaults, ...(repProps && typeof repProps === 'object' ? repProps : {}) };
  if (repType === 'medalSummary' || repType === 'ringsCount') {
    delete merged.countSuffix;
  }
  Object.keys(merged).forEach((key) => {
    const val = merged[key];
    if (typeof val === 'string' && key.toLowerCase().includes('color')) {
      merged[key] = normalizeHexColor(val, defaults[key] || SWIMFLOW_COLOR_SET.grey_light2);
    }
  });
  return merged;
}

function applySharedBarStyle(out, style, fallbackColor) {
  if (style.width != null) out.width = clamp(style.width, 10, 1000);
  if (style.height != null) out.height = clamp(style.height, 2, 240);
  if (style.radius != null) out.radius = clamp(style.radius, 0, 120);
  if (style.backgroundColor != null) out.backgroundColor = colorToPixi(style.backgroundColor, out.backgroundColor ?? 0x1f2937);
  if (style.fillColor != null) {
    const pixi = colorToPixi(style.fillColor, fallbackColor);
    if (Object.prototype.hasOwnProperty.call(out, 'overlayColor')) {
      out.overlayColor = pixi;
    } else if (Object.prototype.hasOwnProperty.call(out, 'baseFillColor')) {
      out.baseFillColor = pixi;
      out.overlayColor = pixi;
    } else {
      out.fillColor = pixi;
    }
  }
  if (style.strokeColor != null) out.strokeColor = colorToPixi(style.strokeColor, out.strokeColor ?? 0x424242);
  if (style.backgroundAlpha != null) out.backgroundAlpha = clamp01(style.backgroundAlpha);
  if (style.fillAlpha != null) out.fillAlpha = clamp01(style.fillAlpha);
  if (style.strokeAlpha != null) out.strokeAlpha = clamp01(style.strokeAlpha);
  if (style.strokeWidth != null) out.strokeWidth = clamp(style.strokeWidth, 0, 30);
  if (style.minValue != null) out.minValue = toNumber(style.minValue, out.minValue ?? 0);
  if (style.maxValue != null) out.maxValue = toNumber(style.maxValue, out.maxValue ?? 1);
  if (style.majorTickStep != null) out.majorTickStep = Math.max(0, toNumber(style.majorTickStep, out.majorTickStep ?? 1));
  if (style.minorTickStep != null) out.minorTickStep = Math.max(0, toNumber(style.minorTickStep, out.minorTickStep ?? 0));
  if (style.showTicks != null) out.showTicks = !!style.showTicks;
  if (style.showScaleText != null) {
    out.showScaleText = !!style.showScaleText;
  } else if (style.showTickLabels != null) {
    out.showScaleText = !!style.showTickLabels;
  }
  if (style.unitLabel != null) out.unitLabel = String(style.unitLabel);
  if (style.tickColor != null) out.tickColor = colorToPixi(style.tickColor, out.tickColor ?? 0xcbd5e1);
  if (style.labelColor != null) out.labelColor = colorToPixi(style.labelColor, out.labelColor ?? 0xe2e8f0);
  if (style.tickAlpha != null) out.tickAlpha = clamp01(style.tickAlpha);
  if (style.minorTickAlpha != null) out.minorTickAlpha = clamp01(style.minorTickAlpha);
  if (style.endpointTickAlpha != null) out.endpointTickAlpha = clamp01(style.endpointTickAlpha);
  if (style.tickWidth != null) out.tickWidth = clamp(style.tickWidth, 0.5, 12);
  if (style.tickInset != null) out.tickInset = clamp(style.tickInset, 0, 40);
  if (style.labelFontSize != null) out.labelFontSize = clamp(style.labelFontSize, 6, 48);
  if (style.labelOffsetY != null) out.labelOffsetY = clamp(style.labelOffsetY, -120, 160);
  if (style.unitGap != null) out.unitGap = clamp(style.unitGap, 0, 64);
}

export function applyRepresentationStyle(repType, baseSpec, repProps, styleOverrides, fallbackColor = 0xd3d3d3) {
  const out = { ...(baseSpec || {}) };
  const style = { ...(repProps || {}), ...(styleOverrides || {}) };

  if (repType === 'text') {
    if (style.fontSize != null) out.fontSize = clamp(style.fontSize, 6, 160);
    if (style.strokeWidth != null) out.strokeWidth = clamp(style.strokeWidth, 0, 30);
    if (style.fillColor != null || style.color != null) out.color = colorToPixi(style.fillColor ?? style.color, fallbackColor);
    if (style.strokeColor != null) out.strokeColor = colorToPixi(style.strokeColor, out.strokeColor ?? 0x424242);
    if (style.fillAlpha != null) out.fillAlpha = clamp01(style.fillAlpha);
    if (style.strokeAlpha != null) out.strokeAlpha = clamp01(style.strokeAlpha);
    if (style.fontWeight != null) out.fontWeight = String(style.fontWeight);
    if (style.fontFamily != null) out.fontFamily = String(style.fontFamily);
    if (style.showBackground != null) out.showBackground = !!style.showBackground;
    if (style.backgroundColor != null) out.backgroundColor = colorToPixi(style.backgroundColor, out.backgroundColor ?? 0x000000);
    if (style.backgroundAlpha != null) out.backgroundAlpha = clamp01(style.backgroundAlpha);
    if (style.backgroundPaddingX != null) out.backgroundPaddingX = clamp(style.backgroundPaddingX, 0, 80);
    if (style.backgroundPaddingY != null) out.backgroundPaddingY = clamp(style.backgroundPaddingY, 0, 80);
    if (style.backgroundRadius != null) out.backgroundRadius = clamp(style.backgroundRadius, 0, 40);
    if (style.fixedBackground != null) out.fixedBackground = !!style.fixedBackground;
    return out;
  }

  if (repType === 'medalSummary' || repType === 'ringsCount') {
    if (repType === 'medalSummary' && style.awardSet != null) out.awardSet = String(style.awardSet);
    if (style.fontSize != null) out.fontSize = clamp(style.fontSize, 6, 120);
    if (style.iconSize != null) out.iconSize = clamp(style.iconSize, 6, 96);
    if (style.fontFamily != null) out.fontFamily = String(style.fontFamily);
    if (style.countPrefix != null) out.countPrefix = String(style.countPrefix);
    if (style.medalGap != null) out.medalGap = clamp(style.medalGap, 0, 200);
    if (style.textGap != null) out.textGap = clamp(style.textGap, 0, 80);
    if (style.countGap != null) out.countGap = clamp(style.countGap, 0, 80);
    if (style.fillColor != null || style.color != null) out.color = colorToPixi(style.fillColor ?? style.color, fallbackColor);
    if (style.goldColor != null) out.goldColor = colorToPixi(style.goldColor, out.goldColor ?? 0xf5c84c);
    if (style.silverColor != null) out.silverColor = colorToPixi(style.silverColor, out.silverColor ?? 0xcfd6e0);
    if (style.bronzeColor != null) out.bronzeColor = colorToPixi(style.bronzeColor, out.bronzeColor ?? 0xc98a57);
    if (style.showBackground != null) out.showBackground = !!style.showBackground;
    if (style.backgroundColor != null) out.backgroundColor = colorToPixi(style.backgroundColor, out.backgroundColor ?? 0x000000);
    if (style.backgroundAlpha != null) out.backgroundAlpha = clamp01(style.backgroundAlpha);
    if (style.backgroundPaddingX != null) out.backgroundPaddingX = clamp(style.backgroundPaddingX, 0, 80);
    if (style.backgroundPaddingY != null) out.backgroundPaddingY = clamp(style.backgroundPaddingY, 0, 80);
    if (style.backgroundRadius != null) out.backgroundRadius = clamp(style.backgroundRadius, 0, 40);
    return out;
  }

  if (repType === 'bar' || repType === 'progressBar') {
    applySharedBarStyle(out, style, fallbackColor);
    return out;
  }

  if (repType === 'glyph') {
    if (style.radius != null) out.radius = clamp(style.radius, 1, 160);
    if (style.width != null) {
      if (out.variant === 'sector' || out.variant === 'badge') {
        out.radius = clamp(style.width, 2, 180);
      } else {
        out.length = clamp(style.width, 4, 320);
      }
    }
    if (style.height != null) {
      const w = clamp(style.height, 0, 30);
      out.strokeWidth = w;
      out.bgStrokeWidth = Math.max(1, w);
    }
    if (style.headLen != null) out.headLen = clamp(style.headLen, 2, 120);
    if (style.halfHeight != null) out.halfHeight = clamp(style.halfHeight, 1, 80);
    if (style.tailRatio != null) out.tailRatio = clamp(style.tailRatio, 0.2, 1);
    if (style.fillColor != null) {
      const pixi = colorToPixi(style.fillColor, fallbackColor);
      out.fillColor = pixi;
      out.strokeColor = pixi;
    }
    if (style.strokeColor != null) {
      const pixi = colorToPixi(style.strokeColor, 0x424242);
      out.textColor = pixi;
      out.bgStrokeColor = pixi;
      if (out.variant === 'arrow') out.strokeColor = pixi;
    }
    if (style.backgroundColor != null) out.bgStrokeColor = colorToPixi(style.backgroundColor, out.bgStrokeColor ?? 0x1f2937);
    if (style.fillAlpha != null) {
      out.fillAlpha = clamp01(style.fillAlpha);
      out.strokeAlpha = clamp01(style.fillAlpha);
    }
    if (style.strokeWidth != null) {
      const w = clamp(style.strokeWidth, 0, 30);
      out.strokeWidth = w;
      out.bgStrokeWidth = Math.max(1, w);
    }
    return out;
  }

  if (repType === 'circular') {
    out.variant = out.variant || 'sector';
    if (style.radius != null) out.radius = clamp(style.radius, 2, 160);
    if (style.height != null) {
      const w = clamp(style.height, 0, 30);
      out.strokeWidth = w;
      out.bgStrokeWidth = Math.max(1, w);
    }
    if (style.backgroundColor != null) out.bgStrokeColor = colorToPixi(style.backgroundColor, out.bgStrokeColor ?? 0x1f2937);
    if (style.fillColor != null) {
      const pixi = colorToPixi(style.fillColor, out.strokeColor ?? fallbackColor);
      out.strokeColor = pixi;
      out.valueColor = pixi;
    }
    if (style.backgroundAlpha != null) out.bgStrokeAlpha = clamp01(style.backgroundAlpha);
    if (style.fillAlpha != null) out.strokeAlpha = clamp01(style.fillAlpha);
    if (style.showText != null) out.showText = !!style.showText;
    if (style.showUnit != null) out.showUnit = !!style.showUnit;
    if (style.valueColor != null) out.valueColor = colorToPixi(style.valueColor, out.valueColor ?? out.strokeColor ?? fallbackColor);
    if (style.unitColor != null) out.unitColor = colorToPixi(style.unitColor, out.unitColor ?? 0xe5e7eb);
    if (style.valueFontSize != null) out.valueFontSize = clamp(style.valueFontSize, 6, 96);
    if (style.unitFontSize != null) out.unitFontSize = clamp(style.unitFontSize, 6, 72);
    if (style.textOffsetY != null) out.textOffsetY = clamp(style.textOffsetY, -120, 160);
    if (style.valueUnitGap != null) out.valueUnitGap = clamp(style.valueUnitGap, 0, 64);
    return out;
  }

    if (repType === 'line') {
      if (style.width != null) {
        const width = clamp(style.width, 1, 80);
        if (out.variant === 'compareLine') out.childLineWidth = width;
        else out.width = width;
    }
    if (style.height != null) out.height = clamp(style.height, 2, 1000);
    if (style.fillColor != null) {
      const pixi = colorToPixi(style.fillColor, out.color ?? fallbackColor);
      if (out.variant === 'compareLine') out.childLineColor = pixi;
      else out.color = pixi;
    }
    if (style.strokeColor != null) {
      const pixi = colorToPixi(style.strokeColor, out.mainLineColor ?? 0xf8fafc);
      if (out.variant === 'compareLine') out.mainLineColor = pixi;
    }
    if (style.fillAlpha != null) {
      const alpha = clamp01(style.fillAlpha);
      if (out.variant === 'compareLine') out.childLineAlpha = alpha;
      else out.alpha = alpha;
    }
    if (style.mainLineWidth != null) out.mainLineWidth = clamp(style.mainLineWidth, 1, 40);
    if (style.childLineWidth != null) out.childLineWidth = clamp(style.childLineWidth, 1, 40);
    if (style.mainStrokeWidth != null) out.mainStrokeWidth = clamp(style.mainStrokeWidth, 0, 48);
    if (style.childStrokeWidth != null) out.childStrokeWidth = clamp(style.childStrokeWidth, 0, 48);
    if (style.mainLineColor != null) out.mainLineColor = colorToPixi(style.mainLineColor, out.mainLineColor ?? 0xf8fafc);
    if (style.childLineColor != null) out.childLineColor = colorToPixi(style.childLineColor, out.childLineColor ?? fallbackColor);
    if (style.mainStrokeColor != null) out.mainStrokeColor = colorToPixi(style.mainStrokeColor, out.mainStrokeColor ?? 0x0f172a);
    if (style.childStrokeColor != null) out.childStrokeColor = colorToPixi(style.childStrokeColor, out.childStrokeColor ?? 0x0f172a);
    if (style.mainLineAlpha != null) out.mainLineAlpha = clamp01(style.mainLineAlpha);
    if (style.childLineAlpha != null) out.childLineAlpha = clamp01(style.childLineAlpha);
    if (style.mainStrokeAlpha != null) out.mainStrokeAlpha = clamp01(style.mainStrokeAlpha);
    else if (style.mainGlowAlpha != null) out.mainStrokeAlpha = clamp01(style.mainGlowAlpha);
    if (style.childStrokeAlpha != null) out.childStrokeAlpha = clamp01(style.childStrokeAlpha);
    else if (style.childGlowAlpha != null) out.childStrokeAlpha = clamp01(style.childGlowAlpha);
    if (style.showDebugOverlay != null) out.showDebugOverlay = !!style.showDebugOverlay;
    if (style.debugColor != null) out.debugColor = normalizeHexColor(style.debugColor, out.debugColor ?? SWIMFLOW_COLOR_SET.grey_light3);
    if (style.debugAlpha != null) out.debugAlpha = clamp01(style.debugAlpha);
    if (style.debugWidth != null) out.debugWidth = clamp(style.debugWidth, 0.5, 12);
    if (style.debugLabelColor != null) out.debugLabelColor = normalizeHexColor(style.debugLabelColor, out.debugLabelColor ?? SWIMFLOW_COLOR_SET.grey_light3);
    if (style.debugLabelBgColor != null) out.debugLabelBgColor = normalizeHexColor(style.debugLabelBgColor, out.debugLabelBgColor ?? SWIMFLOW_COLOR_SET.black);
    if (style.debugLabelBgAlpha != null) out.debugLabelBgAlpha = clamp01(style.debugLabelBgAlpha);
    if (style.debugLabelFontSize != null) out.debugLabelFontSize = clamp(style.debugLabelFontSize, 8, 48);
    if (style.debugLabelPaddingX != null) out.debugLabelPaddingX = clamp(style.debugLabelPaddingX, 0, 40);
    if (style.debugLabelPaddingY != null) out.debugLabelPaddingY = clamp(style.debugLabelPaddingY, 0, 32);
    if (style.debugLabelRadius != null) out.debugLabelRadius = clamp(style.debugLabelRadius, 0, 32);
    if (style.debugLabelOffsetY != null) out.debugLabelOffsetY = clamp(style.debugLabelOffsetY, -120, 120);
    if (style.debugEndpointLabelColor != null) out.debugEndpointLabelColor = normalizeHexColor(style.debugEndpointLabelColor, out.debugEndpointLabelColor ?? SWIMFLOW_COLOR_SET.grey_light3);
    if (style.debugEndpointLabelFontSize != null) out.debugEndpointLabelFontSize = clamp(style.debugEndpointLabelFontSize, 8, 36);
    if (style.debugEndpointLabelOffsetY != null) out.debugEndpointLabelOffsetY = clamp(style.debugEndpointLabelOffsetY, 0, 64);
    return out;
  }

  if (repType === 'arrow') {
    if (style.width != null) {
      const width = clamp(style.width, 4, 360);
      if (out.variant !== 'baselineDelta' && !out.lockLength) out.length = width;
    }
    if (style.headLen != null) out.headLen = clamp(style.headLen, 2, 120);
    if (style.halfHeight != null) out.halfHeight = clamp(style.halfHeight, 1, 80);
    if (style.tailRatio != null) out.tailRatio = clamp(style.tailRatio, 0.2, 1);
    if (style.fillColor != null) {
      const pixi = colorToPixi(style.fillColor, out.color ?? fallbackColor);
      out.color = pixi;
    }
    if (style.fillAlpha != null) {
      out.alpha = clamp01(style.fillAlpha);
      if (out.variant === 'baselineDelta') out.originFillAlpha = out.alpha;
    }
    if (style.strokeColor != null) out.strokeColor = colorToPixi(style.strokeColor, out.strokeColor ?? 0x424242);
    if (style.strokeAlpha != null) out.strokeAlpha = clamp01(style.strokeAlpha);
    if (style.strokeWidth != null) out.strokeWidth = clamp(style.strokeWidth, 0, 20);
    if (style.originRadius != null) out.originRadius = clamp(style.originRadius, 2, 40);
    if (style.originStrokeColor != null) out.originStrokeColor = colorToPixi(style.originStrokeColor, out.originStrokeColor ?? 0xf8fafc);
    if (style.originCoreColor != null) out.originCoreColor = colorToPixi(style.originCoreColor, out.originCoreColor ?? out.color ?? fallbackColor);
    return out;
  }

  if (repType === 'badge') {
    out.variant = 'badge';
    if (style.radius != null) out.radius = clamp(style.radius, 2, 120);
    if (style.fontSize != null) out.fontSize = clamp(style.fontSize, 6, 120);
    if (style.fontWeight != null) out.fontWeight = String(style.fontWeight);
    if (style.fontFamily != null) out.fontFamily = String(style.fontFamily);
    if (style.fillColor != null) out.fillColor = colorToPixi(style.fillColor, out.fillColor ?? fallbackColor);
    if (style.strokeColor != null) {
      const pixi = colorToPixi(style.strokeColor, out.textColor ?? 0x0b0b0b);
      out.textColor = pixi;
      out.strokeColor = pixi;
    }
    if (style.fillAlpha != null) out.fillAlpha = clamp01(style.fillAlpha);
    if (style.strokeAlpha != null) out.strokeAlpha = clamp01(style.strokeAlpha);
    if (style.strokeWidth != null) out.strokeWidth = clamp(style.strokeWidth, 0, 20);
    return out;
  }

  if (repType === 'medal') {
    out.variant = 'medal';
    if (style.radius != null) out.radius = clamp(style.radius, 4, 144);
    if (style.fillAlpha != null) out.fillAlpha = clamp01(style.fillAlpha);
    if (style.strokeColor != null) out.strokeColor = colorToPixi(style.strokeColor, out.strokeColor ?? 0x0f172a);
    if (style.strokeAlpha != null) out.strokeAlpha = clamp01(style.strokeAlpha);
    if (style.strokeWidth != null) out.strokeWidth = clamp(style.strokeWidth, 0, 20);
    return out;
  }

  if (repType === 'flag') {
    if (style.width != null) out.width = clamp(style.width, 8, 260);
    if (style.height != null) out.height = clamp(style.height, 8, 160);
    if (style.fillAlpha != null) out.alpha = clamp01(style.fillAlpha);
    return out;
  }

  if (repType === 'pie') {
    if (style.radius != null) out.radius = clamp(style.radius, 2, 160);
    if (style.height != null) out.strokeWidth = clamp(style.height, 0, 20);
    if (style.backgroundColor != null) out.backgroundColor = colorToPixi(style.backgroundColor, out.backgroundColor ?? 0x1f2937);
    if (style.fillColor != null) out.fillColor = colorToPixi(style.fillColor, out.fillColor ?? fallbackColor);
    if (style.backgroundAlpha != null) out.backgroundAlpha = clamp01(style.backgroundAlpha);
    if (style.fillAlpha != null) out.fillAlpha = clamp01(style.fillAlpha);
    if (style.strokeColor != null) out.strokeColor = colorToPixi(style.strokeColor, out.strokeColor ?? 0x424242);
    if (style.strokeWidth != null) out.strokeWidth = clamp(style.strokeWidth, 0, 20);
    if (style.strokeAlpha != null) out.strokeAlpha = clamp01(style.strokeAlpha);
    return out;
  }

  return out;
}

export function formatRepPropReadout(def, value) {
  if (!def) return String(value ?? '');
  if (def.type === 'range') {
    const num = toNumber(value, 0);
    const fixed = def.step && Number(def.step) < 1 ? num.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(Math.round(num * 100) / 100);
    return `${fixed}${def.suffix || ''}`;
  }
  return String(value ?? '');
}
