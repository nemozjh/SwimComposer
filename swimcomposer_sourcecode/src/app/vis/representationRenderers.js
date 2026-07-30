
function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function ensureNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function colorToRgbaString(rawColor, rawAlpha = 1, fallback = 0xffffff) {
  const color = Math.max(0, Math.min(0xffffff, ensureNumber(rawColor, fallback)));
  const alpha = clamp01(rawAlpha);
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function colorToHexString(rawColor, fallback = 0xffffff) {
  const color = Math.max(0, Math.min(0xffffff, ensureNumber(rawColor, fallback)));
  return `#${color.toString(16).padStart(6, '0')}`;
}

const medalTextureCache = new Map();

function getMedalTexture({ medalKind = 'gold', label = '1', strokeColor = 0x0f172a, strokeAlpha = 0.26, strokeWidth = 1.2 } = {}) {
  const kind = String(medalKind || 'gold').toLowerCase();
  const safeLabel = String(label || '').trim() || '1';
  const outlineColor = colorToHexString(strokeColor, 0x0f172a);
  const outlineOpacity = clamp01(strokeAlpha);
  const outlineWidth = Math.max(0, ensureNumber(strokeWidth, 1.2));
  const key = [kind, safeLabel, outlineColor, outlineOpacity.toFixed(3), outlineWidth.toFixed(2)].join('|');
  if (medalTextureCache.has(key)) return medalTextureCache.get(key);

  const paletteByMedal = {
    gold: {
      ribbonLeft: '#2563eb',
      ribbonRight: '#1d4ed8',
      discOuter: '#c89110',
      discInner: '#fcd34d',
      discGlow: '#fff2b3',
      text: '#1f2937'
    },
    silver: {
      ribbonLeft: '#3b82f6',
      ribbonRight: '#2563eb',
      discOuter: '#7c8798',
      discInner: '#d7dde7',
      discGlow: '#ffffff',
      text: '#1f2937'
    },
    bronze: {
      ribbonLeft: '#0f766e',
      ribbonRight: '#115e59',
      discOuter: '#8b4a1e',
      discInner: '#cd7f32',
      discGlow: '#f6d0b4',
      text: '#1f2937'
    }
  };
  const palette = paletteByMedal[kind] || paletteByMedal.gold;
  const idBase = `${kind}-${safeLabel.replace(/[^a-z0-9_-]/gi, '') || 'x'}-${outlineColor.replace('#', '')}`;
  const gradientId = `medal-grad-${idBase}`;
  const shineId = `medal-shine-${idBase}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="110" height="136" viewBox="0 0 110 136">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.discGlow}" />
          <stop offset="52%" stop-color="${palette.discInner}" />
          <stop offset="100%" stop-color="${palette.discOuter}" />
        </linearGradient>
        <radialGradient id="${shineId}" cx="35%" cy="28%" r="62%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.88" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <path d="M24 8 L47 8 L43 50 L19 50 Z" fill="${palette.ribbonLeft}" />
      <path d="M63 8 L86 8 L91 50 L67 50 Z" fill="${palette.ribbonRight}" />
      <rect x="43" y="42" width="24" height="14" rx="6" fill="#f8fafc" fill-opacity="0.96" />
      <circle cx="55" cy="78" r="34" fill="url(#${gradientId})" stroke="${outlineColor}" stroke-opacity="${outlineOpacity}" stroke-width="${outlineWidth}" />
      <circle cx="55" cy="78" r="26" fill="url(#${shineId})" />
      <circle cx="55" cy="78" r="22" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3.2" />
      <text x="55" y="89" text-anchor="middle" font-family="SF Pro Display, Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="${palette.text}">${safeLabel}</text>
    </svg>
  `;
  const texture = PIXI.Texture.from(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  medalTextureCache.set(key, texture);
  return texture;
}

export function resetInstanceVisualState(inst) {
  if (!inst) return;
  if (inst.textBg) {
    inst.textBg.visible = false;
    inst.textBg.clear();
  }
  if (inst.barBg) {
    inst.barBg.visible = false;
    inst.barBg.clear();
  }
  if (inst.barFill) {
    inst.barFill.visible = false;
    inst.barFill.clear();
  }
  if (inst.barFill2) {
    inst.barFill2.visible = false;
    inst.barFill2.clear();
  }
  if (inst.circle) {
    inst.circle.visible = false;
    inst.circle.clear();
    inst.circle.scale?.set?.(1, 1);
  }
  if (inst.text) {
    inst.text.visible = false;
    inst.text.text = '';
    inst.text.position.set(0, 0);
    inst.text.anchor.set(0.5);
  }
  if (inst.__auxTexts) {
    inst.__auxTexts.forEach((txt) => {
      txt.visible = false;
      txt.text = '';
      txt.position.set(0, 0);
      txt.anchor?.set?.(0.5);
    });
  }
  if (inst.flagSprite) {
    inst.flagSprite.visible = false;
    inst.flagSprite.position.set(0, 0);
    inst.flagSprite.anchor?.set?.(0.5);
  }
}

function ensureAuxText(inst, key, defaults = {}) {
  if (!inst) return null;
  if (!inst.__auxTexts) inst.__auxTexts = new Map();
  let txt = inst.__auxTexts.get(key);
  if (txt) return txt;
  txt = new PIXI.Text('', {
    fontSize: defaults.fontSize ?? 14,
    fill: defaults.fill ?? 0xffffff,
    fontWeight: defaults.fontWeight ?? '700',
    fontFamily: defaults.fontFamily ?? 'system-ui',
    resolution: Math.max(1, inst.text?.resolution || globalThis.devicePixelRatio || 1)
  });
  inst.content?.addChild?.(txt);
  inst.__auxTexts.set(key, txt);
  return txt;
}

function roundScaleValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
}

function buildLinearScaleValues(minValue, maxValue, step) {
  const safeMin = Number(minValue);
  const safeMax = Number(maxValue);
  const safeStep = Number(step);
  if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || !(safeMax > safeMin) || !(safeStep > 0)) {
    return [];
  }
  const values = [];
  const maxIterations = 256;
  for (let i = 0; i <= maxIterations; i += 1) {
    const next = roundScaleValue(safeMin + safeStep * i);
    if (next > safeMax + safeStep * 0.25) break;
    values.push(Math.max(safeMin, Math.min(safeMax, next)));
  }
  if (!values.length || Math.abs(values[values.length - 1] - safeMax) > 1e-6) {
    values.push(safeMax);
  }
  return Array.from(new Set(values.map((value) => roundScaleValue(value))));
}

function formatScaleLabel(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  if (Math.abs(num - Math.round(num)) < 1e-6) return String(Math.round(num));
  return num.toFixed(1).replace(/\.0$/, '');
}

function drawRoundedBackground(graphics, raw = null) {
  if (!graphics) return;
  if (!raw || typeof raw !== 'object') {
    graphics.clear();
    graphics.visible = false;
    return;
  }
  const {
    left = 0,
    top = 0,
    width = 0,
    height = 0,
    radius = 8,
    color = 0x000000,
    alpha = 0.45
  } = raw;
  graphics.clear();
  if (!(width > 0 && height > 0)) {
    graphics.visible = false;
    return;
  }
  graphics.beginFill(color, alpha);
  graphics.drawRoundedRect(left, top, width, height, Math.max(0, radius));
  graphics.endFill();
  graphics.visible = true;
}

function drawOlympicRings(graphics, x, y, radius, alpha = 1) {
  if (!graphics) return;
  const r = Math.max(2, radius);
  const lw = Math.max(1.6, r * 0.34);
  const dx = r * 2.06;
  const dy = r * 0.9;
  const colors = [0x3fa9ff, 0x2d3748, 0xff4f6d, 0xf7d64f, 0x39c57a];
  const positions = [
    [x - dx, y - dy * 0.5],
    [x, y - dy * 0.5],
    [x + dx, y - dy * 0.5],
    [x - dx * 0.5, y + dy * 0.55],
    [x + dx * 0.5, y + dy * 0.55]
  ];
  colors.forEach((color, idx) => {
    const [cx, cy] = positions[idx];
    graphics.lineStyle(lw, color, alpha, 0.8);
    graphics.drawCircle(cx, cy, r);
  });
  graphics.lineStyle(0);
}

