export function resolvePixiResolution() {
  const dpr = Number(window.devicePixelRatio || 1);
  return Math.max(1, Math.min(2, Number.isFinite(dpr) ? dpr : 1));
}

export function syncPixiResolution(app, containerEl) {
  if (!app?.renderer || !containerEl) return;
  const nextResolution = resolvePixiResolution();
  if (PIXI?.settings) {
    PIXI.settings.RESOLUTION = nextResolution;
    PIXI.settings.FILTER_RESOLUTION = nextResolution;
  }
  if (Math.abs((app.renderer.resolution || 1) - nextResolution) > 1e-3) {
    app.renderer.resolution = nextResolution;
    app.renderer.resize(
      Math.max(1, Math.round(containerEl.clientWidth || app.renderer.width || 1)),
      Math.max(1, Math.round(containerEl.clientHeight || app.renderer.height || 1))
    );
  }
}

export function createPixiApp(containerEl) {
  if (!containerEl) {
    throw new Error('Container element is required for Pixi app creation');
  }
  const resolution = resolvePixiResolution();
  if (PIXI?.settings) {
    PIXI.settings.RESOLUTION = resolution;
    PIXI.settings.FILTER_RESOLUTION = resolution;
  }
  const app = new PIXI.Application({
    resizeTo: containerEl,
    backgroundColor: 0x000000,
    antialias: true,
    autoDensity: true,
    resolution
  });
  containerEl.appendChild(app.view);
  return app;
}

export default createPixiApp;
