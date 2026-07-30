

export function mapSpriteToQuad(sprite, quad) {
  if (!sprite || !sprite.proj || !quad) return false;
  sprite.visible = true;
  sprite.position.set(0, 0);
  sprite.scale.set(1, 1);
  sprite.proj.affine = PIXI.projection.AFFINE.NONE;
  sprite.proj.mapSprite(sprite, [
    new PIXI.Point(quad.tl.cx, quad.tl.cy),
    new PIXI.Point(quad.tr.cx, quad.tr.cy),
    new PIXI.Point(quad.br.cx, quad.br.cy),
    new PIXI.Point(quad.bl.cx, quad.bl.cy)
  ]);
  return true;
}
export function buildProjectedQuad(projector, cx, cy, halfW, halfH, rotationRad = 0) {
  if (typeof projector !== 'function') return null;
  const cosR = Math.cos(rotationRad);
  const sinR = Math.sin(rotationRad);
  const rot = (x, y) => ({
    x: x * cosR - y * sinR,
    y: x * sinR + y * cosR
  });
  const tl = rot(-halfW, -halfH);
  const tr = rot(halfW, -halfH);
  const br = rot(halfW, halfH);
  const bl = rot(-halfW, halfH);
  return {
    tl: projector(cx + tl.x, cy + tl.y),
    tr: projector(cx + tr.x, cy + tr.y),
    br: projector(cx + br.x, cy + br.y),
    bl: projector(cx + bl.x, cy + bl.y)
  };
}
export function renderProjectedContent({
  app,
  inst,
  center,
  scale = 1,
  rotation = 0,
  projector,
  padding = 32,
  oversample = 2,
  minSize = 256
}) {
  if (!app?.renderer || !inst?.content || !inst?.rtSprite || !center || typeof projector !== 'function') {
    return false;
  }
  try {
    inst.content.updateTransform();
    const b = inst.content.getBounds();
    const safeW = Math.max(4, b.width || 0);
    const safeH = Math.max(4, b.height || 0);
    const baseW = safeW + padding * 2;
    const baseH = safeH + padding * 2;
    const w = Math.max(minSize, Math.ceil(baseW * oversample));
    const h = Math.max(minSize, Math.ceil(baseH * oversample));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      console.warn('renderProjectedContent: invalid RT size', { w, h, baseW, baseH, b });
      return false;
    }

    if (!inst._rt || inst._rt.width < w || inst._rt.height < h) {
      inst._rt?.destroy(true);
      inst._rt = PIXI.RenderTexture.create({ width: w, height: h, scaleMode: PIXI.SCALE_MODES.LINEAR });
    }

    const m = new PIXI.Matrix()
      .translate(-b.x * oversample + w / 2, -b.y * oversample + h / 2)
      .scale(oversample, oversample);
    app.renderer.render(inst.content, inst._rt, true, m);
    inst.rtSprite.texture = inst._rt;
    inst.rtSprite.anchor.set(0.5);
    inst.rtSprite.position.set(0, 0);
    inst.content.visible = false;
    inst.rtSprite.visible = true;

    const halfW = (w / oversample) * scale / 2;
    const halfH = (h / oversample) * scale / 2;
    const quad = buildProjectedQuad(projector, center.x, center.y, halfW, halfH, rotation);
    if (!quad) {
      console.warn('renderProjectedContent: Failed to build quad');
      return false;
    }

    const mapped = mapSpriteToQuad(inst.rtSprite, quad);
    if (!mapped) {
      console.warn('renderProjectedContent: mapSpriteToQuad failed');
      return false;
    }
    inst.container.position.set(0, 0);
    inst.container.scale.set(1, 1);
    inst.container.rotation = 0;
    return true;
  } catch (err) {
    console.warn('renderProjectedContent failed', err);
    return false;
  }
}