function drawWchBadge(graphics, x, y, width, height, alpha = 1) {
  if (!graphics) return;
  const w = Math.max(28, width);
  const h = Math.max(14, height);
  const radius = Math.max(4, h * 0.32);
  const fill = 0x122033;
  const stroke = 0xd7b468;
  const accent = 0x8edcff;
  graphics.beginFill(fill, alpha * 0.94);
  graphics.drawRoundedRect(x - w * 0.5, y - h * 0.5, w, h, radius);
  graphics.endFill();
  graphics.lineStyle(Math.max(1.2, h * 0.08), stroke, alpha * 0.92, 0.8);
  graphics.drawRoundedRect(x - w * 0.5, y - h * 0.5, w, h, radius);
  graphics.lineStyle(Math.max(0.8, h * 0.04), accent, alpha * 0.26, 0.8);
  graphics.moveTo(x - w * 0.26, y - h * 0.18);
  graphics.lineTo(x + w * 0.26, y - h * 0.18);
  graphics.moveTo(x - w * 0.26, y + h * 0.18);
  graphics.lineTo(x + w * 0.26, y + h * 0.18);
  graphics.lineStyle(0);
  graphics.beginFill(stroke, alpha * 0.92);
  graphics.drawCircle(x - w * 0.34, y, Math.max(1.6, h * 0.07));
  graphics.drawCircle(x + w * 0.34, y, Math.max(1.6, h * 0.07));
  graphics.endFill();
}

function drawMedalIcon(graphics, x, y, size, fillColor, alpha = 1) {
  if (!graphics) return;
  const medalR = Math.max(3, size * 0.34);
  const ribbonH = Math.max(3, size * 0.24);
  const ribbonW = Math.max(5, size * 0.56);
  const ribbonColor = 0x8fb8ff;
  graphics.beginFill(ribbonColor, alpha * 0.9);
  graphics.drawRoundedRect(x - ribbonW * 0.5, y - medalR - ribbonH - 1, ribbonW, ribbonH, Math.max(1, ribbonH * 0.22));
  graphics.endFill();
  graphics.beginFill(fillColor, alpha);
  graphics.drawCircle(x, y, medalR);
  graphics.endFill();
  graphics.beginFill(0xffffff, alpha * 0.18);
  graphics.drawCircle(x - medalR * 0.25, y - medalR * 0.25, medalR * 0.45);
  graphics.endFill();
}

function renderRingsCount(inst, spec) {
  if (!inst?.circle || !inst?.text) return;
  const iconSize = Math.max(8, ensureNumber(spec?.iconSize, 18));
  const fontSize = Math.max(8, ensureNumber(spec?.fontSize, 20));
  const count = Math.max(0, Math.round(ensureNumber(spec?.count, 0)));
  const color = ensureNumber(spec?.color, 0xd3d3d3);
  const anchorX = ensureNumber(spec?.anchorX, 0.5);
  const countPrefix = spec?.countPrefix != null ? String(spec.countPrefix) : '×';
  const fontFamily = spec?.fontFamily != null
    ? String(spec.fontFamily)
    : 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace';
  const countText = `${countPrefix}${count}`;
  const ringRadius = iconSize * 0.18;
  const ringDx = ringRadius * 2.06;
  const iconBlockW = ringDx * 2 + ringRadius * 2;
  const gap = Math.max(0, ensureNumber(spec?.textGap, Math.max(4, iconSize * 0.24)));

  inst.text.visible = true;
  inst.text.text = countText;
  inst.text.style.fill = color;
  inst.text.style.fontSize = fontSize;
  inst.text.style.fontWeight = '700';
  inst.text.style.fontFamily = fontFamily;
  inst.text.anchor.set(0, 0.5);
  inst.text.position.set(iconBlockW + gap, 0);
  const textBounds = inst.text.getLocalBounds();
  const totalW = iconBlockW + gap + Math.max(1, textBounds.width);
  const totalH = Math.max(iconSize * 1.6, Math.max(1, textBounds.height));
  const left = -totalW * anchorX;
  const top = -totalH * 0.5;
  const shiftX = left;
  inst.text.position.set(shiftX + iconBlockW + gap, 0);

  drawRoundedBackground(
    inst.textBg,
    spec?.showBackground
      ? {
          left: left - ensureNumber(spec?.backgroundPaddingX, 12),
          top: top - ensureNumber(spec?.backgroundPaddingY, 6),
          width: totalW + ensureNumber(spec?.backgroundPaddingX, 12) * 2,
          height: totalH + ensureNumber(spec?.backgroundPaddingY, 6) * 2,
          radius: ensureNumber(spec?.backgroundRadius, 8),
          color: ensureNumber(spec?.backgroundColor, 0x000000),
          alpha: ensureNumber(spec?.backgroundAlpha, 0.45)
        }
      : null
  );

  inst.circle.visible = true;
  inst.circle.clear();
  drawOlympicRings(inst.circle, shiftX + iconBlockW * 0.5, 0, ringRadius, 0.96);
}

function renderMedalSummary(inst, spec) {
  if (!inst?.circle) return;
  const awards = spec?.awards || {};
  const awardSet = String(spec?.awardSet || 'olympic').toLowerCase() === 'world' ? 'world' : 'olympic';
  const bucket = awardSet === 'world'
    ? (awards.world_championships || {})
    : (awards.olympic_games || {});
  const iconSize = Math.max(10, ensureNumber(spec?.iconSize, 30));
  const fontSize = Math.max(10, ensureNumber(spec?.fontSize, 24));
  const medalGap = Math.max(0, ensureNumber(spec?.medalGap, Math.max(22, iconSize * 3.2)));
  const countGap = Math.max(0, ensureNumber(spec?.countGap, iconSize * 0.58));
  const anchorX = ensureNumber(spec?.anchorX, 0.5);
  const goldColor = ensureNumber(spec?.goldColor, 0xf5c84c);
  const silverColor = ensureNumber(spec?.silverColor, 0xcfd6e0);
  const bronzeColor = ensureNumber(spec?.bronzeColor, 0xc98a57);
  const countColor = ensureNumber(spec?.color, 0xd3d3d3);
  const fontFamily = spec?.fontFamily != null
    ? String(spec.fontFamily)
    : 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace';
  const countPrefix = spec?.countPrefix != null ? String(spec.countPrefix) : '×';
  const medalColors = [goldColor, silverColor, bronzeColor];
  const rowY = 0;

  inst.circle.visible = true;
  inst.circle.clear();

  const wchLabel = ensureAuxText(inst, 'award-wch-label', { fontSize: Math.max(10, fontSize * 0.7) });
  wchLabel.visible = awardSet === 'world';
  if (awardSet === 'world') {
    wchLabel.text = 'WCH';
    wchLabel.style.fill = countColor;
    wchLabel.style.fontSize = Math.max(12, fontSize * 0.68);
    wchLabel.style.fontWeight = '700';
    wchLabel.anchor.set(0.5, 0.5);
    wchLabel.position.set(0, rowY);
  }
  const wchLabelBounds = awardSet === 'world' ? wchLabel.getLocalBounds() : null;
  const labelWidth = awardSet === 'world'
    ? Math.max(48, Math.ceil(Math.max(1, wchLabelBounds?.width || 0) + iconSize * 1.05))
    : Math.max(52, iconSize * 4.8);
  const labelGap = awardSet === 'world' ? Math.max(12, iconSize * 0.42) : 0;
  const startX = labelWidth + labelGap;
  const emptyText = ensureAuxText(inst, 'award-empty', { fontSize: Math.max(10, fontSize * 0.82) });
  emptyText.visible = false;
  emptyText.alpha = 1;

  let maxRight = startX;
  const values = [bucket?.gold ?? 0, bucket?.silver ?? 0, bucket?.bronze ?? 0];
  const medalEntries = values
    .map((count, idx) => ({ idx, count: Math.max(0, Math.round(ensureNumber(count, 0))) }))
    .filter((entry) => entry.count > 0);
  const showEmpty = medalEntries.length === 0;
  [0, 1, 2].forEach((idx) => {
    const countText = ensureAuxText(inst, `award-single-${idx}`, { fontSize });
    countText.visible = false;
  });
  ['award-og-0', 'award-og-1', 'award-og-2', 'award-wch-0', 'award-wch-1', 'award-wch-2'].forEach((key) => {
    const txt = inst.__auxTexts?.get?.(key);
    if (txt) txt.visible = false;
  });
  if (showEmpty) {
    emptyText.visible = true;
    emptyText.text = 'No medals';
    emptyText.style.fill = 0xb8c1ce;
    emptyText.style.fontSize = Math.max(10, fontSize * 0.8);
    emptyText.style.fontWeight = '600';
    emptyText.style.fontFamily = fontFamily;
    emptyText.anchor.set(0, 0.5);
    emptyText.position.set(startX, rowY);
    const bounds = emptyText.getLocalBounds();
    maxRight = Math.max(maxRight, emptyText.position.x + Math.max(1, bounds.width));
  } else {
    medalEntries.forEach((entry, renderIdx) => {
      const medalX = startX + renderIdx * medalGap;
      const countText = ensureAuxText(inst, `award-single-${entry.idx}`, { fontSize });
      countText.visible = true;
      countText.text = `${countPrefix}${entry.count}`;
      countText.style.fill = countColor;
      countText.style.fontSize = fontSize;
      countText.style.fontWeight = '700';
      countText.style.fontFamily = fontFamily;
      countText.anchor.set(0, 0.5);
      countText.position.set(medalX + countGap, rowY);
      const bounds = countText.getLocalBounds();
      maxRight = Math.max(maxRight, countText.position.x + Math.max(1, bounds.width));
    });
  }

  const totalLeft = 0;
  const totalTop = -iconSize * 0.85;
  const totalHeight = iconSize * 1.7;
  const totalWidth = maxRight - totalLeft;
  const shiftX = -totalWidth * anchorX;
  if (awardSet === 'world') {
    const badgeCenterX = shiftX + labelWidth * 0.5;
    drawWchBadge(inst.circle, badgeCenterX, rowY, labelWidth - 6, Math.max(18, iconSize * 0.82), 1);
    wchLabel.position.x = badgeCenterX;
  } else {
    drawOlympicRings(inst.circle, shiftX + startX - labelWidth * 0.42, rowY, iconSize * 0.26, 1);
  }
  if (showEmpty) {
    emptyText.position.x = shiftX + startX;
  } else {
    medalEntries.forEach((entry, renderIdx) => {
      const medalX = shiftX + startX + renderIdx * medalGap;
      drawMedalIcon(inst.circle, medalX, rowY, iconSize, medalColors[entry.idx], 1);
      const countText = ensureAuxText(inst, `award-single-${entry.idx}`, { fontSize });
      countText.position.set(medalX + countGap, rowY);
    });
  }
  drawRoundedBackground(
    inst.textBg,
    spec?.showBackground
      ? {
          left: shiftX + totalLeft - ensureNumber(spec?.backgroundPaddingX, 12),
          top: totalTop - ensureNumber(spec?.backgroundPaddingY, 8),
          width: totalWidth + ensureNumber(spec?.backgroundPaddingX, 12) * 2,
          height: totalHeight + ensureNumber(spec?.backgroundPaddingY, 8) * 2,
          radius: ensureNumber(spec?.backgroundRadius, 8),
          color: ensureNumber(spec?.backgroundColor, 0x000000),
          alpha: ensureNumber(spec?.backgroundAlpha, 0.45)
        }
      : null
  );
}

