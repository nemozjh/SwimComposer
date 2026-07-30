import { loadOverlay } from '../data/overlayLoader.js';
import { loadInsight } from '../data/insightLoader.js';

const DEFAULT_INDEX_URL = './assets/competitions/index.json';

export async function loadCompetitions(indexUrl = DEFAULT_INDEX_URL) {
  const res = await fetch(indexUrl);
  if (!res.ok) {
    throw new Error(`Failed to load competitions index: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data.competitions) ? data.competitions : [];
}

export function chooseCompetition(competitions, requestedId) {
  if (!competitions || !competitions.length) return null;
  const found = competitions.find(c => c.id === requestedId);
  return found || competitions[0];
}

export function wireCompetitionSelect(selectEl, competitions, currentId) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  competitions.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label || c.id;
    selectEl.appendChild(opt);
  });
  selectEl.value = currentId;
  selectEl.addEventListener('change', (e) => {
    const newId = e.target.value;
    const params = new URLSearchParams(window.location.search);
    params.set('competition', newId);
    window.location.search = `?${params.toString()}`;
  });
}

export async function loadCompetitionData(competition) {
  if (!competition) {
    throw new Error('No competition provided for loading');
  }
  const inferBaseDir = () => {
    const candidates = [
      competition.overlay,
      competition.insight,
      competition.clickZones,
      competition.video
    ].filter((value) => typeof value === 'string' && value.trim());
    for (const candidate of candidates) {
      const idx = candidate.lastIndexOf('/');
      if (idx > 0) return candidate.slice(0, idx);
    }
    return null;
  };
  const loadOptionalJson = async (url, label) => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to load ${label}: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      return null;
    }
  };
  const inferredBaseDir = inferBaseDir();
  const clickZonesPromise = competition.clickZones
    ? loadOptionalJson(competition.clickZones, 'click zone config')
    : Promise.resolve(null);
  const metricValidityUrl = competition.metricValidity
    || (inferredBaseDir ? `${inferredBaseDir}/metric_validity.json` : null);
  const metricValidityPromise = loadOptionalJson(metricValidityUrl, 'metric validity config');

  const [overlay, insight, clickZones, metricValidity] = await Promise.all([
    loadOverlay(competition.overlay),
    loadInsight(competition.insight),
    clickZonesPromise,
    metricValidityPromise
  ]);
  return { overlay, insight, clickZones, metricValidity };
}