function renderText(inst, spec) {
  if (!inst?.text) return;
  inst.text.visible = true;
  inst.text.text = spec?.text ?? '';
  const fillAlpha = ensureNumber(spec?.fillAlpha, 1);
  const strokeAlpha = ensureNumber(spec?.strokeAlpha, 1);
  if (Number.isFinite(spec?.color)) {
    inst.text.style.fill = colorToRgbaString(spec.color, fillAlpha, 0xffffff);
  }
  if (Number.isFinite(spec?.fontSize)) inst.text.style.fontSize = spec.fontSize;
  if (spec?.fontWeight != null) inst.text.style.fontWeight = String(spec.fontWeight);
  if (spec?.fontFamily != null) inst.text.style.fontFamily = String(spec.fontFamily);
  if (Number.isFinite(spec?.strokeColor)) {
    inst.text.style.stroke = colorToRgbaString(spec.strokeColor, strokeAlpha, 0x424242);
  }
  if (Number.isFinite(spec?.strokeWidth)) inst.text.style.strokeThickness = Math.max(0, spec.strokeWidth);
  if (spec?.align != null) inst.text.style.align = String(spec.align);
  if (Number.isFinite(spec?.maxWidth) && spec.maxWidth > 0) {
    inst.text.style.wordWrap = true;
    inst.text.style.wordWrapWidth = spec.maxWidth;
    inst.text.style.breakWords = true;
  } else {
    inst.text.style.wordWrap = false;
    inst.text.style.wordWrapWidth = 0;
    inst.text.style.breakWords = false;
  }
  inst.text.alpha = 1;
  const anchorX = ensureNumber(spec?.anchorX, 0.5);
  const anchorY = ensureNumber(spec?.anchorY, 0.5);
  inst.text.anchor.set(anchorX, anchorY);
  inst.text.position.set(
    ensureNumber(spec?.x, 0),
    ensureNumber(spec?.y, 0)
  );

  if (inst.textBg) {
    const showBackground = !!spec?.showBackground;
    if (!showBackground || !inst.text.text) {
      inst.textBg.clear();
      inst.textBg.visible = false;
      return;
    }

    const padX = Math.max(0, ensureNumber(spec?.backgroundPaddingX, 12));
    const padY = Math.max(0, ensureNumber(spec?.backgroundPaddingY, 6));
    const radius = Math.max(0, ensureNumber(spec?.backgroundRadius, 8));
    const bounds = inst.text.getLocalBounds();
    const textWidth = Math.max(1, ensureNumber(bounds?.width, 0));
    const textHeight = Math.max(1, ensureNumber(bounds?.height, 0));
    const width = Math.max(1, textWidth + padX * 2);
    const height = Math.max(1, textHeight + padY * 2);
    const fixedBackground = spec?.fixedBackground !== false;
    if (!inst.__fixedTextBgSize) inst.__fixedTextBgSize = new Map();
    const cacheKey = String(spec?.backgroundKey || 'text');
    let bgW = width;
    let bgH = height;
    if (fixedBackground) {
      const prev = inst.__fixedTextBgSize.get(cacheKey);
      bgW = Math.max(width, Number(prev?.width) || 0);
      bgH = Math.max(height, Number(prev?.height) || 0);
      inst.__fixedTextBgSize.set(cacheKey, { width: bgW, height: bgH });
    }

    const textLeft = ensureNumber(spec?.x, 0) + ensureNumber(bounds?.x, 0);
    const textTop = ensureNumber(spec?.y, 0) + ensureNumber(bounds?.y, 0);
    const textCenterX = textLeft + textWidth * 0.5;
    const textCenterY = textTop + textHeight * 0.5;
    const left = textCenterX - bgW * 0.5;
    const top = textCenterY - bgH * 0.5;

    inst.textBg.clear();
    inst.textBg.beginFill(ensureNumber(spec?.backgroundColor, 0x000000), ensureNumber(spec?.backgroundAlpha, 0.45));
    inst.textBg.drawRoundedRect(left, top, bgW, bgH, radius);
    inst.textBg.endFill();
    inst.textBg.visible = true;
  }
}

function renderBar(inst, spec) {
  if (!inst?.barBg || !inst?.barFill) return;

  const width = Math.max(1, ensureNumber(spec?.width, 180));
  const height = Math.max(1, ensureNumber(spec?.height, 10));
  const radius = Math.max(0, ensureNumber(spec?.radius, height / 2));

  const showBg = spec?.showBackground !== false;
  const bgColor = ensureNumber(spec?.backgroundColor, 0x1f2937);
  const bgAlpha = ensureNumber(spec?.backgroundAlpha, 0.9);
  const strokeWidth = Math.max(0, ensureNumber(spec?.strokeWidth, 0));
  const strokeColor = ensureNumber(spec?.strokeColor, 0x424242);
  const strokeAlpha = ensureNumber(spec?.strokeAlpha, 1);

  if (showBg) {
    inst.barBg.visible = true;
    inst.barBg.clear();
    if (strokeWidth > 0) {
      inst.barBg.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    }
    inst.barBg.beginFill(bgColor, bgAlpha);
    inst.barBg.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    inst.barBg.endFill();
    if (strokeWidth > 0) {
      inst.barBg.lineStyle(0);
    }
  }

  if (Number.isFinite(spec?.baseFillColor)) {
    inst.barFill.visible = true;
    inst.barFill.clear();
    inst.barFill.beginFill(spec.baseFillColor, ensureNumber(spec?.baseFillAlpha, 0.9));
    inst.barFill.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    inst.barFill.endFill();
  } else {
    inst.barFill.visible = true;
    inst.barFill.clear();
  }

  if (spec?.mode === 'centerSigned') {
    const signed = ensureNumber(spec?.signedValue, 0);
    const minValue = ensureNumber(spec?.minValue, -1);
    const maxValue = ensureNumber(spec?.maxValue, 1);
    const signedRange = Math.max(Math.abs(minValue), Math.abs(maxValue), 1e-6);
    const ratio = clamp01(spec?.ratio ?? (Math.abs(signed) / signedRange));
    const maxLen = Math.max(1, ensureNumber(spec?.maxLen, 60));
    const baseLen = Math.max(0, ensureNumber(spec?.baseLen, 8));
    const len = signed === 0 ? 0 : baseLen + ratio * maxLen;
    const reverseScale = !!spec?.reverseScale;
    const drawSigned = reverseScale ? -signed : signed;
    const fillColor = ensureNumber(spec?.fillColor, 0x4ade80);
    const fillAlpha = ensureNumber(spec?.fillAlpha, 0.95);

    if (len > 0) {
      inst.barFill.beginFill(fillColor, fillAlpha);
      if (drawSigned > 0) {
        inst.barFill.drawRoundedRect(0, -height / 2, len, height, radius);
      } else {
        inst.barFill.drawRoundedRect(-len, -height / 2, len, height, radius);
      }
      inst.barFill.endFill();
    }
  } else {
    const minValue = ensureNumber(spec?.minValue, 0);
    const maxValue = ensureNumber(spec?.maxValue, 1);
    const ratio = spec?.ratio != null
      ? clamp01(spec.ratio)
      : (
          Number.isFinite(spec?.value) && maxValue > minValue
            ? clamp01((ensureNumber(spec.value, minValue) - minValue) / (maxValue - minValue))
            : 0
        );
    const fillColor = ensureNumber(spec?.fillColor, 0xd3d3d3);
    const fillAlpha = ensureNumber(spec?.fillAlpha, 0.9);
    if (ratio > 0) {
      inst.barFill.beginFill(fillColor, fillAlpha);
      inst.barFill.drawRoundedRect(-width / 2, -height / 2, width * ratio, height, radius);
      inst.barFill.endFill();
    }
  }

  if (inst.barFill2 && Number.isFinite(spec?.overlayRatio)) {
    const overlayRatio = clamp01(spec.overlayRatio);
    if (overlayRatio > 0) {
      inst.barFill2.visible = true;
      inst.barFill2.clear();
      inst.barFill2.beginFill(
        ensureNumber(spec?.overlayColor, ensureNumber(spec?.fillColor, 0xd3d3d3)),
        ensureNumber(spec?.overlayAlpha, 0.95)
      );
      inst.barFill2.drawRoundedRect(-width / 2, -height / 2, width * overlayRatio, height, radius);
      inst.barFill2.endFill();
    }
  }

  if (inst.text && spec?.labelText != null) {
    inst.text.visible = true;
    inst.text.text = String(spec.labelText);
    if (Number.isFinite(spec?.labelColor)) inst.text.style.fill = spec.labelColor;
    inst.text.anchor.set(
      ensureNumber(spec?.labelAnchorX, 0.5),
      ensureNumber(spec?.labelAnchorY, 0.5)
    );
    inst.text.position.set(
      ensureNumber(spec?.labelX, 0),
      ensureNumber(spec?.labelY, -16)
    );
  }

  const minValue = ensureNumber(spec?.minValue, 0);
  const maxValue = ensureNumber(spec?.maxValue, 0);
  const hasScale = Number.isFinite(minValue) && Number.isFinite(maxValue) && maxValue > minValue;
  if (hasScale && inst?.circle) {
    const isCenterSigned = spec?.mode === 'centerSigned';
    const showTicks = spec?.showTicks !== false;
    const showScaleText = spec?.showScaleText != null
      ? !!spec.showScaleText
      : (spec?.showTickLabels != null ? !!spec.showTickLabels : true);
    const tickColor = ensureNumber(spec?.tickColor, strokeColor || 0xf8fafc);
    const majorTickAlpha = clamp01(spec?.tickAlpha ?? Math.max(0.36, strokeAlpha * 0.82));
    const tickWidth = Math.max(0.5, ensureNumber(spec?.tickWidth, Math.max(1.6, strokeWidth || 1.6)));

    inst.circle.clear();
    inst.circle.visible = showTicks && isCenterSigned;

    if (showTicks && isCenterSigned) {
      const zeroRatio = clamp01((0 - minValue) / (maxValue - minValue));
      const x = -width / 2 + zeroRatio * width;
      inst.circle.lineStyle(tickWidth, tickColor, majorTickAlpha, 0.5);
      inst.circle.moveTo(x, -height / 2);
      inst.circle.lineTo(x, height / 2);
      inst.circle.lineStyle(0);
    }

    if (showScaleText) {
      const labelColor = ensureNumber(spec?.labelColor, 0xe2e8f0);
      const labelFontSize = Math.max(8, ensureNumber(spec?.labelFontSize, 11));
      const labelOffsetY = ensureNumber(spec?.labelOffsetY, height * 0.5 + 7);
      const unitGap = Math.max(0, ensureNumber(spec?.unitGap, 6));
      const unitLabel = String(spec?.unitLabel || '').trim();
      const sharedTextStyle = {
        fontSize: labelFontSize,
        fill: labelColor,
        fontWeight: '700',
        fontFamily: 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace'
      };
      const minLabel = ensureAuxText(inst, 'bar-scale-min', sharedTextStyle);
      const reverseScale = !!spec?.reverseScale;
      const leftLabelValue = reverseScale ? maxValue : minValue;
      const rightLabelValue = reverseScale ? minValue : maxValue;
      if (minLabel) {
        minLabel.visible = true;
        minLabel.text = formatScaleLabel(leftLabelValue);
        minLabel.style.fill = labelColor;
        minLabel.style.fontSize = labelFontSize;
        minLabel.style.fontWeight = '700';
        minLabel.style.fontFamily = sharedTextStyle.fontFamily;
        minLabel.anchor.set(0, 0);
        minLabel.position.set(-width / 2, labelOffsetY);
      }
      const maxLabel = ensureAuxText(inst, 'bar-scale-max', sharedTextStyle);
      if (maxLabel) {
        maxLabel.visible = true;
        maxLabel.text = formatScaleLabel(rightLabelValue);
        maxLabel.style.fill = labelColor;
        maxLabel.style.fontSize = labelFontSize;
        maxLabel.style.fontWeight = '700';
        maxLabel.style.fontFamily = sharedTextStyle.fontFamily;
        maxLabel.anchor.set(1, 0);
        maxLabel.position.set(width / 2, labelOffsetY);
      }
      const unitText = ensureAuxText(inst, 'bar-scale-unit', {
        ...sharedTextStyle,
        fontSize: Math.max(8, labelFontSize - 1)
      });
      if (unitText) {
        unitText.visible = !!unitLabel;
        unitText.text = unitLabel;
        unitText.style.fill = labelColor;
        unitText.style.fontSize = Math.max(8, labelFontSize - 1);
        unitText.style.fontWeight = '700';
        unitText.style.fontFamily = sharedTextStyle.fontFamily;
        unitText.anchor.set(0, 0);
        unitText.position.set(width / 2 + unitGap, labelOffsetY);
      }
    }
  }
}

function renderPie(inst, spec) {
  if (!inst?.circle) return;
  const radius = Math.max(1, ensureNumber(spec?.radius, 18));
  const ratio = clamp01(spec?.ratio);
  const backgroundColor = ensureNumber(spec?.backgroundColor, 0x1f2937);
  const backgroundAlpha = ensureNumber(spec?.backgroundAlpha, 0.9);
  const fillColor = ensureNumber(spec?.fillColor, 0xd3d3d3);
  const fillAlpha = ensureNumber(spec?.fillAlpha, 0.95);
  const strokeWidth = Math.max(0, ensureNumber(spec?.strokeWidth, 0));
  const strokeColor = ensureNumber(spec?.strokeColor, 0x424242);
  const strokeAlpha = ensureNumber(spec?.strokeAlpha, 1);

  inst.circle.visible = true;
  inst.circle.clear();

  if (strokeWidth > 0) {
    inst.circle.lineStyle(strokeWidth, strokeColor, strokeAlpha);
  }
  inst.circle.beginFill(backgroundColor, backgroundAlpha);
  inst.circle.drawCircle(0, 0, radius);
  inst.circle.endFill();

  if (ratio > 0) {
    const startA = -Math.PI / 2;
    const endA = startA + ratio * Math.PI * 2;
    inst.circle.beginFill(fillColor, fillAlpha);
    inst.circle.moveTo(0, 0);
    inst.circle.lineTo(Math.cos(startA) * radius, Math.sin(startA) * radius);
    inst.circle.arc(0, 0, radius, startA, endA);
    inst.circle.closePath();
    inst.circle.endFill();
  }
  if (strokeWidth > 0) {
    inst.circle.lineStyle(0);
  }
}

function renderLine(inst, spec) {
  if (!inst?.barFill) return;
  if (spec?.variant === 'compareLine') {
    const mainSegments = Array.isArray(spec?.mainSegments)
      ? spec.mainSegments.filter((seg) => (
        Number.isFinite(seg?.x1)
        && Number.isFinite(seg?.y1)
        && Number.isFinite(seg?.x2)
        && Number.isFinite(seg?.y2)
      ))
      : [];
    const childSegments = Array.isArray(spec?.childSegments)
      ? spec.childSegments.filter((seg) => (
        Number.isFinite(seg?.x1)
        && Number.isFinite(seg?.y1)
        && Number.isFinite(seg?.x2)
        && Number.isFinite(seg?.y2)
      ))
      : [];
    const drawRoundedSegment = (graphics, seg, radius) => {
      const dx = Number(seg?.x2) - Number(seg?.x1);
      const dy = Number(seg?.y2) - Number(seg?.y1);
      const length = Math.hypot(dx, dy);
      if (!(length > 1e-3) || !(radius > 0.01)) {
        graphics.drawCircle(Number(seg?.x1) || 0, Number(seg?.y1) || 0, Math.max(0.5, radius));
        return;
      }
      const ux = dx / length;
      const uy = dy / length;
      const nx = -uy;
      const ny = ux;
      const capSteps = Math.max(6, Math.min(18, Math.round(radius * 0.9)));
      const x1 = Number(seg.x1);
      const y1 = Number(seg.y1);
      const x2 = Number(seg.x2);
      const y2 = Number(seg.y2);

      graphics.moveTo(x1 + nx * radius, y1 + ny * radius);
      graphics.lineTo(x2 + nx * radius, y2 + ny * radius);
      for (let step = 1; step <= capSteps; step += 1) {
        const theta = (step / capSteps) * Math.PI;
        graphics.lineTo(
          x2 + (nx * Math.cos(theta) + ux * Math.sin(theta)) * radius,
          y2 + (ny * Math.cos(theta) + uy * Math.sin(theta)) * radius
        );
      }
      graphics.lineTo(x1 - nx * radius, y1 - ny * radius);
      for (let step = 1; step <= capSteps; step += 1) {
        const theta = (step / capSteps) * Math.PI;
        graphics.lineTo(
          x1 + (-nx * Math.cos(theta) - ux * Math.sin(theta)) * radius,
          y1 + (-ny * Math.cos(theta) - uy * Math.sin(theta)) * radius
        );
      }
      graphics.closePath();
    };

    const drawSegmentSet = (graphics, segments, width, color, alpha, glowWidth = 0) => {
      if (!graphics) return;
      const safeWidth = Math.max(0, ensureNumber(width, 0));
      const safeAlpha = clamp01(alpha);
      if (!segments.length || safeWidth <= 0.01 || safeAlpha <= 0.001) {
        graphics.visible = false;
        graphics.clear();
        return;
      }
      graphics.visible = true;
      graphics.clear();
      graphics.beginFill(ensureNumber(color, 0xffffff), safeAlpha);
      const capRadius = Math.max(1, (safeWidth + glowWidth) * 0.5);
      segments.forEach((seg) => {
        drawRoundedSegment(graphics, seg, capRadius);
      });
      graphics.endFill();
    };

    const mainLineWidth = Math.max(1, ensureNumber(spec?.mainLineWidth, 8));
    const childLineWidth = Math.max(1, ensureNumber(spec?.childLineWidth, 5));
    const mainStrokeWidth = Math.max(mainLineWidth, ensureNumber(spec?.mainStrokeWidth, mainLineWidth + 4.5));
    const childStrokeWidth = Math.max(childLineWidth, ensureNumber(spec?.childStrokeWidth, childLineWidth + 2.8));
    const mainLineColor = ensureNumber(spec?.mainLineColor, 0xf8fafc);
    const childLineColor = ensureNumber(spec?.childLineColor, 0x7dd3fc);
    const mainStrokeColor = ensureNumber(spec?.mainStrokeColor, 0x0f172a);
    const childStrokeColor = ensureNumber(spec?.childStrokeColor, 0x0f172a);
    const mainLineAlpha = clamp01(spec?.mainLineAlpha ?? 0.94);
    const childLineAlpha = clamp01(spec?.childLineAlpha ?? 0.88);
    const mainStrokeAlpha = clamp01(spec?.mainStrokeAlpha ?? spec?.mainGlowAlpha ?? 0.24);
    const childStrokeAlpha = clamp01(spec?.childStrokeAlpha ?? spec?.childGlowAlpha ?? 0.18);

    drawSegmentSet(inst.barBg, mainSegments, mainStrokeWidth, mainStrokeColor, mainStrokeAlpha);
    drawSegmentSet(inst.barFill, mainSegments, mainLineWidth, mainLineColor, mainLineAlpha);
    drawSegmentSet(inst.barFill2, childSegments, childStrokeWidth, childStrokeColor, childStrokeAlpha);
    drawSegmentSet(inst.circle, childSegments, childLineWidth, childLineColor, childLineAlpha);

    const debugOverlay = spec?.debugOverlay;
    if (debugOverlay?.enabled) {
      const debugSegments = Array.isArray(debugOverlay?.guideSegments)
        ? debugOverlay.guideSegments.filter((seg) => (
          Number.isFinite(seg?.x1)
          && Number.isFinite(seg?.y1)
          && Number.isFinite(seg?.x2)
          && Number.isFinite(seg?.y2)
        ))
        : [];
      const debugColor = ensureNumber(debugOverlay?.color, 0xfbbf24);
      const debugAlpha = clamp01(debugOverlay?.alpha ?? 0.42);
      const debugLineWidth = Math.max(0.5, ensureNumber(debugOverlay?.lineWidth, 1.8));
      if (inst.textBg) {
        inst.textBg.visible = true;
        inst.textBg.clear();
        if (debugSegments.length && debugAlpha > 0.001) {
          inst.textBg.lineStyle(debugLineWidth, debugColor, debugAlpha, 0.5);
          debugSegments.forEach((seg) => {
            inst.textBg.moveTo(seg.x1, seg.y1);
            inst.textBg.lineTo(seg.x2, seg.y2);
          });
          inst.textBg.lineStyle(0);
          inst.textBg.beginFill(debugColor, Math.min(0.94, debugAlpha * 0.8));
          const capRadius = Math.max(1.2, debugLineWidth * 0.9);
          debugSegments.forEach((seg) => {
            inst.textBg.drawCircle(seg.x1, seg.y1, capRadius);
            inst.textBg.drawCircle(seg.x2, seg.y2, capRadius);
          });
          inst.textBg.endFill();
        }
      }

      const labelText = String(debugOverlay?.labelText || '').trim();
      if (inst.text && labelText && Number.isFinite(debugOverlay?.labelX) && Number.isFinite(debugOverlay?.labelY)) {
        inst.text.visible = true;
        inst.text.text = labelText;
        inst.text.style.fill = ensureNumber(debugOverlay?.labelColor, 0xf8fafc);
        inst.text.style.fontSize = Math.max(8, ensureNumber(debugOverlay?.labelFontSize, 13));
        inst.text.style.fontWeight = '700';
        inst.text.style.fontFamily = 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace';
        inst.text.anchor.set(0.5, 1);
        inst.text.position.set(debugOverlay.labelX, debugOverlay.labelY);
        if (inst.textBg) {
          const bounds = inst.text.getLocalBounds();
          const padX = Math.max(0, ensureNumber(debugOverlay?.labelPaddingX, 10));
          const padY = Math.max(0, ensureNumber(debugOverlay?.labelPaddingY, 6));
          const left = inst.text.position.x + bounds.x - padX;
          const top = inst.text.position.y + bounds.y - padY;
          const width = Math.max(1, bounds.width + padX * 2);
          const height = Math.max(1, bounds.height + padY * 2);
          inst.textBg.beginFill(
            ensureNumber(debugOverlay?.labelBgColor, 0x020617),
            clamp01(debugOverlay?.labelBgAlpha ?? 0.76)
          );
          inst.textBg.drawRoundedRect(left, top, width, height, Math.max(0, ensureNumber(debugOverlay?.labelRadius, 8)));
          inst.textBg.endFill();
        }
      }

      const endpointLabels = Array.isArray(debugOverlay?.guideLabels) ? debugOverlay.guideLabels : [];
      endpointLabels.forEach((entry, idx) => {
        const textNode = ensureAuxText(inst, `compare-line-debug-label-${idx}`, {
          fontSize: Math.max(8, ensureNumber(debugOverlay?.endpointLabelFontSize, 11)),
          fill: ensureNumber(debugOverlay?.endpointLabelColor, 0xf8fafc),
          fontWeight: '700',
          fontFamily: 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace'
        });
        if (!textNode || !Number.isFinite(entry?.x) || !Number.isFinite(entry?.y) || !String(entry?.text || '').trim()) {
          if (textNode) textNode.visible = false;
          return;
        }
        textNode.visible = true;
        textNode.text = String(entry.text);
        textNode.style.fill = ensureNumber(debugOverlay?.endpointLabelColor, 0xf8fafc);
        textNode.style.fontSize = Math.max(8, ensureNumber(debugOverlay?.endpointLabelFontSize, 11));
        textNode.style.fontWeight = '700';
        textNode.style.fontFamily = 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace';
        textNode.anchor.set(0.5, 1);
        textNode.position.set(entry.x, entry.y);
      });
    }
    return;
  }
  const width = Math.max(1, ensureNumber(spec?.width, 6));
  const color = ensureNumber(spec?.color, 0xd3d3d3);
  const alpha = ensureNumber(spec?.alpha, 0.95);
  inst.barFill.visible = true;
  inst.barFill.clear();

  if (spec?.fullHeight) {
    const videoHeight = Math.max(1, ensureNumber(spec?.videoHeight, 1080));
    inst.barFill.beginFill(color, alpha);
    inst.barFill.drawRoundedRect(-width / 2, -videoHeight / 2, width, videoHeight, 3);
    inst.barFill.endFill();
    return;
  }

  const height = Math.max(1, ensureNumber(spec?.height, 100));
  inst.barFill.beginFill(color, alpha);
  inst.barFill.drawRoundedRect(-width / 2, -height / 2, width, height, 3);
  inst.barFill.endFill();
}

function drawStylizedArrow(graphics, rawSpec = {}, {
  colorKey = 'color',
  alphaKey = 'alpha'
} = {}) {
  const bodyLen = Math.max(8, ensureNumber(rawSpec?.length, 24));
  const headLen = Math.max(4, ensureNumber(rawSpec?.headLen, 12));
  const halfH = Math.max(2, ensureNumber(rawSpec?.halfHeight, 5));
  const tailRatio = Math.max(0.2, Math.min(1, ensureNumber(rawSpec?.tailRatio, 0.54)));
  const tailHalfH = Math.max(1, halfH * tailRatio);
  const color = ensureNumber(rawSpec?.[colorKey], 0xd3d3d3);
  const alpha = ensureNumber(rawSpec?.[alphaKey], 0.95);
  const strokeWidth = Math.max(0, ensureNumber(rawSpec?.strokeWidth, 0.8));
  const strokeColor = ensureNumber(rawSpec?.strokeColor, 0x111827);
  const strokeAlpha = ensureNumber(rawSpec?.strokeAlpha, 0.62);
  const flipX = !!rawSpec?.flipX;

  const tailX = -bodyLen * 0.5;
  const shaftLen = bodyLen;
  const tipX = tailX + shaftLen + headLen;
  const neckX = tailX + shaftLen - headLen * 0.1;

  graphics.visible = true;
  graphics.clear();

  if (strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
  }
  graphics.beginFill(color, alpha);
  graphics.moveTo(tailX, -tailHalfH);
  graphics.lineTo(neckX, -tailHalfH);
  graphics.lineTo(neckX, -halfH);
  graphics.lineTo(tipX, 0);
  graphics.lineTo(neckX, halfH);
  graphics.lineTo(neckX, tailHalfH);
  graphics.lineTo(tailX, tailHalfH);
  graphics.closePath();
  graphics.endFill();

  if (strokeWidth > 0) {
    graphics.lineStyle(0);
  }
  graphics.scale.set(flipX ? -1 : 1, 1);
}

function renderArrow(inst, spec) {
  if (!inst?.circle) return;
  if (spec?.variant === 'baselineDelta') {
    const dir = spec?.flipX ? -1 : 1;
    const showArrow = spec?.showArrow !== false;
    const headLen = Math.max(4, ensureNumber(spec?.headLen, 12));
    const halfH = Math.max(2, ensureNumber(spec?.halfHeight, 7));
    const tailRatio = clamp01(spec?.tailRatio ?? 0.44);
    const tailHalfH = Math.max(1, halfH * tailRatio);
    const tailLen = Math.max(0, ensureNumber(spec?.tailLen, 24));
    const color = ensureNumber(spec?.color, 0x7dd3fc);
    const alpha = ensureNumber(spec?.alpha, 0.95);
    const strokeWidth = Math.max(0, ensureNumber(spec?.strokeWidth, 1.2));
    const strokeColor = ensureNumber(spec?.strokeColor, 0x0f172a);
    const strokeAlpha = ensureNumber(spec?.strokeAlpha, 0.68);
    const originRadius = Math.max(3, ensureNumber(spec?.originRadius, 5));
    const originInnerRadius = Math.max(1, ensureNumber(spec?.originInnerRadius, Math.max(1.8, originRadius * 0.34)));
    const originGap = Math.max(0, ensureNumber(spec?.originGap, 5));
    const originFillColor = ensureNumber(spec?.originFillColor, 0x0f172a);
    const originFillAlpha = ensureNumber(spec?.originFillAlpha, 0.96);
    const originStrokeColor = ensureNumber(spec?.originStrokeColor, 0xf8fafc);
    const originStrokeAlpha = ensureNumber(spec?.originStrokeAlpha, 0.9);
    const originStrokeWidth = Math.max(0, ensureNumber(spec?.originStrokeWidth, 1.2));
    const originCoreColor = ensureNumber(spec?.originCoreColor, color);
    const originCoreAlpha = ensureNumber(spec?.originCoreAlpha, 0.96);

    const shaftInset = Math.min(originRadius * 0.62, tailHalfH * 0.92);
    const shaftStart = dir * Math.max(0, originRadius + originGap - shaftInset);
    const shaftEnd = shaftStart + dir * tailLen;
    const tipX = shaftEnd + dir * headLen;

    inst.circle.visible = true;
    inst.circle.clear();

    if (showArrow) {
      if (strokeWidth > 0) {
        inst.circle.lineStyle(strokeWidth, strokeColor, strokeAlpha);
      }
      inst.circle.beginFill(color, alpha);
      if (tailLen > 0) {
        const rectX = dir > 0 ? shaftStart : shaftEnd;
        inst.circle.drawRect(rectX, -tailHalfH, tailLen, tailHalfH * 2);
      }
      inst.circle.moveTo(shaftEnd, -halfH);
      inst.circle.lineTo(tipX, 0);
      inst.circle.lineTo(shaftEnd, halfH);
      inst.circle.closePath();
      inst.circle.endFill();
    }

    if (originStrokeWidth > 0) {
      inst.circle.lineStyle(originStrokeWidth, originStrokeColor, originStrokeAlpha);
    }
    inst.circle.beginFill(originFillColor, originFillAlpha);
    inst.circle.drawCircle(0, 0, originRadius);
    inst.circle.endFill();
    inst.circle.lineStyle(0);
    inst.circle.beginFill(originCoreColor, originCoreAlpha);
    inst.circle.drawCircle(0, 0, originInnerRadius);
    inst.circle.endFill();
    inst.circle.lineStyle(0);
    return;
  }
  if (spec?.variant === 'tripleChevron') {
    const length = Math.max(8, ensureNumber(spec?.length, 24));
    const halfH = Math.max(2, ensureNumber(spec?.halfHeight, 6));
    const gap = Math.max(2, ensureNumber(spec?.gap, 4));
    const coreColor = ensureNumber(spec?.color, 0xffffff);
    const coreAlpha = ensureNumber(spec?.alpha, 0.98);
    const outlineColor = ensureNumber(spec?.strokeColor, 0x111827);
    const outlineAlpha = ensureNumber(spec?.strokeAlpha, 0.34);
    const outlineWidth = Math.max(0, ensureNumber(spec?.strokeWidth, 1.2));
    const dir = spec?.flipX ? -1 : 1;
    const step = length * 0.62 + gap;
    const offsets = [-step, 0, step];
    const visibleCount = Math.max(1, Math.min(3, Math.round(ensureNumber(spec?.visibleCount, offsets.length))));
    const drawOrder = dir > 0 ? [0, 1, 2] : [2, 1, 0];
    const visibleIndices = new Set(drawOrder.slice(0, visibleCount));

    const drawChevronSet = (lineWidth, color, alpha) => {
      if (lineWidth <= 0 || alpha <= 0) return;
      inst.circle.lineStyle(lineWidth, color, alpha, 0.5);
      offsets.forEach((offset, idx) => {
        if (!visibleIndices.has(idx)) return;
        const tipX = offset + dir * (length * 0.42);
        const tailX = offset - dir * (length * 0.36);
        inst.circle.moveTo(tailX, -halfH);
        inst.circle.lineTo(tipX, 0);
        inst.circle.lineTo(tailX, halfH);
      });
    };

    inst.circle.visible = true;
    inst.circle.clear();
    drawChevronSet(outlineWidth + 2.8, outlineColor, outlineAlpha * 0.55);
    drawChevronSet(outlineWidth + 1.4, ensureNumber(spec?.backgroundColor, 0x8edcff), Math.min(1, coreAlpha * 0.28));
    drawChevronSet(Math.max(2, outlineWidth + 0.6), coreColor, coreAlpha);
    inst.circle.lineStyle(0);
    return;
  }
  drawStylizedArrow(inst.circle, spec, { colorKey: 'color', alphaKey: 'alpha' });
}

function renderGlyph(inst, spec) {
  if (!inst?.circle) return;
  const variant = spec?.variant || 'arrow';

  if (inst.text) {
    inst.text.visible = false;
  }

  if (variant === 'badge') {
    const radius = Math.max(4, ensureNumber(spec?.radius, 12));
    const fillColor = ensureNumber(spec?.fillColor, 0xfcd34d);
    const fillAlpha = ensureNumber(spec?.fillAlpha, 0.95);
    const strokeWidth = Math.max(0, ensureNumber(spec?.strokeWidth, 0));
    const strokeColor = ensureNumber(spec?.strokeColor, 0x424242);
    const strokeAlpha = ensureNumber(spec?.strokeAlpha, 1);
    inst.circle.visible = true;
    inst.circle.clear();
    if (strokeWidth > 0) {
      inst.circle.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    }
    inst.circle.beginFill(fillColor, fillAlpha);
    inst.circle.drawCircle(0, 0, radius);
    inst.circle.endFill();
    if (strokeWidth > 0) {
      inst.circle.lineStyle(0);
    }

    if (inst.text) {
      inst.text.visible = true;
      inst.text.text = spec?.text ?? '';
      inst.text.style.fill = ensureNumber(spec?.textColor, 0x0b0b0b);
      if (Number.isFinite(spec?.fontSize)) inst.text.style.fontSize = spec.fontSize;
      if (spec?.fontWeight != null) inst.text.style.fontWeight = String(spec.fontWeight);
      if (spec?.fontFamily != null) inst.text.style.fontFamily = String(spec.fontFamily);
      inst.text.anchor.set(0.5);
      inst.text.position.set(0, 0);
    }
    return;
  }

  if (variant === 'medal') {
    const radius = Math.max(6, ensureNumber(spec?.radius, 22));
    const medalKind = String(spec?.medal || 'gold').toLowerCase();
    const fillAlpha = ensureNumber(spec?.fillAlpha, 0.98);
    const strokeWidth = Math.max(0, ensureNumber(spec?.strokeWidth, 1.2));
    const strokeColor = ensureNumber(spec?.strokeColor, 0x0f172a);
    const strokeAlpha = ensureNumber(spec?.strokeAlpha, 0.26);
    if (inst.circle) {
      inst.circle.visible = false;
      inst.circle.clear();
    }
    if (inst.text) {
      inst.text.visible = false;
      inst.text.text = '';
    }
    if (inst.flagSprite) {
      inst.flagSprite.texture = getMedalTexture({
        medalKind,
        label: spec?.text ?? '',
        strokeColor,
        strokeAlpha,
        strokeWidth
      });
      inst.flagSprite.width = Math.max(1, radius * 2.5);
      inst.flagSprite.height = Math.max(1, radius * 3.1);
      inst.flagSprite.anchor.set(0.5);
      inst.flagSprite.position.set(0, 0);
      inst.flagSprite.alpha = clamp01(fillAlpha);
      inst.flagSprite.visible = fillAlpha > 0.001;
    }
    return;
  }

  if (variant === 'sector') {
    const radius = Math.max(4, ensureNumber(spec?.radius, 18));
    const ratio = clamp01(spec?.ratio);
    const bgStrokeColor = ensureNumber(spec?.bgStrokeColor, 0x1f2937);
    const strokeColor = ensureNumber(spec?.strokeColor, ensureNumber(spec?.fillColor, 0xd3d3d3));
    const bgStrokeWidth = Math.max(1, ensureNumber(spec?.bgStrokeWidth, 3));
    const strokeWidth = Math.max(1, ensureNumber(spec?.strokeWidth, 4));
    inst.circle.visible = true;
    inst.circle.clear();
    inst.circle.lineStyle(bgStrokeWidth, bgStrokeColor, ensureNumber(spec?.bgStrokeAlpha, 0.9));
    inst.circle.drawCircle(0, 0, radius);
    if (ratio > 0) {
      inst.circle.lineStyle(strokeWidth, strokeColor, ensureNumber(spec?.strokeAlpha, 0.95));
      inst.circle.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    }
    return;
  }

  if (variant === 'speedometer') {
    const minValue = ensureNumber(spec?.minValue, 0);
    const maxValue = Math.max(minValue + 1e-6, ensureNumber(spec?.maxValue, 3));
    const rawValue = Number.isFinite(Number(spec?.value)) ? Number(spec.value) : null;
    const clampedValue = rawValue == null ? minValue : Math.max(minValue, Math.min(maxValue, rawValue));
    const ratio = clamp01((clampedValue - minValue) / (maxValue - minValue));
    const radius = Math.max(10, ensureNumber(spec?.radius, 32));
    const bgStrokeColor = ensureNumber(spec?.bgStrokeColor, 0x334155);
    const bgStrokeAlpha = ensureNumber(spec?.bgStrokeAlpha, 0.92);
    const bgStrokeWidth = Math.max(1, ensureNumber(spec?.bgStrokeWidth, 5));
    const strokeColor = ensureNumber(spec?.strokeColor, ensureNumber(spec?.fillColor, 0x7dd3fc));
    const strokeAlpha = ensureNumber(spec?.strokeAlpha, 1);
    const strokeWidth = Math.max(1, ensureNumber(spec?.strokeWidth, 4));
    const tickColor = ensureNumber(spec?.tickColor, 0x94a3b8);
    const labelColor = ensureNumber(spec?.labelColor, 0xe5e7eb);
    const valueColor = ensureNumber(spec?.valueColor, strokeColor);
    const startAngle = -Math.PI * 0.86;
    const endAngle = -Math.PI * 0.14;
    const needleAngle = startAngle + (endAngle - startAngle) * ratio;
    const pointOnArc = (angle, distance) => ({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    });

    inst.circle.visible = true;
    inst.circle.clear();

    inst.circle.lineStyle(bgStrokeWidth, bgStrokeColor, bgStrokeAlpha, 0.5);
    inst.circle.arc(0, 0, radius, startAngle, endAngle);

    const tickOuterRadius = radius + bgStrokeWidth * 0.85;
    for (let i = 0; i <= 6; i += 1) {
      const tickRatio = i / 6;
      const angle = startAngle + (endAngle - startAngle) * tickRatio;
      const major = i % 2 === 0;
      const outer = pointOnArc(angle, tickOuterRadius);
      const inner = pointOnArc(angle, radius - (major ? 8 : 5));
      inst.circle.lineStyle(major ? 2.2 : 1.2, tickColor, major ? 0.88 : 0.4, 0.5);
      inst.circle.moveTo(inner.x, inner.y);
      inst.circle.lineTo(outer.x, outer.y);
    }

    if (ratio > 0) {
      inst.circle.lineStyle(Math.max(2, strokeWidth * 0.7), strokeColor, Math.min(1, strokeAlpha * 0.22), 0.5);
      inst.circle.arc(0, 0, radius, startAngle, needleAngle);
    }

    const needleBaseWidth = Math.max(3, strokeWidth * 0.95);
    const needleLen = Math.max(8, radius - bgStrokeWidth * 0.9);
    const needleTip = pointOnArc(needleAngle, needleLen);
    const needleLeft = pointOnArc(needleAngle - Math.PI / 2, needleBaseWidth);
    const needleRight = pointOnArc(needleAngle + Math.PI / 2, needleBaseWidth);

    inst.circle.lineStyle(0);
    inst.circle.beginFill(strokeColor, strokeAlpha);
    inst.circle.moveTo(needleLeft.x * 0.85, needleLeft.y * 0.85);
    inst.circle.lineTo(needleRight.x * 0.85, needleRight.y * 0.85);
    inst.circle.lineTo(needleTip.x, needleTip.y);
    inst.circle.closePath();
    inst.circle.endFill();
    inst.circle.beginFill(0x0f172a, 0.98);
    inst.circle.drawCircle(0, 0, Math.max(4, radius * 0.14));
    inst.circle.endFill();
    inst.circle.beginFill(strokeColor, 0.95);
    inst.circle.drawCircle(0, 0, Math.max(2, radius * 0.07));
    inst.circle.endFill();
    inst.circle.lineStyle(0);

    const labelRadius = radius + 16;
    const minLabel = ensureAuxText(inst, 'speedometer-min', { fontSize: Math.max(10, radius * 0.22) });
    const maxLabel = ensureAuxText(inst, 'speedometer-max', { fontSize: Math.max(10, radius * 0.22) });
    const unitText = ensureAuxText(inst, 'speedometer-unit', { fontSize: Math.max(10, radius * 0.2) });
    const showText = spec?.showText !== false;
    const showUnit = spec?.showUnit !== false && String(spec?.unitLabel || '').trim().length > 0;
    const valueFontSize = Math.max(13, ensureNumber(spec?.valueFontSize, radius * 0.34));
    const unitFontSize = Math.max(10, ensureNumber(spec?.unitFontSize, radius * 0.18));
    const textOffsetY = ensureNumber(spec?.textOffsetY, radius * 0.34);
    const valueUnitGap = Math.max(0, ensureNumber(spec?.valueUnitGap, 6));
    const unitColor = ensureNumber(spec?.unitColor, labelColor);

    minLabel.visible = true;
    minLabel.text = `${minValue.toFixed(0)}`;
    minLabel.style.fill = labelColor;
    minLabel.style.fontSize = Math.max(10, radius * 0.22);
    minLabel.style.fontWeight = '600';
    minLabel.style.fontFamily = 'SF Pro Text, Inter, system-ui, sans-serif';
    minLabel.anchor.set(0.5);
    {
      const p = pointOnArc(startAngle, labelRadius);
      minLabel.position.set(p.x, p.y);
    }

    maxLabel.visible = true;
    maxLabel.text = `${maxValue.toFixed(0)}`;
    maxLabel.style.fill = labelColor;
    maxLabel.style.fontSize = Math.max(10, radius * 0.22);
    maxLabel.style.fontWeight = '600';
    maxLabel.style.fontFamily = 'SF Pro Text, Inter, system-ui, sans-serif';
    maxLabel.anchor.set(0.5);
    {
      const p = pointOnArc(endAngle, labelRadius);
      maxLabel.position.set(p.x, p.y);
    }

    if (inst.text) {
      inst.text.visible = showText;
      inst.text.text = rawValue == null ? '--' : rawValue.toFixed(2);
      inst.text.style.fill = valueColor;
      inst.text.style.fontSize = valueFontSize;
      inst.text.style.fontWeight = '700';
      inst.text.style.fontFamily = 'SF Mono, ui-monospace, Menlo, Monaco, Consolas, monospace';
      inst.text.anchor.set(0, 0.5);
    }

    unitText.visible = showUnit;
    unitText.text = String(spec?.unitLabel || 'm/s');
    unitText.style.fill = unitColor;
    unitText.style.fontSize = unitFontSize;
    unitText.style.fontWeight = '600';
    unitText.style.fontFamily = 'SF Pro Text, Inter, system-ui, sans-serif';
    unitText.anchor.set(0, 0.5);

    const valueWidth = showText ? Math.max(1, inst.text.getLocalBounds().width) : 0;
    const unitWidth = showUnit ? Math.max(1, unitText.getLocalBounds().width) : 0;
    const totalWidth = (showText ? valueWidth : 0) + (showText && showUnit ? valueUnitGap : 0) + (showUnit ? unitWidth : 0);
    const left = -totalWidth * 0.5;

    if (showText && inst.text) {
      inst.text.position.set(left, textOffsetY);
    }
    if (showUnit) {
      const unitX = left + (showText ? valueWidth + valueUnitGap : 0);
      unitText.position.set(unitX, textOffsetY);
    }
    return;
  }
  drawStylizedArrow(
    inst.circle,
    {
      ...spec,
      color: ensureNumber(spec?.fillColor, 0x4ade80),
      alpha: ensureNumber(spec?.fillAlpha, 0.95)
    },
    { colorKey: 'color', alphaKey: 'alpha' }
  );
}

function renderFlag(inst, spec, deps) {
  if (!inst?.flagSprite) return;
  const code = String(spec?.countryCode || '').toLowerCase();
  if (!code) {
    inst.flagSprite.visible = false;
    return;
  }
  const url = spec?.url || `./assets/flags/${code}.svg`;
  const normalizeFlagTexture = deps?.normalizeFlagTexture;
  const tex = typeof normalizeFlagTexture === 'function' ? normalizeFlagTexture(url) : null;
  if (!tex) {
    inst.flagSprite.visible = false;
    return;
  }
  inst.flagSprite.texture = tex;
  inst.flagSprite.width = Math.max(1, ensureNumber(spec?.width, 64));
  inst.flagSprite.height = Math.max(1, ensureNumber(spec?.height, 40));
  inst.flagSprite.anchor.set(0.5);
  inst.flagSprite.position.set(
    ensureNumber(spec?.x, 0),
    ensureNumber(spec?.y, 0)
  );
  inst.flagSprite.alpha = clamp01(spec?.alpha ?? 1);
  inst.flagSprite.visible = true;
}

function renderProgressBar(inst, spec) {
  renderBar(inst, {
    ...spec,
    width: ensureNumber(spec?.width, 200),
    height: ensureNumber(spec?.height, 10),
    backgroundColor: ensureNumber(spec?.backgroundColor, 0x1f2937),
    backgroundAlpha: ensureNumber(spec?.backgroundAlpha, 0.9),
    fillAlpha: ensureNumber(spec?.fillAlpha, 0.9)
  });
}

const RENDERERS = {
  text: renderText,
  medalSummary: renderMedalSummary,
  ringsCount: renderRingsCount,
  bar: renderBar,
  glyph: renderGlyph,
  line: renderLine,
  arrow: renderArrow,
  flag: renderFlag,
  pie: renderPie,
  progressBar: renderProgressBar
};

const REP_ALIAS = {
  circular: 'glyph',
  badge: 'glyph',
  medal: 'glyph'
};

export function normalizeRepAlias(repType) {
  const r = String(repType || '');
  return REP_ALIAS[r] || r;
}

export function renderRepresentation(inst, repType, spec, deps = {}) {
  const normalized = normalizeRepAlias(repType);
  const renderer = RENDERERS[normalized];
  if (!renderer) return false;
  if (normalized === 'glyph' && spec && !spec.variant) {
    if (repType === 'circular') spec = { ...spec, variant: 'sector' };
    if (repType === 'badge') spec = { ...spec, variant: 'badge' };
    if (repType === 'medal') spec = { ...spec, variant: 'medal' };
  }
  renderer(inst, spec || {}, deps);
  return true;
}
