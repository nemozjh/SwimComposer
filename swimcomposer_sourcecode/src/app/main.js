import {
  findSegmentAtTime,
  getLeaderIdAtTime,
  getChaseIdAtTime
} from '../data/insightLoader.js';
import {
  loadCompetitions,
  chooseCompetition,
  wireCompetitionSelect,
  loadCompetitionData
} from './competitionManager.js';
import createPixiApp, { syncPixiResolution } from './pixiApp.js';
import createVideoElement from './videoFactory.js';
import { mapSpriteToQuad, buildProjectedQuad } from './projectionUtils.js';
import { ProjectedElement } from './ProjectedElement.js';
import {
  createMetricRuntimeState,
  getFrameTimeSec,
  buildDerivedMetricsForFrame,
  buildAheadSwimmerById,
  getAthleteProgressValue
} from './vis/metricRuntime.js';
import {
  METRIC_DEFINITIONS,
  buildVisLibraryFromDefinitions,
  normalizeMetricRepType
} from './vis/metricDefinitions.js';
import { resetInstanceVisualState, renderRepresentation } from './vis/representationRenderers.js';
import {
  getRepStyleSchema,
  createDefaultRepProps,
  ensureRepProps,
  parseCssLikeStyleText,
  applyRepresentationStyle,
  formatRepPropReadout
} from './vis/representationStyleSystem.js';

async function init() {
  const DEFAULT_LAYER_OFFSET_X = 130;
  const PRESET_SCHEMA_VERSION = 9;
  const LIVE_DATA_UPDATE_INTERVAL_SEC = 0.5;
  const appRoot = document.getElementById('app');
  const logEl = document.getElementById('log');
  const containerEl = document.getElementById('canvas-container');
  const competitionSelect = document.getElementById('competition-select');
  const selectVis = document.getElementById('select-vis');
  const selectRep = document.getElementById('select-rep');
  const btnAddVis = document.getElementById('btn-add-vis');
  const liveDataChips = document.getElementById('live-data-chips');
  const athleteInfoChips = document.getElementById('athlete-info-chips');
  const recordsChips = document.getElementById('records-chips');
  const layerSettingsFlyout = document.getElementById('layer-settings-flyout');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const rightPanelHeading = document.getElementById('right-panel-heading');
  const rightPanelModeContent = document.getElementById('right-panel-mode-content');
  const panelOverviewSettings = document.getElementById('panel-overview-settings');
  const panelTrackingSettings = document.getElementById('panel-tracking-settings');
  const panelComparisonSettings = document.getElementById('panel-comparison-settings');
  const btnComparisonPanelToggle = document.getElementById('btn-comparison-panel-toggle');
  const comparisonSettingsCollapsible = document.getElementById('comparison-settings-collapsible');
  const btnViewOverview = document.getElementById('btn-view-overview');
  const btnViewTracking = document.getElementById('btn-view-tracking');
  const btnViewComparison = document.getElementById('btn-view-comparison');
  const btnExitTrack = document.getElementById('btn-exit-track');
  const trackTransitionDurationInput = document.getElementById('track-transition-duration');
  const trackTransitionDurationReadout = document.getElementById('track-transition-duration-readout');
  const trackZoomLevelInput = document.getElementById('track-zoom-level');
  const trackZoomLevelReadout = document.getElementById('track-zoom-level-readout');
  const trackAthleteSelection = document.getElementById('track-athlete-selection');
  const trackAthleteSelectionToggle = document.getElementById('track-athlete-selection-toggle');
  const trackAthleteSelectionBody = document.getElementById('track-athlete-selection-body');
  const trackTransitionButtons = Array.from(document.querySelectorAll('[data-track-transition]'));
  const trackBehaviorButtons = Array.from(document.querySelectorAll('[data-track-behavior]'));
  const trackHighlightStyleButtons = Array.from(document.querySelectorAll('[data-track-highlight-style]'));
  const overviewHighlightTransitionButtons = Array.from(document.querySelectorAll('[data-overview-highlight-transition]'));
  const overviewHighlightTransitionDurationInput = document.getElementById('overview-highlight-transition-duration');
  const overviewHighlightTransitionDurationReadout = document.getElementById('overview-highlight-transition-duration-readout');
  const comparisonTransitionButtons = Array.from(document.querySelectorAll('[data-comparison-transition]'));
  const comparisonTransitionDurationInput = document.getElementById('comparison-transition-duration');
  const comparisonTransitionDurationReadout = document.getElementById('comparison-transition-duration-readout');
  const comparisonLayoutButtons = Array.from(document.querySelectorAll('[data-comparison-layout]'));
  const comparisonPreserveSelectionInput = document.getElementById('comparison-preserve-selection');
  const comparisonSelectionModeInput = document.getElementById('comparison-selection-mode');
  const comparisonLaneSelector = document.getElementById('comparison-lane-selector');
  const btnComparisonConfirm = document.getElementById('btn-comparison-confirm');
  const comparisonSelectionFrameEl = document.getElementById('comparison-selection-frame');
  const comparisonLiveDataCanvas = document.getElementById('comparison-live-data-canvas');
  const comparisonLiveDataMetricEl = document.getElementById('comparison-live-data-metric');
  const comparisonLiveDataStatusEl = document.getElementById('comparison-live-data-status');
  const comparisonLiveDataEmptyEl = document.getElementById('comparison-live-data-empty');
  const panelTitle = document.getElementById('panel-title');
  const panelReps = document.getElementById('panel-reps');
  const panelLiveDataSection = document.getElementById('panel-live-data-section');
  const panelLiveDataControls = document.getElementById('panel-live-data-controls');
  const panelRepPropsSection = document.getElementById('panel-rep-props-section');
  const panelRepProps = document.getElementById('panel-rep-props');
  const panelRepPropsNote = document.getElementById('panel-rep-props-note');
  if (panelRepPropsNote) panelRepPropsNote.style.display = 'none';
  const panelStyleCss = document.getElementById('panel-style-css');
  const panelStyleApply = document.getElementById('panel-style-apply');
  const panelStyleReset = document.getElementById('panel-style-reset');
  const panelFollow = document.getElementById('panel-follow');
  const panelFollowLabel = document.getElementById('panel-follow-label');
  const panelStaticSlotRow = document.getElementById('panel-static-slot-row');
  const panelStaticSlot = document.getElementById('panel-static-slot');
  const panelStaticAlignRow = document.getElementById('panel-static-align-row');
  const panelStaticAlign = document.getElementById('panel-static-align');
  const panelScreenAnchorRow = document.getElementById('panel-screen-anchor-row');
  const panelScreenAnchor = document.getElementById('panel-screen-anchor');
  const panelOffsetXLabel = document.getElementById('panel-offset-x-label');
  const panelOffsetX = document.getElementById('panel-offset-x');
  const panelOffsetXReadout = document.getElementById('panel-offset-x-readout');
  const panelOffsetY = document.getElementById('panel-offset-y');
  const panelOffsetYReadout = document.getElementById('panel-offset-y-readout');
  const panelScale = document.getElementById('panel-scale');
  const panelScaleReadout = document.getElementById('panel-scale-readout');
  const panelRotation = document.getElementById('panel-rotation');
  const panelRotationReadout = document.getElementById('panel-rotation-readout');
  const panelAlpha = document.getElementById('panel-alpha');
  const panelAlphaReadout = document.getElementById('panel-alpha-readout');
  const panelColor = document.getElementById('panel-color');
  const panelProjection = document.getElementById('panel-projection');
  const panelSegmentMotion = document.getElementById('panel-segment-motion');
  const panelLanesSection = document.getElementById('panel-lanes-section');
  const panelLanes = document.getElementById('panel-lanes');
  const panelLaneSelectionMode = document.getElementById('panel-lane-selection-mode');
  const panelCompareTargetSection = document.getElementById('panel-compare-target-section');
  const panelTargetLaneRow = document.getElementById('panel-target-lane-row');
  const panelTargetLane = document.getElementById('panel-target-lane');
  const panelTargetRecordRow = document.getElementById('panel-target-record-row');
  const panelTargetRecord = document.getElementById('panel-target-record');
  const panelVisible = document.getElementById('panel-visible');
  const btnSaveDefault = document.getElementById('btn-save-default');
  const btnImportSettings = document.getElementById('btn-import-settings');
  const btnClearDefault = document.getElementById('btn-clear-default');
  const importSettingsInput = document.getElementById('import-settings-input');
  const elementsTimelineEl = document.getElementById('elements-timeline');
  const chipAwards = document.getElementById('chip-awards'); // may be null until chips are built
  const chipAppear = document.getElementById('chip-appearances'); // may be null until chips are built
  const insightContainer = document.getElementById('insight-options');

  const btnCamWide = document.getElementById('btn-cam-wide');
  const btnCamTrack = document.getElementById('btn-cam-track');
  const btnPlay = document.getElementById('btn-play');
  const btnIllustration = document.getElementById('btn-illustration');
  const btnProjHelp = document.getElementById('btn-projection-help');
  const videoTimeLabelEl = document.getElementById('video-time-label');
  const playbackSpeedInput = document.getElementById('playback-speed-input');
  const playbackSpeedReadout = document.getElementById('playback-speed-readout');

  const insightTextEl = document.getElementById('insight-text');
  const awardsBoxEl = document.getElementById('awards-box');
  const awardsListEl = document.getElementById('awards-list');
  const modalHelp = document.getElementById('modal-help');
  const modalHelpClose = document.getElementById('modal-help-close');
  const modalIllustration = document.getElementById('modal-illustration');
  const modalClose = document.getElementById('modal-close');
  const awardsOverlayWide = document.createElement('div');
  awardsOverlayWide.id = 'overlay-awards-wide';
  awardsOverlayWide.className = 'awards-overlay-surface';
  const awardsOverlayTrack = document.createElement('div');
  awardsOverlayTrack.id = 'overlay-awards-track';
  awardsOverlayTrack.className = 'awards-overlay-surface';
  containerEl.appendChild(awardsOverlayWide);
  containerEl.appendChild(awardsOverlayTrack);
  const timelineScrubber = document.getElementById('timeline-scrubber');
  const timelineBarEl = document.getElementById('timeline-bar');
  const timelineMarkersEl = document.getElementById('timeline-markers');
  const timelinePointerEl = document.getElementById('timeline-pointer');
  const btnExportRender = document.getElementById('btn-export-render');
  const btnExportRenderLabel = document.getElementById('btn-export-render-label');
  const exportControlEl = document.getElementById('export-control');
  const btnExportSettingsToggle = document.getElementById('btn-export-settings-toggle');
  const exportSettingsPopoverEl = document.getElementById('export-settings-popover');
  const exportMetricsOptionsEl = document.getElementById('export-metrics-options');
  const exportLanesOptionsEl = document.getElementById('export-lanes-options');
  const exportMetricsSectionEl = exportMetricsOptionsEl?.closest('.export-settings-section') || null;
  const exportLanesSectionEl = exportLanesOptionsEl?.closest('.export-settings-section') || null;
  const exportModeInputs = Array.from(document.querySelectorAll('input[name="export-output-mode"]'));
  const exportRenderOverlayEl = document.getElementById('export-render-overlay');
  const exportRenderProgressFillEl = document.getElementById('export-render-progress-fill');
  const exportRenderStatusTextEl = document.getElementById('export-render-status-text');
  const exportRenderStatusTimeEl = document.getElementById('export-render-status-time');
  const btnExportRenderCancel = document.getElementById('btn-export-render-cancel');

  let laneCountGlobal = 8;

  const highlightState = {};

  const infoState = {
    awards: false,
    appearances: false,
    age: false
  };
  const insightInputs = {};
  const currentInsightLayerState = {
    segment: null,
    leaderId: null,
    chaseId: null,
    results: null
  };
  let currentOverlayRenderContext = null;
  const awardRowById = new Map();
  let trackAwardEntry = null;

  const trackConfig = {
    show: true,
    alpha: 0.35,
    thickness: 2.5,
    snap: true,
    yOffset: 0
  };

  const uiState = {
    viewMode: 'overview',
    rightPanelSurface: 'mode',
    selectedLayerTypeId: null,
    modePanels: {
      overview: {
        highlightStyle: 'standard',
        highlightTransitionType: 'smooth',
        highlightTransitionDurationSec: 0.3
      },
      tracking: {
        transitionType: 'zoomlens',
        transitionDurationSec: 0.75,
        zoomLevel: 1.85,
        trackingBehavior: 'follow',
        athleteSelectionExpanded: false
      },
      comparison: {
        transitionType: 'smooth',
        transitionDurationSec: 0.75,
        layoutMode: 'sideBySide',
        preserveSelectionOnEnter: false
      }
    }
  };
  let comparisonSettingsExpanded = true;
  const overviewHighlightedLaneIds = new Set();
  const comparisonSelectedLaneIds = new Set();
  let comparisonLaneDisplayOrder = [];
  const comparisonState = {
    phase: 'idle', // 'idle' | 'selecting' | 'confirmed'
    selectionMode: 'lane',
    dragLaneId: null,
    dragPointerId: null,
    dragOffsetY: 0,
    pendingConfirmTransition: 'none', // 'none' | 'full' | 'rows' | 'layout'
    pendingTransitionFromLayout: 'sideBySide'
  };
  const comparisonTransitionState = {
    active: false,
    kind: 'full',
    startMs: 0,
    durationMs: 750,
    fromByLane: new Map(),
    toByLane: new Map(),
    fromBackdropAlpha: 1,
    toBackdropAlpha: 1
  };
  const comparisonExitTransitionState = {
    active: false,
    startMs: 0,
    durationMs: 0,
    fromByLane: new Map(),
    toByLane: new Map(),
    fromBackdropAlpha: 1,
    toBackdropAlpha: 0,
    layoutMode: 'sideBySide'
  };
  const overviewHighlightTransitionState = {
    laneAlpha: new Map(),
    lastUpdateMs: 0
  };
  let comparisonDeferredPauseTimer = 0;
  let comparisonHistorySeriesCache = null;
  let recordMotionTemplateCache = null;
  const VIEW_MODE_TIMELINE_PALETTE = {
    overview: {
      fill: '#7EB8F8',
      fillSoft: 'rgba(126, 184, 248, 0.24)',
      border: 'rgba(88, 149, 218, 0.42)',
      text: '#ffffff'
    },
    tracking: {
      fill: '#3478F6',
      fillSoft: 'rgba(52, 120, 246, 0.22)',
      border: 'rgba(52, 120, 246, 0.42)',
      text: '#ffffff'
    },
    comparison: {
      fill: '#2456C8',
      fillSoft: 'rgba(36, 86, 200, 0.22)',
      border: 'rgba(36, 86, 200, 0.42)',
      text: '#ffffff'
    }
  };
  const viewModeTimelineState = {
    nextId: 1,
    segments: [],
    draft: null,
    selectedSegmentId: null,
    isApplyingPlaybackState: false,
    lastAppliedSegmentId: null
  };
  const playbackRateTimelineState = {
    nextId: 1,
    segments: [],
    draft: null,
    selectedSegmentId: null,
    lastAppliedSegmentId: null
  };
  const playbackRateTransitionState = {
    active: false,
    fromRate: 1,
    toRate: 1,
    startedAtMs: 0,
    durationMs: 0
  };
  let userModeSwitchSeq = 0;
  let timelinePlaybackModeSwitchSeq = 0;
  let pausedCameraTransitionRaf = 0;
  const PLAYBACK_RATE_TRANSITION_MIN_MS = 220;
  const PLAYBACK_RATE_TRANSITION_MAX_MS = 420;
  const PLAYBACK_RATE_RUNTIME_ONE_EPSILON = 0.0005;
  const EXPORT_OUTPUT_MODE = Object.freeze({
    video: 'video',
    metrics: 'metrics',
    composite: 'composite',
    preset: 'preset'
  });
  const COMPARISON_HISTORY_THEME = Object.freeze({
    canvasBg: 'rgba(247, 248, 251, 0.98)',
    rowBg: 'rgba(255, 255, 255, 0.96)',
    rowBorder: 'rgba(29, 29, 31, 0.08)',
    title: 'rgba(29, 29, 31, 0.88)',
    grid: 'rgba(29, 29, 31, 0.06)',
    axis: 'rgba(29, 29, 31, 0.14)',
    axisText: 'rgba(66, 66, 69, 0.58)',
    legendText: 'rgba(29, 29, 31, 0.78)',
    noSelectionText: 'rgba(66, 66, 69, 0.62)',
    noDataText: 'rgba(66, 66, 69, 0.34)',
    playhead: 'rgba(29, 29, 31, 0.26)',
    rankBandFill: 'rgba(250, 204, 21, 0.10)',
    rankBandStroke: 'rgba(250, 204, 21, 0.28)'
  });
  const exportSettingsState = {
    outputMode: EXPORT_OUTPUT_MODE.video,
    metricIds: new Set(),
    laneIds: new Set(),
    panelOpen: false
  };
  const exportRenderState = {
    active: false,
    cancelled: false,
    recorder: null,
    chunks: [],
    mimeType: '',
    startedFromTime: 0,
    wasPlaying: false,
    prevTime: 0,
    preExportUiPlaying: false,
    listenerCleanup: null,
    captureStream: null,
    composeCanvas: null,
    composeCtx: null,
    composeRaf: 0,
    composeMetricsCanvas: null,
    captureOptions: null,
    captureLayout: null
  };
  const presetFileHandleByCompetitionId = new Map();

  const VIS_LIBRARY = buildVisLibraryFromDefinitions(METRIC_DEFINITIONS);

  const VIS_GROUPS = [
    {
      id: 'live',
      label: 'Live Data',
      items: [
        'currentSpeed',
        'avgSpeed',
        'speedDiffSwimmer',
        'timeDiffSwimmer',
        'acceleration',
        'distanceSwam',
        'remainingDistance',
        'distanceDiffLeader',
        'positionDiffSwimmer',
        'timeDiffRecord',
        'speedDiffRecord',
        'positionDiffRecord',
        'estCompletion',
        'rank',
        'elapsed'
      ]
    },
    {
      id: 'insights',
      label: 'Insights',
      items: [
        'leaderStatus',
        'chaseStatus',
        'splitTime',
        'finalTime',
        'insightText',
        'resultStatus'
      ]
    },
    {
      id: 'info',
      label: 'Athletes Info',
      items: [
        'name',
        'country',
        'age',
        'awardsInfo',
        'appearancesInfo'
      ]
    },
    {
      id: 'records',
      label: 'Records',
      items: [
        'worldRecord',
        'olympicsRecord',
        'personalRecord'
      ]
    }
  ];
  const LIVE_DATA_TIMELINE_TYPES = new Set(
    (VIS_GROUPS.find((group) => group.id === 'live')?.items || []).filter((id) => id !== 'elapsed')
  );
  const STATIC_TIMED_TEXT_TYPES = new Set(['splitTime', 'finalTime']);
  const LIVE_DATA_UPDATE_INTERVAL_CONTROL = {
    key: 'updateIntervalSec',
    label: 'Update Interval',
    type: 'range',
    min: 0.1,
    max: 2,
    step: 0.05,
    suffix: 's'
  };
  const DEFAULT_TEXT_REP_FONT_SIZE = 22;
  const ATHLETE_INFO_STATIC_TYPES = new Set(['name', 'country', 'age', 'awardsInfo', 'appearancesInfo']);
  const LANE_STATIC_TEXT_TYPES = new Set(['name', 'country', 'age', 'awardsInfo', 'appearancesInfo', 'insightText', ...STATIC_TIMED_TEXT_TYPES]);
  const GLOBAL_CORNER_TEXT_TYPES = new Set(['elapsed', 'worldRecord', 'olympicsRecord']);
  const STATIC_ALIGNABLE_REP_TYPES = new Set(['text', 'medalSummary', 'ringsCount']);
  const TARGET_SWIMMER_METRIC_TYPES = new Set(['positionDiffSwimmer', 'speedDiffSwimmer', 'timeDiffSwimmer']);
  const TARGET_RECORD_METRIC_TYPES = new Set(['timeDiffRecord', 'speedDiffRecord', 'positionDiffRecord']);
  const INSIGHT_LAYER_TYPES = new Set(['leaderStatus', 'chaseStatus', 'insightText', 'resultStatus']);
  const BASELINE_DELTA_ARROW_TYPES = new Set(['speedDiffSwimmer', 'speedDiffRecord', 'timeDiffRecord', 'distanceDiffLeader']);
  const COMPARE_LINE_TYPES = new Set(['distanceDiffLeader', 'positionDiffSwimmer', 'positionDiffRecord']);
  const CONTINUOUS_LIVE_METRIC_TYPES = new Set(['distanceDiffLeader', 'positionDiffSwimmer', 'positionDiffRecord']);
  const DYNAMIC_ARROW_LENGTH_TYPES = new Set(['acceleration', ...BASELINE_DELTA_ARROW_TYPES]);
  const ARROW_FORCE_PROJECT_FALSE_TYPES = new Set([...BASELINE_DELTA_ARROW_TYPES]);
  const REP_FILL_COLOR_PRIMARY_TYPES = new Set([
    'currentSpeed',
    'avgSpeed',
    'speedDiffSwimmer',
    'timeDiffSwimmer',
    'acceleration',
    'distanceSwam',
    'remainingDistance',
    'distanceDiffLeader',
    'positionDiffSwimmer',
    'timeDiffRecord',
    'speedDiffRecord',
    'positionDiffRecord',
    'estCompletion'
  ]);

  function usesLaneStaticPlacement(typeId) {
    return LANE_STATIC_TEXT_TYPES.has(String(typeId || ''));
  }

  function supportsLiveDataUpdateInterval(typeId) {
    const normalizedTypeId = String(typeId || '');
    return LIVE_DATA_TIMELINE_TYPES.has(normalizedTypeId) && !CONTINUOUS_LIVE_METRIC_TYPES.has(normalizedTypeId);
  }

  function supportsStaticTextAlign(typeId, repType = 'text') {
    return usesLaneStaticPlacement(typeId) && STATIC_ALIGNABLE_REP_TYPES.has(String(repType || ''));
  }

  function usesFollowDrivenProjection(typeId, repType = 'text') {
    return supportsStaticTextAlign(typeId, repType);
  }

  function usesStaticLanePosition(typeId) {
    return !usesGlobalCornerPlacement(typeId);
  }

  function usesGlobalCornerPlacement(typeId) {
    return GLOBAL_CORNER_TEXT_TYPES.has(String(typeId || ''));
  }

  function usesInsightLayerTimeline(typeId) {
    return INSIGHT_LAYER_TYPES.has(String(typeId || ''));
  }

  function hidesAppearanceColorControl(typeId, repType = '') {
    if (String(typeId || '') === 'resultStatus' && String(repType || '') === 'medal') return true;
    if (String(repType || '') === 'text') return true;
    return REP_FILL_COLOR_PRIMARY_TYPES.has(String(typeId || ''));
  }

  const NO_FRAME_FALLBACK_TYPES = new Set([
    ...ATHLETE_INFO_STATIC_TYPES,
    ...STATIC_TIMED_TEXT_TYPES,
    'elapsed',
    'worldRecord',
    'olympicsRecord',
    'personalRecord',
    'resultStatus'
  ]);

  function usesNoFrameFallbackPlacement(typeId) {
    return NO_FRAME_FALLBACK_TYPES.has(String(typeId || ''));
  }

  function resolveInsightIntervalWindow(seg, safeEnd) {
    const fallbackStart = Number(seg?.start_sec);
    const start = Number.isFinite(Number(seg?.display_start_sec))
      ? Number(seg.display_start_sec)
      : fallbackStart;
    const category = String(seg?.category || '').toLowerCase();
    let duration = Number.isFinite(Number(seg?.display_duration_sec))
      ? Number(seg.display_duration_sec)
      : 1.35;
    if (!Number.isFinite(duration) || duration <= 0) {
      duration = 1.35;
    }
    if (category === 'result') duration = Number.isFinite(Number(seg?.display_duration_sec)) ? Number(seg.display_duration_sec) : 1.6;
    if (category === 'tech_review') duration = Number.isFinite(Number(seg?.display_duration_sec)) ? Number(seg.display_duration_sec) : 1.5;
    if (category === 'lead_change') duration = Number.isFinite(Number(seg?.display_duration_sec)) ? Number(seg.display_duration_sec) : 1.2;
    if (!Number.isFinite(start)) return null;
    const clippedStart = Math.max(0, Math.min(safeEnd, start));
    const clippedEnd = Math.max(0, Math.min(safeEnd, clippedStart + duration));
    if (!(clippedEnd > clippedStart + 1e-3)) return null;
    return { start: clippedStart, end: clippedEnd };
  }

  function buildInsightIntervalsForType(typeId, baseEnd) {
    const safeEnd = Number.isFinite(baseEnd) && baseEnd > 0 ? baseEnd : 20;
    const segments = Array.isArray(insight?.segments) ? insight.segments : [];
    const matches = segments
      .map((seg, idx) => {
        if (String(typeId) === 'leaderStatus' && seg?.leader_id == null) return null;
        if (String(typeId) === 'chaseStatus' && seg?.chase_id == null) return null;
        if (String(typeId) === 'insightText' && (!seg?.athlete_texts || typeof seg.athlete_texts !== 'object')) return null;
        if (String(typeId) === 'resultStatus' && !seg?.results) return null;
        const window = resolveInsightIntervalWindow(seg, safeEnd);
        if (!window) return null;
        return {
          id: `int_${Date.now()}_${idx}_${Math.floor(Math.random() * 9999)}`,
          start: window.start,
          end: window.end
        };
      })
      .filter(Boolean);
    if (matches.length) return matches;
    return [{ id: `int_${Date.now()}`, start: 0, end: safeEnd }];
  }

  function applyBroadcastTextDefaults(props) {
    props.fillColor = '#7dd3fc';
    props.strokeColor = '#334155';
    props.strokeWidth = 0;
    props.showBackground = false;
  }

  function applyBroadcastBarShellDefaults(props) {
    props.width = 146;
    props.height = 21;
    props.radius = 2;
    props.fillColor = '#7dd3fc';
    props.backgroundColor = '#0f172a';
    props.backgroundAlpha = 0.88;
    props.fillAlpha = 0.95;
    props.strokeColor = '#334155';
    props.strokeAlpha = 0.42;
    props.strokeWidth = 1;
  }

  function applyBroadcastBarScaleDefaults(props, {
    minValue = 0,
    maxValue = 100,
    majorTickStep = 50,
    minorTickStep = 25,
    unitLabel = '',
    showTicks = true,
    showScaleText = true
  } = {}) {
    props.minValue = minValue;
    props.maxValue = maxValue;
    props.majorTickStep = majorTickStep;
    props.minorTickStep = minorTickStep;
    props.showTicks = showTicks;
    props.showScaleText = showScaleText;
    props.unitLabel = unitLabel;
    props.tickColor = '#f8fafc';
    props.tickAlpha = 0.82;
    props.minorTickAlpha = 0.52;
    props.endpointTickAlpha = 0.32;
    props.tickWidth = 3.2;
    props.tickInset = 3.8;
    props.labelColor = '#e2e8f0';
    props.labelFontSize = 15;
    props.labelOffsetY = 9;
    props.unitGap = 6;
  }

  function applyBroadcastPieDefaults(props) {
    props.radius = 24;
    props.height = 1;
    props.fillColor = '#7dd3fc';
    props.backgroundColor = '#0f172a';
    props.strokeColor = '#334155';
    props.backgroundAlpha = 0.92;
    props.fillAlpha = 0.95;
    props.strokeAlpha = 0.52;
    props.strokeWidth = 1;
  }

  function applyDynamicArrowDefaults(props) {
    props.headLen = 10;
    props.halfHeight = 7;
    props.tailRatio = 0.5;
    props.fillColor = '#7dd3fc';
    props.strokeColor = '#0f172a';
    props.fillAlpha = 0.95;
    props.strokeAlpha = 0.62;
    props.strokeWidth = 0.8;
  }

  function applyBaselineArrowDefaults(props) {
    props.headLen = 13;
    props.halfHeight = 7.2;
    props.tailRatio = 0.44;
    props.originRadius = 5.2;
    props.fillColor = '#7dd3fc';
    props.strokeColor = '#0f172a';
    props.originStrokeColor = '#000000';
    props.originCoreColor = '#facc15';
    props.fillAlpha = 0.95;
    props.strokeAlpha = 0.68;
    props.strokeWidth = 1.2;
  }

  function applyCompareLineDefaults(props, options = {}) {
    props.mainLineWidth = Number.isFinite(options.mainLineWidth) ? options.mainLineWidth : 6;
    props.childLineWidth = Number.isFinite(options.childLineWidth) ? options.childLineWidth : 3.4;
    props.mainLineColor = options.mainLineColor || '#f8fafc';
    props.childLineColor = options.childLineColor || '#7dd3fc';
    props.mainLineAlpha = Number.isFinite(options.mainLineAlpha) ? options.mainLineAlpha : 0.94;
    props.childLineAlpha = Number.isFinite(options.childLineAlpha) ? options.childLineAlpha : 0.88;
    props.mainStrokeWidth = Number.isFinite(options.mainStrokeWidth) ? options.mainStrokeWidth : 10.5;
    props.childStrokeWidth = Number.isFinite(options.childStrokeWidth) ? options.childStrokeWidth : 6.2;
    props.mainStrokeColor = options.mainStrokeColor || '#0f172a';
    props.childStrokeColor = options.childStrokeColor || '#0f172a';
    props.mainStrokeAlpha = Number.isFinite(options.mainStrokeAlpha) ? options.mainStrokeAlpha : 0.24;
    props.childStrokeAlpha = Number.isFinite(options.childStrokeAlpha) ? options.childStrokeAlpha : 0.18;
  }

  function normalizeCompareLineOffsetX(typeId, repType, rawOffsetX) {
    const offsetX = Number(rawOffsetX);
    if (!Number.isFinite(offsetX)) return 0;
    if (repType === 'line' && COMPARE_LINE_TYPES.has(String(typeId || '')) && Math.abs(offsetX - DEFAULT_LAYER_OFFSET_X) < 1e-6) {
      return 0;
    }
    return offsetX;
  }

  function applyRecordLineDebugDefaults(props) {
    props.showDebugOverlay = false;
    props.debugColor = '#fbbf24';
    props.debugAlpha = 0.42;
    props.debugWidth = 1.8;
    props.debugLabelColor = '#f8fafc';
    props.debugLabelBgColor = '#020617';
    props.debugLabelBgAlpha = 0.76;
    props.debugLabelFontSize = 13;
    props.debugLabelPaddingX = 10;
    props.debugLabelPaddingY = 6;
    props.debugLabelRadius = 8;
    props.debugLabelOffsetY = 16;
    props.debugEndpointLabelColor = '#f8fafc';
    props.debugEndpointLabelFontSize = 11;
    props.debugEndpointLabelOffsetY = 14;
  }

  function buildLayerDefaultRepProps(typeId, repType, layerColorHex) {
    const props = createDefaultRepProps(repType, layerColorHex);
    if (supportsLiveDataUpdateInterval(typeId)) {
      props.updateIntervalSec = LIVE_DATA_UPDATE_INTERVAL_SEC;
    }
    if ((typeId === 'currentSpeed' || typeId === 'avgSpeed') && repType === 'bar') {
      props.width = 146;
      props.height = 21;
      props.radius = 2;
      props.fillColor = '#7dd3fc';
      props.backgroundColor = '#0f172a';
      props.backgroundAlpha = 0.88;
      props.fillAlpha = 0.95;
      props.strokeColor = '#334155';
      props.strokeAlpha = 0.42;
      props.strokeWidth = 1;
      props.minValue = 0;
      props.maxValue = 3;
      props.majorTickStep = 1;
      props.minorTickStep = 0.5;
      props.showTicks = false;
      props.showScaleText = true;
      props.unitLabel = 'm/s';
      props.tickColor = '#f8fafc';
      props.tickAlpha = 0.82;
      props.minorTickAlpha = 0.52;
      props.endpointTickAlpha = 0.32;
      props.tickWidth = 3.2;
      props.tickInset = 3.8;
      props.labelColor = '#e2e8f0';
      props.labelFontSize = 15;
      props.labelOffsetY = 9;
      props.unitGap = 6;
      props.backgroundPaddingX = 12;
      props.backgroundPaddingY = 6;
      props.backgroundRadius = 8;
      props.fixedBackground = true;
      props.fontSize = 52;
      props.showBackground = false;
    }
    if ((typeId === 'currentSpeed' || typeId === 'avgSpeed') && repType === 'circular') {
      props.radius = 34;
      props.height = 4;
      props.fillColor = '#7dd3fc';
      props.backgroundColor = '#0f172a';
      props.fillAlpha = 1;
      props.backgroundAlpha = 0.92;
      props.showText = true;
      props.showUnit = true;
      props.valueColor = '#7dd3fc';
      props.unitColor = '#f8fafc';
      props.valueFontSize = 13;
      props.unitFontSize = 10;
      props.textOffsetY = 14;
      props.valueUnitGap = 6;
    }
    if (typeId === 'speedDiffSwimmer' && repType === 'text') {
      props.fillColor = '#7dd3fc';
      props.strokeColor = '#334155';
      props.strokeWidth = 0;
      props.showBackground = false;
    }
    if (typeId === 'speedDiffSwimmer' && repType === 'bar') {
      props.width = 146;
      props.height = 21;
      props.radius = 2;
      props.fillColor = '#7dd3fc';
      props.backgroundColor = '#0f172a';
      props.backgroundAlpha = 0.88;
      props.fillAlpha = 0.95;
      props.strokeColor = '#334155';
      props.strokeAlpha = 0.42;
      props.strokeWidth = 1;
      props.minValue = -1;
      props.maxValue = 1;
      props.majorTickStep = 1;
      props.minorTickStep = 0.5;
      props.showTicks = true;
      props.showScaleText = true;
      props.unitLabel = 'm/s';
      props.tickColor = '#f8fafc';
      props.tickAlpha = 0.82;
      props.minorTickAlpha = 0.52;
      props.endpointTickAlpha = 0.32;
      props.tickWidth = 3.2;
      props.tickInset = 3.8;
      props.labelColor = '#e2e8f0';
      props.labelFontSize = 15;
      props.labelOffsetY = 9;
      props.unitGap = 6;
    }
    if (typeId === 'speedDiffSwimmer' && repType === 'arrow') {
      props.headLen = 13;
      props.halfHeight = 7.2;
      props.tailRatio = 0.44;
      props.originRadius = 5.2;
      props.fillColor = '#7dd3fc';
      props.strokeColor = '#0f172a';
      props.originStrokeColor = '#000000';
      props.originCoreColor = '#facc15';
      props.fillAlpha = 0.95;
      props.strokeAlpha = 0.68;
      props.strokeWidth = 1.2;
    }
    if (typeId === 'timeDiffSwimmer' && repType === 'text') {
      props.fillColor = '#7dd3fc';
      props.strokeColor = '#334155';
      props.strokeWidth = 0;
      props.showBackground = false;
    }
    if (typeId === 'timeDiffSwimmer' && repType === 'bar') {
      props.width = 146;
      props.height = 21;
      props.radius = 2;
      props.fillColor = '#7dd3fc';
      props.backgroundColor = '#0f172a';
      props.backgroundAlpha = 0.88;
      props.fillAlpha = 0.95;
      props.strokeColor = '#334155';
      props.strokeAlpha = 0.42;
      props.strokeWidth = 1;
      props.minValue = -1;
      props.maxValue = 1;
      props.majorTickStep = 1;
      props.minorTickStep = 0.5;
      props.showTicks = true;
      props.showScaleText = true;
      props.unitLabel = 's';
      props.tickColor = '#f8fafc';
      props.tickAlpha = 0.82;
      props.minorTickAlpha = 0.52;
      props.endpointTickAlpha = 0.32;
      props.tickWidth = 3.2;
      props.tickInset = 3.8;
      props.labelColor = '#e2e8f0';
      props.labelFontSize = 15;
      props.labelOffsetY = 9;
      props.unitGap = 6;
    }
    if (typeId === 'rank' && repType === 'badge') {
      props.radius = 20;
      props.fontSize = 18;
      props.fontWeight = '700';
    }
    if (typeId === 'resultStatus' && repType === 'medal') {
      props.radius = 22;
      props.fillAlpha = 0.98;
      props.strokeColor = '#0f172a';
      props.strokeAlpha = 0.26;
      props.strokeWidth = 1.2;
    }
    if (typeId === 'acceleration' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'acceleration' && repType === 'bar') {
      applyBroadcastBarShellDefaults(props);
      applyBroadcastBarScaleDefaults(props, {
        minValue: -1,
        maxValue: 1,
        majorTickStep: 1,
        minorTickStep: 0.5,
        unitLabel: 'm/s²'
      });
    }
    if (typeId === 'acceleration' && repType === 'arrow') {
      applyDynamicArrowDefaults(props);
    }
    if ((typeId === 'distanceSwam' || typeId === 'remainingDistance') && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if ((typeId === 'distanceSwam' || typeId === 'remainingDistance') && repType === 'bar') {
      applyBroadcastBarShellDefaults(props);
      applyBroadcastBarScaleDefaults(props, {
        minValue: 0,
        maxValue: 100,
        majorTickStep: 50,
        minorTickStep: 25,
        unitLabel: 'm',
        showTicks: false
      });
    }
    if ((typeId === 'distanceSwam' || typeId === 'remainingDistance') && repType === 'pie') {
      applyBroadcastPieDefaults(props);
    }
    if (typeId === 'distanceDiffLeader' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'distanceDiffLeader' && repType === 'line') {
      applyCompareLineDefaults(props, {
        mainLineColor: '#f8fafc',
        childLineColor: '#7dd3fc'
      });
    }
    if (typeId === 'distanceDiffLeader' && repType === 'arrow') {
      applyBaselineArrowDefaults(props);
      props.originCoreColor = '#f8fafc';
    }
    if (typeId === 'positionDiffSwimmer' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'positionDiffSwimmer' && repType === 'line') {
      applyCompareLineDefaults(props, {
        mainLineColor: '#f8fafc',
        childLineColor: '#7dd3fc'
      });
    }
    if (typeId === 'timeDiffRecord' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'timeDiffRecord' && repType === 'bar') {
      applyBroadcastBarShellDefaults(props);
      applyBroadcastBarScaleDefaults(props, {
        minValue: -3,
        maxValue: 3,
        majorTickStep: 1,
        minorTickStep: 0.5,
        unitLabel: 's'
      });
    }
    if (typeId === 'timeDiffRecord' && repType === 'arrow') {
      applyBaselineArrowDefaults(props);
    }
    if (typeId === 'speedDiffRecord' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'speedDiffRecord' && repType === 'bar') {
      applyBroadcastBarShellDefaults(props);
      applyBroadcastBarScaleDefaults(props, {
        minValue: -1,
        maxValue: 1,
        majorTickStep: 1,
        minorTickStep: 0.5,
        unitLabel: 'm/s'
      });
    }
    if (typeId === 'speedDiffRecord' && repType === 'arrow') {
      applyBaselineArrowDefaults(props);
    }
    if (typeId === 'positionDiffRecord' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'positionDiffRecord' && repType === 'line') {
      applyCompareLineDefaults(props, {
        mainLineColor: '#f8fafc',
        childLineColor: '#7dd3fc'
      });
      applyRecordLineDebugDefaults(props);
    }
    if (typeId === 'personalRecord' && repType === 'text') {
      props.fontSize = 15;
    }
    if (typeId === 'estCompletion' && repType === 'text') {
      applyBroadcastTextDefaults(props);
    }
    if (typeId === 'estCompletion' && repType === 'bar') {
      applyBroadcastBarShellDefaults(props);
      props.showTicks = false;
      props.showScaleText = false;
    }
    if (typeId === 'awardsInfo' && repType === 'medalSummary') {
      props.awardSet = 'olympic';
      props.fontSize = 24;
      props.iconSize = 30;
      props.fillColor = '#d3d3d3';
      props.showBackground = false;
    }
    if (typeId === 'appearancesInfo' && repType === 'ringsCount') {
      props.fontSize = 28;
      props.iconSize = 36;
      props.fillColor = '#d3d3d3';
      props.showBackground = false;
    }
    if (typeId === 'leaderStatus' && repType === 'arrow') {
      props.width = 22;
      props.halfHeight = 9;
      props.fillColor = '#facc15';
      props.strokeColor = '#451a03';
      props.fillAlpha = 1;
      props.strokeAlpha = 0.42;
      props.strokeWidth = 1.4;
    }
    if (typeId === 'leaderStatus' && repType === 'text') {
      props.fillColor = '#facc15';
      props.strokeColor = '#451a03';
      props.strokeWidth = 0;
    }
    if (typeId === 'chaseStatus' && repType === 'arrow') {
      props.width = 22;
      props.halfHeight = 9;
      props.fillColor = '#93c5fd';
      props.strokeColor = '#1e3a8a';
      props.fillAlpha = 1;
      props.strokeAlpha = 0.42;
      props.strokeWidth = 1.4;
    }
    if (typeId === 'chaseStatus' && repType === 'text') {
      props.fillColor = '#93c5fd';
      props.strokeColor = '#1e3a8a';
      props.strokeWidth = 0;
    }
    if (typeId === 'insightText' && repType === 'text') {
      props.fontSize = 20;
      props.fillColor = '#e5e7eb';
      props.strokeColor = '#111827';
      props.strokeWidth = 0;
      props.showBackground = true;
      props.backgroundColor = '#000000';
      props.backgroundAlpha = 0.45;
      props.backgroundPaddingX = 12;
      props.backgroundPaddingY = 6;
      props.backgroundRadius = 8;
    }
    return props;
  }

  function mergeRepPropsWithMetricDefaults(typeId, repType, repProps, color) {
    const variantColor = normalizeColorInputValue(color || '#d3d3d3');
    const merged = {
      ...clonePlainData(buildLayerDefaultRepProps(typeId, repType, variantColor)),
      ...ensureRepProps(repType, clonePlainData(repProps), variantColor)
    };
    if (!supportsLiveDataUpdateInterval(typeId) && Object.prototype.hasOwnProperty.call(merged, 'updateIntervalSec')) {
      delete merged.updateIntervalSec;
    }
    return merged;
  }

  function getDefaultStaticPlacementForType(typeId) {
    const key = String(typeId || '');
    if (key === 'elapsed') return 'screenTopRight';
    if (key === 'worldRecord') return 'screenTopLeft';
    if (key === 'olympicsRecord') return 'screenBottomLeft';
    if (key === 'resultStatus') return 'laneRight';
    if (key === 'country') return 'laneCenter';
    if (STATIC_TIMED_TEXT_TYPES.has(key)) return 'laneCenter';
    if (usesStaticLanePosition(key)) return 'laneLeft';
    return 'laneLeft';
  }

  function normalizeStaticPlacement(typeId, rawValue) {
    const value = String(rawValue || '');
    if (usesGlobalCornerPlacement(typeId)) {
      if (value === 'screenTopLeft' || value === 'screenTopRight' || value === 'screenBottomLeft' || value === 'screenBottomRight') {
        return value;
      }
      return getDefaultStaticPlacementForType(typeId);
    }
    if (usesStaticLanePosition(typeId)) {
      if (value === 'laneLeft' || value === 'laneCenter' || value === 'laneRight') {
        return value;
      }
      return getDefaultStaticPlacementForType(typeId);
    }
    return value || getDefaultStaticPlacementForType(typeId);
  }

  function getDefaultStaticTextAlign(_typeId) {
    return 'left';
  }

  function normalizeStaticTextAlign(rawValue, fallback = 'left') {
    const value = String(rawValue || '');
    if (value === 'left' || value === 'center' || value === 'right') {
      return value;
    }
    return String(fallback || 'left');
  }

  function normalizeCompareTargetLaneId(rawValue) {
    const num = Number(rawValue);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.max(1, Math.min(laneCountGlobal || 8, Math.round(num)));
  }

  function normalizeCompareTargetBinding(rawValue) {
    const value = String(rawValue || '').toLowerCase();
    if (value === 'lane') return 'lane';
    if (value === 'rank') return 'rank';
    return 'auto';
  }

  function resolveCompareTargetBindingConfig(rawBinding, rawLaneId = 0, rawRank = 0) {
    const normalizedBinding = normalizeCompareTargetBinding(rawBinding);
    if (normalizedBinding === 'auto') {
      if (normalizeCompareTargetRank(rawRank) > 0) return 'rank';
      if (normalizeCompareTargetLaneId(rawLaneId) > 0) return 'lane';
    }
    return normalizedBinding;
  }

  function normalizeCompareTargetRank(rawValue) {
    const num = Number(rawValue);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.max(1, Math.min(laneCountGlobal || 8, Math.round(num)));
  }

  function buildCompareTargetSelectValue(target) {
    const binding = resolveCompareTargetBindingConfig(
      target?.compareTargetBinding ?? 'auto',
      target?.compareTargetLaneId ?? 0,
      target?.compareTargetRank ?? 0
    );
    if (binding === 'lane') {
      const laneId = normalizeCompareTargetLaneId(target?.compareTargetLaneId ?? 0);
      return laneId > 0 ? `lane:${laneId}` : 'auto';
    }
    if (binding === 'rank') {
      const rank = normalizeCompareTargetRank(target?.compareTargetRank ?? 0);
      return rank > 0 ? `rank:${rank}` : 'auto';
    }
    return 'auto';
  }

  function parseCompareTargetSelectValue(rawValue) {
    const value = String(rawValue || '').trim().toLowerCase();
    if (!value || value === '0' || value === 'auto') {
      return { binding: 'auto', laneId: 0, rank: 0 };
    }
    if (value.startsWith('rank:')) {
      return {
        binding: 'rank',
        laneId: 0,
        rank: normalizeCompareTargetRank(value.slice(5))
      };
    }
    if (value.startsWith('lane:')) {
      return {
        binding: 'lane',
        laneId: normalizeCompareTargetLaneId(value.slice(5)),
        rank: 0
      };
    }
    const laneId = normalizeCompareTargetLaneId(value);
    return laneId > 0
      ? { binding: 'lane', laneId, rank: 0 }
      : { binding: 'auto', laneId: 0, rank: 0 };
  }

  function normalizeCompareRecordType(rawValue) {
    return String(rawValue || '') === 'olympic' ? 'olympic' : 'world';
  }

  function getModeHeading(mode) {
    if (mode === 'tracking') return 'Tracking Settings';
    if (mode === 'comparison') return 'Comparison Settings';
    return 'Overview Settings';
  }

  function getModeSubtitle(mode) {
    if (mode === 'tracking') return 'Select a layer to edit Layer Settings';
    if (mode === 'comparison') return 'Select lanes, confirm, then compare layouts';
    return 'Select a layer to edit settings';
  }

  function getVisLabel(typeId) {
    return VIS_LIBRARY[typeId]?.label || typeId || 'Layer';
  }

  function renderViewModeTabs() {
    const entries = [
      [btnViewOverview, 'overview'],
      [btnViewTracking, 'tracking'],
      [btnViewComparison, 'comparison']
    ];
    entries.forEach(([btn, mode]) => {
      if (!btn) return;
      const active = uiState.viewMode === mode;
      const palette = VIEW_MODE_TIMELINE_PALETTE[mode] || VIEW_MODE_TIMELINE_PALETTE.overview;
      btn.classList.toggle('is-active', active);
      btn.style.background = active ? palette.fill : 'transparent';
      btn.style.borderColor = active ? palette.fill : 'transparent';
      btn.style.color = active ? palette.text : '';
      btn.style.boxShadow = active ? `0 6px 18px ${palette.fillSoft}, inset 0 0 0 1px rgba(255,255,255,0.08)` : '';
    });
  }

  function cloneArrayNums(list) {
    if (!Array.isArray(list)) return [];
    return list.map(v => Number(v)).filter(v => Number.isFinite(v));
  }

  function sameNumberArray(a, b) {
    const aa = cloneArrayNums(a);
    const bb = cloneArrayNums(b);
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i += 1) {
      if (aa[i] !== bb[i]) return false;
    }
    return true;
  }

  function quantizeTimelineSec(raw) {
    const t = Number(raw);
    if (!Number.isFinite(t)) return 0;
    return Math.round(Math.max(0, t) * 1000) / 1000;
  }

  function getCurrentPlaybackTimeForViewModeTimeline() {
    if (videoEl && Number.isFinite(videoEl.currentTime)) {
      return quantizeTimelineSec(videoEl.currentTime);
    }
    return quantizeTimelineSec(prevTimeSec || 0);
  }

  function getViewModeTimelineTimeTotal() {
    const total = Number(videoDuration || videoEl?.duration || 20);
    if (!Number.isFinite(total) || total <= 0) return 20;
    return total;
  }

  function clampPlaybackRateValue(raw) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return 1;
    return Math.max(0.25, Math.min(2, num));
  }

  function normalizePlaybackRateValue(raw) {
    const num = clampPlaybackRateValue(raw);
    return Math.round(num * 20) / 20;
  }

  function resolveRuntimePlaybackRateValue(rateRaw) {
    const rate = clampPlaybackRateValue(rateRaw);
    if (Math.abs(rate - 1) < 1e-6) {
      return 1 - PLAYBACK_RATE_RUNTIME_ONE_EPSILON;
    }
    return rate;
  }

  function formatDecimalReadout(raw, suffix = '') {
    const num = Number(raw);
    if (!Number.isFinite(num)) return `1.0${suffix}`;
    let text = num.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    if (!text.includes('.')) text += '.0';
    return `${text}${suffix}`;
  }

  function formatPlaybackRateLabel(raw) {
    const rate = clampPlaybackRateValue(raw);
    return formatDecimalReadout(rate, 'x');
  }

  function getCurrentPlaybackRateValue(opts = {}) {
    const quantize = opts.quantize !== false;
    if (videoEl && Number.isFinite(videoEl.playbackRate)) {
      return quantize
        ? normalizePlaybackRateValue(videoEl.playbackRate)
        : clampPlaybackRateValue(videoEl.playbackRate);
    }
    return quantize
      ? normalizePlaybackRateValue(playbackSpeedInput?.value || 1)
      : clampPlaybackRateValue(playbackSpeedInput?.value || 1);
  }

  function updatePlaybackSpeedControl(rateRaw = 1, opts = {}) {
    const quantize = opts.quantize !== false;
    const rate = quantize
      ? normalizePlaybackRateValue(rateRaw)
      : clampPlaybackRateValue(rateRaw);
    if (playbackSpeedInput) playbackSpeedInput.value = String(rate);
    if (playbackSpeedReadout) playbackSpeedReadout.textContent = formatPlaybackRateLabel(rate);
  }

  function clearPlaybackRateTransition() {
    playbackRateTransitionState.active = false;
    playbackRateTransitionState.fromRate = getCurrentPlaybackRateValue({ quantize: false });
    playbackRateTransitionState.toRate = playbackRateTransitionState.fromRate;
    playbackRateTransitionState.startedAtMs = 0;
    playbackRateTransitionState.durationMs = 0;
  }

  function resolvePlaybackRateTransitionDurationMs(fromRateRaw, toRateRaw) {
    const delta = Math.abs(clampPlaybackRateValue(toRateRaw) - clampPlaybackRateValue(fromRateRaw));
    const scaled = PLAYBACK_RATE_TRANSITION_MIN_MS + (delta / 1.75) * 200;
    return Math.max(PLAYBACK_RATE_TRANSITION_MIN_MS, Math.min(PLAYBACK_RATE_TRANSITION_MAX_MS, Math.round(scaled)));
  }

  function startPlaybackRateTransition(toRateRaw, nowMs = performance.now()) {
    const fromRate = getCurrentPlaybackRateValue({ quantize: false });
    const toRate = clampPlaybackRateValue(toRateRaw);
    if (Math.abs(fromRate - toRate) < 1e-4) {
      clearPlaybackRateTransition();
      return false;
    }
    const startedAt = Number.isFinite(nowMs) ? nowMs : performance.now();
    playbackRateTransitionState.active = true;
    playbackRateTransitionState.fromRate = fromRate;
    playbackRateTransitionState.toRate = toRate;
    playbackRateTransitionState.startedAtMs = startedAt - 16;
    playbackRateTransitionState.durationMs = resolvePlaybackRateTransitionDurationMs(fromRate, toRate);
    return true;
  }

  function updatePlaybackRateTransition(nowMs = performance.now()) {
    if (!playbackRateTransitionState.active) return false;
    const {
      fromRate,
      toRate,
      startedAtMs,
      durationMs
    } = playbackRateTransitionState;
    const elapsed = Math.max(0, (Number.isFinite(nowMs) ? nowMs : performance.now()) - startedAtMs);
    const rawT = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1;
    const eased = 1 - Math.pow(1 - rawT, 3);
    const nextRate = fromRate + (toRate - fromRate) * eased;
    applyPlaybackRateValue(nextRate, {
      preserveTransition: true,
      quantize: false,
      syncDefault: false
    });
    if (rawT >= 1) {
      clearPlaybackRateTransition();
      applyPlaybackRateValue(toRate, {
        preserveTransition: true,
        quantize: false
      });
      return false;
    }
    return true;
  }

  function applyPlaybackRateValue(rateRaw = 1, opts = {}) {
    const authoredRate = opts.quantize === false
      ? clampPlaybackRateValue(rateRaw)
      : normalizePlaybackRateValue(rateRaw);
    const runtimeRate = resolveRuntimePlaybackRateValue(authoredRate);
    if (!opts.preserveTransition) {
      clearPlaybackRateTransition();
    }
    if (videoEl) {
      videoEl.playbackRate = runtimeRate;
    }
    updatePlaybackSpeedControl(authoredRate, { quantize: opts.quantize !== false });
    if (opts.record === 'draft') {
      stagePlaybackRateTimelineDraft(opts.reason || 'playback-rate');
    } else if (opts.record === 'commit') {
      stagePlaybackRateTimelineDraft(opts.reason || 'playback-rate');
      commitPlaybackRateTimelineDraft(opts.reason || 'playback-rate');
    }
    return authoredRate;
  }

  function recomputePlaybackRateTimelineSegments() {
    const total = getViewModeTimelineTimeTotal();
    playbackRateTimelineState.segments.sort((a, b) => (a.start - b.start) || (a.id - b.id));
    playbackRateTimelineState.segments.forEach((seg, idx) => {
      const next = playbackRateTimelineState.segments[idx + 1];
      seg.end = next ? next.start : total;
    });
    for (let i = playbackRateTimelineState.segments.length - 1; i > 0; i -= 1) {
      const cur = playbackRateTimelineState.segments[i];
      const prev = playbackRateTimelineState.segments[i - 1];
      if (Math.abs(cur.start - prev.start) < 1e-3) {
        playbackRateTimelineState.segments.splice(i - 1, 1);
        continue;
      }
      if (Math.abs(normalizePlaybackRateValue(cur.rate) - normalizePlaybackRateValue(prev.rate)) < 1e-4) {
        playbackRateTimelineState.segments.splice(i, 1);
      }
    }
    playbackRateTimelineState.segments.forEach((seg, idx) => {
      const next = playbackRateTimelineState.segments[idx + 1];
      seg.end = next ? next.start : total;
    });
    if (playbackRateTimelineState.selectedSegmentId != null
      && !playbackRateTimelineState.segments.some(seg => seg.id === playbackRateTimelineState.selectedSegmentId)) {
      playbackRateTimelineState.selectedSegmentId = playbackRateTimelineState.segments[0]?.id ?? null;
    }
  }

  function findPlaybackRateTimelineSegmentAtTime(tSec) {
    const t = Number.isFinite(tSec) ? tSec : 0;
    const list = playbackRateTimelineState.segments;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const seg = list[i];
      if (t + 1e-6 >= seg.start && t < (seg.end ?? Infinity) - 1e-6) return seg;
    }
    if (list.length && Math.abs(t - list[list.length - 1].end) < 1e-6) {
      return list[list.length - 1];
    }
    return null;
  }

  function getPlaybackRateTimelineSegmentById(segId) {
    const id = Number(segId);
    if (!Number.isFinite(id)) return null;
    return playbackRateTimelineState.segments.find(seg => seg.id === id) || null;
  }

  function setSelectedPlaybackRateTimelineSegmentId(segId) {
    if (segId == null) {
      playbackRateTimelineState.selectedSegmentId = null;
      return;
    }
    const id = Number(segId);
    if (!getPlaybackRateTimelineSegmentById(id)) return;
    playbackRateTimelineState.selectedSegmentId = id;
  }

  function getSelectedPlaybackRateTimelineSegment() {
    return getPlaybackRateTimelineSegmentById(playbackRateTimelineState.selectedSegmentId);
  }

  function syncPlaybackRateTimelineEditResultAtCurrentTime() {
    const t = getCurrentPlaybackTimeForViewModeTimeline();
    const seg = findPlaybackRateTimelineSegmentAtTime(t);
    if (seg) {
      applyPlaybackRateValue(seg.rate);
      playbackRateTimelineState.lastAppliedSegmentId = seg.id;
      playbackRateTimelineState.selectedSegmentId = seg.id;
    } else {
      applyPlaybackRateValue(1);
      playbackRateTimelineState.lastAppliedSegmentId = null;
      playbackRateTimelineState.selectedSegmentId = null;
    }
  }

  function deletePlaybackRateTimelineSegmentById(segId) {
    const id = Number(segId);
    if (!Number.isFinite(id)) return false;
    const segments = playbackRateTimelineState.segments;
    if (segments.length <= 1) return false;
    const idx = segments.findIndex(seg => seg.id === id);
    if (idx < 0) return false;

    playbackRateTimelineState.draft = null;
    const removed = segments[idx];
    if (idx === 0 && segments[idx + 1]) {
      segments[idx + 1].start = removed.start;
    }
    segments.splice(idx, 1);
    recomputePlaybackRateTimelineSegments();
    const replacement = segments[Math.max(0, idx - 1)] || segments[0] || null;
    playbackRateTimelineState.selectedSegmentId = replacement?.id ?? null;
    syncPlaybackRateTimelineEditResultAtCurrentTime();
    renderElementTimeline();
    return true;
  }

  function resetPlaybackRateTimelineToDefaults() {
    playbackRateTimelineState.nextId = 1;
    playbackRateTimelineState.segments = [{
      id: playbackRateTimelineState.nextId++,
      start: 0,
      end: getViewModeTimelineTimeTotal(),
      rate: 1
    }];
    recomputePlaybackRateTimelineSegments();
    playbackRateTimelineState.draft = null;
    playbackRateTimelineState.selectedSegmentId = playbackRateTimelineState.segments[0]?.id ?? null;
    playbackRateTimelineState.lastAppliedSegmentId = null;
    applyPlaybackRateValue(1);
    playbackRateTimelineState.lastAppliedSegmentId = playbackRateTimelineState.segments[0]?.id ?? null;
    renderElementTimeline();
  }

  function stagePlaybackRateTimelineDraft(reason = 'playback-rate-change') {
    const rate = getCurrentPlaybackRateValue();
    playbackRateTimelineState.draft = {
      id: 'draft',
      reason,
      start: getCurrentPlaybackTimeForViewModeTimeline(),
      rate
    };
    renderElementTimeline();
  }

  function commitPlaybackRateTimelineDraft(reason = 'playback-rate-change') {
    const draft = playbackRateTimelineState.draft;
    if (!draft) return null;
    const start = quantizeTimelineSec(draft.start);
    const rate = normalizePlaybackRateValue(draft.rate);
    const existingSameStartIdx = playbackRateTimelineState.segments.findIndex(seg => Math.abs(seg.start - start) < 1e-3);
    if (existingSameStartIdx >= 0) {
      playbackRateTimelineState.segments[existingSameStartIdx] = {
        ...playbackRateTimelineState.segments[existingSameStartIdx],
        start,
        rate
      };
    } else {
      playbackRateTimelineState.segments.push({
        id: playbackRateTimelineState.nextId++,
        start,
        end: start,
        rate
      });
    }
    recomputePlaybackRateTimelineSegments();
    playbackRateTimelineState.draft = null;
    const active = findPlaybackRateTimelineSegmentAtTime(start + 1e-6);
    playbackRateTimelineState.lastAppliedSegmentId = active?.id ?? null;
    playbackRateTimelineState.selectedSegmentId = active?.id ?? null;
    renderElementTimeline();
    return active;
  }

  function applyPlaybackRateTimelineSegmentAtTime(tSec, opts = {}) {
    const seg = findPlaybackRateTimelineSegmentAtTime(tSec);
    if (!seg) {
      clearPlaybackRateTransition();
      playbackRateTimelineState.lastAppliedSegmentId = null;
      return null;
    }
    if (!opts.force && playbackRateTimelineState.lastAppliedSegmentId === seg.id) {
      return seg;
    }
    const shouldSmoothTransition = !opts.force && !isScrubbing && !(videoEl?.paused);
    if (shouldSmoothTransition) {
      startPlaybackRateTransition(seg.rate, opts.nowMs);
    } else {
      applyPlaybackRateValue(seg.rate);
    }
    playbackRateTimelineState.lastAppliedSegmentId = seg.id;
    return seg;
  }

  function seekAndApplyPlaybackRateSegment(segOrNull, timeSec) {
    const t = quantizeTimelineSec(timeSec);
    playbackRateTimelineState.draft = null;
    if (videoEl) {
      videoEl.pause();
      setPlaybackUiPlayingState(false);
      try {
        videoEl.currentTime = t;
      } catch (err) {
        console.warn('Failed to seek playback-rate segment', err);
      }
    }
    syncUiToSeekTime(t, { resetPlaybackBaseline: true });
    if (segOrNull) {
      applyPlaybackRateValue(segOrNull.rate);
      playbackRateTimelineState.lastAppliedSegmentId = segOrNull.id ?? null;
      playbackRateTimelineState.selectedSegmentId = segOrNull.id ?? null;
    } else {
      playbackRateTimelineState.selectedSegmentId = null;
    }
    renderElementTimeline();
  }

  function stableJson(value) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      console.warn('Failed to stringify view mode snapshot', err);
      return '';
    }
  }

  function getViewModeTimelineDraft() {
    return viewModeTimelineState.draft;
  }

  function clearViewModeTimelineDraft() {
    viewModeTimelineState.draft = null;
  }

  function normalizeComparisonPhaseForTimeline(rawPhase) {
    if (rawPhase === 'confirmed') return 'confirmed';
    if (rawPhase === 'selecting') return 'selecting';
    return 'selecting';
  }

  function normalizeComparisonSelectionMode(rawMode) {
    return rawMode === 'rank' ? 'rank' : 'lane';
  }

  function normalizeElementLaneSelectionMode(rawMode) {
    return rawMode === 'rank' ? 'rank' : 'lane';
  }

  function captureViewModeTimelineSnapshot() {
    return {
      viewMode: uiState.viewMode,
      modePanels: {
        overview: {
          highlightStyle: uiState.modePanels.overview.highlightStyle,
          highlightTransitionType: uiState.modePanels.overview.highlightTransitionType,
          highlightTransitionDurationSec: Number(uiState.modePanels.overview.highlightTransitionDurationSec)
        },
        tracking: {
          transitionType: uiState.modePanels.tracking.transitionType,
          transitionDurationSec: Number(uiState.modePanels.tracking.transitionDurationSec),
          zoomLevel: Number(uiState.modePanels.tracking.zoomLevel),
          trackingBehavior: uiState.modePanels.tracking.trackingBehavior
        },
        comparison: {
          transitionType: uiState.modePanels.comparison.transitionType,
          transitionDurationSec: Number(uiState.modePanels.comparison.transitionDurationSec),
          layoutMode: uiState.modePanels.comparison.layoutMode
        }
      },
      tracking: {
        shotId: currentShotId,
        focusedLaneId: focusedLaneId != null ? Number(focusedLaneId) : null
      },
      overview: {
        highlightedLaneIds: Array.from(overviewHighlightedLaneIds).sort((a, b) => a - b)
      },
      comparison: {
        phase: normalizeComparisonPhaseForTimeline(comparisonState.phase),
        selectionMode: normalizeComparisonSelectionMode(comparisonState.selectionMode),
        selectedLaneIds: Array.from(comparisonSelectedLaneIds).sort((a, b) => a - b),
        displayOrder: cloneArrayNums(comparisonLaneDisplayOrder)
      }
    };
  }

  function viewModeSnapshotEquals(a, b) {
    if (!a || !b) return false;
    return stableJson(a) === stableJson(b);
  }

  function recomputeViewModeTimelineSegments() {
    const total = getViewModeTimelineTimeTotal();
    viewModeTimelineState.segments.sort((a, b) => (a.start - b.start) || (a.id - b.id));
    viewModeTimelineState.segments.forEach((seg, idx) => {
      const next = viewModeTimelineState.segments[idx + 1];
      const end = next ? next.start : total;
      seg.end = Math.max(seg.start, Math.min(total, end));
    });
    for (let i = viewModeTimelineState.segments.length - 1; i > 0; i -= 1) {
      const cur = viewModeTimelineState.segments[i];
      const prev = viewModeTimelineState.segments[i - 1];
      if (Math.abs(cur.start - prev.start) < 1e-3) {
        viewModeTimelineState.segments.splice(i - 1, 1);
        continue;
      }
      if (viewModeSnapshotEquals(cur.snapshot, prev.snapshot)) {
        viewModeTimelineState.segments.splice(i, 1);
      }
    }
    viewModeTimelineState.segments.forEach((seg, idx) => {
      const next = viewModeTimelineState.segments[idx + 1];
      seg.end = next ? next.start : total;
    });
    if (viewModeTimelineState.selectedSegmentId != null
      && !viewModeTimelineState.segments.some(seg => seg.id === viewModeTimelineState.selectedSegmentId)) {
      viewModeTimelineState.selectedSegmentId = viewModeTimelineState.segments[0]?.id ?? null;
    }
  }

  function findViewModeTimelineSegmentAtTime(tSec) {
    const t = Number.isFinite(tSec) ? tSec : 0;
    const list = viewModeTimelineState.segments;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const seg = list[i];
      if (t + 1e-6 >= seg.start && t < (seg.end ?? Infinity) - 1e-6) return seg;
    }
    if (list.length && Math.abs(t - list[list.length - 1].end) < 1e-6) {
      return list[list.length - 1];
    }
    return null;
  }

  function getViewModeTimelineSegmentById(segId) {
    return viewModeTimelineState.segments.find(seg => seg.id === segId) || null;
  }

  function setSelectedViewModeTimelineSegmentId(segId) {
    if (segId == null) {
      viewModeTimelineState.selectedSegmentId = null;
      return;
    }
    const id = Number(segId);
    if (!Number.isFinite(id)) return;
    if (!getViewModeTimelineSegmentById(id)) return;
    viewModeTimelineState.selectedSegmentId = id;
  }

  function getSelectedViewModeTimelineSegment() {
    return getViewModeTimelineSegmentById(viewModeTimelineState.selectedSegmentId);
  }

  function syncViewModeTimelineEditResultAtCurrentTime() {
    const t = getCurrentPlaybackTimeForViewModeTimeline();
    const seg = findViewModeTimelineSegmentAtTime(t);
    if (seg) {
      applyViewModeTimelineSnapshot(seg.snapshot, {
        fromPlayback: false,
        pauseOnEnter: true,
        skipComparisonExitAnimation: true
      });
      viewModeTimelineState.lastAppliedSegmentId = seg.id;
    } else {
      requestOverlayRefresh();
    }
  }

  function deleteViewModeTimelineSegmentById(segId) {
    const id = Number(segId);
    if (!Number.isFinite(id)) return false;
    const segments = viewModeTimelineState.segments;
    if (segments.length <= 1) return false;
    const idx = segments.findIndex(seg => seg.id === id);
    if (idx < 0) return false;

    clearViewModeTimelineDraft();
    pausePlaybackForUserModeEntry();

    const removed = segments[idx];
    if (idx === 0 && segments[idx + 1]) {
      segments[idx + 1].start = removed.start;
    }
    segments.splice(idx, 1);
    recomputeViewModeTimelineSegments();
    const replacement = segments[Math.max(0, idx - 1)] || segments[0] || null;
    viewModeTimelineState.selectedSegmentId = replacement?.id ?? null;
    syncViewModeTimelineEditResultAtCurrentTime();
    renderElementTimeline();
    return true;
  }

  function clampViewModeSegmentBoundaryStartValue(nextStart, prevStart, followingStart) {
    const minDur = 0.1;
    const lower = Math.max(0, prevStart + minDur);
    const upper = Math.max(lower, followingStart - minDur);
    return Math.max(lower, Math.min(upper, nextStart));
  }

  function setViewModeTimelineBoundaryBySegment(segId, edge, timeSec) {
    const id = Number(segId);
    if (!Number.isFinite(id)) return false;
    const segments = viewModeTimelineState.segments;
    const idx = segments.findIndex(seg => seg.id === id);
    if (idx < 0) return false;
    if (segments.length <= 1) return false;
    const seg = segments[idx];
    const total = getViewModeTimelineTimeTotal();
    const rawT = Math.max(0, Math.min(total, quantizeTimelineSec(timeSec)));

    if (edge === 'left') {
      if (idx === 0) return false;
      const prev = segments[idx - 1];
      const next = segments[idx + 1];
      const nextStart = next ? next.start : total;
      const clamped = clampViewModeSegmentBoundaryStartValue(rawT, prev.start, nextStart);
      if (Math.abs(seg.start - clamped) < 1e-3) return false;
      seg.start = clamped;
      recomputeViewModeTimelineSegments();
      return true;
    }

    if (edge === 'right') {
      if (idx >= segments.length - 1) return false;
      const next = segments[idx + 1];
      const nextNext = segments[idx + 2];
      const followingStart = nextNext ? nextNext.start : total;
      const clamped = clampViewModeSegmentBoundaryStartValue(rawT, seg.start, followingStart);
      if (Math.abs(next.start - clamped) < 1e-3) return false;
      next.start = clamped;
      recomputeViewModeTimelineSegments();
      return true;
    }
    return false;
  }

  function setPlaybackRateTimelineBoundaryBySegment(segId, edge, timeSec) {
    const id = Number(segId);
    if (!Number.isFinite(id)) return false;
    const segments = playbackRateTimelineState.segments;
    const idx = segments.findIndex(seg => seg.id === id);
    if (idx < 0) return false;
    if (segments.length <= 1) return false;
    const seg = segments[idx];
    const total = getViewModeTimelineTimeTotal();
    const rawT = Math.max(0, Math.min(total, quantizeTimelineSec(timeSec)));

    if (edge === 'left') {
      if (idx === 0) return false;
      const prev = segments[idx - 1];
      const next = segments[idx + 1];
      const nextStart = next ? next.start : total;
      const clamped = clampViewModeSegmentBoundaryStartValue(rawT, prev.start, nextStart);
      if (Math.abs(seg.start - clamped) < 1e-3) return false;
      seg.start = clamped;
      recomputePlaybackRateTimelineSegments();
      return true;
    }

    if (edge === 'right') {
      if (idx >= segments.length - 1) return false;
      const next = segments[idx + 1];
      const nextNext = segments[idx + 2];
      const followingStart = nextNext ? nextNext.start : total;
      const clamped = clampViewModeSegmentBoundaryStartValue(rawT, seg.start, followingStart);
      if (Math.abs(next.start - clamped) < 1e-3) return false;
      next.start = clamped;
      recomputePlaybackRateTimelineSegments();
      return true;
    }
    return false;
  }

  function makeViewModeTimelineBoundaryDraggable(handleEl, segId, edge) {
    if (!handleEl) return;
    let barRect = null;
    let active = false;
    let prevUserSelect = '';
    const onMouseMove = (e) => {
      if (!active || !barRect || !(barRect.width > 0)) return;
      const x = e.clientX - barRect.left;
      const pct = Math.max(0, Math.min(1, x / barRect.width));
      const t = pct * getViewModeTimelineTimeTotal();
      if (setViewModeTimelineBoundaryBySegment(segId, edge, t)) {
        renderElementTimeline();
      }
    };
    const onMouseUp = () => {
      if (!active) return;
      active = false;
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      syncViewModeTimelineEditResultAtCurrentTime();
      renderElementTimeline();
    };
    handleEl.addEventListener('mousedown', (e) => {
      if (exportRenderState.active) return;
      e.preventDefault();
      e.stopPropagation();
      const bar = handleEl.closest('.et-bar');
      if (!bar) return;
      clearViewModeTimelineDraft();
      pausePlaybackForUserModeEntry();
      setSelectedViewModeTimelineSegmentId(segId);
      barRect = bar.getBoundingClientRect();
      active = true;
      prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function makePlaybackRateTimelineBoundaryDraggable(handleEl, segId, edge) {
    if (!handleEl) return;
    let barRect = null;
    let active = false;
    let prevUserSelect = '';
    const onMouseMove = (e) => {
      if (!active || !barRect || !(barRect.width > 0)) return;
      const x = e.clientX - barRect.left;
      const pct = Math.max(0, Math.min(1, x / barRect.width));
      const t = pct * getViewModeTimelineTimeTotal();
      if (setPlaybackRateTimelineBoundaryBySegment(segId, edge, t)) {
        renderElementTimeline();
      }
    };
    const onMouseUp = () => {
      if (!active) return;
      active = false;
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      syncPlaybackRateTimelineEditResultAtCurrentTime();
      renderElementTimeline();
    };
    handleEl.addEventListener('mousedown', (e) => {
      if (exportRenderState.active) return;
      e.preventDefault();
      e.stopPropagation();
      const bar = handleEl.closest('.et-bar');
      if (!bar) return;
      playbackRateTimelineState.draft = null;
      pausePlaybackForUserModeEntry();
      setSelectedPlaybackRateTimelineSegmentId(segId);
      barRect = bar.getBoundingClientRect();
      active = true;
      prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function stageViewModeTimelineDraft(reason = 'state-change') {
    if (viewModeTimelineState.isApplyingPlaybackState) return;
    const snapshot = captureViewModeTimelineSnapshot();
    const start = getCurrentPlaybackTimeForViewModeTimeline();
    viewModeTimelineState.draft = {
      id: 'draft',
      reason,
      start,
      snapshot,
      snapshotKey: stableJson(snapshot)
    };
    renderElementTimeline();
  }

  function commitViewModeTimelineDraft(reason = 'playback-resume') {
    if (viewModeTimelineState.isApplyingPlaybackState) return null;
    const draft = getViewModeTimelineDraft();
    if (!draft?.snapshot) return null;
    const start = quantizeTimelineSec(draft.start);
    const nextSnapshot = draft.snapshot;
    const existingSameStartIdx = viewModeTimelineState.segments.findIndex(seg => Math.abs(seg.start - start) < 1e-3);
    if (existingSameStartIdx >= 0) {
      viewModeTimelineState.segments[existingSameStartIdx] = {
        ...viewModeTimelineState.segments[existingSameStartIdx],
        start,
        snapshot: nextSnapshot
      };
    } else {
      viewModeTimelineState.segments.push({
        id: viewModeTimelineState.nextId++,
        start,
        end: start,
        snapshot: nextSnapshot
      });
    }
    recomputeViewModeTimelineSegments();
    clearViewModeTimelineDraft();
    const active = findViewModeTimelineSegmentAtTime(start + 1e-6);
    viewModeTimelineState.lastAppliedSegmentId = active?.id ?? null;
    if (active?.id != null) {
      viewModeTimelineState.selectedSegmentId = active.id;
    }
    renderElementTimeline();
    return active;
  }

  function noteViewModeStateChanged(reason = 'state-change') {
    if (viewModeTimelineState.isApplyingPlaybackState) return;
    if (videoEl?.paused || !videoReady) {
      stageViewModeTimelineDraft(reason);
      return;
    }
    stageViewModeTimelineDraft(reason);
    commitViewModeTimelineDraft(reason);
  }

  function resetViewModeStateToDefaultsAndClearTimeline() {
    clearViewModeTimelineDraft();
    viewModeTimelineState.nextId = 1;
    viewModeTimelineState.segments = [];
    viewModeTimelineState.selectedSegmentId = null;
    viewModeTimelineState.lastAppliedSegmentId = null;

    uiState.modePanels.overview.highlightStyle = 'standard';
    uiState.modePanels.overview.highlightTransitionType = 'smooth';
    uiState.modePanels.overview.highlightTransitionDurationSec = 0.3;
    uiState.modePanels.tracking.transitionType = 'zoomlens';
    uiState.modePanels.tracking.transitionDurationSec = 0.75;
    uiState.modePanels.tracking.zoomLevel = 1.85;
    uiState.modePanels.tracking.trackingBehavior = 'follow';
    uiState.modePanels.tracking.athleteSelectionExpanded = false;
    uiState.modePanels.comparison.transitionType = 'smooth';
    uiState.modePanels.comparison.transitionDurationSec = 0.75;
    uiState.modePanels.comparison.layoutMode = 'sideBySide';
    uiState.modePanels.comparison.preserveSelectionOnEnter = false;

    overviewHighlightedLaneIds.clear();
    clearComparisonDeferredPause();
    clearComparisonConfirmTransition();
    clearComparisonExitTransition();
    comparisonSelectedLaneIds.clear();
    comparisonLaneDisplayOrder = [];
    comparisonState.phase = 'idle';
    comparisonState.dragLaneId = null;
    comparisonState.dragPointerId = null;
    comparisonState.dragOffsetY = 0;
    comparisonState.pendingConfirmTransition = 'none';
    comparisonState.pendingTransitionFromLayout = 'sideBySide';
    markComparisonLayoutDirty();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();

    pausePlaybackForUserModeEntry();
    setViewMode('overview');
    switchCameraShot('wide', defaultShot, {
      focusedLaneId: null,
      transitionType: 'hardcut'
    });
    overviewHighlightedLaneIds.clear();

    const baselineSnapshot = captureViewModeTimelineSnapshot();
    const seg = {
      id: viewModeTimelineState.nextId++,
      start: 0,
      end: getViewModeTimelineTimeTotal(),
      snapshot: baselineSnapshot
    };
    viewModeTimelineState.segments = [seg];
    recomputeViewModeTimelineSegments();
    viewModeTimelineState.selectedSegmentId = seg.id;
    viewModeTimelineState.lastAppliedSegmentId = seg.id;

    requestOverlayRefresh();
    renderElementTimeline();
  }

  function renderModePanels() {
    panelOverviewSettings?.classList.toggle('mode-panel--active', uiState.viewMode === 'overview');
    panelTrackingSettings?.classList.toggle('mode-panel--active', uiState.viewMode === 'tracking');
    panelComparisonSettings?.classList.toggle('mode-panel--active', uiState.viewMode === 'comparison');

    trackTransitionButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.trackTransition === uiState.modePanels.tracking.transitionType);
    });
    if (trackTransitionDurationInput) {
      trackTransitionDurationInput.value = String(normalizeTrackTransitionDurationSec(uiState.modePanels.tracking.transitionDurationSec));
    }
    if (trackTransitionDurationReadout) {
      trackTransitionDurationReadout.textContent = formatTrackTransitionDurationLabel(uiState.modePanels.tracking.transitionDurationSec);
    }
    if (trackZoomLevelInput) {
      trackZoomLevelInput.value = String(uiState.modePanels.tracking.zoomLevel);
    }
    if (trackZoomLevelReadout) {
      trackZoomLevelReadout.textContent = `${Number(uiState.modePanels.tracking.zoomLevel).toFixed(1)}x`;
    }
    trackBehaviorButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.trackBehavior === uiState.modePanels.tracking.trackingBehavior);
    });
    const normalizedOverviewHighlightStyle = normalizeOverviewHighlightStyle(uiState.modePanels.overview.highlightStyle);
    if (uiState.modePanels.overview.highlightStyle !== normalizedOverviewHighlightStyle) {
      uiState.modePanels.overview.highlightStyle = normalizedOverviewHighlightStyle;
    }
    trackHighlightStyleButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.trackHighlightStyle === normalizedOverviewHighlightStyle);
    });
    overviewHighlightTransitionButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.overviewHighlightTransition === uiState.modePanels.overview.highlightTransitionType);
    });
    if (overviewHighlightTransitionDurationInput) {
      overviewHighlightTransitionDurationInput.value = String(normalizeOverviewHighlightTransitionDurationSec(uiState.modePanels.overview.highlightTransitionDurationSec));
    }
    if (overviewHighlightTransitionDurationReadout) {
      overviewHighlightTransitionDurationReadout.textContent = formatOverviewHighlightTransitionDurationLabel(uiState.modePanels.overview.highlightTransitionDurationSec);
    }
    if (trackAthleteSelection) {
      trackAthleteSelection.classList.toggle('expanded', !!uiState.modePanels.tracking.athleteSelectionExpanded);
    }
    if (trackAthleteSelectionToggle) {
      trackAthleteSelectionToggle.setAttribute('aria-expanded', String(!!uiState.modePanels.tracking.athleteSelectionExpanded));
    }
    if (trackAthleteSelectionBody) {
      trackAthleteSelectionBody.classList.toggle('is-hidden', !uiState.modePanels.tracking.athleteSelectionExpanded);
    }

    comparisonTransitionButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.comparisonTransition === uiState.modePanels.comparison.transitionType);
    });
    if (comparisonTransitionDurationInput) {
      comparisonTransitionDurationInput.value = String(normalizeComparisonTransitionDurationSec(uiState.modePanels.comparison.transitionDurationSec));
    }
    if (comparisonTransitionDurationReadout) {
      comparisonTransitionDurationReadout.textContent = formatComparisonTransitionDurationLabel(uiState.modePanels.comparison.transitionDurationSec);
    }
    comparisonLayoutButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.comparisonLayout === uiState.modePanels.comparison.layoutMode);
    });
    if (comparisonPreserveSelectionInput) {
      comparisonPreserveSelectionInput.checked = !!uiState.modePanels.comparison.preserveSelectionOnEnter;
    }
    if (comparisonSettingsCollapsible) {
      comparisonSettingsCollapsible.classList.toggle('expanded', comparisonSettingsExpanded);
    }
    if (btnComparisonPanelToggle) {
      btnComparisonPanelToggle.setAttribute('aria-expanded', String(!!comparisonSettingsExpanded));
      btnComparisonPanelToggle.setAttribute(
        'aria-label',
        comparisonSettingsExpanded ? 'Collapse comparison settings' : 'Expand comparison settings'
      );
      btnComparisonPanelToggle.setAttribute(
        'title',
        comparisonSettingsExpanded ? 'Collapse comparison settings' : 'Expand comparison settings'
      );
      btnComparisonPanelToggle.textContent = comparisonSettingsExpanded ? 'Hide Settings' : 'Show Settings';
    }
    if (comparisonLiveDataMetricEl) {
      comparisonLiveDataMetricEl.textContent = 'Selected Metrics Data';
    }
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
  }

  function renderRightPanelHeader() {
    if (!rightPanelHeading || !panelTitle) return;
    if (uiState.rightPanelSurface === 'layer') {
      rightPanelHeading.textContent = 'Layer Settings';
      if (btnComparisonPanelToggle) {
        btnComparisonPanelToggle.style.display = 'none';
      }
      if (!activeElementId) {
        panelTitle.textContent = uiState.selectedLayerTypeId
          ? `Editing: ${getVisLabel(uiState.selectedLayerTypeId)}`
          : 'Select a layer';
      }
      return;
    }

    rightPanelHeading.textContent = getModeHeading(uiState.viewMode);
    panelTitle.textContent = getModeSubtitle(uiState.viewMode);
    if (btnComparisonPanelToggle) {
      btnComparisonPanelToggle.style.display = uiState.viewMode === 'comparison' ? '' : 'none';
    }
  }

  function renderRightPanelSurface() {
    appRoot?.classList.toggle('right-panel-surface--mode', uiState.rightPanelSurface === 'mode');
    appRoot?.classList.toggle('right-panel-surface--layer', uiState.rightPanelSurface === 'layer');
    appRoot?.classList.toggle('view-mode-overview', uiState.viewMode === 'overview');
    appRoot?.classList.toggle('view-mode-tracking', uiState.viewMode === 'tracking');
    appRoot?.classList.toggle('view-mode-comparison', uiState.viewMode === 'comparison');

    if (rightPanelModeContent) {
      rightPanelModeContent.style.display = uiState.rightPanelSurface === 'mode' ? '' : 'none';
    }
    if (layerSettingsFlyout) {
      layerSettingsFlyout.style.display = uiState.rightPanelSurface === 'layer' ? 'flex' : 'none';
    }

    renderRightPanelHeader();
    updateVisChipActive();
  }

  function renderUiShellState() {
    renderViewModeTabs();
    renderModePanels();
    renderRightPanelSurface();
  }

  function pausePlaybackForUserModeEntry() {
    if (!videoEl) return;
    debugPlaybackResume('pausePlaybackForUserModeEntry:before');
    cacheCurrentPlaybackPosition();
    if (!videoEl.paused) {
      videoEl.pause();
    }
    setPlaybackUiPlayingState(false);
    debugPlaybackResume('pausePlaybackForUserModeEntry:after');
  }

  function delayMs(ms) {
    const t = Math.max(0, Number(ms) || 0);
    if (t <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      setTimeout(resolve, t);
    });
  }

  function setViewMode(mode, opts = {}) {
    if (!['overview', 'tracking', 'comparison'].includes(mode)) return;
    const comparisonEnterOpts = opts.comparisonEnter || null;
    const prevMode = uiState.viewMode;
    const allowComparisonExitAnimation = opts.skipComparisonExitAnimation !== true;
    const shouldAnimateComparisonExit =
      allowComparisonExitAnimation
      && !opts.forceImmediate
    mode !== 'comparison'
      && prevMode === 'comparison'
      && comparisonState.phase === 'confirmed'
      && comparisonHasSelection();
    const prevComparisonLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    const didStartComparisonExit = shouldAnimateComparisonExit
      ? startComparisonExitTransition(performance.now(), { fromLayout: prevComparisonLayout })
      : false;

    uiState.viewMode = mode;
    renderUiShellState();
    if (mode === 'overview' && prevMode === 'tracking' && currentShotId === 'track') {
      switchCameraShot('wide', defaultShot, {
        focusedLaneId: null,
        transitionType: resolveTrackingTransitionType()
      });
    }

    if (mode === 'comparison') {
      enterComparisonMode(prevMode, comparisonEnterOpts || {});
    } else if (prevMode === 'comparison') {
      if (!didStartComparisonExit) {
        leaveComparisonModePresentation();
      }
    }

    updateLaneInteractionAffordances();
    updateExitButtonVisibility();
    requestOverlayRefresh();
  }

  async function handleUserViewModeTabClick(mode) {
    if (exportRenderState.active) return;
    const requestSeq = ++userModeSwitchSeq;
    timelinePlaybackModeSwitchSeq += 1;
    debugPlaybackResume('handleUserViewModeTabClick:start', { mode });
    pausePlaybackForUserModeEntry();
    const prevMode = uiState.viewMode;

    if (prevMode !== mode
      && prevMode === 'tracking'
      && mode !== 'tracking'
      && currentShotId === 'track') {
      const transitionType = resolveTrackingTransitionType();
      const durationMs = estimateCameraTransitionDurationMs(transitionType);
      switchCameraShot('wide', defaultShot, {
        focusedLaneId: null,
        transitionType
      });
      if (durationMs > 0) {
        ensurePausedCameraTransitionTick();
        await delayMs(durationMs + 20);
      }
      if (requestSeq !== userModeSwitchSeq) return;
    }

    if (prevMode !== mode
      && prevMode === 'comparison'
      && mode !== 'comparison'
      && comparisonState.phase === 'confirmed'
      && comparisonHasSelection()) {
      const fromLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
      const started = startComparisonExitTransition(performance.now(), { fromLayout });
      if (started) {
        const durationMs = Math.max(1, Number(comparisonExitTransitionState.durationMs) || resolveComparisonTransitionDurationMs());
        ensurePausedCameraTransitionTick();
        await delayMs(durationMs + 20);
      }
      if (requestSeq !== userModeSwitchSeq) return;
    }

    setViewMode(mode, { skipComparisonExitAnimation: true });
    noteViewModeStateChanged(`view-tab:${mode}`);
  }

  function showLayerSettingsSurface(typeId = null) {
    if (typeId) uiState.selectedLayerTypeId = typeId;
    uiState.rightPanelSurface = 'layer';
    renderRightPanelSurface();
  }

  function closeLayerSettingsToModePanel() {
    uiState.rightPanelSurface = 'mode';
    renderRightPanelSurface();
  }

  function bindModePanelUi() {
    btnViewOverview?.addEventListener('click', () => handleUserViewModeTabClick('overview'));
    btnViewTracking?.addEventListener('click', () => handleUserViewModeTabClick('tracking'));
    btnViewComparison?.addEventListener('click', () => handleUserViewModeTabClick('comparison'));

    trackTransitionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.modePanels.tracking.transitionType = btn.dataset.trackTransition || 'hardcut';
        renderModePanels();
        noteViewModeStateChanged('tracking:transition-type');
      });
    });

    trackTransitionDurationInput?.addEventListener('input', () => {
      const next = normalizeTrackTransitionDurationSec(trackTransitionDurationInput.value);
      uiState.modePanels.tracking.transitionDurationSec = next;
      renderModePanels();
      noteViewModeStateChanged('tracking:transition-duration');
    });

    trackBehaviorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.modePanels.tracking.trackingBehavior = btn.dataset.trackBehavior || 'follow';
        renderModePanels();
        refreshTrackCameraFromTrackingControls();
        noteViewModeStateChanged('tracking:behavior');
      });
    });

    trackHighlightStyleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.modePanels.overview.highlightStyle = normalizeOverviewHighlightStyle(btn.dataset.trackHighlightStyle || 'spotlight');
        renderModePanels();
        requestOverlayRefresh();
        noteViewModeStateChanged('overview:highlight-style');
      });
    });

    overviewHighlightTransitionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.modePanels.overview.highlightTransitionType = btn.dataset.overviewHighlightTransition === 'hardcut'
          ? 'hardcut'
          : 'smooth';
        renderModePanels();
        noteViewModeStateChanged('overview:highlight-transition-type');
      });
    });

    overviewHighlightTransitionDurationInput?.addEventListener('input', () => {
      uiState.modePanels.overview.highlightTransitionDurationSec =
        normalizeOverviewHighlightTransitionDurationSec(overviewHighlightTransitionDurationInput.value);
      renderModePanels();
      noteViewModeStateChanged('overview:highlight-transition-duration');
    });

    trackZoomLevelInput?.addEventListener('input', () => {
      const next = Number.parseFloat(trackZoomLevelInput.value);
      if (Number.isFinite(next)) uiState.modePanels.tracking.zoomLevel = next;
      renderModePanels();
      refreshTrackCameraFromTrackingControls();
      noteViewModeStateChanged('tracking:zoom-level');
    });

    trackAthleteSelectionToggle?.addEventListener('click', () => {
      uiState.modePanels.tracking.athleteSelectionExpanded = !uiState.modePanels.tracking.athleteSelectionExpanded;
      renderModePanels();
    });

    comparisonLayoutButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.modePanels.comparison.layoutMode = btn.dataset.comparisonLayout || 'sideBySide';
        renderModePanels();
        markComparisonLayoutDirty();
        requestOverlayRefresh();
        noteViewModeStateChanged('comparison:layout-mode');
      });
    });

    comparisonTransitionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.modePanels.comparison.transitionType = btn.dataset.comparisonTransition || 'smooth';
        renderModePanels();
        noteViewModeStateChanged('comparison:transition-type');
      });
    });

    comparisonTransitionDurationInput?.addEventListener('input', () => {
      uiState.modePanels.comparison.transitionDurationSec = normalizeComparisonTransitionDurationSec(comparisonTransitionDurationInput.value);
      renderModePanels();
      noteViewModeStateChanged('comparison:transition-duration');
    });

    comparisonPreserveSelectionInput?.addEventListener('change', () => {
      uiState.modePanels.comparison.preserveSelectionOnEnter = !!comparisonPreserveSelectionInput.checked;
      renderModePanels();
    });

    comparisonSelectionModeInput?.addEventListener('input', () => {
      setComparisonSelectionMode(comparisonSelectionModeInput.value);
      renderModePanels();
    });

    btnComparisonPanelToggle?.addEventListener('click', () => {
      comparisonSettingsExpanded = !comparisonSettingsExpanded;
      renderModePanels();
      renderRightPanelHeader();
    });

    btnComparisonConfirm?.addEventListener('click', () => {
      confirmComparisonSelection();
    });
  }

  function bindDataGroupToggles() {
    document.querySelectorAll('[data-group-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.data-group');
        if (!group) return;
        const willCollapse = !group.classList.contains('is-collapsed');
        group.classList.toggle('is-collapsed', willCollapse);
        btn.setAttribute('aria-expanded', String(!willCollapse));
      });
    });
  }

  function formatClockLabel(timeSec = 0) {
    const t = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateVideoTimeLabel(nowSec = 0, totalSec = 0) {
    if (!videoTimeLabelEl) return;
    videoTimeLabelEl.textContent = `${formatClockLabel(nowSec)} / ${formatClockLabel(totalSec)}`;
  }

  function measurePixiTextBox(textObj, sampleText = '') {
    const fallback = {
      width: Math.max(0, Math.ceil(Number(textObj?.width) || 0)),
      height: Math.max(0, Math.ceil(Number(textObj?.height) || 0))
    };
    try {
      const style = textObj?.style;
      if (!style || !PIXI?.TextMetrics?.measureText) return fallback;
      const metrics = PIXI.TextMetrics.measureText(String(sampleText ?? ''), style);
      if (!metrics) return fallback;
      return {
        width: Math.max(fallback.width, Math.ceil(Number(metrics.width) || 0)),
        height: Math.max(fallback.height, Math.ceil(Number(metrics.height) || 0))
      };
    } catch (err) {
      return fallback;
    }
  }

  function resolveFixedTextBackgroundSize(owner, key, width, height, opts = {}) {
    const nextWidth = Math.max(0, Math.ceil(Number(width) || 0), Math.ceil(Number(opts.minWidth) || 0));
    const nextHeight = Math.max(0, Math.ceil(Number(height) || 0), Math.ceil(Number(opts.minHeight) || 0));
    if (!owner) {
      return { width: nextWidth, height: nextHeight };
    }
    if (!owner._fixedTextBackgroundSizes) {
      owner._fixedTextBackgroundSizes = new Map();
    }
    let size = owner._fixedTextBackgroundSizes.get(key);
    if (!size) {
      size = { width: nextWidth, height: nextHeight };
      owner._fixedTextBackgroundSizes.set(key, size);
      return size;
    }
    size.width = Math.max(size.width, nextWidth);
    size.height = Math.max(size.height, nextHeight);
    return size;
  }

  const elements = new Map(); // id -> element state
  let activeElementId = null;
  let activeIntervalId = null;
  let pendingIntervalInsert = null;
  const LAYER_SEGMENT_MOTION_SEC = 0.28;
  let librarySelection = { vis: 'currentSpeed', rep: 'circular' };
  let defaultPresetLoaded = false;
  let smoothingEnabled = true;
  const smoothAlpha = 0.15;          // athlete position
  const cameraFollowAlpha = 0.08;    // camera offX
  const smoothedPosById = new Map(); // id -> {x,y}
  let cameraFollowOffX = 0;          // smoothed offX for track mode

  const metricRuntimeState = createMetricRuntimeState();
  const liveMetricRuntimeStatesByInterval = new Map();
  const compareLineReferenceByKey = new Map();
  const FONT_FAMILY_LIBRARY = [
    {
      label: 'System Sans',
      value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      alwaysAvailable: true
    },
    {
      label: 'System Serif',
      value: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
      alwaysAvailable: true
    },
    {
      label: 'System Mono',
      value: 'SFMono-Regular, SF Mono, ui-monospace, Menlo, Monaco, Consolas, Liberation Mono, monospace',
      alwaysAvailable: true
    },
    {
      label: 'Inter',
      value: 'Inter, "Helvetica Neue", Arial, sans-serif',
      probes: ['Inter']
    },
    {
      label: 'SF Pro',
      value: '"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      probes: ['SF Pro Text', 'SF Pro Display']
    },
    {
      label: 'Avenir Next',
      value: '"Avenir Next", Avenir, system-ui, sans-serif',
      probes: ['Avenir Next', 'Avenir']
    },
    {
      label: 'Helvetica Neue',
      value: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      probes: ['Helvetica Neue', 'Helvetica']
    },
    {
      label: 'Arial',
      value: 'Arial, Helvetica, sans-serif',
      probes: ['Arial']
    },
    {
      label: 'Georgia',
      value: 'Georgia, "Times New Roman", serif',
      probes: ['Georgia']
    },
    {
      label: 'Baskerville',
      value: 'Baskerville, "Times New Roman", serif',
      probes: ['Baskerville']
    },
    {
      label: 'PingFang SC',
      value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      probes: ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC']
    },
    {
      label: 'Songti SC',
      value: '"Songti SC", STSong, SimSun, serif',
      probes: ['Songti SC', 'STSong', 'SimSun']
    },
    {
      label: 'Menlo',
      value: 'Menlo, Monaco, Consolas, Liberation Mono, monospace',
      probes: ['Menlo', 'Monaco', 'Consolas']
    },
    {
      label: 'Courier New',
      value: '"Courier New", Courier, monospace',
      probes: ['Courier New', 'Courier']
    },
    {
      label: 'Times New Roman',
      value: '"Times New Roman", Times, serif',
      probes: ['Times New Roman', 'Times']
    }
  ];
  const fontAvailabilityCache = new Map();
  let fontMeasureCanvas = null;
  let prevTimeSec = 0;
  let playbackResumeHintSec = null;
  let playbackStartAnchor = null;
  let lastObservedPlayingTimeSec = 0;
  let playbackResumeGuard = null;
  const DEBUG_PLAYBACK_RESUME = false;
  let insight = {
    raw: null,
    segments: []
  };

  logEl.textContent = 'Loading competitions list...';

  const competitions = await loadCompetitions().catch(err => {
    console.error(err);
    logEl.textContent = 'Unable to load competitions index.';
    return null;
  });
  if (!competitions || !competitions.length) {
    logEl.textContent = 'No competitions found in assets/competitions/index.json';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const requestedId = urlParams.get('competition');
  let currentCompetition = chooseCompetition(competitions, requestedId);
  if (!currentCompetition) {
    logEl.textContent = 'No competition could be selected.';
    return;
  }

  wireCompetitionSelect(competitionSelect, competitions, currentCompetition.id);

  const competitionLabel = currentCompetition.label || currentCompetition.id;
  logEl.textContent = `Loading ${competitionLabel} data...`;
  const { overlay, insight: insightLoaded, clickZones: clickZonesLoaded, metricValidity: metricValidityLoaded } =
    await loadCompetitionData(currentCompetition);
  const midCfg = currentCompetition.midlines || {};
  trackConfig.show = midCfg.visible !== undefined ? midCfg.visible : true;
  trackConfig.alpha = midCfg.alpha != null ? midCfg.alpha : trackConfig.alpha;
  trackConfig.thickness = midCfg.thickness != null ? midCfg.thickness : trackConfig.thickness;
  const overlayStartTime = overlay.hasTimeSec ? (overlay.minTimeSec || 0) : 0;
  const overlayEndTime = overlay.hasTimeSec ? overlay.maxTimeSec : null;
  const defaultDirection = (overlay.raw && overlay.raw.direction) || 'rtl'; // 'rtl' | 'ltr'
  const defaultMetricValidityConfig = Object.freeze({
    globalInvalidWindows: [],
    metricOverrides: new Map()
  });

  function normalizeLaneIdArray(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  function normalizeMetricValidityWindow(rawWindow) {
    if (!rawWindow || typeof rawWindow !== 'object') return null;
    const start = Math.max(0, Number(rawWindow.start));
    const end = Math.max(0, Number(rawWindow.end));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return {
      start,
      end,
      reason: typeof rawWindow.reason === 'string' ? rawWindow.reason : 'invalid'
    };
  }

  function normalizeMetricValidityConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object') return defaultMetricValidityConfig;
    const globalInvalidWindows = Array.isArray(rawConfig.globalInvalidWindows)
      ? rawConfig.globalInvalidWindows.map(normalizeMetricValidityWindow).filter(Boolean).sort((a, b) => a.start - b.start)
      : Array.isArray(rawConfig.windows)
        ? rawConfig.windows.map(normalizeMetricValidityWindow).filter(Boolean).sort((a, b) => a.start - b.start)
        : [];
    const metricOverrides = new Map();
    const rawOverrides = rawConfig.metricOverrides && typeof rawConfig.metricOverrides === 'object'
      ? rawConfig.metricOverrides
      : {};
    Object.entries(rawOverrides).forEach(([metricId, windows]) => {
      const normalizedWindows = Array.isArray(windows)
        ? windows.map(normalizeMetricValidityWindow).filter(Boolean).sort((a, b) => a.start - b.start)
        : [];
      if (normalizedWindows.length) {
        metricOverrides.set(String(metricId), normalizedWindows);
      }
    });
    return {
      globalInvalidWindows,
      metricOverrides
    };
  }

  const metricValidityConfig = normalizeMetricValidityConfig(metricValidityLoaded);
  const metricValidityElapsedWindowCache = new Map();

  function mapVideoTimeToElapsedTimeSec(videoTimeSec) {
    const frames = overlay?.frames || [];
    if (!Number.isFinite(videoTimeSec) || !frames.length) return videoTimeSec;
    let lo = 0;
    let hi = frames.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const midTime = Number(frames[mid]?.time_sec);
      if (!Number.isFinite(midTime) || midTime < videoTimeSec) lo = mid + 1;
      else hi = mid;
    }
    const candA = frames[Math.max(0, Math.min(frames.length - 1, lo))];
    const candB = frames[Math.max(0, Math.min(frames.length - 1, lo - 1))];
    const timeA = Number(candA?.time_sec);
    const timeB = Number(candB?.time_sec);
    const best = (
      Number.isFinite(timeA)
      && (!Number.isFinite(timeB) || Math.abs(timeA - videoTimeSec) <= Math.abs(timeB - videoTimeSec))
    ) ? candA : candB;
    const elapsed = Number(best?.elapsed_time_sec);
    return Number.isFinite(elapsed) ? elapsed : videoTimeSec;
  }

  function projectMetricValidityWindowsToElapsed(metricId, windows) {
    const cacheKey = String(metricId || '');
    if (metricValidityElapsedWindowCache.has(cacheKey)) {
      return metricValidityElapsedWindowCache.get(cacheKey);
    }
    const projected = (Array.isArray(windows) ? windows : [])
      .map((window) => {
        const start = mapVideoTimeToElapsedTimeSec(Number(window?.start));
        const end = mapVideoTimeToElapsedTimeSec(Number(window?.end));
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
        return {
          start,
          end,
          reason: typeof window?.reason === 'string' ? window.reason : 'invalid'
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
    metricValidityElapsedWindowCache.set(cacheKey, projected);
    return projected;
  }

  function getMetricValidityWindowsForType(typeId, timeBasis = 'video') {
    const metricId = String(typeId || '');
    if (!LIVE_DATA_TIMELINE_TYPES.has(metricId)) return [];
    const rawWindows = metricValidityConfig.metricOverrides.get(metricId)
      || metricValidityConfig.globalInvalidWindows
      || [];
    if (timeBasis === 'elapsed') {
      return projectMetricValidityWindowsToElapsed(metricId, rawWindows);
    }
    return rawWindows;
  }

  function buildMetricValidityIntervalsForType(typeId, baseEnd, options = {}) {
    const safeEnd = Number.isFinite(baseEnd) && baseEnd > 0 ? baseEnd : 20;
    const metricId = String(typeId || '');
    const excludeReasons = new Set(
      (Array.isArray(options.excludeReasons) ? options.excludeReasons : [])
        .map((value) => String(value || '').toLowerCase())
        .filter(Boolean)
    );
    const rawWindows = metricValidityConfig.metricOverrides.get(metricId)
      || metricValidityConfig.globalInvalidWindows
      || [];
    const intervals = rawWindows
      .filter((window) => !excludeReasons.has(String(window?.reason || '').toLowerCase()))
      .map((window, idx) => {
        const start = Math.max(0, Math.min(safeEnd, Number(window?.start)));
        const end = Math.max(0, Math.min(safeEnd, Number(window?.end)));
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
        return {
          id: `int_${Date.now()}_${metricId}_${idx}_${Math.floor(Math.random() * 9999)}`,
          start,
          end
        };
      })
      .filter(Boolean);
    if (intervals.length) return intervals;
    return [{ id: `int_${Date.now()}_${metricId}`, start: 0, end: safeEnd }];
  }

  function mapElapsedTimeToVideoTimeSec(elapsedTimeSec) {
    const frames = overlay?.frames || [];
    const targetElapsed = Number(elapsedTimeSec);
    if (!Number.isFinite(targetElapsed) || !frames.length) return targetElapsed;
    let lo = 0;
    let hi = frames.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const midElapsed = getFrameTimeSec(frames[mid], overlay?.fps || 50, Number(frames[mid]?.time_sec) || 0);
      if (!Number.isFinite(midElapsed) || midElapsed < targetElapsed) lo = mid + 1;
      else hi = mid;
    }
    const candA = frames[Math.max(0, Math.min(frames.length - 1, lo))];
    const candB = frames[Math.max(0, Math.min(frames.length - 1, lo - 1))];
    const elapsedA = getFrameTimeSec(candA, overlay?.fps || 50, Number(candA?.time_sec) || 0);
    const elapsedB = getFrameTimeSec(candB, overlay?.fps || 50, Number(candB?.time_sec) || 0);
    const best = (
      Number.isFinite(elapsedA)
      && (!Number.isFinite(elapsedB) || Math.abs(elapsedA - targetElapsed) <= Math.abs(elapsedB - targetElapsed))
    ) ? candA : candB;
    const videoTimeSec = Number(best?.time_sec);
    return Number.isFinite(videoTimeSec) ? videoTimeSec : targetElapsed;
  }

  function buildFinalTimeIntervals(baseEnd) {
    const safeEnd = Number.isFinite(baseEnd) && baseEnd > 0 ? baseEnd : 20;
    const athletes = Array.isArray(overlay?.raw?.athletes) ? overlay.raw.athletes : [];
    const winningFinalTimeSec = athletes
      .map((athlete) => {
        if (Number.isFinite(Number(athlete?.final_time))) return Number(athlete.final_time);
        if (Number.isFinite(Number(athlete?.final))) return Number(athlete.final);
        return NaN;
      })
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b)[0];
    if (!Number.isFinite(winningFinalTimeSec)) {
      return [{ id: `int_${Date.now()}_finalTime`, start: 0, end: safeEnd }];
    }
    const start = Math.max(0, Math.min(safeEnd, mapElapsedTimeToVideoTimeSec(winningFinalTimeSec)));
    if (!(safeEnd > start)) {
      return [{ id: `int_${Date.now()}_finalTime`, start: 0, end: safeEnd }];
    }
    return [{ id: `int_${Date.now()}_finalTime`, start, end: safeEnd }];
  }

  function findMetricInvalidWindowAtTime(typeId, timeSec, options = {}) {
    const t = Number(timeSec);
    if (!Number.isFinite(t)) return null;
    const windows = getMetricValidityWindowsForType(typeId, options.timeBasis || 'video');
    for (const window of windows) {
      if (t >= window.start && t < window.end) return window;
    }
    return null;
  }

  function isMetricVisualizationSuppressedAtTime(typeId, timeSec, options = {}) {
    return !!findMetricInvalidWindowAtTime(typeId, timeSec, options);
  }

  function getMetricValidityMotionState(typeId, timeSec, options = {}) {
    const t = Number(timeSec);
    const motionEnabled = options.motionEnabled !== false;
    if (!Number.isFinite(t)) {
      return {
        active: false,
        factor: 0,
        alpha: 0,
        scaleX: 1,
        scaleY: 1,
        invalidWindow: null,
        suppressed: false
      };
    }

    const windows = getMetricValidityWindowsForType(typeId, options.timeBasis || 'video');
    if (!windows.length) {
      return {
        active: true,
        factor: 1,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        invalidWindow: null,
        suppressed: false
      };
    }

    const easeInCubic = (u) => {
      const x = clamp01(u);
      return x * x * x;
    };

    let bestMatch = null;
    for (const invalidWindow of windows) {
      const start = Number(invalidWindow?.start);
      const end = Number(invalidWindow?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

      const span = Math.max(0, end - start);
      const windowSec = motionEnabled
        ? Math.min(LAYER_SEGMENT_MOTION_SEC, Math.max(0.10, span * 0.35))
        : 0;
      const isDuringFadeOutLead = motionEnabled && t >= start - windowSec && t < start;
      const isDuringWindow = t >= start && t < end;
      const isDuringRecoveryTail = motionEnabled && t >= end && t <= end + windowSec;
      if (!isDuringFadeOutLead && !isDuringWindow && !isDuringRecoveryTail) continue;

      let factor = isDuringWindow ? 0 : 1;
      if (motionEnabled && windowSec > 1e-4) {
        if (isDuringFadeOutLead) {
          factor = lerp(1, 0, easeInCubic((t - (start - windowSec)) / windowSec));
        } else if (isDuringRecoveryTail) {
          factor = lerp(0, 1, easeInOutCubic((t - end) / windowSec));
        }
      }

      factor = clamp01(factor);
      const candidate = {
        active: factor > 0.001,
        factor,
        alpha: factor,
        scaleX: lerp(0.14, 1, factor),
        scaleY: 1,
        invalidWindow,
        suppressed: isDuringWindow && factor <= 0.001,
        start
      };
      if (!bestMatch || start > bestMatch.start) {
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      return {
        active: bestMatch.active,
        factor: bestMatch.factor,
        alpha: bestMatch.alpha,
        scaleX: bestMatch.scaleX,
        scaleY: bestMatch.scaleY,
        invalidWindow: bestMatch.invalidWindow,
        suppressed: bestMatch.suppressed
      };
    }

    return {
      active: true,
      factor: 1,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      invalidWindow: null,
      suppressed: false
    };
  }

  function buildCompetitionLaneIdRemap() {
    const configuredTopToBottom = normalizeLaneIdArray(currentCompetition?.laneIdsTopToBottom);
    const rawTopToBottomFromClickZones = [];
    const rawLanesObj = clickZonesLoaded?.lanes && typeof clickZonesLoaded.lanes === 'object'
      ? clickZonesLoaded.lanes
      : {};

    Object.entries(rawLanesObj)
      .map(([laneKey, zone]) => {
        const rawLaneId = Number(laneKey);
        const y0 = Number.parseFloat(String(zone?.y0Pct ?? zone?.y0 ?? zone?.top ?? '').replace('%', ''));
        const y1 = Number.parseFloat(String(zone?.y1Pct ?? zone?.y1 ?? zone?.bottom ?? '').replace('%', ''));
        const yMin = Math.min(y0, y1);
        if (!Number.isFinite(rawLaneId) || !Number.isFinite(yMin)) return null;
        return { rawLaneId, yMin };
      })
      .filter(Boolean)
      .sort((a, b) => a.yMin - b.yMin)
      .forEach(({ rawLaneId }) => rawTopToBottomFromClickZones.push(rawLaneId));

    const rawTopToBottomFromOverlay = (overlay.athletes || [])
      .map((meta, idx) => {
        const rawLaneId = Number(meta?.id);
        return Number.isFinite(rawLaneId) ? { rawLaneId, idx } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.idx - b.idx)
      .map(({ rawLaneId }) => rawLaneId);

    const rawTopToBottom = rawTopToBottomFromClickZones.length
      ? rawTopToBottomFromClickZones
      : rawTopToBottomFromOverlay;
    const canonicalTopToBottom = configuredTopToBottom.length === rawTopToBottom.length
      ? configuredTopToBottom
      : rawTopToBottom.slice();

    const rawToCanonical = new Map();
    const canonicalToRaw = new Map();
    rawTopToBottom.forEach((rawLaneId, idx) => {
      const canonicalLaneId = canonicalTopToBottom[idx];
      if (!Number.isFinite(rawLaneId) || !Number.isFinite(canonicalLaneId)) return;
      rawToCanonical.set(rawLaneId, canonicalLaneId);
      canonicalToRaw.set(canonicalLaneId, rawLaneId);
    });

    const enabled = Array.from(rawToCanonical.entries())
      .some(([rawLaneId, canonicalLaneId]) => rawLaneId !== canonicalLaneId);

    return {
      enabled,
      rawTopToBottom,
      canonicalTopToBottom,
      rawToCanonical,
      canonicalToRaw
    };
  }

  const competitionLaneIdRemap = buildCompetitionLaneIdRemap();
  const competitionLaneIdSpace = 'canonical';

  function mapRawLaneIdToCanonical(rawLaneId) {
    const id = Number(rawLaneId);
    if (!Number.isFinite(id)) return rawLaneId;
    return competitionLaneIdRemap.rawToCanonical.get(id) ?? id;
  }

  function mapCanonicalLaneIdToRaw(canonicalLaneId) {
    const id = Number(canonicalLaneId);
    if (!Number.isFinite(id)) return canonicalLaneId;
    return competitionLaneIdRemap.canonicalToRaw.get(id) ?? id;
  }

  function remapLaneValueMapByCanonical(rawValueMap) {
    const out = {};
    Object.entries(rawValueMap || {}).forEach(([rawLaneId, value]) => {
      const canonicalLaneId = mapRawLaneIdToCanonical(Number(rawLaneId));
      if (!Number.isFinite(Number(canonicalLaneId))) return;
      out[canonicalLaneId] = value;
    });
    return out;
  }

  function remapOverlayLaneIdsInPlace(overlayData) {
    if (!competitionLaneIdRemap.enabled || !overlayData) return;
    (overlayData.athletes || []).forEach((meta) => {
      if (!meta || !Number.isFinite(Number(meta.id))) return;
      meta.id = mapRawLaneIdToCanonical(meta.id);
    });
    (overlayData.frames || []).forEach((frame) => {
      const arr = frame?.athletes || frame?.lanes || [];
      arr.forEach((athlete) => {
        if (!athlete || !Number.isFinite(Number(athlete.id))) return;
        athlete.id = mapRawLaneIdToCanonical(athlete.id);
        if (Number.isFinite(Number(athlete.target_swimmer_id))) {
          athlete.target_swimmer_id = mapRawLaneIdToCanonical(athlete.target_swimmer_id);
        }
      });
    });
  }

  function remapInsightLaneIdsInPlace(insightData) {
    if (!competitionLaneIdRemap.enabled || !insightData) return;
    (insightData.segments || []).forEach((seg) => {
      if (!seg || typeof seg !== 'object') return;
      if (Number.isFinite(Number(seg.leader_id))) seg.leader_id = mapRawLaneIdToCanonical(seg.leader_id);
      if (Number.isFinite(Number(seg.chase_id))) seg.chase_id = mapRawLaneIdToCanonical(seg.chase_id);
      if (seg.athlete_texts && typeof seg.athlete_texts === 'object') {
        const remappedTexts = {};
        Object.entries(seg.athlete_texts).forEach(([key, value]) => {
          const remappedKey = Number.isFinite(Number(key)) ? mapRawLaneIdToCanonical(Number(key)) : key;
          remappedTexts[String(remappedKey)] = value;
        });
        seg.athlete_texts = remappedTexts;
      }
      if (seg.results && typeof seg.results === 'object') {
        ['gold', 'silver', 'bronze'].forEach((key) => {
          if (Number.isFinite(Number(seg.results[key]))) {
            seg.results[key] = mapRawLaneIdToCanonical(seg.results[key]);
          }
        });
      }
    });
  }

  remapOverlayLaneIdsInPlace(overlay);
  remapInsightLaneIdsInPlace(insightLoaded);

  insight = insightLoaded;
  setupInsightControls(insight.segments);
  const athleteMetaById = new Map();
  overlay.athletes.forEach(meta => {
    if (meta && typeof meta.id !== 'undefined') {
      athleteMetaById.set(meta.id, meta);
    }
  });

  logEl.textContent =
    `${competitionLabel}: overlay frames ${overlay.frames.length}, insight segments ${insight.segments.length}`;
  const videoInfo = overlay.raw.video || {};
  const videoW = videoInfo.width || 1920;
  const videoH = videoInfo.height || 1080;
  const defaultLaneClickHalfHeightPct = 0.05;
  const defaultLaneClickZoneDebug = {
    enabled: false,
    fillAlpha: 0.08,
    lineAlpha: 0.55,
    lineWidth: 1.5
  };
  laneCountGlobal = (overlay.athletes && overlay.athletes.length) ? overlay.athletes.length : 8;

  function parseRatioLike(raw, fallback = null) {
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return fallback;
      if (s.endsWith('%')) {
        const v = Number.parseFloat(s.slice(0, -1));
        if (!Number.isFinite(v)) return fallback;
        return v / 100;
      }
      const v = Number.parseFloat(s);
      if (!Number.isFinite(v)) return fallback;
      if (v > 1 && v <= 100) return v / 100;
      return v;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      if (raw > 1 && raw <= 100) return raw / 100;
      return raw;
    }
    return fallback;
  }

  function parseAlphaLike(raw, fallback) {
    const v = parseRatioLike(raw, fallback);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(0, Math.min(1, v));
  }

  function parsePositiveNumber(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return n;
  }

  function normalizeClickZoneConfig(rawCfg) {
    const normalized = {
      lanes: new Map(),
      debugOverlay: { ...defaultLaneClickZoneDebug }
    };
    if (!rawCfg || typeof rawCfg !== 'object') return normalized;

    const debugRaw = rawCfg.debugOverlay;
    if (debugRaw && typeof debugRaw === 'object') {
      if (typeof debugRaw.enabled === 'boolean') {
        normalized.debugOverlay.enabled = debugRaw.enabled;
      }
      normalized.debugOverlay.fillAlpha = parseAlphaLike(debugRaw.fillAlpha, normalized.debugOverlay.fillAlpha);
      normalized.debugOverlay.lineAlpha = parseAlphaLike(debugRaw.lineAlpha, normalized.debugOverlay.lineAlpha);
      normalized.debugOverlay.lineWidth = parsePositiveNumber(debugRaw.lineWidth, normalized.debugOverlay.lineWidth);
    }

    const out = new Map();
    const lanesObj = rawCfg.lanes && typeof rawCfg.lanes === 'object' ? rawCfg.lanes : {};
    Object.entries(lanesObj).forEach(([laneKey, zone]) => {
      if (!zone || typeof zone !== 'object') return;
      const laneId = mapRawLaneIdToCanonical(Number(laneKey));
      let y0Pct = parseRatioLike(zone.y0Pct, null);
      let y1Pct = parseRatioLike(zone.y1Pct, null);
      if (!Number.isFinite(y0Pct)) y0Pct = parseRatioLike(zone.y0, null);
      if (!Number.isFinite(y1Pct)) y1Pct = parseRatioLike(zone.y1, null);
      if (!Number.isFinite(y0Pct)) y0Pct = parseRatioLike(zone.top, null);
      if (!Number.isFinite(y1Pct)) y1Pct = parseRatioLike(zone.bottom, null);
      if (!Number.isFinite(laneId) || !Number.isFinite(y0Pct) || !Number.isFinite(y1Pct)) return;
      const yMinPct = Math.max(0, Math.min(y0Pct, y1Pct));
      const yMaxPct = Math.min(1, Math.max(y0Pct, y1Pct));
      if (yMaxPct <= yMinPct) return;
      out.set(laneId, { y0Pct: yMinPct, y1Pct: yMaxPct });
    });
    normalized.lanes = out;
    return normalized;
  }

  const laneClickZoneConfig = normalizeClickZoneConfig(clickZonesLoaded);
  if (laneClickZoneConfig.lanes.size) {
  }
  const baselineYById = new Map();
  const trackYById = new Map();
  {
    const acc = new Map(); // id -> {sum, count}
    const ys = [];
    (overlay.frames || []).forEach(frame => {
      const arr = frame.athletes || frame.lanes || [];
      arr.forEach(a => {
        const rawY = (typeof a.y === 'number' ? a.y
          : typeof a.cy === 'number' ? a.cy
            : null);
        if (rawY == null) return;
        let s = acc.get(a.id);
        if (!s) {
          s = { sum: 0, count: 0 };
          acc.set(a.id, s);
        }
        s.sum += rawY;
        s.count += 1;
        ys.push(rawY);
      });
    });

    acc.forEach((v, id) => {
      if (v.count > 0) {
        baselineYById.set(id, v.sum / v.count);
      }
    });
    let laneSpacingAvg = 140;
    if (ys.length > 1) {
      ys.sort((a, b) => a - b);
      let totalDiff = 0;
      let countDiff = 0;
      for (let i = 1; i < ys.length; i++) {
        const diff = ys[i] - ys[i - 1];
        if (diff > 1) {
          totalDiff += diff;
          countDiff += 1;
        }
      }
      if (countDiff > 0) {
        laneSpacingAvg = totalDiff / countDiff;
      }
    }
    overlay.laneSpacingAvg = laneSpacingAvg;
  }

  function rebuildTrackYMap() {
    trackYById.clear();
    const configuredLaneIds = new Set([
      ...Array.from(baselineYById.keys()),
      ...Array.from((overlay.athletes || []).map(meta => meta?.id).filter(id => Number.isFinite(id))),
      ...Array.from(laneClickZoneConfig.lanes.keys())
    ]);

    configuredLaneIds.forEach((laneId) => {
      const zone = laneClickZoneConfig.lanes.get(laneId);
      if (zone && isFiniteNumber(zone.y0Pct) && isFiniteNumber(zone.y1Pct)) {
        const yMid = videoH * ((zone.y0Pct + zone.y1Pct) / 2);
        if (isFiniteNumber(yMid)) {
          trackYById.set(laneId, yMid);
          return;
        }
      }
      const baselineY = baselineYById.get(laneId);
      if (isFiniteNumber(baselineY)) {
        trackYById.set(laneId, baselineY);
      }
    });
    if (trackYById.size === 0) {
      const spacing = overlay.laneSpacingAvg || (videoH / Math.max((overlay.athletes || []).length, 1));
      const n = (overlay.athletes || []).length || 8;
      const startY = videoH / 2 - spacing * (n - 1) / 2;
      (overlay.athletes || []).forEach((meta, idx) => {
        const id = meta?.id ?? (idx + 1);
        trackYById.set(id, startY + spacing * idx);
      });
    }
  }
  rebuildTrackYMap();

  function getAverageLaneZoneHeightPx() {
    const heights = Array.from(laneClickZoneConfig.lanes.values())
      .map((zone) => (Number(zone?.y1Pct) - Number(zone?.y0Pct)) * videoH)
      .filter((value) => Number.isFinite(value) && value > 1);
    if (heights.length) {
      return heights.reduce((sum, value) => sum + value, 0) / heights.length;
    }
    return videoH / Math.max(1, laneCountGlobal || 8);
  }

  function getSuggestedStaticTextFontSize(typeId, laneHeightPx) {
    const baseHeight = Number.isFinite(laneHeightPx) && laneHeightPx > 0
      ? laneHeightPx
      : getAverageLaneZoneHeightPx();
    const ratio = String(typeId || '') === 'awardsInfo' ? 0.24 : 0.38;
    return Math.max(14, Math.min(140, Math.round(baseHeight * ratio)));
  }

  function normalizeMetricUpdateIntervalSec(rawValue, fallback = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const numeric = Number(rawValue);
    const fallbackSec = Number.isFinite(Number(fallback)) ? Number(fallback) : LIVE_DATA_UPDATE_INTERVAL_SEC;
    if (!Number.isFinite(numeric)) return fallbackSec;
    return Math.max(0.1, Math.min(2, Math.round(numeric * 20) / 20));
  }

  function normalizeMovingAverageSec(rawValue, fallback = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return Math.max(0, Number(fallback) || 0);
    return Math.max(0, numeric);
  }

  function quantizeLiveDataDisplayTimeSec(timeSec, updateIntervalSec = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const numericTime = Number(timeSec);
    if (!Number.isFinite(numericTime) || numericTime <= 0) return 0;
    const intervalSec = normalizeMetricUpdateIntervalSec(updateIntervalSec, LIVE_DATA_UPDATE_INTERVAL_SEC);
    const snapped = Math.floor((numericTime + 1e-6) / intervalSec) * intervalSec;
    return Number(snapped.toFixed(3));
  }

  function resolveLaneStaticScreenPlacement(rect, placement, textAlign = null) {
    const slot = normalizeStaticPlacement('name', placement);
    if (!rect) {
      return { x: 0, y: 0, anchorX: 0.5, anchorY: 0.5, align: 'center', maxWidth: 0 };
    }
    const x = slot === 'laneLeft'
      ? rect.x + rect.w * 0.08
      : slot === 'laneRight'
        ? rect.x + rect.w * 0.92
        : rect.cx;
    const align = normalizeStaticTextAlign(
      textAlign,
      slot === 'laneLeft' ? 'left' : (slot === 'laneRight' ? 'right' : 'center')
    );
    const anchorX = align === 'left' ? 0 : (align === 'right' ? 1 : 0.5);
    const minX = rect.x + rect.w * 0.08;
    const maxX = rect.x + rect.w * 0.92;
    const availableLeft = Math.max(0, x - minX);
    const availableRight = Math.max(0, maxX - x);
    const maxWidth = align === 'left'
      ? Math.max(rect.w * 0.24, availableRight)
      : align === 'right'
        ? Math.max(rect.w * 0.24, availableLeft)
        : Math.max(rect.w * 0.24, Math.min(availableLeft, availableRight) * 2);
    if (slot === 'laneLeft') {
      return {
        x,
        y: rect.cy,
        anchorX,
        anchorY: 0.5,
        align,
        maxWidth
      };
    }
    if (slot === 'laneRight') {
      return {
        x,
        y: rect.cy,
        anchorX,
        anchorY: 0.5,
        align,
        maxWidth
      };
    }
    return {
      x,
      y: rect.cy,
      anchorX,
      anchorY: 0.5,
      align,
      maxWidth
    };
  }

  function resolveLaneStaticVideoPlacement(laneBounds, placement, offsetX = 0, offsetY = 0) {
    if (!Number.isFinite(Number(laneBounds?.topY)) || !Number.isFinite(Number(laneBounds?.bottomY))) {
      return null;
    }
    const slot = normalizeStaticPlacement('name', placement);
    const xRatio = slot === 'laneLeft' ? 0.08 : (slot === 'laneRight' ? 0.92 : 0.5);
    return {
      x: videoW * xRatio + Number(offsetX || 0),
      y: ((Number(laneBounds.topY) + Number(laneBounds.bottomY)) * 0.5) + Number(offsetY || 0)
    };
  }

  function resolveProjectedSpriteAnchorFromMatrix(matrix, rtW, rtH, fallbackX = 0.5, fallbackY = 0.5) {
    if (!matrix || !(rtW > 0) || !(rtH > 0) || !PIXI?.Point) {
      return { x: fallbackX, y: fallbackY };
    }
    const localOrigin = matrix.apply(new PIXI.Point(0, 0));
    const anchorX = Number.isFinite(localOrigin?.x) ? Math.max(0, Math.min(1, localOrigin.x / rtW)) : fallbackX;
    const anchorY = Number.isFinite(localOrigin?.y) ? Math.max(0, Math.min(1, localOrigin.y / rtH)) : fallbackY;
    return { x: anchorX, y: anchorY };
  }

  function resolveGlobalScreenAnchor(cornerRaw) {
    const corner = normalizeStaticPlacement('elapsed', cornerRaw);
    const vw = getViewportWidth();
    const vh = getViewportHeight();
    const marginX = 24;
    const marginY = 24;
    if (corner === 'screenTopLeft') {
      return { x: marginX, y: marginY, anchorX: 0, anchorY: 0 };
    }
    if (corner === 'screenBottomLeft') {
      return { x: marginX, y: vh - marginY, anchorX: 0, anchorY: 1 };
    }
    if (corner === 'screenBottomRight') {
      return { x: vw - marginX, y: vh - marginY, anchorX: 1, anchorY: 1 };
    }
    return { x: vw - marginX, y: marginY, anchorX: 1, anchorY: 0 };
  }

  function findAthleteInFrameByLaneId(arr, laneId) {
    const targetLane = Number(laneId);
    if (!Number.isFinite(targetLane)) return null;
    return (Array.isArray(arr) ? arr : []).find((entry) => Number(entry?.id) === targetLane) || null;
  }

  function getAthleteRankValue(athlete) {
    const rank = Number(athlete?.rank);
    if (!Number.isFinite(rank)) return null;
    return Math.max(1, Math.round(rank));
  }

  function findAthleteInFrameByRank(arr, rankValue) {
    const targetRank = Number(rankValue);
    if (!Number.isFinite(targetRank)) return null;
    return (Array.isArray(arr) ? arr : [])
      .filter((entry) => getAthleteRankValue(entry) === targetRank)
      .sort((a, b) => {
        const laneA = Number(a?.id);
        const laneB = Number(b?.id);
        if (Number.isFinite(laneA) && Number.isFinite(laneB)) return laneA - laneB;
        if (Number.isFinite(laneA)) return -1;
        if (Number.isFinite(laneB)) return 1;
        return 0;
      })[0] || null;
  }

  function getCurrentFrameAthletes() {
    const timeSec = Number.isFinite(videoEl?.currentTime) ? Number(videoEl.currentTime) : Number(prevTimeSec || 0);
    const frame = overlay?.getFrameByTime?.(timeSec);
    return Array.isArray(frame?.athletes) ? frame.athletes : (Array.isArray(frame?.lanes) ? frame.lanes : []);
  }

  function getCurrentComparisonFrameAthletes() {
    return getCurrentFrameAthletes();
  }

  function getMetricTargetLayerState(typeId) {
    const el = [...elements.values()].find((entry) => entry?.typeId === typeId);
    return el ? (getPrimaryElementState(el) || el) : null;
  }

  function getMetricUpdateIntervalSec(typeId, fallback = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const layerState = getMetricTargetLayerState(typeId);
    return normalizeMetricUpdateIntervalSec(
      layerState?.styleOverrides?.updateIntervalSec ?? layerState?.repProps?.updateIntervalSec,
      fallback
    );
  }

  function getMetricSmoothingWindowSec(typeId, fallback = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    if (!supportsLiveDataUpdateInterval(typeId)) return 0;
    return getMetricUpdateIntervalSec(typeId, fallback);
  }

  function resolveMetricDisplayTimeSec(typeId, timeSec, fallback = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const numericTime = Number(timeSec);
    if (!Number.isFinite(numericTime) || numericTime <= 0) return 0;
    if (!supportsLiveDataUpdateInterval(typeId)) return numericTime;
    return quantizeLiveDataDisplayTimeSec(numericTime, getMetricUpdateIntervalSec(typeId, fallback));
  }

  function resolveSwimmerComparisonTargetAthlete(athlete, athletes, targetBinding = 'auto', targetLaneId = 0, targetRank = 0) {
    const laneId = Number(athlete?.id);
    if (!Number.isFinite(laneId)) return null;
    const arr = Array.isArray(athletes) ? athletes : [];
    const normalizedBinding = resolveCompareTargetBindingConfig(targetBinding, targetLaneId, targetRank);
    if (normalizedBinding === 'lane') {
      return findAthleteInFrameByLaneId(arr, normalizeCompareTargetLaneId(targetLaneId));
    }
    if (normalizedBinding === 'rank') {
      return findAthleteInFrameByRank(arr, normalizeCompareTargetRank(targetRank));
    }
    return buildAheadSwimmerById(arr).get(laneId) || null;
  }

  function computeSwimmerComparisonMetricValue(
    metricId,
    athlete,
    athletes,
    frameTimeSec,
    targetLaneId = 0,
    targetBinding = 'auto',
    targetRank = 0
  ) {
    const laneId = Number(athlete?.id);
    if (!Number.isFinite(laneId)) return null;
    const arr = Array.isArray(athletes) ? athletes : [];
    const normalizedBinding = resolveCompareTargetBindingConfig(targetBinding, targetLaneId, targetRank);
    const normalizedTargetLaneId = normalizeCompareTargetLaneId(targetLaneId);
    const normalizedTargetRank = normalizeCompareTargetRank(targetRank);
    if (normalizedBinding === 'auto' && normalizedTargetLaneId <= 0) {
      if (metricId === 'speedDiffSwimmer' && Number.isFinite(athlete?.speed_differences_swimmer)) {
        return athlete.speed_differences_swimmer;
      }
      if (metricId === 'positionDiffSwimmer' && Number.isFinite(athlete?.position_differences_swimmer)) {
        return athlete.position_differences_swimmer;
      }
      if (metricId === 'timeDiffSwimmer' && Number.isFinite(athlete?.time_differences_swimmer)) {
        return athlete.time_differences_swimmer;
      }
    }
    const targetAthlete = resolveSwimmerComparisonTargetAthlete(
      athlete,
      arr,
      normalizedBinding,
      normalizedTargetLaneId,
      normalizedTargetRank
    );
    if (!targetAthlete) return 0;
    const targetId = Number(targetAthlete?.id);
    if (!Number.isFinite(targetId) || targetId === laneId) return 0;

    if (metricId === 'speedDiffSwimmer') {
      const currentSpeed = getCurrentSpeedValueForChart(athlete);
      const targetSpeed = getCurrentSpeedValueForChart(targetAthlete);
      return Number.isFinite(currentSpeed) && Number.isFinite(targetSpeed)
        ? (currentSpeed - targetSpeed)
        : null;
    }

    const currentProgress = getAthleteProgressValue(athlete);
    const targetProgress = getAthleteProgressValue(targetAthlete);
    if (metricId === 'positionDiffSwimmer') {
      const computed = Number.isFinite(currentProgress) && Number.isFinite(targetProgress)
        ? (currentProgress - targetProgress)
        : null;
      if (!Number.isFinite(computed)) return computed;
      return Math.abs(computed) < 1e-9 ? -0 : computed;
    }

    if (metricId === 'timeDiffSwimmer') {
      const targetSpeed = getCurrentSpeedValueForChart(targetAthlete);
      const computed = Number.isFinite(targetProgress)
        && Number.isFinite(currentProgress)
        && Number.isFinite(targetSpeed)
        && targetSpeed > 1e-6
        ? ((targetProgress - currentProgress) / targetSpeed)
        : null;
      if (!Number.isFinite(computed)) return computed;
      return Math.abs(computed) < 1e-9 ? -0 : computed;
    }

    return null;
  }

  function computeRecordComparisonMetricValue(metricId, athlete, frameTimeSec, recordType = 'world') {
    const recordKey = normalizeCompareRecordType(recordType) === 'olympic' ? 'olympic' : 'world';
    const athleteRecordKey = typeof athlete?.record_reference === 'string'
      ? athlete.record_reference.toLowerCase()
      : '';
    if (athleteRecordKey === recordKey) {
      if (metricId === 'speedDiffRecord' && Number.isFinite(athlete?.speed_differences_record)) {
        return athlete.speed_differences_record;
      }
      if (metricId === 'positionDiffRecord' && Number.isFinite(athlete?.position_differences_record)) {
        return athlete.position_differences_record;
      }
      if (metricId === 'timeDiffRecord' && Number.isFinite(athlete?.time_differences_record)) {
        return athlete.time_differences_record;
      }
    }
    const currentSpeed = getCurrentSpeedValueForChart(athlete);
    const currentProgress = getAthleteProgressValue(athlete);
    const recordSpeed = Number.isFinite(athlete?.[`speed_${recordKey}`]) ? athlete[`speed_${recordKey}`] : null;
    const recordProgress = Number.isFinite(athlete?.[`x_${recordKey}`]) ? athlete[`x_${recordKey}`] : null;

    if (metricId === 'speedDiffRecord') {
      return Number.isFinite(currentSpeed) && Number.isFinite(recordSpeed)
        ? (currentSpeed - recordSpeed)
        : null;
    }
    if (metricId === 'positionDiffRecord') {
      return Number.isFinite(recordProgress) && Number.isFinite(currentProgress)
        ? (recordProgress - currentProgress)
        : null;
    }
    if (metricId === 'timeDiffRecord') {
      return Number.isFinite(recordSpeed)
        && recordSpeed > 1e-6
        && Number.isFinite(currentProgress)
        && Number.isFinite(frameTimeSec)
        ? (frameTimeSec - (currentProgress / recordSpeed))
        : null;
    }
    return null;
  }

  function getGlobalRecordMetricValue(typeId, frameAthletes) {
    const arr = Array.isArray(frameAthletes) ? frameAthletes : [];
    const frameAthlete = arr.find((athlete) => {
      if (typeId === 'worldRecord') return Number.isFinite(athlete?.world_record) || Number.isFinite(athlete?.world);
      return Number.isFinite(athlete?.olympics_record) || Number.isFinite(athlete?.olympic);
    }) || null;
    const metaAthlete = overlay?.athletes?.find((meta) => {
      if (typeId === 'worldRecord') return Number.isFinite(meta?.world_record);
      return Number.isFinite(meta?.olympics_record);
    }) || null;

    if (typeId === 'worldRecord') {
      if (Number.isFinite(metaAthlete?.world_record)) return metaAthlete.world_record;
      if (Number.isFinite(frameAthlete?.world_record)) return frameAthlete.world_record;
      if (Number.isFinite(frameAthlete?.world)) return frameAthlete.world;
      return null;
    }
    if (Number.isFinite(metaAthlete?.olympics_record)) return metaAthlete.olympics_record;
    if (Number.isFinite(frameAthlete?.olympics_record)) return frameAthlete.olympics_record;
    if (Number.isFinite(frameAthlete?.olympic)) return frameAthlete.olympic;
    return null;
  }

  function getOverlayRawData() {
    if (overlay?.raw && typeof overlay.raw === 'object') return overlay.raw;
    return overlay;
  }

  function getOverlayOfficialRecordContext() {
    return getOverlayRawData()?.official_record_context || null;
  }

  function getOverlayRaceLength() {
    const raw = getOverlayRawData();
    const officialRecordContext = getOverlayOfficialRecordContext();
    const raceLength = Number(
      officialRecordContext?.race_length_m
      ?? raw?.race_length
      ?? 50
    );
    return Number.isFinite(raceLength) && raceLength > 0 ? raceLength : 50;
  }

  function getOverlayAthleteMetaList() {
    const rawAthletes = Array.isArray(getOverlayRawData()?.athletes) ? getOverlayRawData().athletes : null;
    if (rawAthletes?.length) return rawAthletes;
    return Array.isArray(overlay?.athletes) ? overlay.athletes : [];
  }

  function hasIntermediateSplitTimeData() {
    return getOverlayAthleteMetaList().some((athlete) => {
      const splits = Array.isArray(athlete?.splits) ? athlete.splits : [];
      const splitTimes = Array.isArray(athlete?.split_times) ? athlete.split_times : [];
      return splits.length > 1 || splitTimes.length > 1;
    });
  }

  function hasFinalTimeData() {
    return getOverlayAthleteMetaList().some((athlete) => (
      Number.isFinite(Number(athlete?.final_time))
      || Number.isFinite(Number(athlete?.final))
    ));
  }

  function hasLeaderInsightData() {
    return (Array.isArray(insight?.segments) ? insight.segments : [])
      .some((seg) => Number.isFinite(Number(seg?.leader_id)));
  }

  function hasChaseInsightData() {
    return (Array.isArray(insight?.segments) ? insight.segments : [])
      .some((seg) => Number.isFinite(Number(seg?.chase_id)));
  }

  function hasInsightTextData() {
    return (Array.isArray(insight?.segments) ? insight.segments : [])
      .some((seg) => {
        const texts = seg?.athlete_texts;
        return texts && typeof texts === 'object' && !Array.isArray(texts) && Object.keys(texts).length > 0;
      });
  }

  function hasResultInsightData() {
    return (Array.isArray(insight?.segments) ? insight.segments : [])
      .some((seg) => seg?.results && typeof seg.results === 'object' && !Array.isArray(seg.results) && Object.keys(seg.results).length > 0);
  }

  function isVisTypeAvailable(typeId) {
    const normalizedTypeId = String(typeId || '');
    if (normalizedTypeId === 'splitTime') return hasIntermediateSplitTimeData();
    if (normalizedTypeId === 'finalTime') return hasFinalTimeData();
    if (normalizedTypeId === 'leaderStatus') return hasLeaderInsightData();
    if (normalizedTypeId === 'chaseStatus') return hasChaseInsightData();
    if (normalizedTypeId === 'insightText') return hasInsightTextData();
    if (normalizedTypeId === 'resultStatus') return hasResultInsightData();
    return true;
  }

  function getOfficialRecordTimeSec(recordType = 'world', frameAthletes = null) {
    const normalized = normalizeCompareRecordType(recordType);
    const records = getOverlayOfficialRecordContext()?.records;
    if (records && Number.isFinite(Number(records?.[normalized]))) {
      return Number(records[normalized]);
    }
    return getGlobalRecordMetricValue(
      normalized === 'world' ? 'worldRecord' : 'olympicsRecord',
      frameAthletes
    );
  }
  let viewportRefreshRaf = 0;
  let viewportRefreshListenersReady = false;

  populateVisSelect();
  attachPanelBindings(overlay.athletes);
  bindModePanelUi();
  bindDataGroupToggles();
  renderActiveElements();
  syncInfoChips();
  renderUiShellState();
  const onViewportMaybeChanged = () => {
    if (!viewportRefreshListenersReady) return;
    scheduleViewportRefresh();
    requestAnimationFrame(() => {
      scheduleViewportRefresh();
    });
  };
  if (typeof ResizeObserver !== 'undefined') {
    const viewportResizeObserver = new ResizeObserver(() => {
      onViewportMaybeChanged();
    });
    viewportResizeObserver.observe(containerEl);
  }
  window.addEventListener('resize', onViewportMaybeChanged);
  document.addEventListener('fullscreenchange', onViewportMaybeChanged);
  document.addEventListener('webkitfullscreenchange', onViewportMaybeChanged);
  btnCloseSettings?.addEventListener('click', () => {
    closeLayerSettingsToModePanel();
  });

  selectVis?.addEventListener('change', () => {
    librarySelection.vis = selectVis.value;
    const vis = VIS_LIBRARY[librarySelection.vis];
    librarySelection.rep = getDefaultRepIdForType(librarySelection.vis, vis);
    renderRepOptions();
    updateVisChipActive();
  });

  btnAddVis?.addEventListener('click', () => {
    const vis = VIS_LIBRARY[librarySelection.vis];
    if (!vis) return;
    const existing = [...elements.values()].find(el => el.typeId === vis.id);
    if (existing) {
      removeElement(existing.id);
    } else {
      addElement(librarySelection.vis, librarySelection.rep, overlay.athletes);
    }
    updateVisChipActive();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (clearPendingIntervalInsert()) {
        renderElementTimeline();
      }
    }
  });
  const app = createPixiApp(containerEl);
  if (app?.renderer && typeof app.renderer.on === 'function') {
    app.renderer.on('resize', onViewportMaybeChanged);
  }

  function getViewportWidth() {
    return Math.max(
      0,
      Number(
        app?.screen?.width
        || containerEl?.clientWidth
        || ((app?.renderer?.width || 0) / Math.max(1, app?.renderer?.resolution || 1))
      ) || 0
    );
  }

  function getViewportHeight() {
    return Math.max(
      0,
      Number(
        app?.screen?.height
        || containerEl?.clientHeight
        || ((app?.renderer?.height || 0) / Math.max(1, app?.renderer?.resolution || 1))
      ) || 0
    );
  }
  const FLAG_RT_W = 320;
  const FLAG_RT_H = 200;
  const FLAG_DISPLAY_W = 96;  // draw from normalized texture but display compact
  const FLAG_DISPLAY_H = 60;
  const flagTextureCache = new Map(); // key -> RenderTexture
  let arrowGoldTexture = null;
  let arrowGrayTextures = [];

  function normalizeFlagTexture(url) {
    if (flagTextureCache.has(url)) return flagTextureCache.get(url);
    const baseTex = PIXI.Texture.from(url);
    if (!baseTex) return null;

    const makeRT = () => {
      const rt = PIXI.RenderTexture.create({ width: FLAG_RT_W, height: FLAG_RT_H });
      const tempSprite = new PIXI.Sprite(baseTex);
      const scale = Math.min(FLAG_RT_W / baseTex.width, FLAG_RT_H / baseTex.height);
      tempSprite.anchor.set(0.5);
      tempSprite.position.set(FLAG_RT_W / 2, FLAG_RT_H / 2);
      tempSprite.scale.set(scale);
      const tempContainer = new PIXI.Container();
      tempContainer.addChild(tempSprite);
      app.renderer.render(tempContainer, { renderTexture: rt, clear: true });
      flagTextureCache.set(url, rt);
      return rt;
    };

    if (baseTex.valid) {
      return makeRT();
    } else {
      baseTex.baseTexture.once('loaded', makeRT);
      return null;
    }
  }

  function createArrowTexture(color) {
    const w = 132;
    const h = 60;
    const shaftW = 88;
    const shaftH = 18;
    const tailX = 8;
    const shaftY = (h - shaftH) / 2;
    const tipX = w - 8;
    const g = new PIXI.Graphics();
    g.lineStyle(1.2, 0x0f172a, 0.62);
    g.beginFill(color, 0.82);
    g.drawRoundedRect(tailX, shaftY, shaftW, shaftH, 8);
    g.drawPolygon([
      tailX + shaftW - 2, shaftY - 6,
      tipX, h / 2,
      tailX + shaftW - 2, shaftY + shaftH + 6
    ]);
    g.endFill();
    g.lineStyle(0);
    const rt = app.renderer.generateTexture(g);
    return rt;
  }

  function createChaseArrowTexture(color, visibleCount = 3) {
    const w = 132;
    const h = 60;
    const length = 26;
    const halfH = 10;
    const gap = 8;
    const dir = 1;
    const step = length * 0.62 + gap;
    const offsets = [-step, 0, step];
    const drawOrder = [2, 1, 0];
    const active = new Set(drawOrder.slice(0, Math.max(1, Math.min(3, Math.round(visibleCount)))));
    const g = new PIXI.Graphics();
    const centerX = w * 0.48;
    const centerY = h * 0.5;

    const drawChevronSet = (lineWidth, tint, alpha) => {
      if (lineWidth <= 0 || alpha <= 0) return;
      g.lineStyle(lineWidth, tint, alpha, 0.5);
      offsets.forEach((offset, idx) => {
        if (!active.has(idx)) return;
        const tipX = centerX + offset + dir * (length * 0.42);
        const tailX = centerX + offset - dir * (length * 0.36);
        g.moveTo(tailX, centerY - halfH);
        g.lineTo(tipX, centerY);
        g.lineTo(tailX, centerY + halfH);
      });
    };

    drawChevronSet(5.2, 0x0f172a, 0.22);
    drawChevronSet(3.2, color, 0.22);
    drawChevronSet(2.2, color, 0.98);
    g.lineStyle(0);
    return app.renderer.generateTexture(g);
  }
  const videoEl = createVideoElement(
    currentCompetition.video || './assets/sample_fast_h264.mp4'
  );

  let videoTexture = null;
  let videoSprite = null;
  let videoReady = false;
  let videoDuration = 20;
  let isScrubbing = false;
  let playbackRestartPending = false;
  const defaultShot = {
    zoom: 1.0,
    offX: 0.0,
    offY: 0.0,
    ltx: 0.0,
    lty: 0.0,
    rtx: 1.0,
    rty: 0.0,
    rbx: 1.0,
    rby: 1.0,
    lbx: 0.0,
    lby: 1.0
  };
  const baseTrackShot = {
    zoom: 1.85,
    offX: 0.0,
    offY: 0.0,
    ltx: 0.2,
    lty: 0.05,
    rtx: 1.1,
    rty: 0.05,
    rbx: 1.0,
    rby: 0.96,
    lbx: 0.05,
    lby: 0.96
  };
  const baseTrackPanShot = {
    zoom: 1.85,
    offX: 0.0,
    offY: 0.0,
    ltx: 0.0,
    lty: 0.0,
    rtx: 1.0,
    rty: 0.0,
    rbx: 1.0,
    rby: 1.0,
    lbx: 0.0,
    lby: 1.0
  };

  let currentShotId = 'wide';         // 'wide' | 'track'
  let currentShotState = { ...defaultShot };
  let focusedLaneId = null;            // Lane currently being tracked (1-8)
  const laneOffsetTopToBottom = [0.71, 0.6, 0.4, 0.2, -0.2, -0.4, -0.6, -0.72];
  const laneOffsetY = {};
  (
    competitionLaneIdRemap.canonicalTopToBottom.length
      ? competitionLaneIdRemap.canonicalTopToBottom
      : Array.from({ length: laneCountGlobal || 8 }, (_, idx) => idx + 1)
  ).forEach((laneId, idx) => {
    const safeIdx = Math.min(idx, laneOffsetTopToBottom.length - 1);
    laneOffsetY[laneId] = laneOffsetTopToBottom[safeIdx];
  });
  const trackReferenceLaneId = (
    competitionLaneIdRemap.canonicalTopToBottom[
      Math.max(0, Math.floor((Math.max(competitionLaneIdRemap.canonicalTopToBottom.length, 1) - 1) / 2))
    ]
  ) ?? 5;

  let camAnimating = false;
  let camFrom = null;
  let camTo = null;
  let camAnimStart = 0;
  const camAnimDurationDefault = 320;
  let camAnimDurationActive = camAnimDurationDefault;
  let camVisualTransition = null; // dissolve / wipe overlay snapshot fx
  const trackLayer = new PIXI.Container();
  const trackGraphics = new PIXI.Graphics();
  trackLayer.addChild(trackGraphics);

  const overlayLayer = new PIXI.Container();
  overlayLayer.interactive = true;
  overlayLayer.interactiveChildren = true;

  const overviewHighlightFxLayer = new PIXI.Container();
  overviewHighlightFxLayer.visible = false;
  overviewHighlightFxLayer.renderable = false;
  overviewHighlightFxLayer.interactive = false;
  overviewHighlightFxLayer.interactiveChildren = false;
  const overviewHighlightDimMask = new PIXI.Graphics();
  const overviewHighlightBlurMask = new PIXI.Graphics();
  overviewHighlightBlurMask.renderable = false;
  overviewHighlightFxLayer.addChild(overviewHighlightDimMask);
  overviewHighlightFxLayer.addChild(overviewHighlightBlurMask);
  const overviewHighlightDecorLayer = new PIXI.Container();
  overviewHighlightDecorLayer.visible = false;
  overviewHighlightDecorLayer.renderable = false;
  overviewHighlightDecorLayer.interactive = false;
  overviewHighlightDecorLayer.interactiveChildren = false;
  const overviewHighlightDecorGraphics = new PIXI.Graphics();
  overviewHighlightDecorLayer.addChild(overviewHighlightDecorGraphics);
  let overviewHighlightBlurSprite = null;
  let overviewHighlightBlurSupported = false;

  const cameraTransitionLayer = new PIXI.Container();
  cameraTransitionLayer.visible = false;
  cameraTransitionLayer.renderable = false;
  cameraTransitionLayer.interactive = false;
  cameraTransitionLayer.interactiveChildren = false;
  const cameraTransitionWipeMask = new PIXI.Graphics();
  const cameraTransitionOverlay = new PIXI.Graphics();
  const cameraTransitionBrandBand = new PIXI.Graphics();
  const cameraTransitionWipeEdge = new PIXI.Graphics();
  const cameraTransitionLogoPlate = new PIXI.Graphics();
  const cameraTransitionLogoSprite = new PIXI.Sprite(PIXI.Texture.from('assets/transition_fx/paris2024-logo.png'));
  cameraTransitionLogoSprite.anchor.set(0.5);
  cameraTransitionLogoSprite.visible = false;
  cameraTransitionLogoSprite.renderable = false;
  cameraTransitionLogoSprite.alpha = 0;

  const comparisonDisplayLayer = new PIXI.Container();
  comparisonDisplayLayer.visible = false;
  comparisonDisplayLayer.renderable = false;
  comparisonDisplayLayer.interactive = true;
  comparisonDisplayLayer.interactiveChildren = true;
  const comparisonDisplayBackdrop = new PIXI.Graphics();
  const comparisonDisplayRowsLayer = new PIXI.Container();
  comparisonDisplayRowsLayer.interactive = true;
  comparisonDisplayRowsLayer.interactiveChildren = true;
  comparisonDisplayLayer.addChild(comparisonDisplayBackdrop);
  comparisonDisplayLayer.addChild(comparisonDisplayRowsLayer);

  const comparisonSelectionLayer = new PIXI.Container();
  comparisonSelectionLayer.visible = false;
  comparisonSelectionLayer.renderable = false;
  comparisonSelectionLayer.interactive = false;
  comparisonSelectionLayer.interactiveChildren = false;
  const comparisonSelectionGlowGraphics = new PIXI.Graphics();
  const comparisonSelectionCheckboxGraphics = new PIXI.Graphics();
  comparisonSelectionLayer.addChild(comparisonSelectionGlowGraphics);
  comparisonSelectionLayer.addChild(comparisonSelectionCheckboxGraphics);

  const comparisonRowsByLaneId = new Map();
  const comparisonLaneLayoutRects = new Map();
  const comparisonPinnedHudLayer = new PIXI.Container();
  comparisonPinnedHudLayer.visible = false;
  comparisonPinnedHudLayer.renderable = false;
  comparisonPinnedHudLayer.interactive = false;
  comparisonPinnedHudLayer.interactiveChildren = false;
  let comparisonBlurBgSprite = null;
  let comparisonBlurBgSupported = false;
  let comparisonCompositeRT = null;
  let comparisonNeedsLayoutRefresh = true;
  app.stage.addChild(trackLayer);
  app.stage.addChild(overviewHighlightFxLayer);
  app.stage.addChild(overlayLayer);
  app.stage.addChild(overviewHighlightDecorLayer);
  app.stage.addChild(comparisonDisplayLayer);
  app.stage.addChild(comparisonSelectionLayer);
  app.stage.addChild(comparisonPinnedHudLayer);
  app.stage.addChild(cameraTransitionLayer);
  app.stage.interactive = true;
  app.stage.interactiveChildren = true;
  comparisonDisplayRowsLayer.on('pointermove', updateComparisonRowDrag);
  app.stage.on('pointermove', updateComparisonRowDrag);
  app.stage.on('pointerup', endComparisonRowDrag);
  app.stage.on('pointerupoutside', endComparisonRowDrag);

  const athleteGraphics = new Map();

  overlay.athletes.forEach(meta => {
    const container = new PIXI.Container();
    container.visible = false;
    container.renderable = false;

    const badgeContainer = new PIXI.Container();
    const badgeBg = new PIXI.Graphics();
    const badgeText = new PIXI.Text('', {
      fontSize: 12,
      fill: 0x0b0b0b,
      fontWeight: '800',
      fontFamily: 'system-ui',
      resolution: Math.max(1, app.renderer?.resolution || 1)
    });
    badgeText.anchor.set(0.5);
    badgeContainer.addChild(badgeBg);
    badgeContainer.addChild(badgeText);
    badgeContainer.position.set(26, -32);
    badgeContainer.visible = false;

    const Sprite2d = PIXI.projection.Sprite2d;
    const arrowLeader = new Sprite2d();
    arrowLeader.anchor.set(0);
    arrowLeader.visible = false;

    const arrowChase = new Sprite2d();
    arrowChase.anchor.set(0);
    arrowChase.visible = false;

    const leaderGlow = new PIXI.Graphics();
    leaderGlow.beginFill(laneColor(meta.id), 0.18);
    leaderGlow.drawCircle(0, 0, 16);
    leaderGlow.endFill();
    leaderGlow.visible = false;

    container.addChild(badgeContainer);
    container.addChild(leaderGlow);

    overlayLayer.addChild(container);
    overlayLayer.addChild(arrowLeader);
    overlayLayer.addChild(arrowChase);

    athleteGraphics.set(meta.id, {
      container,
      arrowLeader,
      arrowChase,
      leaderGlow,
      badgeContainer,
      badgeBg,
      badgeText
    });
  });

  function hidePerFrameAthleteGraphics() {
    athleteGraphics.forEach((entry) => {
      if (entry?.container) {
        entry.container.visible = false;
        entry.container.renderable = false;
      }
      if (entry?.arrowLeader) entry.arrowLeader.visible = false;
      if (entry?.arrowChase) entry.arrowChase.visible = false;
      if (entry?.leaderGlow) entry.leaderGlow.visible = false;
    });
  }

  function buildNoFrameFallbackFrame(timeSec) {
    const fallbackX = Math.max(0, videoW * 0.5);
    const elapsedTimeSec = mapVideoTimeToElapsedTimeSec(timeSec);
    const athletes = (overlay?.athletes || [])
      .map((meta, idx) => {
        const laneId = Number(meta?.id);
        if (!Number.isFinite(laneId)) return null;
        const y = getTrackYForId(laneId)
          ?? baselineYById.get(laneId)
          ?? (videoH * ((idx + 0.5) / Math.max(1, overlay?.athletes?.length || laneCountGlobal || 8)));
        return {
          ...meta,
          id: laneId,
          x: fallbackX,
          cx: fallbackX,
          y,
          cy: y
        };
      })
      .filter(Boolean);
    return {
      frame: -1,
      time_sec: Number.isFinite(timeSec) ? timeSec : 0,
      elapsed_time_sec: Number.isFinite(elapsedTimeSec) ? elapsedTimeSec : 0,
      athletes
    };
  }

  function renderNoFrameFallbackElements(timeSec) {
    const fallbackFrame = buildNoFrameFallbackFrame(timeSec);
    const dirSign = resolveDirection({ direction: defaultDirection }) === 'ltr' ? -1 : 1;
    renderCustomElements(fallbackFrame, dirSign, timeSec, {
      allowedTypeIds: NO_FRAME_FALLBACK_TYPES
    });
  }
  const laneClickLayer = new PIXI.Container();
  laneClickLayer.interactive = true;
  laneClickLayer.interactiveChildren = true;
  app.stage.addChildAt(laneClickLayer, app.stage.getChildIndex(overlayLayer) + 1);
  const zoneColors = [
    0xff4b4b, // lane 1 - red
    0xff9f1c, // lane 2 - orange
    0x2ec4b6, // lane 3 - teal
    0x00b4d8, // lane 4 - blue
    0x4361ee, // lane 5 - indigo
    0x7209b7, // lane 6 - purple
    0xf72585, // lane 7 - pink
    0x8ac926  // lane 8 - green
  ];
  const laneZoneGraphics = new Map();

  function createLaneClickZones() {
    laneClickLayer.removeChildren();
    laneZoneGraphics.clear();

    trackYById.forEach((laneY, laneId) => {
      const zone = new PIXI.Graphics();
      zone.interactive = true;
      zone.buttonMode = true;
      zone.cursor = 'pointer';

      zone.on('pointerdown', () => {
        handleLaneInteraction(laneId);
      });

      laneClickLayer.addChild(zone);
      laneZoneGraphics.set(laneId, { zone, laneY, screenQuad: null });
    });
  }
  createLaneClickZones();
  function getLaneClickZoneBoundsVideoY(laneId, laneY) {
    const configured = laneClickZoneConfig.lanes.get(Number(laneId));
    if (configured) {
      return {
        topY: configured.y0Pct * videoH,
        bottomY: configured.y1Pct * videoH
      };
    }
    const laneHalfHeightPx = videoH * defaultLaneClickHalfHeightPct;
    return {
      topY: laneY - laneHalfHeightPx,
      bottomY: laneY + laneHalfHeightPx
    };
  }

  function updateLaneClickZones() {
    laneZoneGraphics.forEach(({ zone, laneY }, laneId) => {
      zone.clear();
      const { topY, bottomY } = getLaneClickZoneBoundsVideoY(laneId, laneY);
      const tl = projectPointFromCurrentShot(0, topY);
      const tr = projectPointFromCurrentShot(videoW, topY);
      const br = projectPointFromCurrentShot(videoW, bottomY);
      const bl = projectPointFromCurrentShot(0, bottomY);

      const debugCfg = laneClickZoneConfig.debugOverlay;
      const debugEnabled = !!debugCfg?.enabled;
      const zoneColor = zoneColors[(Number(laneId) - 1 + zoneColors.length) % zoneColors.length] || 0xffffff;

      if (debugEnabled) {
        zone.lineStyle(debugCfg.lineWidth || 1, zoneColor, debugCfg.lineAlpha ?? 0.55);
        zone.beginFill(zoneColor, debugCfg.fillAlpha ?? 0.08);
      } else {
        zone.lineStyle(0);
        zone.beginFill(0xffffff, 0);
      }
      zone.moveTo(tl.cx, tl.cy);
      zone.lineTo(tr.cx, tr.cy);
      zone.lineTo(br.cx, br.cy);
      zone.lineTo(bl.cx, bl.cy);
      zone.closePath();
      zone.endFill();
      zone.lineStyle(0);
      zone.hitArea = new PIXI.Polygon([tl.cx, tl.cy, tr.cx, tr.cy, br.cx, br.cy, bl.cx, bl.cy]);
      const record = laneZoneGraphics.get(laneId);
      if (record) {
        record.screenQuad = [
          { x: tl.cx, y: tl.cy },
          { x: tr.cx, y: tr.cy },
          { x: br.cx, y: br.cy },
          { x: bl.cx, y: bl.cy }
        ];
      }
    });
  }

  function requestOverlayRefresh() {
    if (!videoEl) return;
    const t = videoEl.currentTime || 0;
    updateOverlayForTime(t, performance.now());
  }

  function resizeCameraTransitionSnapshotToViewport() {
    const snapshotSprite = camVisualTransition?.snapshotSprite;
    if (!snapshotSprite) return;
    snapshotSprite.position.set(0, 0);
    snapshotSprite.width = getViewportWidth();
    snapshotSprite.height = getViewportHeight();
  }

  function performViewportRefresh() {
    if (!viewportRefreshListenersReady) return;
    viewportRefreshRaf = 0;
    syncPixiResolution(app, containerEl);
    if (videoReady) {
      applyShotStateToSprite(currentShotState);
      resizeCameraTransitionSnapshotToViewport();
    }
    markComparisonLayoutDirty();
    renderHighlightMarkers();
    requestOverlayRefresh();
  }

  function scheduleViewportRefresh() {
    if (!viewportRefreshListenersReady) return;
    if (viewportRefreshRaf) return;
    viewportRefreshRaf = requestAnimationFrame(performViewportRefresh);
  }

  function normalizeOverviewHighlightStyle(raw) {
    if (raw === 'silhouette' || raw === 'pulseband' || raw === 'laneglow') return 'edgebracket';
    if (raw === 'standard' || raw === 'spotlight' || raw === 'edgebracket' || raw === 'blur') {
      return raw;
    }
    return 'standard';
  }

  function resolveOverviewHighlightStyle() {
    return normalizeOverviewHighlightStyle(uiState.modePanels?.overview?.highlightStyle);
  }

  function resolveOverviewHighlightTransitionType() {
    return uiState.modePanels?.overview?.highlightTransitionType === 'hardcut' ? 'hardcut' : 'smooth';
  }

  function normalizeOverviewHighlightTransitionDurationSec(raw) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0.3;
    return Math.max(0.25, Math.min(1.5, Math.round(num * 20) / 20));
  }

  function formatOverviewHighlightTransitionDurationLabel(raw) {
    return formatDecimalReadout(normalizeOverviewHighlightTransitionDurationSec(raw), 's');
  }

  function resolveOverviewHighlightLaneAlphaMap(laneIds, now) {
    const laneList = cloneArrayNums(laneIds).sort((a, b) => a - b);
    const selectedSet = new Set(laneList);
    const alphaMap = overviewHighlightTransitionState.laneAlpha;
    const nowMs = Number.isFinite(now) ? now : performance.now();
    const prevMs = overviewHighlightTransitionState.lastUpdateMs || nowMs;
    const dtMs = Math.max(0, Math.min(250, nowMs - prevMs));
    overviewHighlightTransitionState.lastUpdateMs = nowMs;
    Array.from(alphaMap.keys()).forEach((laneId) => {
      if (!selectedSet.has(laneId)) alphaMap.delete(laneId);
    });

    if (resolveOverviewHighlightTransitionType() === 'hardcut') {
      laneList.forEach((laneId) => alphaMap.set(laneId, 1));
      return alphaMap;
    }

    const durationMs = Math.max(
      1,
      Math.round(normalizeOverviewHighlightTransitionDurationSec(uiState.modePanels?.overview?.highlightTransitionDurationSec) * 1000)
    );
    const step = clamp01(dtMs / durationMs);
    laneList.forEach((laneId) => {
      const current = Number(alphaMap.get(laneId));
      if (!Number.isFinite(current)) {
        alphaMap.set(laneId, 0);
        return;
      }
      const from = Math.max(0, Math.min(1, current));
      const next = Math.min(1, from + (1 - from) * step);
      alphaMap.set(laneId, next);
    });
    return alphaMap;
  }

  function scaleOverviewHoleShapeWithAlpha(shape, alpha = 1) {
    if (!shape || !Number.isFinite(alpha)) return shape;
    const f = Math.max(0.0001, Math.min(1, alpha));
    if (shape.kind === 'ellipse') {
      return {
        ...shape,
        rx: Math.max(1, (Number(shape.rx) || 1) * f),
        ry: Math.max(1, (Number(shape.ry) || 1) * f)
      };
    }
    if (shape.kind === 'rect') {
      const w = (Number(shape.w) || 0);
      const h = (Number(shape.h) || 0);
      const cx = (Number(shape.x) || 0) + w / 2;
      const cy = (Number(shape.y) || 0) + h / 2;
      const nw = Math.max(1, w * f);
      const nh = Math.max(1, h * f);
      return {
        ...shape,
        x: cx - nw / 2,
        y: cy - nh / 2,
        w: nw,
        h: nh
      };
    }
    if (shape.kind === 'quad' && Array.isArray(shape.points) && shape.points.length >= 3) {
      const pts = shape.points;
      const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
      const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
      return {
        ...shape,
        points: pts.map((p) => ({
          x: cx + (p.x - cx) * f,
          y: cy + (p.y - cy) * f
        }))
      };
    }
    return shape;
  }

  function buildOverviewTransitionedHoles(shapes, laneAlphaMap) {
    if (!Array.isArray(shapes) || !shapes.length) return [];
    return shapes.map((shape) => {
      const laneId = Number(shape?.laneId);
      const alpha = Number.isFinite(laneId) ? (laneAlphaMap.get(laneId) ?? 1) : 1;
      return scaleOverviewHoleShapeWithAlpha(shape, alpha);
    });
  }

  function toggleOverviewLaneHighlight(laneId) {
    const id = Number(laneId);
    if (!Number.isFinite(id)) return;
    if (overviewHighlightedLaneIds.has(id)) {
      overviewHighlightedLaneIds.delete(id);
      overviewHighlightTransitionState.laneAlpha.delete(id);
    } else {
      overviewHighlightedLaneIds.add(id);
      if (resolveOverviewHighlightTransitionType() === 'hardcut') {
        overviewHighlightTransitionState.laneAlpha.set(id, 1);
      } else if (!overviewHighlightTransitionState.laneAlpha.has(id)) {
        overviewHighlightTransitionState.laneAlpha.set(id, 0);
      }
    }
    updateExitButtonVisibility();
    noteViewModeStateChanged(`overview:lane-highlight-${id}`);
    requestOverlayRefresh();
    ensurePausedCameraTransitionTick();
  }

  function resetOverviewLaneHighlights(opts = {}) {
    if (overviewHighlightedLaneIds.size === 0) return;
    overviewHighlightedLaneIds.clear();
    clearOverviewLaneHighlights();
    updateExitButtonVisibility();
    if (opts.record !== false) {
      noteViewModeStateChanged('overview:clear-highlights');
    }
    requestOverlayRefresh();
    ensurePausedCameraTransitionTick();
  }

  function handleLaneInteraction(laneId) {
    if (exportRenderState.active) return;
    if (uiState.viewMode === 'tracking') {
      switchToLane(laneId);
      return;
    }

    if (uiState.viewMode === 'overview') {
      if (!canInteractWithOverviewHighlightLane(laneId)) return;
      toggleOverviewLaneHighlight(laneId);
      return;
    }

    if (uiState.viewMode === 'comparison') {
      if (comparisonState.phase !== 'selecting') return;
      const selectionValue = resolveComparisonSelectionValueForLaneId(laneId);
      if (!Number.isFinite(selectionValue)) return;
      toggleComparisonLaneSelection(selectionValue, { source: 'canvas' });
      return;
    }
  }

  function updateLaneInteractionAffordances() {
    const enabled = uiState.viewMode === 'overview'
      || uiState.viewMode === 'tracking'
      || comparisonIsSelecting();
    const cursor = enabled ? 'pointer' : 'default';

    laneZoneGraphics.forEach(({ zone }) => {
      zone.interactive = enabled;
      zone.buttonMode = enabled;
      zone.cursor = cursor;
    });
  }
  updateLaneInteractionAffordances();

  function canInteractWithOverviewHighlightLane(laneId) {
    if (uiState.viewMode !== 'overview') return false;
    if (resolveOverviewHighlightStyle() !== 'spotlight') return true;
    const t = Number.isFinite(videoEl?.currentTime) ? Number(videoEl.currentTime) : 0;
    const frame = overlay?.getFrameByTime?.(t);
    if (!frame) return false;
    const arr = frame.athletes || frame.lanes || [];
    const numericLaneId = Number(laneId);
    return arr.some((athlete) => {
      if (Number(athlete?.id) !== numericLaneId) return false;
      const x = athlete?.x ?? athlete?.cx;
      const y = athlete?.y ?? athlete?.cy;
      return isFiniteNumber(x) && isFiniteNumber(y);
    });
  }

  function drawQuadPath(graphics, quad) {
    if (!Array.isArray(quad) || quad.length < 3) return;
    graphics.moveTo(quad[0].x, quad[0].y);
    for (let i = 1; i < quad.length; i += 1) {
      graphics.lineTo(quad[i].x, quad[i].y);
    }
    graphics.closePath();
  }

  function withHoleShape(graphics, shape) {
    if (!graphics || !shape) return;
    graphics.beginHole();
    if (shape.kind === 'rect') {
      const radius = Number(shape.radius) || 0;
      if (radius > 0) {
        graphics.drawRoundedRect(shape.x, shape.y, shape.w, shape.h, radius);
      } else {
        graphics.drawRect(shape.x, shape.y, shape.w, shape.h);
      }
    } else if (shape.kind === 'ellipse') {
      const cx = Number(shape.cx);
      const cy = Number(shape.cy);
      const rx = Math.max(1, Number(shape.rx) || 0);
      const ry = Math.max(1, Number(shape.ry) || 0);
      graphics.drawEllipse(cx, cy, rx, ry);
    } else if (shape.kind === 'quad') {
      drawQuadPath(graphics, shape.points);
    }
    graphics.endHole();
  }

  function drawInverseOverlayMask(graphics, holes, color, alpha) {
    graphics.clear();
    const vw = getViewportWidth() || 0;
    const vh = getViewportHeight() || 0;
    if (!vw || !vh || !Array.isArray(holes) || !holes.length) return;

    graphics.beginFill(color, alpha);
    graphics.drawRect(0, 0, vw, vh);
    holes.forEach((shape) => withHoleShape(graphics, shape));
    graphics.endFill();
  }

  function getOverviewSelectedLaneQuads() {
    return Array.from(overviewHighlightedLaneIds)
      .sort((a, b) => a - b)
      .map((laneId) => {
        const record = laneZoneGraphics.get(laneId);
        if (!record?.screenQuad) return null;
        return {
          laneId,
          kind: 'quad',
          points: record.screenQuad,
          color: laneColor(laneId)
        };
      })
      .filter(Boolean);
  }

  function getOverviewSpotlightRects(athleteScreenPositions, laneQuads) {
    const vw = getViewportWidth() || 0;
    const vh = getViewportHeight() || 0;
    const baseRectW = Math.max(150, Math.round(vw * (currentShotId === 'track' ? 0.22 : 0.16)));
    const baseRectH = Math.max(72, Math.round(vh * (currentShotId === 'track' ? 0.22 : 0.16)));
    const ellipseRx = Math.max(64, Math.round(baseRectW * 0.46));
    const ellipseRy = Math.max(22, Math.round(baseRectH * 0.28));
    const fallbackByLane = new Map((laneQuads || []).map((q) => [q.laneId, q]));

    return Array.from(overviewHighlightedLaneIds)
      .sort((a, b) => a - b)
      .map((laneId) => {
        const p = athleteScreenPositions?.get(laneId);
        if (p && Number.isFinite(p.cx) && Number.isFinite(p.cy)) {
          return {
            laneId,
            kind: 'ellipse',
            cx: p.cx,
            cy: p.cy,
            rx: ellipseRx,
            ry: ellipseRy,
            color: laneColor(laneId)
          };
        }

        const quad = fallbackByLane.get(laneId);
        if (!quad?.points?.length) return null;
        const xs = quad.points.map(pt => pt.x);
        const ys = quad.points.map(pt => pt.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rx = Math.max(44, Math.min(ellipseRx, (maxX - minX) * 0.55));
        const ry = Math.max(16, Math.min(ellipseRy, (maxY - minY) * 0.85));
        return {
          laneId,
          kind: 'ellipse',
          cx,
          cy,
          rx,
          ry,
          color: laneColor(laneId)
        };
      })
      .filter(Boolean);
  }

  function drawOverviewLaneQuadHighlights(graphics, laneQuads, opts = {}) {
    const fillAlpha = opts.fillAlpha ?? 0.06;
    const alphaByLane = opts.alphaByLane || null;
    laneQuads.forEach((shape) => {
      const color = shape.color || 0xffffff;
      const laneId = Number(shape.laneId);
      const laneAlpha = alphaByLane && Number.isFinite(laneId)
        ? Math.max(0, Math.min(1, Number(alphaByLane.get(laneId) ?? 1)))
        : 1;
      const finalAlpha = fillAlpha * laneAlpha;
      if (finalAlpha > 0) {
        graphics.beginFill(color, finalAlpha);
        drawQuadPath(graphics, shape.points);
        graphics.endFill();
      }
    });
  }

  function drawOverviewEdgeBrackets(graphics, laneQuads, laneAlphaMap, now) {
    const nowSec = (Number.isFinite(now) ? now : performance.now()) / 1000;
    const haloColor = 0x8edcff;
    const midColor = 0xdff3ff;
    const coreColor = 0xffffff;
    laneQuads.forEach((shape) => {
      if (!Array.isArray(shape?.points) || shape.points.length < 4) return;
      const laneId = Number(shape.laneId);
      const laneAlpha = Number.isFinite(laneId)
        ? clamp01(Number(laneAlphaMap?.get(laneId) ?? 1))
        : 1;
      if (laneAlpha <= 0) return;
      const [tl, tr, br, bl] = shape.points;
      const pulse = 0.76 + 0.24 * Math.sin(nowSec * 0.92 + laneId * 0.41);
      const leftMid = { x: (tl.x + bl.x) * 0.5, y: (tl.y + bl.y) * 0.5 };
      const rightMid = { x: (tr.x + br.x) * 0.5, y: (tr.y + br.y) * 0.5 };
      const laneWidth = Math.hypot(rightMid.x - leftMid.x, rightMid.y - leftMid.y);
      const laneHeight = Math.max(
        Math.hypot(bl.x - tl.x, bl.y - tl.y),
        Math.hypot(br.x - tr.x, br.y - tr.y)
      );
      const depth = Math.max(30, Math.min(84, laneWidth * 0.22));
      const inset = Math.max(0.045, Math.min(0.14, 26 / Math.max(1, laneWidth)));
      const cornerSpan = clamp01(Math.max(0.20, Math.min(0.40, 88 / Math.max(1, laneHeight))));

      const leftInnerTop = {
        x: lerp(tl.x, tr.x, inset),
        y: lerp(tl.y, tr.y, inset)
      };
      const leftInnerBottom = {
        x: lerp(bl.x, br.x, inset),
        y: lerp(bl.y, br.y, inset)
      };
      const rightInnerTop = {
        x: lerp(tr.x, tl.x, inset),
        y: lerp(tr.y, tl.y, inset)
      };
      const rightInnerBottom = {
        x: lerp(br.x, bl.x, inset),
        y: lerp(br.y, bl.y, inset)
      };

      const leftTopOuter = {
        x: lerp(tl.x, bl.x, cornerSpan),
        y: lerp(tl.y, bl.y, cornerSpan)
      };
      const leftBottomOuter = {
        x: lerp(bl.x, tl.x, cornerSpan),
        y: lerp(bl.y, tl.y, cornerSpan)
      };
      const rightTopOuter = {
        x: lerp(tr.x, br.x, cornerSpan),
        y: lerp(tr.y, br.y, cornerSpan)
      };
      const rightBottomOuter = {
        x: lerp(br.x, tr.x, cornerSpan),
        y: lerp(br.y, tr.y, cornerSpan)
      };

      const layers = [
        { width: Math.max(18, depth * 0.28), color: haloColor, alpha: (0.075 + pulse * 0.020) * laneAlpha },
        { width: Math.max(10, depth * 0.15), color: midColor, alpha: (0.16 + pulse * 0.030) * laneAlpha },
        { width: Math.max(5, depth * 0.075), color: coreColor, alpha: (0.34 + pulse * 0.06) * laneAlpha }
      ];
      const spineLayers = [
        { width: Math.max(8, depth * 0.11), color: haloColor, alpha: (0.050 + pulse * 0.014) * laneAlpha },
        { width: Math.max(3, depth * 0.045), color: midColor, alpha: (0.12 + pulse * 0.020) * laneAlpha }
      ];

      layers.forEach((layer) => {
        graphics.lineStyle(layer.width, layer.color, layer.alpha, 0.5);
        graphics.moveTo(leftTopOuter.x, leftTopOuter.y);
        graphics.lineTo(tl.x, tl.y);
        graphics.lineTo(leftInnerTop.x, leftInnerTop.y);

        graphics.moveTo(leftBottomOuter.x, leftBottomOuter.y);
        graphics.lineTo(bl.x, bl.y);
        graphics.lineTo(leftInnerBottom.x, leftInnerBottom.y);

        graphics.moveTo(rightTopOuter.x, rightTopOuter.y);
        graphics.lineTo(tr.x, tr.y);
        graphics.lineTo(rightInnerTop.x, rightInnerTop.y);

        graphics.moveTo(rightBottomOuter.x, rightBottomOuter.y);
        graphics.lineTo(br.x, br.y);
        graphics.lineTo(rightInnerBottom.x, rightInnerBottom.y);
      });
      spineLayers.forEach((layer) => {
        graphics.lineStyle(layer.width, layer.color, layer.alpha, 0.5);
        graphics.moveTo(leftInnerTop.x, leftInnerTop.y);
        graphics.lineTo(leftInnerBottom.x, leftInnerBottom.y);
        graphics.moveTo(rightInnerTop.x, rightInnerTop.y);
        graphics.lineTo(rightInnerBottom.x, rightInnerBottom.y);
      });
      graphics.lineStyle(0);
    });
  }

  function drawOverviewSpotlightRects(graphics, rects) {
    rects.forEach((rect) => {
      const color = rect.color || 0xffffff;
      graphics.beginFill(color, 0.04);
      const radius = Number(rect.radius) || 0;
      if (radius > 0) {
        graphics.drawRoundedRect(rect.x, rect.y, rect.w, rect.h, radius);
      } else {
        graphics.drawRect(rect.x, rect.y, rect.w, rect.h);
      }
      graphics.endFill();
    });
  }

  function clearOverviewLaneHighlights() {
    overviewHighlightDimMask.clear();
    overviewHighlightBlurMask.clear();
    overviewHighlightDecorGraphics.clear();
    overviewHighlightTransitionState.laneAlpha.clear();
    overviewHighlightTransitionState.lastUpdateMs = 0;
    overviewHighlightFxLayer.visible = false;
    overviewHighlightFxLayer.renderable = false;
    overviewHighlightDecorLayer.visible = false;
    overviewHighlightDecorLayer.renderable = false;
    if (overviewHighlightBlurSprite) {
      overviewHighlightBlurSprite.visible = false;
      overviewHighlightBlurSprite.renderable = false;
    }
  }

  function renderOverviewLaneHighlights(athleteScreenPositions, now) {
    if (uiState.viewMode !== 'overview' || overviewHighlightedLaneIds.size === 0) {
      clearOverviewLaneHighlights();
      return;
    }

    const laneQuads = getOverviewSelectedLaneQuads();
    if (!laneQuads.length) {
      clearOverviewLaneHighlights();
      return;
    }

    const style = resolveOverviewHighlightStyle();
    const effectiveStyle = style;
    const spotlightRects = (effectiveStyle === 'spotlight')
      ? getOverviewSpotlightRects(athleteScreenPositions, laneQuads)
      : [];
    const laneAlphaMap = resolveOverviewHighlightLaneAlphaMap(
      laneQuads.map((q) => q.laneId),
      now
    );
    const transitionedLaneQuads = buildOverviewTransitionedHoles(laneQuads, laneAlphaMap);
    const spotlightShapes = spotlightRects.length ? spotlightRects : laneQuads;
    const transitionedSpotlightShapes = buildOverviewTransitionedHoles(spotlightShapes, laneAlphaMap);

    overviewHighlightFxLayer.visible = true;
    overviewHighlightFxLayer.renderable = true;
    overviewHighlightDecorLayer.visible = true;
    overviewHighlightDecorLayer.renderable = true;
    overviewHighlightDecorGraphics.clear();
    overviewHighlightDecorGraphics.blendMode = PIXI.BLEND_MODES.NORMAL;

    if (effectiveStyle === 'blur' && overviewHighlightBlurSprite && overviewHighlightBlurSupported) {
      drawInverseOverlayMask(overviewHighlightBlurMask, transitionedLaneQuads, 0xffffff, 1);
      overviewHighlightBlurSprite.visible = true;
      overviewHighlightBlurSprite.renderable = true;
      overviewHighlightBlurSprite.mask = overviewHighlightBlurMask;
      drawInverseOverlayMask(overviewHighlightDimMask, transitionedLaneQuads, 0x000000, 0.08);
      drawOverviewLaneQuadHighlights(overviewHighlightDecorGraphics, laneQuads, {
        fillAlpha: 0.02,
        alphaByLane: laneAlphaMap
      });
      return;
    }

    if (overviewHighlightBlurSprite) {
      overviewHighlightBlurSprite.visible = false;
      overviewHighlightBlurSprite.renderable = false;
    }
    overviewHighlightBlurMask.clear();

    if (effectiveStyle === 'standard') {
      drawInverseOverlayMask(overviewHighlightDimMask, transitionedLaneQuads, 0x000000, 0.42);
      drawOverviewLaneQuadHighlights(overviewHighlightDecorGraphics, laneQuads, {
        fillAlpha: 0.05,
        alphaByLane: laneAlphaMap
      });
      return;
    }

    if (effectiveStyle === 'edgebracket') {
      overviewHighlightDecorGraphics.blendMode = PIXI.BLEND_MODES.SCREEN;
      drawInverseOverlayMask(overviewHighlightDimMask, transitionedLaneQuads, 0x000000, 0.18);
      drawOverviewEdgeBrackets(overviewHighlightDecorGraphics, transitionedLaneQuads, laneAlphaMap, now);
      return;
    }

    drawInverseOverlayMask(overviewHighlightDimMask, transitionedSpotlightShapes, 0x000000, 0.50);
  }

  function comparisonHasSelection() {
    return comparisonSelectedLaneIds.size > 0;
  }

  function comparisonUsesRankSelection() {
    return normalizeComparisonSelectionMode(comparisonState.selectionMode) === 'rank';
  }

  function getComparisonOrderedSelectedValues() {
    ensureComparisonLaneOrder();
    return comparisonLaneDisplayOrder.filter((id) => comparisonSelectedLaneIds.has(id));
  }

  function resolveComparisonSelectionValueForLaneId(laneId, athletes = null) {
    const id = Number(laneId);
    if (!Number.isFinite(id)) return null;
    if (!comparisonUsesRankSelection()) return id;
    const targetAthlete = findAthleteInFrameByLaneId(Array.isArray(athletes) ? athletes : getCurrentComparisonFrameAthletes(), id);
    return getAthleteRankValue(targetAthlete);
  }

  function resolveComparisonLaneIdFromSelectionValue(selectionValue, athletes = null) {
    const value = Number(selectionValue);
    if (!Number.isFinite(value)) return null;
    if (!comparisonUsesRankSelection()) return value;
    const targetAthlete = findAthleteInFrameByRank(Array.isArray(athletes) ? athletes : getCurrentComparisonFrameAthletes(), value);
    const laneId = Number(targetAthlete?.id);
    return Number.isFinite(laneId) ? laneId : null;
  }

  function getComparisonSelectionChipLabel(selectionValue) {
    const value = Number(selectionValue);
    if (!Number.isFinite(value)) return '';
    return comparisonUsesRankSelection() ? `#${value}` : String(value);
  }

  function getComparisonSelectionChipTitle(selectionValue) {
    const value = Number(selectionValue);
    if (!Number.isFinite(value)) return '';
    return comparisonUsesRankSelection()
      ? `Toggle Rank ${value} in comparison`
      : `Toggle Lane ${value} in comparison`;
  }

  function syncComparisonSelectionModeControl() {
    if (!comparisonSelectionModeInput) return;
    comparisonSelectionModeInput.value = normalizeComparisonSelectionMode(comparisonState.selectionMode);
  }

  function getChartFrameTimeSec(frame) {
    if (!frame) return null;
    if (typeof frame.elapsed_time_sec === 'number' && Number.isFinite(frame.elapsed_time_sec)) return frame.elapsed_time_sec;
    if (typeof frame.time_sec === 'number' && Number.isFinite(frame.time_sec)) return frame.time_sec;
    if (typeof frame.frame === 'number' && Number.isFinite(frame.frame)) {
      const fps = overlay?.fps || 50;
      return frame.frame / fps;
    }
    return null;
  }

  const COMPARISON_HISTORY_METRIC_ORDER = [
    'currentSpeed',
    'avgSpeed',
    'speedDiffSwimmer',
    'timeDiffSwimmer',
    'acceleration',
    'remainingDistance',
    'distanceDiffLeader',
    'positionDiffSwimmer',
    'timeDiffRecord',
    'speedDiffRecord',
    'positionDiffRecord',
    'estCompletion',
    'rank',
    'distanceSwam'
  ];

  const COMPARISON_HISTORY_METRIC_DEFS = {
    currentSpeed: { label: 'Current Speed', unit: 'm/s', decimals: 2, invertY: false },
    avgSpeed: { label: 'Average Speed', unit: 'm/s', decimals: 2, invertY: false },
    speedDiffSwimmer: { label: 'Speed Diff to Swimmer', unit: 'm/s', decimals: 2, invertY: false },
    timeDiffSwimmer: { label: 'Time Diff to Swimmer', unit: 's', decimals: 2, invertY: false },
    acceleration: { label: 'Acceleration', unit: 'm/s²', decimals: 2, invertY: false },
    remainingDistance: { label: 'Remaining Distance', unit: 'm', decimals: 1, invertY: false },
    distanceDiffLeader: { label: 'Distance Diff to Leader', unit: 'm', decimals: 2, invertY: false },
    positionDiffSwimmer: { label: 'Position Diff to Swimmer', unit: 'm', decimals: 2, invertY: false },
    timeDiffRecord: { label: 'Time Diff to Record', unit: 's', decimals: 2, invertY: false },
    speedDiffRecord: { label: 'Speed Diff to Record', unit: 'm/s', decimals: 2, invertY: false },
    positionDiffRecord: { label: 'Position Diff to Record', unit: 'm', decimals: 2, invertY: false },
    estCompletion: { label: 'Estimated Completion Time', unit: 'time', decimals: 2, invertY: false },
    rank: { label: 'Rank', unit: '', decimals: 0, invertY: true },
    distanceSwam: { label: 'Distance Swam', unit: 'm', decimals: 1, invertY: false }
  };

  function isSignedHistoryMetric(metricId) {
    return (
      metricId === 'acceleration' ||
      metricId === 'speedDiffSwimmer' ||
      metricId === 'positionDiffSwimmer' ||
      metricId === 'timeDiffSwimmer' ||
      metricId === 'timeDiffRecord' ||
      metricId === 'speedDiffRecord' ||
      metricId === 'positionDiffRecord'
    );
  }

  function getCurrentSpeedValueForChart(athlete) {
    if (!athlete || typeof athlete !== 'object') return null;
    if (typeof athlete.speed_smooth === 'number' && Number.isFinite(athlete.speed_smooth)) return athlete.speed_smooth;
    if (typeof athlete.speed_mps === 'number' && Number.isFinite(athlete.speed_mps)) return athlete.speed_mps;
    if (typeof athlete.speed === 'number' && Number.isFinite(athlete.speed)) return athlete.speed;
    if (typeof athlete.speed_px_per_s === 'number' && Number.isFinite(athlete.speed_px_per_s)) return athlete.speed_px_per_s;
    return null;
  }

  function getWindowedMovingAverageValue(sampleCache, key, rawValue, frameTimeSec, windowSec) {
    if (!(sampleCache instanceof Map) || key == null || !Number.isFinite(rawValue)) return rawValue;
    const timeSec = Number(frameTimeSec);
    const normalizedWindowSec = normalizeMovingAverageSec(windowSec, 0);
    if (!(normalizedWindowSec > 0) || !Number.isFinite(timeSec)) return rawValue;
    const prev = sampleCache.get(key);
    const resetGapSec = Math.max(1.25, normalizedWindowSec * 2);
    const shouldReset = (
      !prev
      || !Number.isFinite(prev.t)
      || !Array.isArray(prev.samples)
      || timeSec < prev.t
      || (timeSec - prev.t) > resetGapSec
    );
    const minTime = timeSec - normalizedWindowSec - 1e-6;
    const samples = shouldReset
      ? []
      : prev.samples.filter((sample) => (
        Number.isFinite(sample?.t)
        && Number.isFinite(sample?.v)
        && sample.t >= minTime
      ));
    const lastSample = samples[samples.length - 1];
    if (lastSample && Math.abs(lastSample.t - timeSec) < 1e-6) {
      lastSample.v = rawValue;
    } else {
      samples.push({ t: timeSec, v: rawValue });
    }
    const average = samples.reduce((sum, sample) => sum + sample.v, 0) / Math.max(1, samples.length);
    sampleCache.set(key, { t: timeSec, samples });
    return average;
  }

  function getSmoothedChartSpeedValue(athlete, laneId, frameTimeSec, sampleCache, movingAverageSec = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const rawSpeed = getCurrentSpeedValueForChart(athlete);
    if (!Number.isFinite(rawSpeed)) return null;
    if (!(sampleCache instanceof Map) || !Number.isFinite(laneId)) return rawSpeed;
    return getWindowedMovingAverageValue(sampleCache, laneId, rawSpeed, frameTimeSec, movingAverageSec);
  }

  function formatHistoryMetricAxisLabel(metricId, value) {
    if (!Number.isFinite(value)) return '--';
    if (metricId === 'estCompletion') {
      if (value >= 10) return formatClockLabel(value);
      return `${value.toFixed(1)}s`;
    }
    if (metricId === 'rank') return `#${Math.round(value)}`;
    const def = COMPARISON_HISTORY_METRIC_DEFS[metricId] || { decimals: 1 };
    return Number(value).toFixed(def.decimals ?? 1);
  }

  function isComparisonHistoryMetricSelected(typeId) {
    return [...elements.values()].some((el) => el?.typeId === typeId);
  }

  function getComparisonActiveHistoryMetricIds() {
    return COMPARISON_HISTORY_METRIC_ORDER.filter((id) => isComparisonHistoryMetricSelected(id));
  }

  function pushHistoryMetricPoint(metricStore, laneId, t, v) {
    if (!metricStore || !Number.isFinite(laneId) || !Number.isFinite(t) || !Number.isFinite(v)) return;
    if (!metricStore.byLane.has(laneId)) metricStore.byLane.set(laneId, []);
    metricStore.byLane.get(laneId).push({ t, v });
    if (v < metricStore.minV) metricStore.minV = v;
    if (v > metricStore.maxV) metricStore.maxV = v;
  }

  function pushHistoryMetricPointIfValid(metrics, metricId, laneId, t, v) {
    if (isMetricVisualizationSuppressedAtTime(metricId, t, { timeBasis: 'elapsed' })) return;
    pushHistoryMetricPoint(metrics.get(metricId), laneId, t, v);
  }

  function drawMetricValidityBandsOnChart(ctx, metricId, plotX, plotY, plotW, plotH, durationSec) {
    const windows = getMetricValidityWindowsForType(metricId, 'elapsed');
    if (!windows.length || !(plotW > 0) || !(plotH > 0) || !(durationSec > 0)) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();
    windows.forEach((window) => {
      const x0 = plotX + (Math.max(0, Math.min(durationSec, window.start)) / durationSec) * plotW;
      const x1 = plotX + (Math.max(0, Math.min(durationSec, window.end)) / durationSec) * plotW;
      const bandW = Math.max(0, x1 - x0);
      if (!(bandW > 0.5)) return;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.10)';
      ctx.fillRect(x0, plotY, bandW, plotH);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x0 + 0.5, plotY);
      ctx.lineTo(x0 + 0.5, plotY + plotH);
      ctx.moveTo(x1 - 0.5, plotY);
      ctx.lineTo(x1 - 0.5, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  function ensureComparisonHistorySeriesCache() {
    if (comparisonHistorySeriesCache) return comparisonHistorySeriesCache;
    const metrics = new Map(
      COMPARISON_HISTORY_METRIC_ORDER.map((id) => [
        id,
        { byLane: new Map(), minV: Infinity, maxV: -Infinity }
      ])
    );
    let minT = Infinity;
    let maxT = 0;
    const frameTimes = [];
    const prevSpeedSampleByLane = new Map();
    const currentSpeedMovingAverageSec = getMetricSmoothingWindowSec('currentSpeed', LIVE_DATA_UPDATE_INTERVAL_SEC);
    const raceLen = getOverlayRaceLength();
    const frames = overlay?.frames || [];
    const metricTargetSettings = {
      speedDiffSwimmer: getMetricTargetLayerState('speedDiffSwimmer'),
      timeDiffSwimmer: getMetricTargetLayerState('timeDiffSwimmer'),
      positionDiffSwimmer: getMetricTargetLayerState('positionDiffSwimmer'),
      timeDiffRecord: getMetricTargetLayerState('timeDiffRecord'),
      speedDiffRecord: getMetricTargetLayerState('speedDiffRecord'),
      positionDiffRecord: getMetricTargetLayerState('positionDiffRecord')
    };
    const prevDisplaySpeedByLane = new Map();
    frames.forEach((frame) => {
      const t = getChartFrameTimeSec(frame);
      if (!Number.isFinite(t)) return;
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
      frameTimes.push(t);
      const arr = frame.athletes || frame.lanes || [];
      let leaderDistance = null;
      arr.forEach((a) => {
        const dist = typeof a?.distance === 'number' && Number.isFinite(a.distance) ? a.distance : null;
        if (dist == null) return;
        leaderDistance = leaderDistance == null ? dist : Math.max(leaderDistance, dist);
      });
      const aheadById = buildAheadSwimmerById(arr);
      arr.forEach((a) => {
        const laneId = Number(a?.id);
        if (!Number.isFinite(laneId)) return;

        const currentSpeed = getSmoothedChartSpeedValue(
          a,
          laneId,
          t,
          prevDisplaySpeedByLane,
          currentSpeedMovingAverageSec
        );
        const rank = (typeof a?.rank === 'number' && Number.isFinite(a.rank)) ? a.rank : null;
        const dist = typeof a?.distance === 'number' && Number.isFinite(a.distance) ? a.distance : null;
        const avgSpeed = (typeof a?.average_speed === 'number' && Number.isFinite(a.average_speed))
          ? a.average_speed
          : ((dist != null && t > 0) ? (dist / t) : currentSpeed);
        const remainingDistance = dist != null ? Math.max(0, raceLen - dist) : null;

        let acceleration = (typeof a?.acceleration === 'number' && Number.isFinite(a.acceleration))
          ? a.acceleration
          : null;
        if (acceleration == null && Number.isFinite(currentSpeed)) {
          const prev = prevSpeedSampleByLane.get(laneId);
          if (prev && Number.isFinite(prev.t) && Number.isFinite(prev.v)) {
            const dt = t - prev.t;
            if (dt > 1e-4) acceleration = (currentSpeed - prev.v) / dt;
          }
          prevSpeedSampleByLane.set(laneId, { t, v: currentSpeed });
        }

        const diffLeader = (leaderDistance != null && dist != null) ? (leaderDistance - dist) : null;
        const speedDiffSwimmer = computeSwimmerComparisonMetricValue(
          'speedDiffSwimmer',
          a,
          arr,
          t,
          metricTargetSettings.speedDiffSwimmer?.compareTargetLaneId ?? 0,
          metricTargetSettings.speedDiffSwimmer?.compareTargetBinding ?? 'auto',
          metricTargetSettings.speedDiffSwimmer?.compareTargetRank ?? 0
        );
        const positionDiffSwimmer = computeSwimmerComparisonMetricValue(
          'positionDiffSwimmer',
          a,
          arr,
          t,
          metricTargetSettings.positionDiffSwimmer?.compareTargetLaneId ?? 0,
          metricTargetSettings.positionDiffSwimmer?.compareTargetBinding ?? 'auto',
          metricTargetSettings.positionDiffSwimmer?.compareTargetRank ?? 0
        );
        const timeDiffSwimmer = computeSwimmerComparisonMetricValue(
          'timeDiffSwimmer',
          a,
          arr,
          t,
          metricTargetSettings.timeDiffSwimmer?.compareTargetLaneId ?? 0,
          metricTargetSettings.timeDiffSwimmer?.compareTargetBinding ?? 'auto',
          metricTargetSettings.timeDiffSwimmer?.compareTargetRank ?? 0
        );
        const speedDiffRecord = computeRecordComparisonMetricValue(
          'speedDiffRecord',
          a,
          t,
          metricTargetSettings.speedDiffRecord?.compareRecordType ?? 'world'
        );
        const positionDiffRecord = computeRecordComparisonMetricValue(
          'positionDiffRecord',
          a,
          t,
          metricTargetSettings.positionDiffRecord?.compareRecordType ?? 'world'
        );
        const timeDiffRecord = computeRecordComparisonMetricValue(
          'timeDiffRecord',
          a,
          t,
          metricTargetSettings.timeDiffRecord?.compareRecordType ?? 'world'
        );
        const estCompletion = (typeof a?.estimated_completion_time === 'number' && Number.isFinite(a.estimated_completion_time))
          ? a.estimated_completion_time
          : ((Number.isFinite(avgSpeed) && avgSpeed > 1e-6) ? (raceLen / avgSpeed) : null);

        pushHistoryMetricPointIfValid(metrics, 'currentSpeed', laneId, t, currentSpeed);
        pushHistoryMetricPointIfValid(metrics, 'avgSpeed', laneId, t, avgSpeed);
        pushHistoryMetricPointIfValid(metrics, 'speedDiffSwimmer', laneId, t, speedDiffSwimmer);
        pushHistoryMetricPointIfValid(metrics, 'timeDiffSwimmer', laneId, t, timeDiffSwimmer);
        pushHistoryMetricPointIfValid(metrics, 'acceleration', laneId, t, acceleration);
        pushHistoryMetricPointIfValid(metrics, 'remainingDistance', laneId, t, remainingDistance);
        pushHistoryMetricPointIfValid(metrics, 'distanceDiffLeader', laneId, t, diffLeader);
        pushHistoryMetricPointIfValid(metrics, 'positionDiffSwimmer', laneId, t, positionDiffSwimmer);
        pushHistoryMetricPointIfValid(metrics, 'timeDiffRecord', laneId, t, timeDiffRecord);
        pushHistoryMetricPointIfValid(metrics, 'speedDiffRecord', laneId, t, speedDiffRecord);
        pushHistoryMetricPointIfValid(metrics, 'positionDiffRecord', laneId, t, positionDiffRecord);
        pushHistoryMetricPointIfValid(metrics, 'estCompletion', laneId, t, estCompletion);
        pushHistoryMetricPointIfValid(metrics, 'rank', laneId, t, rank);
        pushHistoryMetricPointIfValid(metrics, 'distanceSwam', laneId, t, dist);
      });
    });

    metrics.forEach((metricStore) => {
      metricStore.byLane.forEach((series, laneId) => {
        series.sort((a, b) => a.t - b.t);
        const deduped = [];
        for (const p of series) {
          const last = deduped[deduped.length - 1];
          if (last && Math.abs(last.t - p.t) < 1e-6) {
            last.v = p.v;
            continue;
          }
          deduped.push(p);
        }
        metricStore.byLane.set(laneId, deduped);
      });
      if (!Number.isFinite(metricStore.minV) || !Number.isFinite(metricStore.maxV)) {
        metricStore.minV = 0;
        metricStore.maxV = 1;
      }
    });

    let frameDtMedian = 1 / (overlay?.fps || 50);
    if (frameTimes.length > 2) {
      const diffs = [];
      for (let i = 1; i < frameTimes.length; i += 1) {
        const dt = frameTimes[i] - frameTimes[i - 1];
        if (Number.isFinite(dt) && dt > 1e-4) diffs.push(dt);
      }
      if (diffs.length) {
        diffs.sort((a, b) => a - b);
        frameDtMedian = diffs[Math.floor(diffs.length / 2)] || frameDtMedian;
      }
    }

    comparisonHistorySeriesCache = {
      metrics,
      minT: Number.isFinite(minT) ? minT : 0,
      maxT: Number.isFinite(maxT) && maxT > 0 ? maxT : 1,
      frameDtMedian: frameDtMedian > 0 ? frameDtMedian : (1 / (overlay?.fps || 50))
    };
    return comparisonHistorySeriesCache;
  }

  function sanitizeExportMetricIds(rawMetricIds) {
    const valid = new Set(COMPARISON_HISTORY_METRIC_ORDER);
    const ids = Array.isArray(rawMetricIds)
      ? rawMetricIds.map((id) => String(id)).filter((id) => valid.has(id))
      : [];
    if (ids.length) return ids;
    const selected = getExportDefaultMetricIds();
    if (selected.length) return selected;
    return COMPARISON_HISTORY_METRIC_ORDER.slice();
  }

  function getExportDefaultMetricIds() {
    const selected = getComparisonActiveHistoryMetricIds();
    if (selected.length) return selected;
    return COMPARISON_HISTORY_METRIC_ORDER.slice();
  }

  function collectComparisonTimelineLaneIds() {
    const laneMax = Math.max(1, Number(laneCountGlobal || 8));
    const valid = new Set(Array.from({ length: laneMax }, (_, i) => i + 1));
    const selected = new Set();
    let hasRankBinding = comparisonUsesRankSelection();
    const pushLaneIds = (laneIds) => {
      (Array.isArray(laneIds) ? laneIds : []).forEach((laneId) => {
        const normalized = Number(laneId);
        if (valid.has(normalized)) selected.add(normalized);
      });
    };

    if (!hasRankBinding) {
      pushLaneIds(Array.from(comparisonSelectedLaneIds));
    }
    (viewModeTimelineState?.segments || []).forEach((segment) => {
      if (normalizeComparisonSelectionMode(segment?.snapshot?.comparison?.selectionMode) === 'rank') {
        hasRankBinding = true;
      } else {
        pushLaneIds(segment?.snapshot?.comparison?.selectedLaneIds);
      }
    });
    const draftSnapshot = viewModeTimelineState?.draft?.snapshot;
    if (draftSnapshot) {
      if (normalizeComparisonSelectionMode(draftSnapshot?.comparison?.selectionMode) === 'rank') {
        hasRankBinding = true;
      } else {
        pushLaneIds(draftSnapshot?.comparison?.selectedLaneIds);
      }
    }

    if (hasRankBinding) return Array.from(valid);
    return Array.from(selected).sort((a, b) => a - b);
  }

  function collectComparisonTargetLaneIds() {
    const laneMax = Math.max(1, Number(laneCountGlobal || 8));
    const valid = new Set(Array.from({ length: laneMax }, (_, i) => i + 1));
    const selected = new Set();
    let hasRankBinding = false;
    const pushLaneId = (laneId) => {
      const normalized = normalizeCompareTargetLaneId(laneId);
      if (valid.has(normalized)) selected.add(normalized);
    };

    elements.forEach((el) => {
      if (!TARGET_SWIMMER_METRIC_TYPES.has(String(el?.typeId || ''))) return;
      if (resolveCompareTargetBindingConfig(el?.compareTargetBinding ?? 'auto', el?.compareTargetLaneId ?? 0, el?.compareTargetRank ?? 0) === 'rank') {
        hasRankBinding = true;
      } else {
        pushLaneId(el?.compareTargetLaneId ?? 0);
      }
      getElementIntervalList(el).forEach((interval) => {
        if (resolveCompareTargetBindingConfig(
          interval?.settings?.compareTargetBinding ?? 'auto',
          interval?.settings?.compareTargetLaneId ?? 0,
          interval?.settings?.compareTargetRank ?? 0
        ) === 'rank') {
          hasRankBinding = true;
        } else {
          pushLaneId(interval?.settings?.compareTargetLaneId ?? 0);
        }
      });
    });

    if (hasRankBinding) return Array.from(valid);
    return Array.from(selected).sort((a, b) => a - b);
  }

  function getExportDefaultLaneIds() {
    const laneMax = Math.max(1, Number(laneCountGlobal || 8));
    const selected = new Set([
      ...collectComparisonTimelineLaneIds(),
      ...collectComparisonTargetLaneIds()
    ]);
    const ids = Array.from(selected)
      .map((laneId) => Number(laneId))
      .filter((laneId) => Number.isFinite(laneId) && laneId >= 1 && laneId <= laneMax)
      .sort((a, b) => a - b);
    if (ids.length) return ids;
    return Array.from({ length: laneMax }, (_, i) => i + 1);
  }

  function sanitizeExportLaneIds(rawLaneIds) {
    const laneMax = Math.max(1, Number(laneCountGlobal || 8));
    const valid = new Set(Array.from({ length: laneMax }, (_, i) => i + 1));
    const ids = Array.isArray(rawLaneIds)
      ? rawLaneIds.map((id) => Number(id)).filter((id) => valid.has(id))
      : [];
    if (ids.length) return ids;
    const selected = getExportDefaultLaneIds().filter((id) => valid.has(id));
    if (selected.length) return selected.sort((a, b) => a - b);
    return Array.from(valid).sort((a, b) => a - b);
  }

  function getExportCaptureOptions() {
    const outputMode = (exportSettingsState.outputMode === EXPORT_OUTPUT_MODE.metrics
      || exportSettingsState.outputMode === EXPORT_OUTPUT_MODE.composite
      || exportSettingsState.outputMode === EXPORT_OUTPUT_MODE.preset)
      ? exportSettingsState.outputMode
      : EXPORT_OUTPUT_MODE.video;
    const metricIds = sanitizeExportMetricIds(Array.from(exportSettingsState.metricIds));
    const laneIds = sanitizeExportLaneIds(Array.from(exportSettingsState.laneIds));
    return { outputMode, metricIds, laneIds };
  }

  function seedExportSettingsDefaults({ force = false } = {}) {
    const metricDefaults = force
      ? getExportDefaultMetricIds()
      : sanitizeExportMetricIds(Array.from(exportSettingsState.metricIds));
    const laneDefaults = force
      ? getExportDefaultLaneIds()
      : sanitizeExportLaneIds(Array.from(exportSettingsState.laneIds));
    if (force || !exportSettingsState.metricIds.size) {
      exportSettingsState.metricIds = new Set(metricDefaults);
    } else {
      exportSettingsState.metricIds = new Set(sanitizeExportMetricIds(Array.from(exportSettingsState.metricIds)));
    }
    if (force || !exportSettingsState.laneIds.size) {
      exportSettingsState.laneIds = new Set(laneDefaults);
    } else {
      exportSettingsState.laneIds = new Set(sanitizeExportLaneIds(Array.from(exportSettingsState.laneIds)));
    }
  }

  function setExportSettingsPanelOpen(nextOpen) {
    exportSettingsState.panelOpen = !!nextOpen;
    if (exportSettingsPopoverEl) {
      exportSettingsPopoverEl.classList.toggle('is-open', exportSettingsState.panelOpen);
      exportSettingsPopoverEl.setAttribute('aria-hidden', exportSettingsState.panelOpen ? 'false' : 'true');
    }
    if (btnExportSettingsToggle) {
      btnExportSettingsToggle.setAttribute('aria-expanded', exportSettingsState.panelOpen ? 'true' : 'false');
    }
  }

  function renderExportSettingsPanel() {
    seedExportSettingsDefaults();
    const isPresetMode = exportSettingsState.outputMode === EXPORT_OUTPUT_MODE.preset;

    exportModeInputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.checked = input.value === exportSettingsState.outputMode;
    });

    if (exportMetricsSectionEl) {
      exportMetricsSectionEl.style.display = isPresetMode ? 'none' : '';
    }
    if (exportLanesSectionEl) {
      exportLanesSectionEl.style.display = isPresetMode ? 'none' : '';
    }

    if (exportMetricsOptionsEl) {
      exportMetricsOptionsEl.innerHTML = '';
      COMPARISON_HISTORY_METRIC_ORDER.forEach((metricId) => {
        const def = COMPARISON_HISTORY_METRIC_DEFS[metricId] || { label: metricId };
        const label = document.createElement('label');
        label.className = 'export-check-item';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = exportSettingsState.metricIds.has(metricId);
        input.addEventListener('change', () => {
          if (input.checked) {
            exportSettingsState.metricIds.add(metricId);
          } else {
            exportSettingsState.metricIds.delete(metricId);
            if (!exportSettingsState.metricIds.size) {
              exportSettingsState.metricIds.add(metricId);
              input.checked = true;
            }
          }
        });
        const text = document.createElement('span');
        text.textContent = def.label || metricId;
        label.appendChild(input);
        label.appendChild(text);
        exportMetricsOptionsEl.appendChild(label);
      });
    }

    if (exportLanesOptionsEl) {
      exportLanesOptionsEl.innerHTML = '';
      const laneMax = Math.max(1, Number(laneCountGlobal || 8));
      for (let laneId = 1; laneId <= laneMax; laneId += 1) {
        const label = document.createElement('label');
        label.className = 'export-check-item';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = exportSettingsState.laneIds.has(laneId);
        input.addEventListener('change', () => {
          if (input.checked) {
            exportSettingsState.laneIds.add(laneId);
          } else {
            exportSettingsState.laneIds.delete(laneId);
            if (!exportSettingsState.laneIds.size) {
              exportSettingsState.laneIds.add(laneId);
              input.checked = true;
            }
          }
        });
        const text = document.createElement('span');
        text.textContent = `Lane ${laneId}`;
        label.appendChild(input);
        label.appendChild(text);
        exportLanesOptionsEl.appendChild(label);
      }
    }

    if (btnExportRender) {
      btnExportRender.title = isPresetMode
        ? 'Export current layers, View Mode, and Speed timeline as preset JSON'
        : 'Export current playback view as video';
    }
    if (btnExportRenderLabel && !exportRenderState.active) {
      btnExportRenderLabel.textContent = isPresetMode ? 'Export JSON' : 'Export';
    }
  }

  function buildExportMetricsLayout(outputMode, metricCount, videoW, videoH) {
    const rowsPerColumn = 5;
    const safeMetricCount = Math.max(1, Number(metricCount) || 1);
    const cols = Math.max(1, Math.ceil(safeMetricCount / rowsPerColumn));
    if (outputMode === EXPORT_OUTPUT_MODE.composite) {
      const panelHeight = Math.max(1, Number(videoH) / rowsPerColumn);
      const panelWidth = Math.max(220, Math.round(panelHeight * 2.35));
      return {
        rowsPerColumn,
        cols,
        panelWidth,
        panelHeight,
        panelGapX: 0,
        panelGapY: 0,
        width: panelWidth * cols,
        height: Number(videoH)
      };
    }
    const baseH = Math.max(720, Number(videoH) || 1080);
    const panelHeight = Math.max(120, Math.round(baseH / rowsPerColumn));
    const panelWidth = Math.max(260, Math.round(panelHeight * 2.55));
    return {
      rowsPerColumn,
      cols,
      panelWidth,
      panelHeight,
      panelGapX: 0,
      panelGapY: 0,
      width: panelWidth * cols,
      height: panelHeight * rowsPerColumn
    };
  }

  function drawExportHistoryMetricsPanels(targetCanvas, currentTimeSec = 0, opts = {}) {
    if (!targetCanvas) return false;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return false;

    const metricIds = sanitizeExportMetricIds(opts.metricIds);
    const laneIds = sanitizeExportLaneIds(opts.laneIds);
    const layout = opts.layout || buildExportMetricsLayout(EXPORT_OUTPUT_MODE.metrics, metricIds.length, app.renderer?.width || 1280, app.renderer?.height || 720);

    const drawW = Math.max(1, Math.round(layout.width || 1));
    const drawH = Math.max(1, Math.round(layout.height || 1));
    if (targetCanvas.width !== drawW || targetCanvas.height !== drawH) {
      targetCanvas.width = drawW;
      targetCanvas.height = drawH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, drawW, drawH);
    ctx.fillStyle = COMPARISON_HISTORY_THEME.canvasBg;
    ctx.fillRect(0, 0, drawW, drawH);

    if (!metricIds.length || !laneIds.length) {
      ctx.fillStyle = COMPARISON_HISTORY_THEME.noSelectionText;
      ctx.font = '500 15px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No metric/lane selected', drawW / 2, drawH / 2);
      return false;
    }

    const cache = ensureComparisonHistorySeriesCache();
    const durationSec = Math.max(1, videoDuration || cache.maxT || 1);
    const tNowRaw = Math.max(0, Math.min(durationSec, Number(currentTimeSec) || 0));
    const gapThresholdSec = Math.max(0.18, (cache.frameDtMedian || (1 / (overlay?.fps || 50))) * 4.5);

    metricIds.forEach((metricId, metricIdx) => {
      const col = Math.floor(metricIdx / layout.rowsPerColumn);
      const row = metricIdx % layout.rowsPerColumn;
      const rowX = col * (layout.panelWidth + layout.panelGapX);
      const rowY = row * (layout.panelHeight + layout.panelGapY);
      const rowW = layout.panelWidth;
      const rowH = layout.panelHeight;

      const def = COMPARISON_HISTORY_METRIC_DEFS[metricId] || { label: metricId, unit: '', decimals: 1, invertY: false };
      const metricStore = cache.metrics.get(metricId);
      const metricSeries = laneIds
        .map((laneId) => ({ laneId, series: metricStore?.byLane?.get(Number(laneId)) || [] }))
        .filter((item) => item.series.length);

      ctx.fillStyle = COMPARISON_HISTORY_THEME.rowBg;
      ctx.fillRect(rowX, rowY, rowW, rowH);
      ctx.strokeStyle = COMPARISON_HISTORY_THEME.rowBorder;
      ctx.strokeRect(rowX + 0.5, rowY + 0.5, Math.max(1, rowW - 1), Math.max(1, rowH - 1));

      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = COMPARISON_HISTORY_THEME.title;
      ctx.font = '600 13px system-ui';
      ctx.fillText(def.label, rowX + 8, rowY + 6);

      const padL = Math.max(28, Math.round(rowW * 0.085));
      const padR = Math.max(10, Math.round(rowW * 0.03));
      const padT = Math.max(28, Math.round(rowH * 0.22));
      const padB = Math.max(18, Math.round(rowH * 0.16));
      const plotX = rowX + padL;
      const plotY = rowY + padT;
      const plotW = Math.max(12, rowW - padL - padR);
      const plotH = Math.max(12, rowH - padT - padB);
      const metricDisplayTimeSec = LIVE_DATA_TIMELINE_TYPES.has(metricId)
        ? resolveMetricDisplayTimeSec(metricId, tNowRaw, LIVE_DATA_UPDATE_INTERVAL_SEC)
        : tNowRaw;
      const progressX = plotX + plotW * Math.max(0, Math.min(1, metricDisplayTimeSec / durationSec));

      let yMin = Number.isFinite(metricStore?.minV) ? metricStore.minV : 0;
      let yMax = Number.isFinite(metricStore?.maxV) ? metricStore.maxV : 1;
      if (def.invertY) {
        yMin = Math.floor(yMin);
        yMax = Math.ceil(yMax);
        if (yMax <= yMin) yMax = yMin + 1;
        yMin = Math.max(0, yMin - 0.5);
        yMax = yMax + 0.5;
      } else {
        let yRange = yMax - yMin;
        if (!(yRange > 1e-4)) yRange = Math.max(0.2, Math.abs(yMax) * 0.1, 0.2);
        const yPad = Math.max(0.03, yRange * 0.16);
        if (yMin >= 0 && !isSignedHistoryMetric(metricId)) yMin = Math.max(0, yMin - yPad);
        else yMin -= yPad;
        yMax += yPad;
      }
      const ySpan = Math.max(0.1, yMax - yMin);
      const metricValueToY = (value) => {
        let yNorm = (Math.max(yMin, Math.min(yMax, value)) - yMin) / ySpan;
        if (def.invertY) yNorm = 1 - yNorm;
        return plotY + plotH - yNorm * plotH;
      };

      if (metricId === 'rank') {
        const rankOneTop = Math.max(plotY, Math.min(plotY + plotH, metricValueToY(0.5)));
        const rankOneBottom = Math.max(plotY, Math.min(plotY + plotH, metricValueToY(1.5)));
        const bandTop = Math.min(rankOneTop, rankOneBottom);
        const bandBottom = Math.max(rankOneTop, rankOneBottom);
        if (bandBottom - bandTop > 1) {
          ctx.fillStyle = COMPARISON_HISTORY_THEME.rankBandFill;
          ctx.fillRect(plotX, bandTop, plotW, bandBottom - bandTop);
          ctx.strokeStyle = COMPARISON_HISTORY_THEME.rankBandStroke;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(plotX, bandBottom + 0.5);
          ctx.lineTo(plotX + plotW, bandBottom + 0.5);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = COMPARISON_HISTORY_THEME.grid;
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) {
        const gy = plotY + (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(plotX, gy + 0.5);
        ctx.lineTo(plotX + plotW, gy + 0.5);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i += 1) {
        const gx = plotX + (plotW * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, plotY);
        ctx.lineTo(gx + 0.5, plotY + plotH);
        ctx.stroke();
      }

      ctx.strokeStyle = COMPARISON_HISTORY_THEME.axis;
      ctx.beginPath();
      ctx.moveTo(plotX + 0.5, plotY);
      ctx.lineTo(plotX + 0.5, plotY + plotH);
      ctx.lineTo(plotX + plotW, plotY + plotH + 0.5);
      ctx.stroke();
      drawMetricValidityBandsOnChart(ctx, metricId, plotX, plotY, plotW, plotH, durationSec);

      ctx.font = '11px system-ui';
      ctx.fillStyle = COMPARISON_HISTORY_THEME.axisText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const axisTopValue = def.invertY ? yMin : yMax;
      const axisBottomValue = def.invertY ? yMax : yMin;
      const topLabel = def.unit && def.unit !== 'time'
        ? `${formatHistoryMetricAxisLabel(metricId, axisTopValue)} ${def.unit}`
        : formatHistoryMetricAxisLabel(metricId, axisTopValue);
      ctx.fillText(topLabel, rowX + 6, plotY);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(formatHistoryMetricAxisLabel(metricId, axisBottomValue), rowX + 6, plotY + plotH + 14);
      ctx.fillText('0', plotX, rowY + rowH - 4);
      ctx.textAlign = 'right';
      ctx.fillText(formatClockLabel(durationSec), plotX + plotW, rowY + rowH - 4);

      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let legendRightX = plotX + plotW - 4;
      let legendY = rowY + 14;
      const legendMinX = plotX + Math.max(90, Math.round(plotW * 0.2));
      metricSeries.forEach(({ laneId }) => {
        const text = `L${laneId}`;
        const tw = ctx.measureText(text).width;
        const itemW = 14 + tw + 8;
        if (legendRightX - itemW < legendMinX) {
          legendRightX = plotX + plotW - 4;
          legendY += 15;
        }
        const itemX = legendRightX - itemW;
        ctx.fillStyle = `#${laneColor(laneId).toString(16).padStart(6, '0')}`;
        ctx.fillRect(itemX, legendY - 4, 9, 9);
        ctx.fillStyle = COMPARISON_HISTORY_THEME.legendText;
        ctx.fillText(text, itemX + 12, legendY + 1);
        legendRightX = itemX - 8;
      });

      if (!metricSeries.length) {
        ctx.font = '11px system-ui';
        ctx.fillStyle = COMPARISON_HISTORY_THEME.noDataText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data for selected lanes', plotX + plotW / 2, plotY + plotH / 2);
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(plotX, plotY, Math.max(0, progressX - plotX), plotH);
      ctx.clip();

      metricSeries.forEach(({ laneId, series }) => {
        ctx.beginPath();
        let hasPath = false;
        let lastT = null;
        let prevY = null;
        for (let i = 0; i < series.length; i += 1) {
          const p = series[i];
          const x = plotX + (Math.max(0, Math.min(durationSec, p.t)) / durationSec) * plotW;
          const y = metricValueToY(p.v);
          const shouldBreak = !hasPath || (lastT != null && (p.t - lastT) > gapThresholdSec);
          if (shouldBreak) {
            ctx.moveTo(x, y);
          } else if (metricId === 'rank') {
            ctx.lineTo(x, prevY != null ? prevY : y);
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          hasPath = true;
          lastT = p.t;
          prevY = y;
        }
        if (!hasPath) return;
        const stroke = `#${laneColor(laneId).toString(16).padStart(6, '0')}`;
        if (metricId === 'rank') {
          ctx.save();
          ctx.strokeStyle = stroke;
          ctx.globalAlpha = 0.12;
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = metricId === 'rank' ? 2.2 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      });
      ctx.restore();

      ctx.strokeStyle = COMPARISON_HISTORY_THEME.playhead;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(progressX + 0.5, plotY);
      ctx.lineTo(progressX + 0.5, plotY + plotH);
      ctx.stroke();

      metricSeries.forEach(({ laneId, series }) => {
        if (isMetricVisualizationSuppressedAtTime(metricId, metricDisplayTimeSec, { timeBasis: 'elapsed' })) return;
        let sample = null;
        for (let i = series.length - 1; i >= 0; i -= 1) {
          if (series[i].t <= metricDisplayTimeSec) {
            sample = series[i];
            break;
          }
        }
        if (!sample || (metricDisplayTimeSec - sample.t) > gapThresholdSec) return;
        const sx = plotX + (Math.max(0, Math.min(durationSec, sample.t)) / durationSec) * plotW;
        const sy = metricValueToY(sample.v);
        ctx.fillStyle = `#${laneColor(laneId).toString(16).padStart(6, '0')}`;
        ctx.beginPath();
        ctx.arc(sx, sy, metricId === 'rank' ? 3.1 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    return true;
  }

  function renderComparisonLiveDataChart(currentTimeSec = 0) {
    const canvas = comparisonLiveDataCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const statusEl = comparisonLiveDataStatusEl;
    const emptyEl = comparisonLiveDataEmptyEl;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width || canvas.clientWidth || 320));
    const cssH = Math.max(1, Math.round(rect.height || canvas.clientHeight || 144));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const pxW = Math.max(1, Math.round(cssW * dpr));
    const pxH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cache = ensureComparisonHistorySeriesCache();
    const durationSec = Math.max(1, videoDuration || cache.maxT || 1);
    const tNowRaw = Math.max(0, Math.min(durationSec, Number(currentTimeSec) || 0));
    const lanes = (typeof getComparisonOrderedSelectedLanes === 'function')
      ? getComparisonOrderedSelectedLanes()
      : Array.from(comparisonSelectedLaneIds).sort((a, b) => a - b);
    const activeMetricIds = getComparisonActiveHistoryMetricIds();

    if (comparisonLiveDataMetricEl) {
      comparisonLiveDataMetricEl.textContent = 'Selected Metrics Data';
    }

    if (statusEl) {
      statusEl.textContent = `${formatClockLabel(tNowRaw)} / ${formatClockLabel(durationSec)}`;
    }

    const chartCount = Math.max(1, activeMetricIds.length);
    const rowGap = 10;
    const rowH = 108;
    const outerPadY = 8;
    const desiredCssH = activeMetricIds.length
      ? (outerPadY * 2 + chartCount * rowH + (chartCount - 1) * rowGap)
      : 144;
    if (canvas.style.height !== `${desiredCssH}px`) {
      canvas.style.height = `${desiredCssH}px`;
    }
    const rect2 = canvas.getBoundingClientRect();
    const cssW2 = Math.max(1, Math.round(rect2.width || canvas.clientWidth || cssW));
    const cssH2 = Math.max(1, Math.round(rect2.height || canvas.clientHeight || desiredCssH));
    const pxW2 = Math.max(1, Math.round(cssW2 * dpr));
    const pxH2 = Math.max(1, Math.round(cssH2 * dpr));
    if (canvas.width !== pxW2 || canvas.height !== pxH2) {
      canvas.width = pxW2;
      canvas.height = pxH2;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = COMPARISON_HISTORY_THEME.canvasBg;
    ctx.fillRect(0, 0, cssW2, cssH2);

    if (!lanes.length || !activeMetricIds.length) {
      if (emptyEl) emptyEl.classList.remove('is-hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('is-hidden');

    const gapThresholdSec = Math.max(0.18, (cache.frameDtMedian || (1 / (overlay?.fps || 50))) * 4.5);
    const rowX = 6;
    const rowW = Math.max(40, cssW2 - 12);
    const headerH = 16;
    const rowInnerPad = { l: 28, r: 8, t: 22, b: 16 };

    ctx.font = '10px system-ui';

    activeMetricIds.forEach((metricId, metricIdx) => {
      const def = COMPARISON_HISTORY_METRIC_DEFS[metricId] || { label: metricId, unit: '', decimals: 1 };
      const metricStore = cache.metrics.get(metricId);
      const rowY = outerPadY + metricIdx * (rowH + rowGap);

      ctx.fillStyle = COMPARISON_HISTORY_THEME.rowBg;
      ctx.fillRect(rowX, rowY, rowW, rowH);
      ctx.strokeStyle = COMPARISON_HISTORY_THEME.rowBorder;
      ctx.strokeRect(rowX + 0.5, rowY + 0.5, rowW - 1, rowH - 1);

      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = COMPARISON_HISTORY_THEME.title;
      ctx.font = '600 10px system-ui';
      ctx.fillText(def.label, rowX + 6, rowY + 4);

      const plotX = rowX + rowInnerPad.l;
      const plotY = rowY + rowInnerPad.t;
      const plotW = Math.max(12, rowW - rowInnerPad.l - rowInnerPad.r);
      const plotH = Math.max(12, rowH - rowInnerPad.t - rowInnerPad.b);
      const metricDisplayTimeSec = LIVE_DATA_TIMELINE_TYPES.has(metricId)
        ? resolveMetricDisplayTimeSec(metricId, tNowRaw, LIVE_DATA_UPDATE_INTERVAL_SEC)
        : tNowRaw;
      const progressX = plotX + plotW * Math.max(0, Math.min(1, metricDisplayTimeSec / durationSec));

      const metricSeries = lanes
        .map((laneId) => ({ laneId, series: metricStore?.byLane?.get(Number(laneId)) || [] }))
        .filter((item) => item.series.length);

      let yMin = Number.isFinite(metricStore?.minV) ? metricStore.minV : 0;
      let yMax = Number.isFinite(metricStore?.maxV) ? metricStore.maxV : 1;
      if (def.invertY) {
        yMin = Math.floor(yMin);
        yMax = Math.ceil(yMax);
        if (yMax <= yMin) yMax = yMin + 1;
        yMin = Math.max(0, yMin - 0.5);
        yMax = yMax + 0.5;
      } else {
        let yRange = yMax - yMin;
        if (!(yRange > 1e-4)) yRange = Math.max(0.2, Math.abs(yMax) * 0.1, 0.2);
        const yPad = Math.max(0.03, yRange * 0.16);
        if (yMin >= 0 && !isSignedHistoryMetric(metricId)) yMin = Math.max(0, yMin - yPad);
        else yMin -= yPad;
        yMax += yPad;
      }
      const ySpan = Math.max(0.1, yMax - yMin);
      const metricValueToY = (value) => {
        let yNorm = (Math.max(yMin, Math.min(yMax, value)) - yMin) / ySpan;
        if (def.invertY) yNorm = 1 - yNorm;
        return plotY + plotH - yNorm * plotH;
      };

      if (metricId === 'rank') {
        const rankOneTop = Math.max(plotY, Math.min(plotY + plotH, metricValueToY(0.5)));
        const rankOneBottom = Math.max(plotY, Math.min(plotY + plotH, metricValueToY(1.5)));
        const bandTop = Math.min(rankOneTop, rankOneBottom);
        const bandBottom = Math.max(rankOneTop, rankOneBottom);
        if (bandBottom - bandTop > 1) {
          ctx.fillStyle = COMPARISON_HISTORY_THEME.rankBandFill;
          ctx.fillRect(plotX, bandTop, plotW, bandBottom - bandTop);
          ctx.strokeStyle = COMPARISON_HISTORY_THEME.rankBandStroke;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(plotX, bandBottom + 0.5);
          ctx.lineTo(plotX + plotW, bandBottom + 0.5);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = COMPARISON_HISTORY_THEME.grid;
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) {
        const gy = plotY + (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(plotX, gy + 0.5);
        ctx.lineTo(plotX + plotW, gy + 0.5);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i += 1) {
        const gx = plotX + (plotW * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, plotY);
        ctx.lineTo(gx + 0.5, plotY + plotH);
        ctx.stroke();
      }
      ctx.strokeStyle = COMPARISON_HISTORY_THEME.axis;
      ctx.beginPath();
      ctx.moveTo(plotX + 0.5, plotY);
      ctx.lineTo(plotX + 0.5, plotY + plotH);
      ctx.lineTo(plotX + plotW, plotY + plotH + 0.5);
      ctx.stroke();
      drawMetricValidityBandsOnChart(ctx, metricId, plotX, plotY, plotW, plotH, durationSec);
      ctx.font = '10px system-ui';
      ctx.fillStyle = COMPARISON_HISTORY_THEME.axisText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const axisTopValue = def.invertY ? yMin : yMax;
      const axisBottomValue = def.invertY ? yMax : yMin;
      const topLabel = def.unit && def.unit !== 'time'
        ? `${formatHistoryMetricAxisLabel(metricId, axisTopValue)} ${def.unit}`
        : formatHistoryMetricAxisLabel(metricId, axisTopValue);
      ctx.fillText(topLabel, rowX + 4, plotY);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(formatHistoryMetricAxisLabel(metricId, axisBottomValue), rowX + 4, plotY + plotH + 12);
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('0', plotX, rowY + rowH - 3);
      ctx.textAlign = 'right';
      ctx.fillText(formatClockLabel(durationSec), plotX + plotW, rowY + rowH - 3);
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let legendRightX = plotX + plotW - 4;
      let legendY = rowY + 10;
      const legendMinX = plotX + 70;
      metricSeries.forEach(({ laneId }) => {
        const text = `L${laneId}`;
        const tw = ctx.measureText(text).width;
        const itemW = 12 + tw + 6;
        if (legendRightX - itemW < legendMinX) {
          legendRightX = plotX + plotW - 4;
          legendY += 13;
        }
        const itemX = legendRightX - itemW;
        ctx.fillStyle = `#${laneColor(laneId).toString(16).padStart(6, '0')}`;
        ctx.fillRect(itemX, legendY - 3, 8, 8);
        ctx.fillStyle = COMPARISON_HISTORY_THEME.legendText;
        ctx.fillText(text, itemX + 11, legendY + 1);
        legendRightX = itemX - 6;
      });

      if (!metricSeries.length) {
        ctx.font = '10px system-ui';
        ctx.fillStyle = COMPARISON_HISTORY_THEME.noDataText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data for selected lanes', plotX + plotW / 2, plotY + plotH / 2);
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(plotX, plotY, Math.max(0, progressX - plotX), plotH);
      ctx.clip();

      metricSeries.forEach(({ laneId, series }) => {
        ctx.beginPath();
        let hasPath = false;
        let lastT = null;
        let prevY = null;
        for (let i = 0; i < series.length; i += 1) {
          const p = series[i];
          const x = plotX + (Math.max(0, Math.min(durationSec, p.t)) / durationSec) * plotW;
          const y = metricValueToY(p.v);
          const shouldBreak = !hasPath || (lastT != null && (p.t - lastT) > gapThresholdSec);
          if (shouldBreak) {
            ctx.moveTo(x, y);
          } else if (metricId === 'rank') {
            ctx.lineTo(x, prevY != null ? prevY : y);
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          hasPath = true;
          lastT = p.t;
          prevY = y;
        }
        if (!hasPath) return;
        const laneHex = laneColor(laneId);
        const stroke = `#${laneHex.toString(16).padStart(6, '0')}`;
        if (metricId === 'rank') {
          ctx.save();
          ctx.strokeStyle = stroke;
          ctx.globalAlpha = 0.12;
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = metricId === 'rank' ? 2.2 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      });
      ctx.restore();
      ctx.strokeStyle = COMPARISON_HISTORY_THEME.playhead;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(progressX + 0.5, plotY);
      ctx.lineTo(progressX + 0.5, plotY + plotH);
      ctx.stroke();

      metricSeries.forEach(({ laneId, series }) => {
        if (isMetricVisualizationSuppressedAtTime(metricId, metricDisplayTimeSec, { timeBasis: 'elapsed' })) return;
        let sample = null;
        for (let i = series.length - 1; i >= 0; i -= 1) {
          if (series[i].t <= metricDisplayTimeSec) { sample = series[i]; break; }
        }
        if (!sample || (metricDisplayTimeSec - sample.t) > gapThresholdSec) return;
        const sx = plotX + (Math.max(0, Math.min(durationSec, sample.t)) / durationSec) * plotW;
        const sy = metricValueToY(sample.v);
        const laneHex = laneColor(laneId);
        ctx.fillStyle = `#${laneHex.toString(16).padStart(6, '0')}`;
        ctx.beginPath();
        ctx.arc(sx, sy, metricId === 'rank' ? 2.8 : 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (metricId === 'rank' && Math.round(sample.v) === 1) {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    });
  }

  function resolveComparisonTransitionType() {
    const raw = uiState.modePanels?.comparison?.transitionType;
    return raw === 'hardcut' ? 'hardcut' : 'smooth';
  }

  function normalizeComparisonTransitionDurationSec(raw) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0.75;
    return Math.max(0.25, Math.min(1.5, Math.round(num * 20) / 20));
  }

  function formatComparisonTransitionDurationLabel(raw) {
    return formatDecimalReadout(normalizeComparisonTransitionDurationSec(raw), 's');
  }

  function resolveComparisonTransitionDurationMs() {
    if (resolveComparisonTransitionType() === 'hardcut') return 0;
    return Math.round(normalizeComparisonTransitionDurationSec(uiState.modePanels?.comparison?.transitionDurationSec) * 1000);
  }

  function clearComparisonConfirmTransition() {
    comparisonTransitionState.active = false;
    comparisonTransitionState.kind = 'full';
    comparisonTransitionState.startMs = 0;
    comparisonTransitionState.durationMs = 0;
    comparisonTransitionState.fromByLane = new Map();
    comparisonTransitionState.toByLane = new Map();
    comparisonTransitionState.fromBackdropAlpha = 1;
    comparisonTransitionState.toBackdropAlpha = 1;
    comparisonState.pendingConfirmTransition = 'none';
    comparisonState.pendingTransitionFromLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
  }

  function clearComparisonExitTransition() {
    comparisonExitTransitionState.active = false;
    comparisonExitTransitionState.startMs = 0;
    comparisonExitTransitionState.durationMs = 0;
    comparisonExitTransitionState.fromByLane = new Map();
    comparisonExitTransitionState.toByLane = new Map();
    comparisonExitTransitionState.fromBackdropAlpha = 1;
    comparisonExitTransitionState.toBackdropAlpha = 0;
    comparisonExitTransitionState.layoutMode = 'sideBySide';
  }

  function captureComparisonRowRectForTransition(entry, fallbackRect = null) {
    if (entry?.targetRect) {
      return {
        x: Number.isFinite(entry.container?.x) ? entry.container.x : entry.targetRect.x,
        y: Number.isFinite(entry.container?.y) ? entry.container.y : entry.targetRect.y,
        w: entry.targetRect.w,
        h: entry.targetRect.h
      };
    }
    if (!fallbackRect) return null;
    return {
      x: fallbackRect.x,
      y: fallbackRect.y,
      w: fallbackRect.w,
      h: fallbackRect.h
    };
  }

  function startComparisonConfirmTransition(nowMs = performance.now(), kind = 'full', opts = {}) {
    comparisonState.pendingConfirmTransition = 'none';
    const type = resolveComparisonTransitionType();
    const durationMs = resolveComparisonTransitionDurationMs();
    if (type === 'hardcut' || durationMs <= 0) {
      clearComparisonConfirmTransition();
      return;
    }
    const targetRects = computeComparisonTargetRects();
    if (!targetRects.length) {
      clearComparisonConfirmTransition();
      return;
    }
    const fromByLane = new Map();
    const toByLane = new Map();
    targetRects.forEach((target) => {
      toByLane.set(target.laneId, { ...target });
      if (kind === 'full') {
        const src = getLaneScreenRectFromClickZone(target.laneId);
        if (src) {
          fromByLane.set(target.laneId, {
            x: src.x,
            y: src.y,
            w: src.w,
            h: src.h
          });
        } else {
          fromByLane.set(target.laneId, { ...target });
        }
        return;
      }

      if (kind === 'layout') {
        fromByLane.set(target.laneId, { ...target });
        return;
      }

      const entry = comparisonRowsByLaneId.get(target.laneId);
      const oldRect = captureComparisonRowRectForTransition(entry, null);
      if (oldRect) {
        fromByLane.set(target.laneId, oldRect);
      } else {
        fromByLane.set(target.laneId, { ...target });
      }
    });

    let fromBackdropAlpha = 1;
    let toBackdropAlpha = 1;
    if (kind === 'full') {
      fromBackdropAlpha = 0;
      toBackdropAlpha = 1;
    } else if (kind === 'layout') {
      const fromLayout = opts.fromLayout === 'overlay' ? 'overlay' : 'sideBySide';
      const toLayout = opts.toLayout === 'overlay' ? 'overlay' : 'sideBySide';
      if (fromLayout !== toLayout && toLayout === 'overlay') {
        fromBackdropAlpha = 0;
        toBackdropAlpha = 1;
      }
    }

    comparisonTransitionState.active = true;
    comparisonTransitionState.kind = kind;
    comparisonTransitionState.startMs = Number.isFinite(nowMs) ? nowMs : performance.now();
    comparisonTransitionState.durationMs = Math.max(1, durationMs);
    comparisonTransitionState.fromByLane = fromByLane;
    comparisonTransitionState.toByLane = toByLane;
    comparisonTransitionState.fromBackdropAlpha = fromBackdropAlpha;
    comparisonTransitionState.toBackdropAlpha = toBackdropAlpha;
    ensurePausedCameraTransitionTick();
  }

  function startComparisonExitTransition(nowMs = performance.now(), opts = {}) {
    clearComparisonDeferredPause();
    clearComparisonConfirmTransition();
    clearComparisonExitTransition();

    const type = resolveComparisonTransitionType();
    const durationMs = resolveComparisonTransitionDurationMs();
    const lanes = getComparisonOrderedSelectedLanes();
    if (!lanes.length || type === 'hardcut' || durationMs <= 0) {
      return false;
    }

    renderComparisonCompositeTexture();
    layoutComparisonRows();

    const fromByLane = new Map();
    const toByLane = new Map();
    lanes.forEach((laneId) => {
      const entry = comparisonRowsByLaneId.get(laneId);
      const fallbackRect = comparisonLaneLayoutRects.get(laneId) || getLaneScreenRectFromClickZone(laneId);
      const fromRect = captureComparisonRowRectForTransition(entry, fallbackRect);
      if (!fromRect) return;
      fromByLane.set(laneId, fromRect);
      const targetRect = getLaneScreenRectFromClickZone(laneId);
      if (targetRect) {
        toByLane.set(laneId, {
          x: targetRect.x,
          y: targetRect.y,
          w: targetRect.w,
          h: targetRect.h
        });
      } else {
        toByLane.set(laneId, { ...fromRect });
      }
    });

    if (!fromByLane.size) {
      return false;
    }

    comparisonSelectionLayer.visible = false;
    comparisonSelectionLayer.renderable = false;
    comparisonDisplayLayer.visible = true;
    comparisonDisplayLayer.renderable = true;
    comparisonDisplayLayer.interactive = false;
    comparisonDisplayLayer.interactiveChildren = false;
    comparisonDisplayRowsLayer.visible = true;
    comparisonDisplayRowsLayer.renderable = true;
    comparisonDisplayRowsLayer.interactive = false;
    comparisonDisplayRowsLayer.interactiveChildren = false;
    comparisonRowsByLaneId.forEach((entry, laneId) => {
      const keep = fromByLane.has(laneId);
      if (!entry?.container) return;
      entry.container.visible = keep;
      entry.container.renderable = keep;
      entry.container.interactive = false;
      entry.container.buttonMode = false;
      entry.container.cursor = 'default';
      entry.container.alpha = 1;
    });

    const layoutMode = opts.fromLayout === 'overlay' ? 'overlay' : 'sideBySide';
    comparisonExitTransitionState.active = true;
    comparisonExitTransitionState.startMs = Number.isFinite(nowMs) ? nowMs : performance.now();
    comparisonExitTransitionState.durationMs = Math.max(1, durationMs);
    comparisonExitTransitionState.fromByLane = fromByLane;
    comparisonExitTransitionState.toByLane = toByLane;
    comparisonExitTransitionState.fromBackdropAlpha = 1;
    comparisonExitTransitionState.toBackdropAlpha = 0;
    comparisonExitTransitionState.layoutMode = layoutMode;
    ensurePausedCameraTransitionTick();
    return true;
  }

  function comparisonIsSelecting() {
    return uiState.viewMode === 'comparison' && comparisonState.phase === 'selecting';
  }

  function comparisonIsConfirmed() {
    return uiState.viewMode === 'comparison' && comparisonState.phase === 'confirmed' && comparisonHasSelection();
  }

  function isComparisonPinnedHudElement(el) {
    return el?.typeId === 'elapsed';
  }

  function syncComparisonPinnedHudLayer() {
    if (!comparisonPinnedHudLayer) return;
    const shouldPin = uiState.viewMode === 'comparison';
    let pinnedCount = 0;
    elements.forEach((el) => {
      if (!el?.container || !isComparisonPinnedHudElement(el)) return;
      const targetParent = shouldPin ? comparisonPinnedHudLayer : overlayLayer;
      if (el.container.parent !== targetParent) {
        targetParent.addChild(el.container);
      }
      if (shouldPin) pinnedCount += 1;
    });
    comparisonPinnedHudLayer.visible = shouldPin && pinnedCount > 0;
    comparisonPinnedHudLayer.renderable = shouldPin && pinnedCount > 0;
  }

  function setPlaybackUiPlayingState(isPlaying) {
    if (!btnPlay) return;
    btnPlay.textContent = isPlaying ? 'Pause' : 'Play';
    btnPlay.classList.toggle('is-playing', !!isPlaying);
  }

  function setPlaybackResumeHint(timeSec) {
    const t = Number(timeSec);
    playbackResumeHintSec = Number.isFinite(t) && t >= 0 ? t : null;
  }

  function clearPlaybackResumeHint() {
    playbackResumeHintSec = null;
  }

  function setPlaybackStartAnchor(timeSec) {
    const t = Number(timeSec);
    playbackStartAnchor = {
      timeSec: Number.isFinite(t) && t >= 0 ? t : 0,
      startedAtMs: performance.now()
    };
  }

  function clearPlaybackStartAnchor() {
    playbackStartAnchor = null;
  }

  function setPlaybackResumeGuard(targetTimeSec) {
    const t = Number(targetTimeSec);
    if (!Number.isFinite(t) || t < 0) {
      playbackResumeGuard = null;
      return;
    }
    playbackResumeGuard = {
      targetTimeSec: t,
      expiresAtMs: performance.now() + 800,
      correctionsRemaining: 2
    };
  }

  function clearPlaybackResumeGuard() {
    playbackResumeGuard = null;
  }

  function debugPlaybackResume(label, extra = {}) {
  }

  function cacheCurrentPlaybackPosition() {
    if (!videoEl) return 0;
    const currentTimeRaw = Number(videoEl.currentTime);
    let t = Number.isFinite(currentTimeRaw) && currentTimeRaw >= 0 ? currentTimeRaw : 0;
    if (playbackStartAnchor && !videoEl.paused) {
      const elapsedMs = Math.max(0, performance.now() - (Number(playbackStartAnchor.startedAtMs) || 0));
      const estimated = playbackStartAnchor.timeSec + (elapsedMs / 1000) * getCurrentPlaybackRateValue({ quantize: false });
      const dur = videoDuration || videoEl.duration || 0;
      const capped = dur > 0 ? Math.min(dur, estimated) : estimated;
      t = Math.max(t, capped);
    }
    t = Math.max(t, Number.isFinite(lastObservedPlayingTimeSec) ? lastObservedPlayingTimeSec : 0);
    if (Number.isFinite(t) && t >= 0) {
      prevTimeSec = t;
      setPlaybackResumeHint(t);
      clearPlaybackStartAnchor();
      debugPlaybackResume('cacheCurrentPlaybackPosition', { resolvedTime: Number(t).toFixed(3) });
      return t;
    }
    const fallback = Number.isFinite(prevTimeSec) ? prevTimeSec : 0;
    setPlaybackResumeHint(fallback);
    clearPlaybackStartAnchor();
    debugPlaybackResume('cacheCurrentPlaybackPosition:fallback', { resolvedTime: Number(fallback).toFixed(3) });
    return fallback;
  }

  function restorePausedPlaybackPositionIfNeeded() {
    if (!videoEl) {
      return Number.isFinite(prevTimeSec) ? prevTimeSec : 0;
    }
    const dur = videoDuration || videoEl.duration || 0;
    let currentTime = Number.isFinite(videoEl.currentTime)
      ? videoEl.currentTime
      : (Number.isFinite(prevTimeSec) ? prevTimeSec : 0);
    const fallbackResumeTime = Math.max(
      Number.isFinite(playbackResumeHintSec) ? playbackResumeHintSec : 0,
      Number.isFinite(lastObservedPlayingTimeSec) ? lastObservedPlayingTimeSec : 0,
      Number.isFinite(prevTimeSec) ? prevTimeSec : 0
    );
    const shouldRestorePausedPosition =
      dur > 0
      && fallbackResumeTime >= 0
      && fallbackResumeTime <= Math.max(0, dur)
      && Math.abs(currentTime - fallbackResumeTime) > 0.05;
    if (!shouldRestorePausedPosition) {
      debugPlaybackResume('restorePausedPlaybackPositionIfNeeded:skip', {
        resolvedTime: Number(currentTime).toFixed(3),
        fallbackResumeTime: Number(fallbackResumeTime).toFixed(3)
      });
      return currentTime;
    }
    currentTime = fallbackResumeTime;
    try {
      videoEl.currentTime = currentTime;
    } catch (err) {
      console.warn('Failed to restore paused playback position', err);
    }
    syncUiToSeekTime(currentTime);
    clearPlaybackResumeGuard();
    debugPlaybackResume('restorePausedPlaybackPositionIfNeeded:apply', {
      resolvedTime: Number(currentTime).toFixed(3),
      fallbackResumeTime: Number(fallbackResumeTime).toFixed(3)
    });
    return currentTime;
  }

  playbackSpeedInput?.addEventListener('input', () => {
    if (exportRenderState.active) return;
    const nextRate = normalizePlaybackRateValue(playbackSpeedInput.value);
    applyPlaybackRateValue(nextRate, { record: 'draft', reason: 'playback-rate-input' });
  });

  playbackSpeedInput?.addEventListener('change', () => {
    if (exportRenderState.active) return;
    if (!playbackRateTimelineState.draft) {
      stagePlaybackRateTimelineDraft('playback-rate-change');
    }
    if (!videoEl?.paused) {
      commitPlaybackRateTimelineDraft('playback-rate-change');
    } else {
      renderElementTimeline();
    }
  });

  function buildExportCaptureLayout(options) {
    const outputMode = options?.outputMode || EXPORT_OUTPUT_MODE.video;
    const metricIds = sanitizeExportMetricIds(options?.metricIds || []);
    const videoW = Math.max(1, Math.round(app?.renderer?.width || app?.view?.width || 1280));
    const videoH = Math.max(1, Math.round(app?.renderer?.height || app?.view?.height || 720));
    if (outputMode === EXPORT_OUTPUT_MODE.video) {
      return {
        outputMode,
        videoW,
        videoH,
        width: videoW,
        height: videoH,
        metricsLayout: null
      };
    }

    const metricsLayout = buildExportMetricsLayout(outputMode, metricIds.length, videoW, videoH);
    if (outputMode === EXPORT_OUTPUT_MODE.metrics) {
      return {
        outputMode,
        videoW,
        videoH,
        width: Math.max(1, Math.round(metricsLayout.width)),
        height: Math.max(1, Math.round(metricsLayout.height)),
        metricsLayout
      };
    }
    return {
      outputMode,
      videoW,
      videoH,
      width: Math.max(1, Math.round(videoW + metricsLayout.width)),
      height: videoH,
      metricsLayout
    };
  }

  function stopExportComposeLoop() {
    if (exportRenderState.composeRaf) {
      cancelAnimationFrame(exportRenderState.composeRaf);
      exportRenderState.composeRaf = 0;
    }
  }

  function renderExportComposeFrame(currentTimeSec = 0) {
    const ctx = exportRenderState.composeCtx;
    const canvas = exportRenderState.composeCanvas;
    const options = exportRenderState.captureOptions;
    const layout = exportRenderState.captureLayout;
    if (!ctx || !canvas || !options || !layout) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (layout.outputMode !== EXPORT_OUTPUT_MODE.metrics) {
      try {
        ctx.drawImage(app.view, 0, 0, layout.videoW, layout.videoH);
      } catch (err) {
      }
    }

    if (layout.outputMode === EXPORT_OUTPUT_MODE.metrics || layout.outputMode === EXPORT_OUTPUT_MODE.composite) {
      if (!exportRenderState.composeMetricsCanvas) {
        exportRenderState.composeMetricsCanvas = document.createElement('canvas');
      }
      const metricsCanvas = exportRenderState.composeMetricsCanvas;
      drawExportHistoryMetricsPanels(metricsCanvas, currentTimeSec, {
        metricIds: options.metricIds,
        laneIds: options.laneIds,
        layout: layout.metricsLayout
      });
      const dx = layout.outputMode === EXPORT_OUTPUT_MODE.composite ? layout.videoW : 0;
      const dw = Math.max(1, Math.round(layout.metricsLayout?.width || metricsCanvas.width));
      const dh = Math.max(1, Math.round(layout.metricsLayout?.height || metricsCanvas.height));
      ctx.drawImage(metricsCanvas, dx, 0, dw, dh);
    }
  }

  function startExportComposeLoop() {
    stopExportComposeLoop();
    const tick = () => {
      if (!exportRenderState.active) return;
      renderExportComposeFrame(videoEl?.currentTime || 0);
      exportRenderState.composeRaf = requestAnimationFrame(tick);
    };
    renderExportComposeFrame(videoEl?.currentTime || 0);
    exportRenderState.composeRaf = requestAnimationFrame(tick);
  }

  function setExportRenderUiState(active, opts = {}) {
    if (btnExportRender) {
      btnExportRender.classList.toggle('is-busy', !!active);
      btnExportRender.disabled = !!active;
    }
    if (btnExportSettingsToggle) {
      btnExportSettingsToggle.disabled = !!active;
    }
    if (active) {
      setExportSettingsPanelOpen(false);
    }
    if (playbackSpeedInput) {
      playbackSpeedInput.disabled = !!active;
    }
    if (btnExportRenderLabel) {
      btnExportRenderLabel.textContent = active ? 'Rendering' : 'Export';
    }
    if (btnExportRenderCancel) {
      btnExportRenderCancel.disabled = !active || !!opts.disableCancel;
    }
    if (exportRenderOverlayEl) {
      exportRenderOverlayEl.classList.toggle('is-visible', !!active);
      exportRenderOverlayEl.setAttribute('aria-hidden', active ? 'false' : 'true');
    }
    if (exportRenderStatusTextEl && typeof opts.statusText === 'string') {
      exportRenderStatusTextEl.textContent = opts.statusText;
    }
    if (exportRenderStatusTimeEl && typeof opts.timeText === 'string') {
      exportRenderStatusTimeEl.textContent = opts.timeText;
    }
    if (exportRenderProgressFillEl && Number.isFinite(opts.progressPct)) {
      exportRenderProgressFillEl.style.width = `${Math.max(0, Math.min(100, opts.progressPct))}%`;
    }
    if (!active) {
      if (exportRenderProgressFillEl) exportRenderProgressFillEl.style.width = '0%';
      if (exportRenderStatusTextEl) exportRenderStatusTextEl.textContent = 'Preparing…';
      if (exportRenderStatusTimeEl) {
        const total = formatClockLabel(videoDuration || videoEl?.duration || 0);
        exportRenderStatusTimeEl.textContent = `00:00 / ${total}`;
      }
    }
  }

  function updateExportRenderProgressUi(nowSec = 0, totalSec = 0) {
    if (!exportRenderState.active) return;
    const total = Math.max(0.001, Number(totalSec || videoDuration || videoEl?.duration || 0));
    const cur = Math.max(0, Math.min(total, Number(nowSec) || 0));
    const pct = (cur / total) * 100;
    setExportRenderUiState(true, {
      statusText: 'Rendering frames…',
      timeText: `${formatClockLabel(cur)} / ${formatClockLabel(total)}`,
      progressPct: pct
    });
  }

  function formatExportOutputModeLabel(mode) {
    if (mode === EXPORT_OUTPUT_MODE.metrics) return 'metrics panels';
    if (mode === EXPORT_OUTPUT_MODE.composite) return 'video + metrics';
    if (mode === EXPORT_OUTPUT_MODE.preset) return 'preset JSON';
    return 'video';
  }

  function pickExportRecorderMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4'
    ];
    for (const mime of candidates) {
      if (!mime) continue;
      try {
        if (typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      } catch (err) {
      }
    }
    return '';
  }

  function getExportFileExtensionForMimeType(mimeType = '') {
    const raw = String(mimeType || '').toLowerCase();
    if (raw.includes('mp4')) return 'mp4';
    return 'webm';
  }

  function finalizeExportRenderBlobDownload(blob, mimeType = '') {
    if (!(blob instanceof Blob) || blob.size <= 0) {
      console.warn('Export blob is empty');
      return;
    }
    const ext = getExportFileExtensionForMimeType(mimeType || blob.type);
    const stamp = new Date();
    const ts = [
      stamp.getFullYear(),
      String(stamp.getMonth() + 1).padStart(2, '0'),
      String(stamp.getDate()).padStart(2, '0'),
      '-',
      String(stamp.getHours()).padStart(2, '0'),
      String(stamp.getMinutes()).padStart(2, '0'),
      String(stamp.getSeconds()).padStart(2, '0')
    ].join('');
    const competitionIdSafe = String(currentCompetition?.id || 'swimvis').replace(/[^a-z0-9_-]+/ig, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const modeSuffix = exportRenderState.captureOptions?.outputMode || 'video';
    a.download = `${competitionIdSafe}_render_${modeSuffix}_${ts}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stopExportRenderCaptureIfActive() {
    const rec = exportRenderState.recorder;
    if (!exportRenderState.active || !rec) return;
    try {
      if (rec.state !== 'inactive') {
        rec.stop();
      } else if (exportRenderState.cancelled) {
        teardownExportRenderState({ saveBlob: false });
      }
    } catch (err) {
      console.warn('Failed to stop export recorder', err);
    }
  }

  function cancelExportRenderCapture() {
    if (!exportRenderState.active) return;
    exportRenderState.cancelled = true;
    setExportRenderUiState(true, {
      statusText: 'Cancelling export…',
      timeText: exportRenderStatusTimeEl?.textContent || `00:00 / ${formatClockLabel(videoDuration || videoEl?.duration || 0)}`,
      disableCancel: true
    });
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
    }
    stopExportRenderCaptureIfActive();
  }

  function seekVideoForExportStart(targetTimeSec = 0) {
    if (!videoEl) return Promise.resolve();
    const target = Math.max(0, Number(targetTimeSec) || 0);
    return new Promise((resolve) => {
      const current = Number(videoEl.currentTime) || 0;
      if (Math.abs(current - target) <= 1e-3) {
        resolve();
        return;
      }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        videoEl.removeEventListener('seeked', onSeeked);
        videoEl.removeEventListener('error', onError);
        resolve();
      };
      const onSeeked = () => done();
      const onError = () => done();
      videoEl.addEventListener('seeked', onSeeked, { once: true });
      videoEl.addEventListener('error', onError, { once: true });
      try {
        videoEl.currentTime = target;
      } catch (err) {
        done();
      }
      setTimeout(done, 250);
    });
  }

  function waitForNextAnimationFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  async function flushExportVisualStateAtTime(targetTimeSec = 0) {
    const t = Math.max(0, Number(targetTimeSec) || 0);
    prevTimeSec = t;
    if (timelineScrubber) timelineScrubber.value = t.toFixed(2);
    setPlaybackResumeHint(t);
    viewModeTimelineState.lastAppliedSegmentId = null;
    playbackRateTimelineState.lastAppliedSegmentId = null;

    applyViewModeTimelineSegmentAtTime(t, {
      force: true,
      fromPlayback: true,
      pauseOnEnter: false,
      skipComparisonExitAnimation: true
    });
    applyPlaybackRateTimelineSegmentAtTime(t, { force: true });
    updateOverlayForTime(t, performance.now());
    try {
      app?.renderer?.render?.(app.stage);
    } catch (err) {
    }

    await waitForNextAnimationFrame();

    updateOverlayForTime(t, performance.now());
    try {
      app?.renderer?.render?.(app.stage);
    } catch (err) {
    }
  }

  function teardownExportRenderState({ saveBlob = true } = {}) {
    const rec = exportRenderState.recorder;
    const chunks = exportRenderState.chunks.slice();
    const mimeType = exportRenderState.mimeType || rec?.mimeType || '';
    const cancelled = exportRenderState.cancelled;
    stopExportComposeLoop();
    if (exportRenderState.captureStream) {
      exportRenderState.captureStream.getTracks().forEach((track) => track.stop());
    }
    if (typeof exportRenderState.listenerCleanup === 'function') {
      try { exportRenderState.listenerCleanup(); } catch (err) {  }
    }
    exportRenderState.listenerCleanup = null;
    exportRenderState.recorder = null;
    exportRenderState.mimeType = '';
    exportRenderState.active = false;
    exportRenderState.cancelled = false;
    exportRenderState.chunks = [];
    exportRenderState.captureStream = null;
    exportRenderState.composeCanvas = null;
    exportRenderState.composeCtx = null;
    exportRenderState.composeMetricsCanvas = null;
    exportRenderState.captureOptions = null;
    exportRenderState.captureLayout = null;
    setExportRenderUiState(false);

    if (saveBlob && !cancelled && chunks.length) {
      try {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        finalizeExportRenderBlobDownload(blob, mimeType);
      } catch (err) {
        console.error('Failed to build export blob', err);
      }
    }
  }

  async function startExportRenderCapture() {
    if (exportRenderState.active) return;
    const captureOptions = getExportCaptureOptions();
    if (captureOptions.outputMode !== EXPORT_OUTPUT_MODE.metrics && comparisonIsSelecting()) {
      console.warn('Cannot export while comparison is in selecting phase');
      return;
    }
    if (!videoReady || !videoEl || !app?.view) {
      console.warn('Export render unavailable: video/canvas not ready');
      return;
    }
    if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
      console.warn('Canvas captureStream is not available in this browser');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      console.warn('MediaRecorder is not available in this browser');
      return;
    }

    commitViewModeTimelineDraft('export-render');
    commitPlaybackRateTimelineDraft('export-render');
    clearComparisonDeferredPause();
    stopPausedCameraTransitionTick();

    const captureLayout = buildExportCaptureLayout(captureOptions);
    const composeCanvas = document.createElement('canvas');
    composeCanvas.width = Math.max(1, Math.round(captureLayout.width || 1));
    composeCanvas.height = Math.max(1, Math.round(captureLayout.height || 1));
    let composeCtx = null;
    try {
      composeCtx = composeCanvas.getContext('2d', { alpha: false, desynchronized: true });
    } catch (err) {
      composeCtx = composeCanvas.getContext('2d');
    }
    if (!composeCtx) {
      console.warn('Failed to create export composition canvas context');
      return;
    }

    exportRenderState.composeCanvas = composeCanvas;
    exportRenderState.composeCtx = composeCtx;
    exportRenderState.captureOptions = captureOptions;
    exportRenderState.captureLayout = captureLayout;
    exportRenderState.composeMetricsCanvas = document.createElement('canvas');

    const captureFps = Math.max(24, Math.min(60, Math.round(overlay?.fps || 30)));
    const stream = composeCanvas.captureStream(captureFps);
    const mimeType = pickExportRecorderMimeType();
    let recorder = null;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      console.error('Failed to create MediaRecorder for export', err);
      stream.getTracks().forEach((track) => track.stop());
      exportRenderState.composeCanvas = null;
      exportRenderState.composeCtx = null;
      exportRenderState.composeMetricsCanvas = null;
      exportRenderState.captureOptions = null;
      exportRenderState.captureLayout = null;
      return;
    }

    exportRenderState.active = true;
    exportRenderState.cancelled = false;
    exportRenderState.recorder = recorder;
    exportRenderState.mimeType = recorder.mimeType || mimeType || '';
    exportRenderState.chunks = [];
    exportRenderState.captureStream = stream;
    exportRenderState.prevTime = videoEl.currentTime || 0;
    exportRenderState.wasPlaying = !videoEl.paused;
    setExportRenderUiState(true, {
      statusText: `Preparing ${formatExportOutputModeLabel(captureOptions.outputMode)} recorder…`,
      timeText: `00:00 / ${formatClockLabel(videoDuration || videoEl.duration || 0)}`,
      progressPct: 0
    });

    const onData = (e) => {
      if (e?.data && e.data.size > 0) {
        exportRenderState.chunks.push(e.data);
      }
    };
    const onStop = () => {
      teardownExportRenderState({ saveBlob: !exportRenderState.cancelled });
      setPlaybackUiPlayingState(false);
      requestOverlayRefresh();
    };
    const onError = (e) => {
      console.error('Export recorder error', e);
      teardownExportRenderState({ saveBlob: false });
      setPlaybackUiPlayingState(false);
      requestOverlayRefresh();
    };
    recorder.addEventListener('dataavailable', onData);
    recorder.addEventListener('stop', onStop, { once: true });
    recorder.addEventListener('error', onError, { once: true });
    exportRenderState.listenerCleanup = () => {
      recorder.removeEventListener('dataavailable', onData);
    };

    pausePlaybackForUserModeEntry();
    await seekVideoForExportStart(0);
    if (exportRenderState.cancelled || !exportRenderState.active) {
      teardownExportRenderState({ saveBlob: false });
      return;
    }
    await flushExportVisualStateAtTime(0);
    renderExportComposeFrame(0);
    startExportComposeLoop();
    updateExportRenderProgressUi(0, videoDuration || videoEl.duration || 0);

    try {
      recorder.start(250);
    } catch (err) {
      console.error('Failed to start export recorder', err);
      teardownExportRenderState({ saveBlob: false });
      return;
    }

    try {
      await videoEl.play();
      setPlaybackUiPlayingState(true);
      setExportRenderUiState(true, {
        statusText: 'Rendering frames…',
        timeText: `00:00 / ${formatClockLabel(videoDuration || videoEl.duration || 0)}`,
        progressPct: 0
      });
    } catch (err) {
      console.error('Failed to start playback for export', err);
      stopExportRenderCaptureIfActive();
    }
  }

  async function exportCurrentStateJson() {
    commitViewModeTimelineDraft('export-current-state');
    commitPlaybackRateTimelineDraft('export-current-state');
    const presetPayload = collectCurrentPresetPayload();
    try {
      const result = await writePresetArrayToPresetFile(presetPayload);
      if (result && result !== 'cancelled' && result !== 'skipped') {
        setExportSettingsPanelOpen(false);
      }
    } catch (err) {
      console.error('Export current state JSON failed', err);
    } finally {
      renderExportSettingsPanel();
    }
  }

  function clearComparisonDeferredPause() {
    if (!comparisonDeferredPauseTimer) return;
    clearTimeout(comparisonDeferredPauseTimer);
    comparisonDeferredPauseTimer = 0;
  }

  function estimateCameraTransitionDurationMs(type) {
    return resolveTrackingTransitionDurationMs(type);
  }

  function pauseVideoForComparisonSelection() {
    clearComparisonDeferredPause();
    if (!videoEl) return;
    debugPlaybackResume('pauseVideoForComparisonSelection:before');
    cacheCurrentPlaybackPosition();
    if (!videoEl.paused) videoEl.pause();
    setPlaybackUiPlayingState(false);
    ensurePausedCameraTransitionTick();
    debugPlaybackResume('pauseVideoForComparisonSelection:after');
  }

  function resumeVideoFromComparisonConfirm() {
    clearComparisonDeferredPause();
    if (!videoEl) return;
    commitViewModeTimelineDraft('comparison-confirm-play');
    commitPlaybackRateTimelineDraft('comparison-confirm-play');
    const currentTime = restorePausedPlaybackPositionIfNeeded();
    stopPausedCameraTransitionTick();
    setPlaybackStartAnchor(currentTime);
    setPlaybackResumeGuard(currentTime);
    debugPlaybackResume('resumeVideoFromComparisonConfirm:play', {
      resolvedTime: Number(currentTime).toFixed(3)
    });
    videoEl.play().then(() => {
      clearPlaybackResumeHint();
    }).catch(() => { });
    prevTimeSec = currentTime;
    setPlaybackUiPlayingState(true);
  }

  function ensureComparisonLaneOrder() {
    const selectedOrdered = comparisonLaneDisplayOrder.filter(id => comparisonSelectedLaneIds.has(id));
    const missing = Array.from(comparisonSelectedLaneIds).sort((a, b) => a - b).filter(id => !selectedOrdered.includes(id));
    comparisonLaneDisplayOrder = [...selectedOrdered, ...missing];
  }

  function sortLaneIdsByDefaultVisualOrder(laneIds) {
    return cloneArrayNums(laneIds).sort((a, b) => {
      const ay = getTrackYForId(a);
      const by = getTrackYForId(b);
      const aHasY = isFiniteNumber(ay);
      const bHasY = isFiniteNumber(by);
      if (aHasY && bHasY) {
        const diff = ay - by;
        if (Math.abs(diff) > 0.001) return diff;
      } else if (aHasY !== bHasY) {
        return aHasY ? -1 : 1;
      }
      return a - b;
    });
  }

  function setComparisonSelectionMode(rawMode, opts = {}) {
    const nextMode = normalizeComparisonSelectionMode(rawMode);
    const prevMode = normalizeComparisonSelectionMode(comparisonState.selectionMode);
    if (nextMode === prevMode) {
      syncComparisonSelectionModeControl();
      return;
    }
    const frameAthletes = getCurrentComparisonFrameAthletes();
    const currentLaneIds = getComparisonOrderedSelectedLanes();
    comparisonState.selectionMode = nextMode;
    comparisonSelectedLaneIds.clear();
    currentLaneIds.forEach((laneId) => {
      const nextSelectionValue = nextMode === 'rank'
        ? getAthleteRankValue(findAthleteInFrameByLaneId(frameAthletes, laneId))
        : Number(laneId);
      if (Number.isFinite(nextSelectionValue)) comparisonSelectedLaneIds.add(nextSelectionValue);
    });
    comparisonLaneDisplayOrder = nextMode === 'rank'
      ? cloneArrayNums(Array.from(comparisonSelectedLaneIds)).sort((a, b) => a - b)
      : sortLaneIdsByDefaultVisualOrder(Array.from(comparisonSelectedLaneIds));
    ensureComparisonLaneOrder();
    syncComparisonSelectionModeControl();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
    markComparisonLayoutDirty();
    comparisonHistorySeriesCache = null;
    if (comparisonState.phase === 'confirmed' && !comparisonHasSelection()) {
      resetComparisonSelectionState({ clearSelection: false });
      return;
    }
    updateExitButtonVisibility();
    if (opts.record !== false) {
      noteViewModeStateChanged(`comparison:selection-mode:${nextMode}`);
    }
    requestOverlayRefresh();
  }

  function renderComparisonLaneSelector() {
    if (!comparisonLaneSelector) return;
    syncComparisonSelectionModeControl();
    comparisonLaneSelector.innerHTML = '';
    const laneCount = laneCountGlobal || 8;
    for (let i = 1; i <= laneCount; i += 1) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `lane-chip ${comparisonSelectedLaneIds.has(i) ? 'active' : ''}`;
      chip.textContent = getComparisonSelectionChipLabel(i);
      chip.title = getComparisonSelectionChipTitle(i);
      chip.addEventListener('click', () => {
        toggleComparisonLaneSelection(i, { source: 'panel' });
      });
      comparisonLaneSelector.appendChild(chip);
    }
  }

  function renderComparisonUiDomState() {
    const selecting = comparisonIsSelecting();
    const confirmed = comparisonIsConfirmed();
    if (comparisonSelectionFrameEl) {
      comparisonSelectionFrameEl.classList.remove('is-active');
    }
    if (btnComparisonConfirm) {
      btnComparisonConfirm.classList.toggle('is-visible', selecting);
      btnComparisonConfirm.disabled = !comparisonHasSelection();
      btnComparisonConfirm.textContent = 'Compare';
    }
    if (comparisonPreserveSelectionInput) {
      comparisonPreserveSelectionInput.checked = !!uiState.modePanels.comparison.preserveSelectionOnEnter;
    }

    if (selecting) {
      hideAwardsOverlays();
    }

  }

  function markComparisonLayoutDirty() {
    comparisonNeedsLayoutRefresh = true;
  }

  function resetComparisonSelectionState({ clearSelection = true } = {}) {
    clearComparisonDeferredPause();
    clearComparisonConfirmTransition();
    if (clearSelection) {
      comparisonSelectedLaneIds.clear();
      comparisonLaneDisplayOrder = [];
    } else {
      ensureComparisonLaneOrder();
    }
    comparisonState.phase = 'selecting';
    comparisonState.dragLaneId = null;
    comparisonState.dragPointerId = null;
    comparisonState.dragOffsetY = 0;
    comparisonState.pendingConfirmTransition = 'none';
    comparisonState.pendingTransitionFromLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    markComparisonLayoutDirty();
    pauseVideoForComparisonSelection();
    updateLaneInteractionAffordances();
    updateExitButtonVisibility();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
    noteViewModeStateChanged(clearSelection ? 'comparison:reset-selection' : 'comparison:selection-empty');
    requestOverlayRefresh();
  }

  function setComparisonLaneSelection(laneId, selected, opts = {}) {
    const id = Number(laneId);
    if (!Number.isFinite(id)) return;
    const had = comparisonSelectedLaneIds.has(id);
    if (selected && !had) {
      comparisonSelectedLaneIds.add(id);
      if (!comparisonLaneDisplayOrder.includes(id)) comparisonLaneDisplayOrder.push(id);
    } else if (!selected && had) {
      comparisonSelectedLaneIds.delete(id);
      comparisonLaneDisplayOrder = comparisonLaneDisplayOrder.filter(x => x !== id);
    } else {
      return;
    }

    ensureComparisonLaneOrder();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
    markComparisonLayoutDirty();

    if (comparisonState.phase === 'confirmed' && !comparisonHasSelection()) {
      resetComparisonSelectionState({ clearSelection: false });
      return;
    }

    if (comparisonState.phase === 'confirmed') {
      updateExitButtonVisibility();
    }

    if (opts.record !== false) {
      noteViewModeStateChanged(`comparison:lane-${selected ? 'add' : 'remove'}`);
    }

    if (opts.refresh !== false) {
      requestOverlayRefresh();
    }
  }

  function toggleComparisonLaneSelection(laneId, opts = {}) {
    const id = Number(laneId);
    if (!Number.isFinite(id)) return;
    const next = !comparisonSelectedLaneIds.has(id);
    setComparisonLaneSelection(id, next, opts);
  }

  function confirmComparisonSelection() {
    if (!comparisonHasSelection()) return;
    clearComparisonDeferredPause();
    comparisonLaneDisplayOrder = comparisonUsesRankSelection()
      ? cloneArrayNums(Array.from(comparisonSelectedLaneIds)).sort((a, b) => a - b)
      : sortLaneIdsByDefaultVisualOrder(Array.from(comparisonSelectedLaneIds));
    ensureComparisonLaneOrder();
    comparisonState.phase = 'confirmed';
    comparisonState.dragLaneId = null;
    comparisonState.dragPointerId = null;
    comparisonState.dragOffsetY = 0;
    comparisonState.pendingConfirmTransition = 'full';
    comparisonState.pendingTransitionFromLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    markComparisonLayoutDirty();
    updateLaneInteractionAffordances();
    updateExitButtonVisibility();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
    noteViewModeStateChanged('comparison:confirm');
    resumeVideoFromComparisonConfirm();
    requestOverlayRefresh();
  }

  function resetComparisonConfirmedToSelection() {
    if (uiState.viewMode !== 'comparison') return;
    clearComparisonDeferredPause();
    clearComparisonConfirmTransition();
    comparisonState.phase = 'selecting';
    comparisonState.dragLaneId = null;
    comparisonState.dragPointerId = null;
    comparisonState.dragOffsetY = 0;
    comparisonState.pendingConfirmTransition = 'none';
    comparisonState.pendingTransitionFromLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    markComparisonLayoutDirty();
    pauseVideoForComparisonSelection();
    updateLaneInteractionAffordances();
    updateExitButtonVisibility();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
    noteViewModeStateChanged('comparison:reset-to-selecting');
    requestOverlayRefresh();
  }

  function enterComparisonMode(prevMode, opts = {}) {
    clearComparisonDeferredPause();
    clearComparisonExitTransition();
    clearComparisonConfirmTransition();
    const pauseOnEnter = opts.pauseOnEnter !== false;
    const snapshotState = opts.snapshotState || null;
    const prevComparisonState = opts.prevComparisonState || null;
    const fromPlayback = !!opts.fromPlayback;
    const preserveOnEnter = !!uiState.modePanels.comparison.preserveSelectionOnEnter;
    const hadConfirmedSelection =
      comparisonState.phase === 'confirmed' && comparisonHasSelection();
    const shouldPreserveConfirmed = preserveOnEnter && hadConfirmedSelection;
    let transitionTypeUsed = 'hardcut';
    if (currentShotId === 'track') {
      transitionTypeUsed = (prevMode === 'tracking')
        ? resolveTrackingTransitionType()
        : 'hardcut';
      switchCameraShot('wide', defaultShot, {
        focusedLaneId: null,
        transitionType: transitionTypeUsed
      });
    } else if (currentShotId !== 'wide') {
      transitionTypeUsed = 'hardcut';
      switchCameraShot('wide', defaultShot, { focusedLaneId: null, transitionType: 'hardcut' });
    }

    if (snapshotState) {
      comparisonSelectedLaneIds.clear();
      cloneArrayNums(snapshotState.selectedLaneIds).forEach(id => comparisonSelectedLaneIds.add(id));
      comparisonLaneDisplayOrder = cloneArrayNums(snapshotState.displayOrder);
      comparisonState.selectionMode = normalizeComparisonSelectionMode(snapshotState.selectionMode);
      ensureComparisonLaneOrder();
      comparisonState.phase = normalizeComparisonPhaseForTimeline(snapshotState.phase);
    } else {
      comparisonState.selectionMode = normalizeComparisonSelectionMode(prevComparisonState?.selectionMode ?? comparisonState.selectionMode);
      if (shouldPreserveConfirmed) {
        ensureComparisonLaneOrder();
        comparisonState.phase = 'confirmed';
      } else {
        comparisonSelectedLaneIds.clear();
        comparisonLaneDisplayOrder = [];
        comparisonState.phase = 'selecting';
      }
    }
    if (!comparisonHasSelection()) {
      comparisonState.phase = 'selecting';
    }

    if (comparisonState.phase === 'confirmed' && !comparisonHasSelection()) {
      comparisonState.phase = 'selecting';
    }

    comparisonState.dragLaneId = null;
    comparisonState.dragPointerId = null;
    comparisonState.dragOffsetY = 0;
    comparisonState.pendingConfirmTransition = 'none';
    comparisonState.pendingTransitionFromLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    if (comparisonState.phase === 'confirmed' && comparisonHasSelection()) {
      if (prevMode !== 'comparison') {
        comparisonState.pendingConfirmTransition = 'full';
      } else {
        const prevPhase = normalizeComparisonPhaseForTimeline(prevComparisonState?.phase);
        if (prevPhase !== 'confirmed') {
          comparisonState.pendingConfirmTransition = 'full';
        } else {
          const prevSelected = cloneArrayNums(prevComparisonState?.selectedLaneIds).sort((a, b) => a - b);
          const nextSelected = Array.from(comparisonSelectedLaneIds).sort((a, b) => a - b);
          const prevOrder = cloneArrayNums(prevComparisonState?.displayOrder).filter(id => prevSelected.includes(id));
          const nextOrder = cloneArrayNums(comparisonLaneDisplayOrder).filter(id => nextSelected.includes(id));
          const prevLayout = prevComparisonState?.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
          const nextLayout = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
          const lanesChanged = !sameNumberArray(prevSelected, nextSelected);
          const orderChanged = !sameNumberArray(prevOrder, nextOrder);
          const layoutChanged = prevLayout !== nextLayout;
          comparisonState.pendingTransitionFromLayout = prevLayout;

          if (layoutChanged && !lanesChanged && !orderChanged && prevLayout === 'sideBySide' && nextLayout === 'overlay') {
            comparisonState.pendingConfirmTransition = 'layout';
          } else if (lanesChanged || orderChanged || !fromPlayback) {
            comparisonState.pendingConfirmTransition = 'rows';
          }
        }
      }
    }

    if (comparisonState.phase === 'selecting' && pauseOnEnter) {
      const delayMs = estimateCameraTransitionDurationMs(transitionTypeUsed);
      if (delayMs > 0 && videoEl && !videoEl.paused) {
        comparisonState.phase = 'idle';
        comparisonDeferredPauseTimer = setTimeout(() => {
          comparisonDeferredPauseTimer = 0;
          if (uiState.viewMode !== 'comparison') return;
          if (comparisonState.phase !== 'idle') return;
          comparisonState.phase = 'selecting';
          pauseVideoForComparisonSelection();
          updateLaneInteractionAffordances();
          renderComparisonUiDomState();
          requestOverlayRefresh();
        }, delayMs + 20);
      } else {
        pauseVideoForComparisonSelection();
      }
    } else if (comparisonState.phase === 'selecting' && !pauseOnEnter) {
      clearComparisonDeferredPause();
    }

    markComparisonLayoutDirty();
    updateLaneInteractionAffordances();
    updateExitButtonVisibility();
    renderComparisonLaneSelector();
    renderComparisonUiDomState();
    requestOverlayRefresh();
  }

  function leaveComparisonModePresentation() {
    clearComparisonDeferredPause();
    clearComparisonConfirmTransition();
    clearComparisonExitTransition();
    comparisonSelectionLayer.visible = false;
    comparisonSelectionLayer.renderable = false;
    comparisonSelectionGlowGraphics.clear();
    comparisonSelectionCheckboxGraphics.clear();
    comparisonDisplayLayer.visible = false;
    comparisonDisplayLayer.renderable = false;
    comparisonDisplayLayer.interactive = true;
    comparisonDisplayLayer.interactiveChildren = true;
    comparisonDisplayBackdrop.clear();
    comparisonDisplayRowsLayer.interactive = true;
    comparisonDisplayRowsLayer.interactiveChildren = true;
    comparisonPinnedHudLayer.visible = false;
    comparisonPinnedHudLayer.renderable = false;
    if (comparisonBlurBgSprite) {
      comparisonBlurBgSprite.visible = false;
      comparisonBlurBgSprite.renderable = false;
    }
    comparisonRowsByLaneId.forEach((entry) => clearComparisonRowInsightInstances(entry));
    syncComparisonPinnedHudLayer();
    renderComparisonUiDomState();
  }

  function getLaneScreenRectFromClickZone(laneId) {
    const laneNum = Number(laneId);
    const record = laneZoneGraphics.get(laneNum);
    let screenQuad = record?.screenQuad;
    if (!Array.isArray(screenQuad) || screenQuad.length !== 4) {
      const laneY = record?.laneY ?? getTrackYForId(laneNum) ?? baselineYById.get(laneNum) ?? null;
      if (!Number.isFinite(laneY)) return null;
      const { topY, bottomY } = getLaneClickZoneBoundsVideoY(laneNum, laneY);
      const tl = projectPointFromCurrentShot(0, topY);
      const tr = projectPointFromCurrentShot(videoW, topY);
      const br = projectPointFromCurrentShot(videoW, bottomY);
      const bl = projectPointFromCurrentShot(0, bottomY);
      screenQuad = [
        { x: tl.cx, y: tl.cy },
        { x: tr.cx, y: tr.cy },
        { x: br.cx, y: br.cy },
        { x: bl.cx, y: bl.cy }
      ];
    }
    const xs = screenQuad.map(pt => pt.x);
    const ys = screenQuad.map(pt => pt.y);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(getViewportWidth() || 0, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(getViewportHeight() || 0, Math.max(...ys));
    const w = maxX - minX;
    const h = maxY - minY;
    if (!(w > 2 && h > 2)) return null;
    return {
      x: minX,
      y: minY,
      w,
      h,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2
    };
  }

  function clearComparisonSelectionOverlay() {
    comparisonSelectionGlowGraphics.clear();
    comparisonSelectionCheckboxGraphics.clear();
    comparisonSelectionLayer.visible = false;
    comparisonSelectionLayer.renderable = false;
  }

  function renderComparisonSelectionOverlay(now) {
    if (!comparisonIsSelecting()) {
      clearComparisonSelectionOverlay();
      return;
    }

    const vw = getViewportWidth() || 0;
    const vh = getViewportHeight() || 0;
    if (!(vw > 0 && vh > 0)) {
      clearComparisonSelectionOverlay();
      return;
    }

    comparisonSelectionLayer.visible = true;
    comparisonSelectionLayer.renderable = true;
    comparisonSelectionGlowGraphics.clear();
    comparisonSelectionCheckboxGraphics.clear();

    const pulse = 0.55 + 0.45 * Math.sin((now || performance.now()) / 260);
    comparisonSelectionGlowGraphics.beginFill(0x000000, 0.02 + 0.03 * pulse);
    comparisonSelectionGlowGraphics.drawRect(0, 0, vw, vh);
    comparisonSelectionGlowGraphics.endFill();

    const laneCount = laneCountGlobal || 8;
    const frameAthletes = getCurrentComparisonFrameAthletes();
    for (let laneId = 1; laneId <= laneCount; laneId += 1) {
      const record = laneZoneGraphics.get(laneId);
      const rect = getLaneScreenRectFromClickZone(laneId);
      if (!record?.screenQuad?.length || !rect) continue;
      const selectionValue = resolveComparisonSelectionValueForLaneId(laneId, frameAthletes);
      const isSelected = Number.isFinite(selectionValue) && comparisonSelectedLaneIds.has(selectionValue);

      const boxSize = 18;
      const pad = 6;
      const boxX = Math.max(4, Math.min(vw - boxSize - 4, rect.x + rect.w - boxSize - pad));
      const boxY = Math.max(4, Math.min(vh - boxSize - 4, rect.y + pad));
      comparisonSelectionCheckboxGraphics.beginFill(0x080b12, isSelected ? 0.88 : 0.55);
      comparisonSelectionCheckboxGraphics.drawRoundedRect(boxX, boxY, boxSize, boxSize, 4);
      comparisonSelectionCheckboxGraphics.endFill();
      comparisonSelectionCheckboxGraphics.lineStyle(1.25, 0xffffff, isSelected ? 0.92 : 0.42);
      comparisonSelectionCheckboxGraphics.drawRoundedRect(boxX, boxY, boxSize, boxSize, 4);
      comparisonSelectionCheckboxGraphics.lineStyle(0);

      if (isSelected) {
        comparisonSelectionCheckboxGraphics.lineStyle(2.0, 0xffffff, 0.95);
        comparisonSelectionCheckboxGraphics.moveTo(boxX + 4.2, boxY + 9.6);
        comparisonSelectionCheckboxGraphics.lineTo(boxX + 7.7, boxY + 13.1);
        comparisonSelectionCheckboxGraphics.lineTo(boxX + 13.8, boxY + 5.3);
        comparisonSelectionCheckboxGraphics.lineStyle(0);
      }
    }
  }

  function destroyComparisonRowEntry(entry) {
    if (!entry) return;
    if (entry.insightInstances instanceof Map) {
      entry.insightInstances.forEach((inst) => {
        if (inst?.container?.parent) inst.container.parent.removeChild(inst.container);
        if (inst?.container?.destroy) {
          inst.container.destroy({ children: true });
        }
      });
      entry.insightInstances.clear();
    }
    if (entry.subTexture) {
      try {
        entry.subTexture.destroy(false);
      } catch (err) {
        console.warn('Failed to destroy comparison subTexture', err);
      }
      entry.subTexture = null;
    }
    if (entry.container?.parent) entry.container.parent.removeChild(entry.container);
    if (entry.container?.destroy) {
      entry.container.destroy({ children: true });
    }
  }

  function ensureComparisonCompositeRT() {
    const vw = Math.max(1, Math.round(getViewportWidth() || 0));
    const vh = Math.max(1, Math.round(getViewportHeight() || 0));
    if (!(vw > 0 && vh > 0)) return null;

    if (comparisonCompositeRT && comparisonCompositeRT.width === vw && comparisonCompositeRT.height === vh) {
      return comparisonCompositeRT;
    }

    if (comparisonCompositeRT) {
      try {
        comparisonCompositeRT.destroy(true);
      } catch (err) {
        console.warn('Failed to destroy previous comparison RT', err);
      }
      comparisonCompositeRT = null;
    }

    comparisonCompositeRT = PIXI.RenderTexture.create({ width: vw, height: vh });
    comparisonRowsByLaneId.forEach((entry) => {
      if (entry.subTexture) {
        try {
          entry.subTexture.destroy(false);
        } catch (err) {
          console.warn('Failed to destroy comparison row subTexture during RT resize', err);
        }
        entry.subTexture = null;
      }
    });
    markComparisonLayoutDirty();
    return comparisonCompositeRT;
  }

  function ensureComparisonRowEntry(laneId) {
    const id = Number(laneId);
    if (comparisonRowsByLaneId.has(id)) return comparisonRowsByLaneId.get(id);

    const container = new PIXI.Container();
    container.interactive = true;
    container.buttonMode = true;
    container.cursor = 'grab';
    const bg = new PIXI.Graphics();
    const spriteMask = new PIXI.Graphics();
    const sprite = new PIXI.Sprite();
    sprite.texture = PIXI.Texture.EMPTY;
    sprite.position.set(0, 0);
    sprite.mask = spriteMask;
    const insightLayer = new PIXI.Container();
    insightLayer.interactive = false;
    insightLayer.interactiveChildren = false;
    const labelBg = new PIXI.Graphics();
    const labelText = new PIXI.Text(`Lane ${id}`, {
      fontSize: 11,
      fill: 0xffffff,
      fontWeight: '700',
      fontFamily: 'system-ui',
      resolution: Math.max(1, app.renderer?.resolution || 1)
    });
    labelText.position.set(8, 4);
    container.addChild(bg);
    container.addChild(spriteMask);
    container.addChild(sprite);
    container.addChild(insightLayer);
    container.addChild(labelBg);
    container.addChild(labelText);
    container.on('pointerdown', (ev) => startComparisonRowDrag(id, ev));
    container.on('pointerup', endComparisonRowDrag);
    container.on('pointerupoutside', endComparisonRowDrag);
    comparisonDisplayRowsLayer.addChild(container);

    const entry = {
      laneId: id,
      container,
      bg,
      spriteMask,
      sprite,
      insightLayer,
      labelBg,
      labelText,
      insightInstances: new Map(),
      subTexture: null,
      sourceRect: null,
      targetRect: null
    };
    comparisonRowsByLaneId.set(id, entry);
    return entry;
  }

  function syncComparisonRowEntriesToSelection() {
    const selected = new Set(getComparisonOrderedSelectedLanes());
    comparisonRowsByLaneId.forEach((entry, laneId) => {
      if (!selected.has(laneId)) {
        destroyComparisonRowEntry(entry);
        comparisonRowsByLaneId.delete(laneId);
      }
    });
    selected.forEach((laneId) => {
      ensureComparisonRowEntry(laneId);
    });
  }

  function buildComparisonRowSubTexture(entry, sourceRect) {
    if (!entry || !comparisonCompositeRT || !sourceRect) return;
    const rtBase = comparisonCompositeRT.baseTexture;
    const frame = new PIXI.Rectangle(
      Math.round(sourceRect.x),
      Math.round(sourceRect.y),
      Math.max(1, Math.round(sourceRect.w)),
      Math.max(1, Math.round(sourceRect.h))
    );
    const sameFrame = entry.subTexture
      && entry.sourceRect
      && entry.sourceRect.x === frame.x
      && entry.sourceRect.y === frame.y
      && entry.sourceRect.w === frame.width
      && entry.sourceRect.h === frame.height
      && entry.subTexture.baseTexture === rtBase;

    if (!sameFrame) {
      if (entry.subTexture) {
        try {
          entry.subTexture.destroy(false);
        } catch (err) {
          console.warn('Failed to destroy stale comparison row texture', err);
        }
      }
      entry.subTexture = new PIXI.Texture(rtBase, frame);
      entry.sprite.texture = entry.subTexture;
      entry.sourceRect = { x: frame.x, y: frame.y, w: frame.width, h: frame.height };
    }
  }

  function clearComparisonRowInsightInstances(entry) {
    if (!entry?.insightInstances) return;
    entry.insightInstances.forEach((inst) => {
      if (inst?.container) {
        inst.container.visible = false;
        inst.container.renderable = false;
      }
    });
    if (entry?.insightLayer) {
      entry.insightLayer.visible = false;
      entry.insightLayer.renderable = false;
    }
  }

  function ensureComparisonInsightInstance(entry, elementId) {
    if (!entry?.insightLayer) return null;
    if (!(entry.insightInstances instanceof Map)) {
      entry.insightInstances = new Map();
    }
    const key = String(elementId);
    if (entry.insightInstances.has(key)) return entry.insightInstances.get(key);
    const inst = createInstanceContainers();
    inst.content.addChild(inst.barBg, inst.barFill, inst.barFill2, inst.circle, inst.flagSprite, inst.textBg, inst.text);
    inst.container.addChild(inst.content);
    inst.container.addChild(inst.rtSprite);
    inst.container.interactive = false;
    inst.container.renderable = false;
    inst.container.visible = false;
    entry.insightLayer.addChild(inst.container);
    entry.insightInstances.set(key, inst);
    return inst;
  }

  function setComparisonInsightInstanceVisible(entry, elementId, visible) {
    const inst = entry?.insightInstances instanceof Map ? entry.insightInstances.get(String(elementId)) : null;
    if (!inst?.container) return;
    inst.container.visible = !!visible;
    inst.container.renderable = !!visible;
  }

  function resolveComparisonRowLocalMetrics(entry) {
    const sourceRect = entry?.sourceRect;
    const targetRect = entry?.targetRect;
    const sourceW = Math.max(1, Number(sourceRect?.w) || 0);
    const sourceH = Math.max(1, Number(sourceRect?.h) || 0);
    const targetW = Math.max(1, Number(targetRect?.w) || 0);
    const targetH = Math.max(1, Number(targetRect?.h) || 0);
    const scale = targetW / sourceW;
    const yOffset = (targetH - (sourceH * scale)) / 2;
    return { scale, yOffset };
  }

  function mapComparisonScreenPointToRowLocal(entry, screenX, screenY) {
    if (!entry?.sourceRect || !entry?.targetRect) return null;
    const metrics = resolveComparisonRowLocalMetrics(entry);
    return {
      x: (Number(screenX) - Number(entry.sourceRect.x)) * metrics.scale,
      y: ((Number(screenY) - Number(entry.sourceRect.y)) * metrics.scale) + metrics.yOffset,
      scale: metrics.scale
    };
  }

  function getCurrentOverlayRenderContextSnapshot() {
    if (currentOverlayRenderContext?.frame) return currentOverlayRenderContext;
    const renderTimeSec = Number.isFinite(videoEl?.currentTime) ? Number(videoEl.currentTime) : Number(prevTimeSec || 0);
    const frame = overlay?.getFrameByTime?.(renderTimeSec);
    const athletes = Array.isArray(frame?.athletes) ? frame.athletes : (Array.isArray(frame?.lanes) ? frame.lanes : []);
    const frameTimeSec = frame
      ? getFrameTimeSec(frame, overlay?.fps || 50, renderTimeSec)
      : renderTimeSec;
    const direction = resolveDirection(frame || { direction: defaultDirection });
    const averageLaneZoneHeightPx = getAverageLaneZoneHeightPx();
    const { derivedById } = buildDerivedMetricsForFrame({
      athletes,
      frameTimeSec,
      fps: overlay?.fps || 50,
      raceLength: getOverlayRaceLength(),
      runtimeState: metricRuntimeState
    });
    return {
      frame,
      athletes,
      frameTimeSec,
      renderTimeSec,
      direction,
      derivedById,
      averageLaneZoneHeightPx
    };
  }

  function resolveComparisonInsightBasePlacement(el, activeConfig, athlete, currentDirection, repType) {
    if (!athlete) return null;
    const rawY = (typeof athlete.y === 'number' ? athlete.y : (typeof athlete.cy === 'number' ? athlete.cy : null));
    const rawX = resolveAthleteCenterX(athlete);
    const yTarget = getTrackYForId(athlete.id) ?? rawY;
    if (!isFiniteNumber(rawX) || !isFiniteNumber(yTarget)) return null;
    const laneStaticPlacement = activeConfig.follow === false && usesStaticLanePosition(el.typeId)
      ? normalizeStaticPlacement(el.typeId, activeConfig.staticPlacement)
      : '';
    const laneStaticRect = laneStaticPlacement ? getLaneScreenRectFromClickZone(athlete.id) : null;
    if (laneStaticPlacement && laneStaticRect) {
      const laneStaticLayout = resolveLaneStaticScreenPlacement(
        laneStaticRect,
        laneStaticPlacement,
        supportsStaticTextAlign(el.typeId, repType) ? activeConfig.staticAlign : null
      );
      return {
        screenX: laneStaticLayout.x + Number(activeConfig.offsetX || 0),
        screenY: laneStaticLayout.y + Number(activeConfig.offsetY || 0),
        laneStaticPlacement,
        laneStaticRect,
        laneStaticLayout
      };
    }
    const effectiveOffsetX = activeConfig.follow !== false
      ? resolveBehindSwimmerOffsetX(activeConfig.offsetX || 0, currentDirection)
      : Number(activeConfig.offsetX || 0);
    const px = rawX + effectiveOffsetX;
    const py = yTarget + Number(activeConfig.offsetY || 0);
    const proj = projectPointFromCurrentShot(px, py);
    return {
      screenX: proj.cx,
      screenY: proj.cy,
      laneStaticPlacement: '',
      laneStaticRect: null,
      laneStaticLayout: null
    };
  }

  function renderComparisonInsightRows() {
    const ctx = getCurrentOverlayRenderContextSnapshot();
    const athletes = Array.isArray(ctx?.athletes) ? ctx.athletes : [];
    if (!athletes.length) {
      comparisonRowsByLaneId.forEach((entry) => clearComparisonRowInsightInstances(entry));
      return;
    }

    const currentDirection = ctx.direction;
    const dirSign = resolveDirectionSign(currentDirection);
    const insightElements = [...elements.values()].filter((el) => INSIGHT_LAYER_TYPES.has(String(el?.typeId || '')));

    comparisonRowsByLaneId.forEach((entry) => {
      if (!entry?.container?.visible || !entry?.sourceRect || !entry?.targetRect || !entry?.insightLayer) {
        clearComparisonRowInsightInstances(entry);
        return;
      }

      const athlete = findAthleteInFrameByLaneId(athletes, entry.laneId);
      if (!athlete) {
        clearComparisonRowInsightInstances(entry);
        return;
      }

      const usedKeys = new Set();
      insightElements.forEach((el) => {
        const segmentMotionState = getLayerSegmentMotionState(el, ctx.renderTimeSec);
        const activeConfig = segmentMotionState.settings || getPrimaryElementState(el) || el;
        const validityMotionState = getMetricValidityMotionState(el.typeId, ctx.renderTimeSec, {
          motionEnabled: activeConfig?.segmentMotion !== false && !usesGlobalCornerPlacement(el.typeId)
        });
        const metricDef = METRIC_DEFINITIONS[el.typeId];
        const repType = ensureElementRepStyleState(activeConfig);
        const laneSelection = resolveRenderableLaneSelection(
          activeConfig.lanes instanceof Set ? activeConfig.lanes : el.lanes,
          activeConfig.laneSelectionMode ?? el?.laneSelectionMode ?? 'lane',
          athletes
        );
        const segmentVisible = activeConfig?.visible !== false;
        const motionFactor = clamp01(
          (segmentMotionState.factor ?? 0) * (validityMotionState.factor ?? 1)
        );
        const shouldAttemptRender = !!(el.visible && segmentVisible && metricDef && motionFactor > 0.001 && laneSelection.has(Number(athlete.id)));
        if (!shouldAttemptRender) {
          setComparisonInsightInstanceVisible(entry, el.id, false);
          return;
        }

        const placement = resolveComparisonInsightBasePlacement(el, activeConfig, athlete, currentDirection, repType);
        const mapped = placement
          ? mapComparisonScreenPointToRowLocal(entry, placement.screenX, placement.screenY)
          : null;
        if (!mapped) {
          setComparisonInsightInstanceVisible(entry, el.id, false);
          return;
        }

        const meta = athleteMetaById.get(athlete.id) || {};
        const derived = ctx.derivedById.get(athlete.id) || {};
        const color = hexToPixi(activeConfig.color || '#d3d3d3');
        const val = metricDef.getValue({
          athlete,
          meta,
          derived,
          frameTimeSec: ctx.frameTimeSec,
          raceLength: getOverlayRaceLength(),
          insightState: currentInsightLayerState,
          direction: currentDirection
        });
        if (!val) {
          setComparisonInsightInstanceVisible(entry, el.id, false);
          return;
        }

        const baseSpec = metricDef.buildSpec(repType, {
          value: val,
          athlete,
          meta,
          derived,
          frameTimeSec: ctx.frameTimeSec,
          direction: currentDirection,
          placementDirection: currentDirection,
          insightState: currentInsightLayerState,
          videoDuration,
          raceLength: getOverlayRaceLength(),
          color,
          runtimeState: metricRuntimeState,
          videoHeight: videoH,
          laneZoneHeight: getAverageLaneZoneHeightPx(),
          flagWidth: FLAG_DISPLAY_W,
          flagHeight: FLAG_DISPLAY_H,
          formatTime
        }) || {};

        const autoFontSize = repType === 'text' && placement.laneStaticPlacement && placement.laneStaticRect
          ? getSuggestedStaticTextFontSize(el.typeId, ctx.averageLaneZoneHeightPx)
          : null;
        if ((repType === 'text' || repType === 'medalSummary' || repType === 'ringsCount' || repType === 'flag')
          && placement.laneStaticPlacement
          && placement.laneStaticLayout) {
          baseSpec.anchorX = placement.laneStaticLayout.anchorX;
          baseSpec.anchorY = placement.laneStaticLayout.anchorY;
          baseSpec.x = 0;
          baseSpec.y = 0;
          baseSpec.align = placement.laneStaticLayout.align;
          baseSpec.maxWidth = placement.laneStaticLayout.maxWidth;
          baseSpec.backgroundKey = `comparison-${entry.laneId}-${el.id}-${athlete.id}`;
        }

        const repPropsForRender = getEffectiveRepPropsForRender(activeConfig, repType, autoFontSize, el.typeId);
        const spec = applyRepresentationStyle(repType, baseSpec, repPropsForRender, activeConfig.styleOverrides, color);
        const inst = ensureComparisonInsightInstance(entry, el.id);
        if (!inst) return;
        resetInstanceVisualState(inst);
        renderRepresentation(inst, repType, spec || {}, { normalizeFlagTexture });

        const scaleAdjust = placement.laneStaticPlacement
          ? 1
          : getNonProjectedRepresentationScaleAdjustment(el.typeId, repType, spec);
        const effectiveScaleVal = (Number(activeConfig.scale) || 1) * scaleAdjust;
        inst.container.visible = true;
        inst.container.renderable = true;
        inst.container.alpha = (activeConfig.alpha ?? 0.9) * motionFactor;
        inst.container.position.set(mapped.x, mapped.y);
        inst.container.scale.set(
          effectiveScaleVal * mapped.scale * motionFactor,
          effectiveScaleVal * mapped.scale
        );
        inst.container.rotation = (activeConfig.rotation || 0) * Math.PI / 180;
        inst.container.zIndex = Number.isFinite(Number(el.zIndex)) ? Number(el.zIndex) : 0;
        inst.content.visible = true;
        inst.rtSprite.visible = false;

        if (!placement.laneStaticPlacement) {
          const localBounds = inst.content.getLocalBounds();
          const baseHalfW = Math.max(1, localBounds.width || 0) * effectiveScaleVal * mapped.scale * 0.5;
          const activeDirSign = activeConfig.follow !== false ? resolveDirectionSign(currentDirection) : dirSign;
          const anchorSide = activeDirSign > 0 ? -1 : 1;
          const anchorShift = -anchorSide * baseHalfW * (1 - motionFactor);
          const rotRad = inst.container.rotation || 0;
          inst.container.position.set(
            mapped.x + (anchorShift * Math.cos(rotRad)),
            mapped.y + (anchorShift * Math.sin(rotRad))
          );
        }
        usedKeys.add(String(el.id));
      });

      entry.insightInstances.forEach((inst, key) => {
        if (!usedKeys.has(key) && inst?.container) {
          inst.container.visible = false;
          inst.container.renderable = false;
        }
      });
      entry.insightLayer.visible = usedKeys.size > 0;
      entry.insightLayer.renderable = usedKeys.size > 0;
      entry.insightLayer.sortableChildren = true;
    });
  }

  function getComparisonOrderedSelectedLanes() {
    const athletes = getCurrentComparisonFrameAthletes();
    const seenLaneIds = new Set();
    return getComparisonOrderedSelectedValues()
      .map((selectionValue) => resolveComparisonLaneIdFromSelectionValue(selectionValue, athletes))
      .filter((laneId) => {
        const normalized = Number(laneId);
        if (!Number.isFinite(normalized) || seenLaneIds.has(normalized)) return false;
        seenLaneIds.add(normalized);
        return true;
      });
  }

  function computeComparisonTargetRects() {
    const lanes = getComparisonOrderedSelectedLanes();
    const vw = getViewportWidth() || 0;
    const vh = getViewportHeight() || 0;
    const n = lanes.length;
    const rects = [];
    if (!(vw > 0 && vh > 0) || n === 0) return rects;

    const mode = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    const baseMaxW = mode === 'overlay'
      ? Math.max(80, vw - Math.max(7, Math.round(vw * 0.03)) * 2)
      : vw;

    const laneSizeMeta = lanes.map((laneId) => {
      const src = getLaneScreenRectFromClickZone(laneId);
      const srcW = Math.max(1, src?.w || vw || 1);
      const srcH = Math.max(1, src?.h || (vh / Math.max(1, n)));
      const scale = baseMaxW / srcW;
      return {
        laneId,
        srcW,
        srcH,
        baseH: srcH * scale
      };
    });

    const totalBaseH = laneSizeMeta.reduce((sum, item) => sum + item.baseH, 0);
    const fitScale = totalBaseH > vh && totalBaseH > 0 ? (vh / totalBaseH) : 1;
    const finalW = Math.max(1, baseMaxW * fitScale);
    const totalFinalH = laneSizeMeta.reduce((sum, item) => sum + item.baseH * fitScale, 0);
    const startX = (vw - finalW) / 2;
    let yCursor = (vh - totalFinalH) / 2;

    laneSizeMeta.forEach((item) => {
      const rowH = Math.max(1, item.baseH * fitScale);
      rects.push({
        laneId: item.laneId,
        x: startX,
        y: yCursor,
        w: finalW,
        h: rowH
      });
      yCursor += rowH;
    });
    return rects;
  }

  function syncComparisonRowZOrder() {
    comparisonDisplayRowsLayer.children.forEach((child, idx) => {
      child.zIndex = idx;
    });
    comparisonDisplayRowsLayer.sortableChildren = true;
    if (comparisonState.dragLaneId != null) {
      const dragEntry = comparisonRowsByLaneId.get(comparisonState.dragLaneId);
      if (dragEntry?.container) {
        dragEntry.container.zIndex = 999;
      }
    }
  }

  function applyComparisonRowVisual(entry, targetRect, mode) {
    if (!entry || !targetRect) return;
    const rankSelection = comparisonUsesRankSelection();
    entry.targetRect = { ...targetRect };
    entry.container.visible = true;
    entry.container.renderable = true;
    entry.container.interactive = !rankSelection;
    entry.container.buttonMode = !rankSelection;
    entry.container.cursor = rankSelection ? 'default' : (comparisonState.dragLaneId === entry.laneId ? 'grabbing' : 'grab');
    entry.container.hitArea = new PIXI.Rectangle(0, 0, targetRect.w, targetRect.h);

    entry.bg.clear();
    if (mode === 'overlay') {
      entry.bg.beginFill(0x070a12, 0.24);
      entry.bg.drawRoundedRect(0, 0, targetRect.w, targetRect.h, 8);
      entry.bg.endFill();
      entry.bg.lineStyle(1, 0xffffff, 0.18);
      entry.bg.drawRoundedRect(0.5, 0.5, Math.max(1, targetRect.w - 1), Math.max(1, targetRect.h - 1), 8);
      entry.bg.lineStyle(0);
    } else {
      entry.bg.beginFill(0x000000, 0.001);
      entry.bg.drawRect(0, 0, targetRect.w, targetRect.h);
      entry.bg.endFill();
    }
    if (entry.spriteMask) {
      entry.spriteMask.clear();
      if (mode === 'overlay') {
        entry.spriteMask.beginFill(0xffffff, 1);
        entry.spriteMask.drawRoundedRect(0, 0, targetRect.w, targetRect.h, 8);
        entry.spriteMask.endFill();
      } else {
        entry.spriteMask.beginFill(0xffffff, 1);
        entry.spriteMask.drawRect(0, 0, targetRect.w, targetRect.h);
        entry.spriteMask.endFill();
      }
      entry.spriteMask.renderable = false;
    }

    const src = entry.sourceRect;
    const naturalW = Math.max(1, src?.w || entry.sprite.texture?.width || targetRect.w);
    const naturalH = Math.max(1, src?.h || entry.sprite.texture?.height || targetRect.h);
    const scaleX = targetRect.w / naturalW;
    const displayW = targetRect.w;
    const displayH = naturalH * scaleX;

    entry.sprite.width = displayW;
    entry.sprite.height = displayH;
    entry.sprite.position.set(0, (targetRect.h - displayH) / 2);

    const labelText = entry.labelText;
    if (labelText) {
      const selectedRank = rankSelection ? resolveComparisonSelectionValueForLaneId(entry.laneId) : null;
      labelText.text = rankSelection && Number.isFinite(selectedRank)
        ? `#${selectedRank} · Lane ${entry.laneId}`
        : `Lane ${entry.laneId}`;
      labelText.style.fill = 0xffffff;
      labelText.position.set(8, 4);
      const labelSample = rankSelection
        ? `#${Math.max(8, Number(laneCountGlobal || 8))} · Lane ${Math.max(8, Number(laneCountGlobal || 8))}`
        : `Lane ${Math.max(8, Number(laneCountGlobal || 8))}`;
      const labelMetrics = measurePixiTextBox(labelText, labelSample);
      const labelBgSize = resolveFixedTextBackgroundSize(
        entry,
        'comparison-lane-label',
        labelMetrics.width + 10,
        labelMetrics.height + 8,
        { minWidth: 40, minHeight: 18 }
      );
      entry.labelBg.clear();
      entry.labelBg.beginFill(0x000000, mode === 'overlay' ? 0.52 : 0.34);
      entry.labelBg.drawRoundedRect(4, 2, labelBgSize.width, labelBgSize.height, 6);
      entry.labelBg.endFill();
      entry.labelBg.lineStyle(1, laneColor(entry.laneId), 0.45);
      entry.labelBg.drawRoundedRect(4.5, 2.5, Math.max(1, labelBgSize.width - 1), Math.max(1, labelBgSize.height - 1), 6);
      entry.labelBg.lineStyle(0);
      entry.labelBg.visible = true;
      labelText.visible = true;
    }

    if (comparisonState.dragLaneId !== entry.laneId) {
      entry.container.position.set(targetRect.x, targetRect.y);
    } else {
      entry.container.x = targetRect.x;
    }
  }

  function layoutComparisonRows() {
    if (!comparisonIsConfirmed()) {
      comparisonLaneLayoutRects.clear();
      comparisonDisplayBackdrop.clear();
      comparisonDisplayRowsLayer.visible = false;
      comparisonDisplayRowsLayer.renderable = false;
      comparisonRowsByLaneId.forEach((entry) => {
        if (entry?.container) {
          entry.container.visible = false;
          entry.container.renderable = false;
        }
      });
      return;
    }

    syncComparisonRowEntriesToSelection();
    comparisonDisplayRowsLayer.visible = true;
    comparisonDisplayRowsLayer.renderable = true;

    const mode = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    const rects = computeComparisonTargetRects();
    comparisonLaneLayoutRects.clear();
    rects.forEach((rect) => comparisonLaneLayoutRects.set(rect.laneId, rect));

    const vw = getViewportWidth() || 0;
    const vh = getViewportHeight() || 0;
    comparisonDisplayBackdrop.clear();
    if (mode === 'sideBySide') {
      comparisonDisplayBackdrop.beginFill(0x000000, 1);
      comparisonDisplayBackdrop.drawRect(0, 0, vw, vh);
      comparisonDisplayBackdrop.endFill();
      if (comparisonBlurBgSprite) {
        comparisonBlurBgSprite.visible = false;
        comparisonBlurBgSprite.renderable = false;
      }
    } else {
      if (comparisonBlurBgSprite && comparisonBlurBgSupported) {
        comparisonBlurBgSprite.visible = true;
        comparisonBlurBgSprite.renderable = true;
      } else if (comparisonBlurBgSprite) {
        comparisonBlurBgSprite.visible = false;
        comparisonBlurBgSprite.renderable = false;
        comparisonDisplayBackdrop.beginFill(0x04070f, 1);
        comparisonDisplayBackdrop.drawRect(0, 0, vw, vh);
        comparisonDisplayBackdrop.endFill();
      }
      comparisonDisplayBackdrop.beginFill(0x12161d, 0.28);
      comparisonDisplayBackdrop.drawRect(0, 0, vw, vh);
      comparisonDisplayBackdrop.endFill();
    }

    rects.forEach((targetRect) => {
      const entry = ensureComparisonRowEntry(targetRect.laneId);
      const sourceRect = getLaneScreenRectFromClickZone(targetRect.laneId);
      if (!sourceRect) {
        entry.container.visible = false;
        entry.container.renderable = false;
        return;
      }
      buildComparisonRowSubTexture(entry, sourceRect);
      applyComparisonRowVisual(entry, targetRect, mode);
    });

    syncComparisonRowZOrder();
    comparisonNeedsLayoutRefresh = false;
  }

  function renderComparisonCompositeTexture() {
    if (!comparisonIsConfirmed() || !videoReady) return;
    const rt = ensureComparisonCompositeRT();
    if (!rt) return;

    const hiddenLayers = [
      [comparisonDisplayLayer, comparisonDisplayLayer.visible, comparisonDisplayLayer.renderable],
      [comparisonSelectionLayer, comparisonSelectionLayer.visible, comparisonSelectionLayer.renderable],
      [comparisonPinnedHudLayer, comparisonPinnedHudLayer.visible, comparisonPinnedHudLayer.renderable],
      [cameraTransitionLayer, cameraTransitionLayer.visible, cameraTransitionLayer.renderable]
    ];

    hiddenLayers.forEach(([layer]) => {
      if (!layer) return;
      layer.visible = false;
      layer.renderable = false;
    });

    try {
      app.renderer.render(app.stage, { renderTexture: rt, clear: true });
    } catch (err) {
      console.warn('Comparison composite render failed', err);
    } finally {
      hiddenLayers.forEach(([layer, wasVisible, wasRenderable]) => {
        if (!layer) return;
        layer.visible = wasVisible;
        layer.renderable = wasRenderable;
      });
    }
  }

  function renderComparisonConfirmedLayout(now) {
    if (!comparisonIsConfirmed()) {
      comparisonDisplayLayer.visible = false;
      comparisonDisplayLayer.renderable = false;
      comparisonDisplayBackdrop.clear();
      comparisonDisplayBackdrop.alpha = 1;
      if (comparisonBlurBgSprite) {
        comparisonBlurBgSprite.visible = false;
        comparisonBlurBgSprite.renderable = false;
        comparisonBlurBgSprite.alpha = 1;
      }
      clearComparisonConfirmTransition();
      return;
    }

    comparisonDisplayLayer.visible = true;
    comparisonDisplayLayer.renderable = true;
    comparisonSelectionLayer.visible = false;
    comparisonSelectionLayer.renderable = false;

    renderComparisonCompositeTexture();
    if (comparisonNeedsLayoutRefresh) {
      layoutComparisonRows();
    } else {
      layoutComparisonRows();
    }
    renderComparisonInsightRows();

    const mode = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    if (comparisonTransitionState.active) {
      const t = clamp01(((Number.isFinite(now) ? now : performance.now()) - comparisonTransitionState.startMs)
        / Math.max(1, comparisonTransitionState.durationMs));
      const e = easeInOutCubic(t);
      const bgAlpha = lerp(
        comparisonTransitionState.fromBackdropAlpha,
        comparisonTransitionState.toBackdropAlpha,
        e
      );
      comparisonDisplayBackdrop.alpha = bgAlpha;
      if (comparisonBlurBgSprite) comparisonBlurBgSprite.alpha = bgAlpha;

      if (comparisonTransitionState.kind !== 'layout') {
        getComparisonOrderedSelectedLanes().forEach((laneId) => {
          const entry = comparisonRowsByLaneId.get(laneId);
          if (!entry) return;
          const fromRect = comparisonTransitionState.fromByLane.get(laneId) || entry.targetRect || comparisonLaneLayoutRects.get(laneId);
          const toRect = comparisonLaneLayoutRects.get(laneId)
            || comparisonTransitionState.toByLane.get(laneId)
            || fromRect;
          if (!fromRect || !toRect) return;
          const rect = {
            laneId,
            x: lerp(fromRect.x, toRect.x, e),
            y: lerp(fromRect.y, toRect.y, e),
            w: lerp(fromRect.w, toRect.w, e),
            h: lerp(fromRect.h, toRect.h, e)
          };
          applyComparisonRowVisual(entry, rect, mode);
          entry.container.alpha = 0.35 + (0.65 * e);
        });
      }

      if (t >= 1) {
        clearComparisonConfirmTransition();
        comparisonDisplayBackdrop.alpha = 1;
        if (comparisonBlurBgSprite) comparisonBlurBgSprite.alpha = 1;
        comparisonRowsByLaneId.forEach((entry) => {
          if (entry?.container) entry.container.alpha = 1;
        });
      }
      renderComparisonInsightRows();
      return;
    }

    comparisonDisplayBackdrop.alpha = 1;
    if (comparisonBlurBgSprite) comparisonBlurBgSprite.alpha = 1;
    comparisonRowsByLaneId.forEach((entry) => {
      if (entry?.container) entry.container.alpha = 1;
    });
    renderComparisonInsightRows();
  }

  function renderComparisonExitTransition(now) {
    if (!comparisonExitTransitionState.active) return false;
    const durationMs = Math.max(1, comparisonExitTransitionState.durationMs);
    const t = clamp01(((Number.isFinite(now) ? now : performance.now()) - comparisonExitTransitionState.startMs) / durationMs);
    const e = easeInOutCubic(t);
    const layoutMode = comparisonExitTransitionState.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    const vw = getViewportWidth() || 0;
    const vh = getViewportHeight() || 0;

    comparisonDisplayLayer.visible = true;
    comparisonDisplayLayer.renderable = true;
    comparisonDisplayLayer.interactive = false;
    comparisonDisplayLayer.interactiveChildren = false;
    comparisonDisplayRowsLayer.visible = true;
    comparisonDisplayRowsLayer.renderable = true;
    comparisonDisplayRowsLayer.interactive = false;
    comparisonDisplayRowsLayer.interactiveChildren = false;
    comparisonSelectionLayer.visible = false;
    comparisonSelectionLayer.renderable = false;

    comparisonDisplayBackdrop.clear();
    if (layoutMode === 'sideBySide') {
      comparisonDisplayBackdrop.beginFill(0x000000, 1);
      comparisonDisplayBackdrop.drawRect(0, 0, vw, vh);
      comparisonDisplayBackdrop.endFill();
      if (comparisonBlurBgSprite) {
        comparisonBlurBgSprite.visible = false;
        comparisonBlurBgSprite.renderable = false;
      }
    } else {
      if (comparisonBlurBgSprite && comparisonBlurBgSupported) {
        comparisonBlurBgSprite.visible = true;
        comparisonBlurBgSprite.renderable = true;
      } else if (comparisonBlurBgSprite) {
        comparisonBlurBgSprite.visible = false;
        comparisonBlurBgSprite.renderable = false;
        comparisonDisplayBackdrop.beginFill(0x04070f, 1);
        comparisonDisplayBackdrop.drawRect(0, 0, vw, vh);
        comparisonDisplayBackdrop.endFill();
      }
      comparisonDisplayBackdrop.beginFill(0x12161d, 0.28);
      comparisonDisplayBackdrop.drawRect(0, 0, vw, vh);
      comparisonDisplayBackdrop.endFill();
    }

    comparisonDisplayBackdrop.alpha = lerp(
      comparisonExitTransitionState.fromBackdropAlpha,
      comparisonExitTransitionState.toBackdropAlpha,
      e
    );
    if (comparisonBlurBgSprite) {
      comparisonBlurBgSprite.alpha = comparisonDisplayBackdrop.alpha;
    }

    comparisonExitTransitionState.fromByLane.forEach((fromRect, laneId) => {
      const entry = comparisonRowsByLaneId.get(laneId);
      if (!entry) return;
      const toRect = comparisonExitTransitionState.toByLane.get(laneId) || fromRect;
      const rect = {
        laneId,
        x: lerp(fromRect.x, toRect.x, e),
        y: lerp(fromRect.y, toRect.y, e),
        w: lerp(fromRect.w, toRect.w, e),
        h: lerp(fromRect.h, toRect.h, e)
      };
      applyComparisonRowVisual(entry, rect, layoutMode);
      entry.container.alpha = 1 - (0.08 * e);
      entry.container.interactive = false;
      entry.container.buttonMode = false;
      entry.container.cursor = 'default';
    });
    renderComparisonInsightRows();

    if (t >= 1) {
      leaveComparisonModePresentation();
      return false;
    }
    return true;
  }

  function reorderComparisonLanesByDraggedCenterY(laneId, dragCenterY) {
    const order = getComparisonOrderedSelectedLanes();
    if (!order.length || !order.includes(laneId)) return;

    const mids = order
      .filter(id => id !== laneId)
      .map((id) => {
        const rect = comparisonLaneLayoutRects.get(id);
        return rect ? { id, mid: rect.y + rect.h / 2 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.mid - b.mid);

    let nextIndex = mids.length;
    for (let i = 0; i < mids.length; i += 1) {
      if (dragCenterY <= mids[i].mid) {
        nextIndex = i;
        break;
      }
    }

    const laneOrderCurrent = order.slice();
    const laneIdx = laneOrderCurrent.indexOf(laneId);
    if (laneIdx < 0) return;
    laneOrderCurrent.splice(laneIdx, 1);
    laneOrderCurrent.splice(nextIndex, 0, laneId);
    if (laneOrderCurrent.every((id, idx) => id === order[idx])) return;
    comparisonLaneDisplayOrder = laneOrderCurrent;
    markComparisonLayoutDirty();
    layoutComparisonRows();
  }

  function startComparisonRowDrag(laneId, event) {
    if (!comparisonIsConfirmed()) return;
    if (comparisonUsesRankSelection()) return;
    if (comparisonTransitionState.active) return;
    const entry = comparisonRowsByLaneId.get(Number(laneId));
    if (!entry?.container || !event?.data) return;
    const p = event.data.getLocalPosition(comparisonDisplayRowsLayer);
    comparisonState.dragLaneId = Number(laneId);
    comparisonState.dragPointerId = event.data.pointerId ?? null;
    comparisonState.dragOffsetY = p.y - entry.container.y;
    entry.container.cursor = 'grabbing';
    syncComparisonRowZOrder();
  }

  function updateComparisonRowDrag(event) {
    if (!comparisonIsConfirmed()) return;
    if (comparisonTransitionState.active) return;
    const dragLaneId = comparisonState.dragLaneId;
    if (dragLaneId == null) return;
    if (!event?.data) return;
    const pointerId = event.data.pointerId ?? null;
    if (comparisonState.dragPointerId != null && pointerId != null && pointerId !== comparisonState.dragPointerId) return;

    const entry = comparisonRowsByLaneId.get(dragLaneId);
    const targetRect = comparisonLaneLayoutRects.get(dragLaneId);
    if (!entry?.container || !targetRect) return;

    const p = event.data.getLocalPosition(comparisonDisplayRowsLayer);
    const mode = uiState.modePanels.comparison.layoutMode === 'overlay' ? 'overlay' : 'sideBySide';
    const minY = 0;
    const maxY = Math.max(0, (getViewportHeight() || 0) - targetRect.h);
    entry.container.x = targetRect.x;
    entry.container.y = Math.max(minY, Math.min(maxY, p.y - comparisonState.dragOffsetY));
    entry.container.cursor = 'grabbing';

    reorderComparisonLanesByDraggedCenterY(dragLaneId, entry.container.y + targetRect.h / 2);
    applyComparisonRowVisual(entry, comparisonLaneLayoutRects.get(dragLaneId) || targetRect, mode);
    entry.container.y = Math.max(minY, Math.min(maxY, p.y - comparisonState.dragOffsetY));
    syncComparisonRowZOrder();
  }

  function endComparisonRowDrag() {
    if (comparisonState.dragLaneId == null) return;
    comparisonState.dragLaneId = null;
    comparisonState.dragPointerId = null;
    comparisonState.dragOffsetY = 0;
    markComparisonLayoutDirty();
    layoutComparisonRows();
    noteViewModeStateChanged('comparison:reorder');
  }

  function clearComparisonPresentation() {
    clearComparisonConfirmTransition();
    clearComparisonExitTransition();
    clearComparisonSelectionOverlay();
    comparisonDisplayLayer.visible = false;
    comparisonDisplayLayer.renderable = false;
    comparisonDisplayLayer.interactive = true;
    comparisonDisplayLayer.interactiveChildren = true;
    comparisonDisplayBackdrop.clear();
    comparisonDisplayRowsLayer.interactive = true;
    comparisonDisplayRowsLayer.interactiveChildren = true;
    comparisonPinnedHudLayer.visible = false;
    comparisonPinnedHudLayer.renderable = false;
    if (comparisonBlurBgSprite) {
      comparisonBlurBgSprite.visible = false;
      comparisonBlurBgSprite.renderable = false;
    }
    comparisonRowsByLaneId.forEach((entry) => {
      if (entry?.container) {
        entry.container.visible = false;
        entry.container.renderable = false;
      }
      clearComparisonRowInsightInstances(entry);
    });
    syncComparisonPinnedHudLayer();
    renderComparisonUiDomState();
  }

  function renderComparisonFramePresentation(now) {
    syncComparisonPinnedHudLayer();
    if (comparisonExitTransitionState.active) {
      renderComparisonExitTransition(now);
      return;
    }
    if (uiState.viewMode !== 'comparison') {
      clearComparisonPresentation();
      return;
    }

    if (comparisonState.phase === 'confirmed' && comparisonHasSelection()) {
      clearComparisonSelectionOverlay();
      if (comparisonState.pendingConfirmTransition && comparisonState.pendingConfirmTransition !== 'none') {
        startComparisonConfirmTransition(
          now,
          comparisonState.pendingConfirmTransition,
          {
            fromLayout: comparisonState.pendingTransitionFromLayout,
            toLayout: uiState.modePanels.comparison.layoutMode
          }
        );
      }
      renderComparisonConfirmedLayout(now);
      renderComparisonUiDomState();
      return;
    }

    comparisonDisplayLayer.visible = false;
    comparisonDisplayLayer.renderable = false;
    comparisonDisplayBackdrop.clear();
    if (comparisonBlurBgSprite) {
      comparisonBlurBgSprite.visible = false;
      comparisonBlurBgSprite.renderable = false;
    }
    renderComparisonSelectionOverlay(now);
    renderComparisonUiDomState();
  }

  function laneColor(id) {
    const colors = [
      0xff4b4b,
      0xff9f1c,
      0x2ec4b6,
      0x00b4d8,
      0x4361ee,
      0x7209b7,
      0xf72585,
      0x8ac926
    ];
    if (id == null) return 0xffffff;
    const idx = (Number(id) - 1 + colors.length) % colors.length;
    return colors[idx];
  }

  function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function resolveDirection(frame) {
    const dir = frame?.direction || defaultDirection;
    return dir === 'ltr' ? 'ltr' : 'rtl';
  }

  function resolveRaceStartDirection() {
    const overlayDirection = String(overlay?.direction || '').toLowerCase();
    if (overlayDirection === 'ltr' || overlayDirection === 'rtl') return overlayDirection;
    const firstFrameDirection = String(overlay?.frames?.[0]?.direction || '').toLowerCase();
    if (firstFrameDirection === 'ltr' || firstFrameDirection === 'rtl') return firstFrameDirection;
    return defaultDirection === 'ltr' ? 'ltr' : 'rtl';
  }

  function resolveDirectionSign(direction) {
    return direction === 'ltr' ? -1 : 1;
  }

  function resolveBehindSwimmerOffsetX(rawOffsetX, direction) {
    const offsetX = Number(rawOffsetX);
    if (!Number.isFinite(offsetX)) return 0;
    return resolveDirectionSign(direction) * offsetX;
  }

  function resolveAthleteCenterX(athlete) {
    const centerX = Number(athlete?.cx);
    if (Number.isFinite(centerX)) return centerX;
    const fallbackX = Number(athlete?.x);
    return Number.isFinite(fallbackX) ? fallbackX : 0;
  }

  function resolveDirectionalReferenceBoundaryX(athlete, direction) {
    const centerX = resolveAthleteCenterX(athlete);
    const width = Number(athlete?.w);
    if (!Number.isFinite(width) || width <= 0) return centerX;
    const halfWidth = width / 2;
    const leftEdge = centerX - halfWidth;
    const rightEdge = centerX + halfWidth;
    return resolveDirectionSign(direction) > 0 ? leftEdge : rightEdge;
  }

  function resolveFollowPlacementAnchorX(athlete, direction) {
    const centerX = resolveAthleteCenterX(athlete);
    const directionalBoundaryX = resolveDirectionalReferenceBoundaryX(athlete, direction);
    return (directionalBoundaryX + centerX) / 2;
  }

  function averageFiniteNumbers(values) {
    const nums = (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (!nums.length) return null;
    return nums.reduce((sum, value) => sum + value, 0) / nums.length;
  }

  function medianFiniteNumbers(values) {
    const nums = (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    if (!nums.length) return null;
    const mid = Math.floor(nums.length / 2);
    if (nums.length % 2) return nums[mid];
    return (nums[mid - 1] + nums[mid]) / 2;
  }

  function computeUniformRecordProgressMeters(frameTimeSec, recordTimeSec, raceLength) {
    const safeRaceLength = Number(raceLength);
    const safeFrameTimeSec = Number(frameTimeSec);
    const safeRecordTimeSec = Number(recordTimeSec);
    if (!(safeRaceLength > 0) || !(safeRecordTimeSec > 1e-6) || !Number.isFinite(safeFrameTimeSec)) {
      return null;
    }
    return Math.max(0, Math.min(safeRaceLength, (safeFrameTimeSec / safeRecordTimeSec) * safeRaceLength));
  }

  function interpolateProgressSample(samples, timeRatio) {
    const arr = Array.isArray(samples) ? samples : [];
    if (!arr.length) {
      const u = clamp01(timeRatio);
      return { progressRatio: u, slope: 1 };
    }
    const u = clamp01(timeRatio);
    if (u <= Number(arr[0]?.timeRatio ?? 0)) {
      const next = arr[1] || arr[0];
      const dt = Math.max(1e-6, Number(next?.timeRatio ?? 1) - Number(arr[0]?.timeRatio ?? 0));
      const dp = Number(next?.progressRatio ?? 0) - Number(arr[0]?.progressRatio ?? 0);
      return { progressRatio: clamp01(Number(arr[0]?.progressRatio ?? 0)), slope: dp / dt };
    }
    for (let i = 1; i < arr.length; i += 1) {
      const prev = arr[i - 1];
      const next = arr[i];
      const t0 = Number(prev?.timeRatio ?? 0);
      const t1 = Number(next?.timeRatio ?? 1);
      if (u > t1 && i < arr.length - 1) continue;
      const safeT1 = Math.max(t0 + 1e-6, t1);
      const local = clamp01((u - t0) / (safeT1 - t0));
      const p0 = clamp01(Number(prev?.progressRatio ?? 0));
      const p1 = clamp01(Number(next?.progressRatio ?? 1));
      return {
        progressRatio: clamp01(lerp(p0, p1, local)),
        slope: (p1 - p0) / (safeT1 - t0)
      };
    }
    const last = arr[arr.length - 1];
    const prev = arr[arr.length - 2] || last;
    const dt = Math.max(1e-6, Number(last?.timeRatio ?? 1) - Number(prev?.timeRatio ?? 0));
    const dp = Number(last?.progressRatio ?? 1) - Number(prev?.progressRatio ?? 0);
    return { progressRatio: clamp01(Number(last?.progressRatio ?? 1)), slope: dp / dt };
  }

  function estimateProgressSlope(samples, timeRatio, window = 0.05) {
    const safeWindow = Math.max(0.01, Number(window) || 0.05);
    const left = clamp01(Number(timeRatio) - safeWindow);
    const right = clamp01(Number(timeRatio) + safeWindow);
    if (right - left < 1e-6) return interpolateProgressSample(samples, timeRatio).slope;
    const leftProgress = interpolateProgressSample(samples, left).progressRatio;
    const rightProgress = interpolateProgressSample(samples, right).progressRatio;
    return (rightProgress - leftProgress) / (right - left);
  }

  function findProgressTimeRatio(samples, targetProgressRatio) {
    const arr = Array.isArray(samples) ? samples : [];
    const target = clamp01(targetProgressRatio);
    if (!arr.length) return target;
    if (target <= Number(arr[0]?.progressRatio ?? 0)) return clamp01(Number(arr[0]?.timeRatio ?? 0));
    for (let i = 1; i < arr.length; i += 1) {
      const prev = arr[i - 1];
      const next = arr[i];
      const p0 = clamp01(Number(prev?.progressRatio ?? 0));
      const p1 = clamp01(Number(next?.progressRatio ?? 1));
      if (target > p1 && i < arr.length - 1) continue;
      if (Math.abs(p1 - p0) < 1e-6) return clamp01(Number(next?.timeRatio ?? 1));
      const local = clamp01((target - p0) / (p1 - p0));
      return clamp01(lerp(Number(prev?.timeRatio ?? 0), Number(next?.timeRatio ?? 1), local));
    }
    return clamp01(Number(arr[arr.length - 1]?.timeRatio ?? 1));
  }

  function getRecordMotionTemplate() {
    if (recordMotionTemplateCache) return recordMotionTemplateCache;

    const raceLength = getOverlayRaceLength();
    const frames = Array.isArray(overlay?.frames) ? overlay.frames : [];
    if (!(raceLength > 0) || !frames.length) {
      recordMotionTemplateCache = {
        mode: 'linear',
        sourceLaneIds: [],
        samples: [
          { timeRatio: 0, progressRatio: 0 },
          { timeRatio: 1, progressRatio: 1 }
        ]
      };
      return recordMotionTemplateCache;
    }

    const leaderSamples = [];
    const sourceLaneIdSet = new Set();

    frames.forEach((frame) => {
      const elapsedTimeSec = getFrameTimeSec(frame, overlay?.fps || 50, frame?.time_sec || 0);
      if (!Number.isFinite(elapsedTimeSec) || elapsedTimeSec < 0) return;
      const athletes = Array.isArray(frame?.athletes) ? frame.athletes : (Array.isArray(frame?.lanes) ? frame.lanes : []);
      let leaderProgress = null;
      let leaderLaneId = null;
      athletes.forEach((athlete) => {
        const progress = getAthleteProgressValue(athlete);
        const laneId = Number(athlete?.id);
        if (!Number.isFinite(progress)) return;
        const safeProgress = Math.max(0, Math.min(raceLength, Number(progress)));
        if (leaderProgress == null || safeProgress > leaderProgress) {
          leaderProgress = safeProgress;
          leaderLaneId = Number.isFinite(laneId) ? laneId : null;
        }
      });
      if (!Number.isFinite(leaderProgress)) return;
      if (Number.isFinite(leaderLaneId)) sourceLaneIdSet.add(leaderLaneId);
      const prev = leaderSamples[leaderSamples.length - 1];
      if (prev && Math.abs(prev.elapsedTimeSec - elapsedTimeSec) < 1e-6) {
        prev.progress = Math.max(prev.progress, leaderProgress);
        if (Number.isFinite(leaderLaneId)) sourceLaneIdSet.add(leaderLaneId);
      } else {
        leaderSamples.push({ elapsedTimeSec, progress: leaderProgress });
      }
    });

    if (!leaderSamples.length) {
      recordMotionTemplateCache = {
        mode: 'linear',
        sourceLaneIds: [],
        samples: [
          { timeRatio: 0, progressRatio: 0 },
          { timeRatio: 1, progressRatio: 1 }
        ]
      };
      return recordMotionTemplateCache;
    }

    let maxLeaderProgress = 0;
    leaderSamples.forEach((sample) => {
      maxLeaderProgress = Math.max(maxLeaderProgress, Number(sample.progress) || 0);
      sample.progress = maxLeaderProgress;
    });

    const finishThreshold = Math.max(raceLength * 0.97, maxLeaderProgress * 0.995);
    const finishSample = leaderSamples.find((sample) => sample.progress >= finishThreshold) || leaderSamples[leaderSamples.length - 1];
    const finishTimeSec = Number(finishSample?.elapsedTimeSec);
    if (!(finishTimeSec > 0.5)) {
      recordMotionTemplateCache = {
        mode: 'linear',
        sourceLaneIds: [],
        samples: [
          { timeRatio: 0, progressRatio: 0 },
          { timeRatio: 1, progressRatio: 1 }
        ]
      };
      return recordMotionTemplateCache;
    }

    const denominator = Math.max(1e-6, Math.min(raceLength, maxLeaderProgress));
    const normalizedSamples = [{ timeRatio: 0, progressRatio: 0 }];
    leaderSamples.forEach((sample) => {
      const timeRatio = clamp01(sample.elapsedTimeSec / finishTimeSec);
      const progressRatio = clamp01(sample.progress / denominator);
      const prev = normalizedSamples[normalizedSamples.length - 1];
      if (prev && Math.abs(prev.timeRatio - timeRatio) < 1e-6) {
        prev.progressRatio = Math.max(prev.progressRatio, progressRatio);
      } else {
        normalizedSamples.push({
          timeRatio,
          progressRatio: Math.max(prev?.progressRatio ?? 0, progressRatio)
        });
      }
    });
    const normalizedLast = normalizedSamples[normalizedSamples.length - 1];
    if (!normalizedLast || normalizedLast.timeRatio < 1) normalizedSamples.push({ timeRatio: 1, progressRatio: 1 });
    else normalizedLast.progressRatio = 1;

    const sampleCount = 201;
    const leaderBiasMaxScaleBoost = 0.1;
    const leaderBiasFadeStartRatio = 0.75;
    const mergedSamples = [];
    let lastProgressRatio = 0;
    for (let i = 0; i < sampleCount; i += 1) {
      const timeRatio = i / (sampleCount - 1);
      const leaderBiasWeight = timeRatio <= leaderBiasFadeStartRatio
        ? 1
        : (1 - clamp01((timeRatio - leaderBiasFadeStartRatio) / Math.max(1e-6, 1 - leaderBiasFadeStartRatio)));
      const leaderBiasEase = leaderBiasWeight * leaderBiasWeight * (3 - (2 * leaderBiasWeight));
      const sampled = interpolateProgressSample(
        normalizedSamples,
        clamp01(timeRatio * (1 + (leaderBiasMaxScaleBoost * leaderBiasEase)))
      ).progressRatio;
      const progressRatio = Number.isFinite(sampled)
        ? Math.max(lastProgressRatio, sampled)
        : lastProgressRatio;
      lastProgressRatio = progressRatio;
      mergedSamples.push({
        timeRatio,
        progressRatio: i === sampleCount - 1 ? 1 : clamp01(progressRatio)
      });
    }
    const smoothedSamples = mergedSamples.map((sample, index) => {
      if (index === 0 || index === mergedSamples.length - 1) return { ...sample };
      let weightedSum = 0;
      let totalWeight = 0;
      for (let offset = -4; offset <= 4; offset += 1) {
        const idx = index + offset;
        if (idx < 0 || idx >= mergedSamples.length) continue;
        const weight = 5 - Math.abs(offset);
        weightedSum += mergedSamples[idx].progressRatio * weight;
        totalWeight += weight;
      }
      return {
        timeRatio: sample.timeRatio,
        progressRatio: totalWeight > 0 ? (weightedSum / totalWeight) : sample.progressRatio
      };
    });
    smoothedSamples[0].progressRatio = 0;
    smoothedSamples[smoothedSamples.length - 1].progressRatio = 1;
    const templateBlend = 0.22;
    const maxTemplateSlope = 1.1;
    let smoothedProgressFloor = 0;
    smoothedSamples.forEach((sample, index) => {
      if (index === 0) {
        sample.progressRatio = 0;
        return;
      }
      if (index === smoothedSamples.length - 1) {
        sample.progressRatio = 1;
        smoothedProgressFloor = 1;
        return;
      }
      const blendedProgressRatio = lerp(sample.timeRatio, clamp01(sample.progressRatio), templateBlend);
      sample.progressRatio = Math.max(smoothedProgressFloor, clamp01(blendedProgressRatio));
      smoothedProgressFloor = sample.progressRatio;
    });
    smoothedSamples.forEach((sample, index) => {
      if (index === 0) {
        sample.progressRatio = 0;
        return;
      }
      if (index === smoothedSamples.length - 1) {
        sample.progressRatio = 1;
        return;
      }
      const upperEnvelope = Math.min(1, sample.timeRatio * maxTemplateSlope);
      const lowerEnvelope = Math.max(0, 1 - ((1 - sample.timeRatio) * maxTemplateSlope));
      sample.progressRatio = Math.max(lowerEnvelope, Math.min(upperEnvelope, sample.progressRatio));
    });
    let cappedProgressFloor = 0;
    smoothedSamples.forEach((sample, index) => {
      if (index === 0) {
        sample.progressRatio = 0;
        cappedProgressFloor = 0;
        return;
      }
      const prev = smoothedSamples[index - 1];
      const dt = Math.max(1e-6, sample.timeRatio - prev.timeRatio);
      const maxProgress = prev.progressRatio + (maxTemplateSlope * dt);
      if (index === smoothedSamples.length - 1) {
        sample.progressRatio = 1;
        cappedProgressFloor = 1;
        return;
      }
      sample.progressRatio = Math.max(cappedProgressFloor, Math.min(sample.progressRatio, maxProgress));
      cappedProgressFloor = sample.progressRatio;
    });

    recordMotionTemplateCache = {
      mode: 'leader-retimed-biased',
      sourceLaneIds: Array.from(sourceLaneIdSet).sort((a, b) => a - b),
      samples: smoothedSamples
    };
    return recordMotionTemplateCache;
  }

  function buildRecordLineMotionState(frameTimeSec, recordType = 'world', frameAthletes = null) {
    const normalizedRecordType = normalizeCompareRecordType(recordType);
    const elapsedTimeSec = Number(frameTimeSec);
    const raceLength = getOverlayRaceLength();
    const recordTimeSec = getOfficialRecordTimeSec(normalizedRecordType, frameAthletes);
    const startDirection = resolveRaceStartDirection();
    const motionTemplate = getRecordMotionTemplate();
    const safeVideoWidth = Number.isFinite(Number(videoW))
      ? Number(videoW)
      : Number(overlay?.video?.width);
    const safeRaceLength = Number.isFinite(raceLength) && raceLength > 0 ? raceLength : null;
    const poolLength = safeRaceLength != null ? Math.max(1, Math.min(50, safeRaceLength)) : null;
    const totalLaps = safeRaceLength != null && poolLength != null
      ? Math.max(1, Math.ceil(safeRaceLength / poolLength))
      : 1;
    const uniformSpeed = safeRaceLength != null && Number.isFinite(recordTimeSec) && recordTimeSec > 1e-6
      ? safeRaceLength / recordTimeSec
      : null;
    const startWallX = Number.isFinite(safeVideoWidth)
      ? (startDirection === 'ltr' ? 0 : safeVideoWidth)
      : null;
    const farWallX = Number.isFinite(safeVideoWidth)
      ? (startDirection === 'ltr' ? safeVideoWidth : 0)
      : null;
    const motionState = {
      visible: false,
      recordType: normalizedRecordType,
      elapsedTimeSec,
      recordTimeSec,
      raceLength: safeRaceLength,
      poolLength,
      totalLaps,
      uniformSpeed,
      currentSpeed: uniformSpeed,
      startDirection,
      currentLapDirection: startDirection,
      progressMeters: 0,
      lapIndex: 0,
      lapNumber: 1,
      lapSpanMeters: poolLength,
      lapDistanceMeters: 0,
      lapRatio: 0,
      videoWidth: safeVideoWidth,
      startWallX,
      farWallX,
      videoX: startWallX,
      turnTimeSec: null,
      motionTemplateMode: motionTemplate?.mode || 'linear',
      motionTemplateSourceLaneIds: Array.isArray(motionTemplate?.sourceLaneIds) ? motionTemplate.sourceLaneIds : []
    };
    if (
      !(safeRaceLength > 0)
      || !(poolLength > 0)
      || !(Number.isFinite(recordTimeSec) && recordTimeSec > 1e-6)
      || !Number.isFinite(elapsedTimeSec)
      || elapsedTimeSec <= 0
    ) {
      return motionState;
    }

    const elapsedRatio = clamp01(elapsedTimeSec / recordTimeSec);
    const sampledProgress = interpolateProgressSample(motionTemplate?.samples, elapsedRatio);
    const progressRatio = Number.isFinite(sampledProgress?.progressRatio)
      ? clamp01(sampledProgress.progressRatio)
      : clamp01(elapsedRatio);
    const progressMeters = progressRatio * safeRaceLength;
    if (!Number.isFinite(progressMeters)) return motionState;
    const turnProgressRatio = clamp01(poolLength / safeRaceLength);
    const turnTimeSec = Number.isFinite(recordTimeSec)
      ? (findProgressTimeRatio(motionTemplate?.samples, turnProgressRatio) * recordTimeSec)
      : null;
    const currentProgressSlope = estimateProgressSlope(motionTemplate?.samples, elapsedRatio);
    const currentSpeed = Number.isFinite(currentProgressSlope)
      ? Math.max(0, currentProgressSlope * safeRaceLength / recordTimeSec)
      : uniformSpeed;

    let lapIndex = Math.floor(progressMeters / poolLength);
    let lapDistanceMeters = progressMeters - lapIndex * poolLength;
    if (progressMeters > 0 && Math.abs(lapDistanceMeters) < 1e-6) {
      lapIndex = Math.max(0, lapIndex - 1);
      lapDistanceMeters = poolLength;
    }
    lapIndex = Math.max(0, Math.min(totalLaps - 1, lapIndex));
    const lapStartMeters = lapIndex * poolLength;
    const lapSpanMeters = Math.max(1e-6, Math.min(poolLength, safeRaceLength - lapStartMeters));
    if (progressMeters > 0 && Math.abs(progressMeters - lapStartMeters) < 1e-6 && lapIndex > 0) {
      lapDistanceMeters = 0;
    } else {
      lapDistanceMeters = Math.max(0, Math.min(lapSpanMeters, progressMeters - lapStartMeters));
    }
    const lapRatio = Math.max(0, Math.min(1, lapDistanceMeters / lapSpanMeters));
    const currentLapDirection = lapIndex % 2 === 0
      ? startDirection
      : (startDirection === 'ltr' ? 'rtl' : 'ltr');
    const videoX = Number.isFinite(safeVideoWidth)
      ? (
          currentLapDirection === 'ltr'
            ? lerp(0, safeVideoWidth, lapRatio)
            : lerp(safeVideoWidth, 0, lapRatio)
        )
      : null;

    return {
      ...motionState,
      visible: true,
      progressMeters,
      lapIndex,
      lapNumber: lapIndex + 1,
      lapSpanMeters,
      lapDistanceMeters,
      lapRatio,
      currentLapDirection,
      videoX,
      currentSpeed,
      turnTimeSec
    };
  }

  function formatRecordLineDebugSeconds(value) {
    const safeValue = Number(value);
    if (!Number.isFinite(safeValue)) return '--';
    return safeValue.toFixed(2);
  }

  function buildRecordLineDebugGeometry(recordMotionState, {
    projected = false,
    videoTop = null,
    videoBottom = null,
    screenTop = null,
    screenBottom = null,
    sampleVideoY = null,
    mainSegments = []
  } = {}) {
    if (!recordMotionState?.visible) return null;
    const wallXs = Array.from(new Set([
      Number(recordMotionState?.startWallX),
      Number(recordMotionState?.farWallX)
    ].filter((value) => Number.isFinite(value))));
    const guideSegments = wallXs
      .map((wallX) => (
        projected
          ? buildProjectedCompareLineSegment(wallX, videoTop, videoBottom)
          : buildBillboardCompareLineSegment(wallX, sampleVideoY, screenTop, screenBottom)
      ))
      .filter(Boolean);
    const leadSegment = Array.isArray(mainSegments) && mainSegments.length ? mainSegments[0] : null;
    const viewportWidth = Math.max(0, getViewportWidth() || 0);
    const baseLabelX = Number.isFinite(leadSegment?.x1)
      ? leadSegment.x1
      : averageFiniteNumbers(guideSegments.map((segment) => segment?.x1));
    const labelX = Number.isFinite(baseLabelX)
      ? (
          viewportWidth > 0
            ? Math.max(96, Math.min(viewportWidth - 96, baseLabelX))
            : baseLabelX
        )
      : null;
    const labelY = Number.isFinite(leadSegment?.y1)
      ? leadSegment.y1
      : (Number.isFinite(screenTop) ? screenTop : 24);
    const startLabelText = recordMotionState.totalLaps > 1 ? 'Start / Finish' : 'Start';
    const farLabelText = recordMotionState.totalLaps > 1
      ? `${Math.round(recordMotionState.poolLength || 0)}m Turn · ${formatRecordLineDebugSeconds(recordMotionState.turnTimeSec)}s`
      : 'Finish';
    const endpointBaseY = Number.isFinite(screenTop) ? screenTop : 14;
    const guideLabels = guideSegments
      .map((segment, idx) => {
        const isStartWall = Math.abs((wallXs[idx] || 0) - Number(recordMotionState?.startWallX)) < 1e-6;
        return {
          text: isStartWall ? startLabelText : farLabelText,
          x: segment.x1,
          y: endpointBaseY
        };
      })
      .filter((entry) => Number.isFinite(entry.x));
    const directionLabel = recordMotionState.currentLapDirection === 'ltr' ? 'L→R' : 'R→L';
    const recordLabel = recordMotionState.recordType === 'olympic' ? 'OR' : 'WR';
    const labelText = [
      `${recordLabel} ${formatRecordLineDebugSeconds(recordMotionState.elapsedTimeSec)} / ${formatRecordLineDebugSeconds(recordMotionState.recordTimeSec)}s`,
      `${Number(recordMotionState.progressMeters || 0).toFixed(2)}m`,
      `${Number(recordMotionState.currentSpeed || recordMotionState.uniformSpeed || 0).toFixed(2)}m/s`,
      `Lap ${recordMotionState.lapNumber}/${recordMotionState.totalLaps}`,
      directionLabel
    ].join(' · ');

    return {
      guideSegments,
      labelText,
      labelX,
      labelY,
      guideLabels
    };
  }

  function buildCompareLineLaneEntries(athletes, laneSelection, direction) {
    const out = [];
    (Array.isArray(athletes) ? athletes : []).forEach((athlete) => {
      const laneId = Number(athlete?.id);
      if (!Number.isFinite(laneId)) return;
      if (laneSelection instanceof Set && !laneSelection.has(laneId)) return;
      const rawY = Number.isFinite(Number(athlete?.y))
        ? Number(athlete.y)
        : (Number.isFinite(Number(athlete?.cy)) ? Number(athlete.cy) : null);
      const anchorX = resolveFollowPlacementAnchorX(athlete, direction);
      if (!Number.isFinite(rawY) || !Number.isFinite(anchorX)) return;
      const yTarget = getTrackYForId(laneId) ?? rawY;
      out.push({
        laneId,
        athlete,
        yTarget,
        anchorX,
        progress: getAthleteProgressValue(athlete),
        laneBounds: getLaneClickZoneBoundsVideoY(laneId, yTarget),
        laneRect: getLaneScreenRectFromClickZone(laneId)
      });
    });
    return out.sort((a, b) => a.laneId - b.laneId);
  }

  function getSmoothedCompareLineReferenceVideoX(key, rawVideoX, frameTimeSec, movingAverageSec = LIVE_DATA_UPDATE_INTERVAL_SEC) {
    const nextVideoX = Number(rawVideoX);
    if (!Number.isFinite(nextVideoX) || !key) return Number.isFinite(nextVideoX) ? nextVideoX : null;
    return getWindowedMovingAverageValue(
      compareLineReferenceByKey,
      key,
      nextVideoX,
      frameTimeSec,
      movingAverageSec
    );
  }

  function buildProjectedCompareLineSegment(videoX, topY, bottomY) {
    if (!Number.isFinite(videoX) || !Number.isFinite(topY) || !Number.isFinite(bottomY)) return null;
    const top = projectPointFromCurrentShot(videoX, topY);
    const bottom = projectPointFromCurrentShot(videoX, bottomY);
    if (!Number.isFinite(top?.cx) || !Number.isFinite(top?.cy) || !Number.isFinite(bottom?.cx) || !Number.isFinite(bottom?.cy)) {
      return null;
    }
    return { x1: top.cx, y1: top.cy, x2: bottom.cx, y2: bottom.cy };
  }

  function buildBillboardCompareLineSegment(videoX, sampleVideoY, screenTop, screenBottom) {
    if (!Number.isFinite(videoX) || !Number.isFinite(sampleVideoY) || !Number.isFinite(screenTop) || !Number.isFinite(screenBottom)) {
      return null;
    }
    const point = projectPointFromCurrentShot(videoX, sampleVideoY);
    if (!Number.isFinite(point?.cx)) return null;
    return { x1: point.cx, y1: screenTop, x2: point.cx, y2: screenBottom };
  }

  function estimateReferenceVideoXForProgress(entries, targetProgress) {
    if (!Number.isFinite(targetProgress)) return null;
    const grouped = [];
    entries
      .filter((entry) => Number.isFinite(entry?.progress) && Number.isFinite(entry?.anchorX))
      .sort((a, b) => a.progress - b.progress)
      .forEach((entry) => {
        const last = grouped[grouped.length - 1];
        if (last && Math.abs(last.progress - entry.progress) < 1e-6) {
          last.anchorXs.push(entry.anchorX);
        } else {
          grouped.push({ progress: entry.progress, anchorXs: [entry.anchorX] });
        }
      });
    const points = grouped.map((group) => ({
      progress: group.progress,
      anchorX: averageFiniteNumbers(group.anchorXs)
    })).filter((point) => Number.isFinite(point.anchorX));
    if (!points.length) return null;
    if (points.length === 1) return points[0].anchorX;
    const exactMatch = points.find((point) => Math.abs(point.progress - targetProgress) < 1e-6);
    if (exactMatch) return exactMatch.anchorX;

    let lower = null;
    let upper = null;
    points.forEach((point) => {
      if (point.progress < targetProgress && (!lower || point.progress > lower.progress)) lower = point;
      if (point.progress > targetProgress && (!upper || point.progress < upper.progress)) upper = point;
    });

    let left = lower;
    let right = upper;
    if (!left && points.length >= 2) {
      left = points[0];
      right = points[1];
    } else if (!right && points.length >= 2) {
      left = points[points.length - 2];
      right = points[points.length - 1];
    }
    if (!left || !right || Math.abs(right.progress - left.progress) < 1e-6) {
      return averageFiniteNumbers([left?.anchorX, right?.anchorX]);
    }
    const ratio = (targetProgress - left.progress) / (right.progress - left.progress);
    return lerp(left.anchorX, right.anchorX, ratio);
  }

  function resolveLeaderReferenceVideoX(entries) {
    const candidates = entries.filter((entry) => Number.isFinite(entry?.progress) && Number.isFinite(entry?.anchorX));
    if (!candidates.length) return averageFiniteNumbers(entries.map((entry) => entry?.anchorX));
    const leaderProgress = Math.max(...candidates.map((entry) => entry.progress));
    const leaders = candidates.filter((entry) => Math.abs(entry.progress - leaderProgress) < 0.05);
    return averageFiniteNumbers(leaders.map((entry) => entry.anchorX));
  }

  function buildCompareLineGeometry(typeId, allEntries, selectedEntries, athletes, activeConfig, direction, projected, frameTimeSec = null, resolvedRepProps = null) {
    if (!selectedEntries.length) return null;
    const allEntriesByLaneId = new Map(allEntries.map((entry) => [entry.laneId, entry]));
    const mainReferenceSpecs = [];
    const omitChildLaneIds = new Set();
    let recordMotionState = null;

    if (typeId === 'distanceDiffLeader') {
      const leaderX = resolveLeaderReferenceVideoX(allEntries);
      if (Number.isFinite(leaderX)) {
        mainReferenceSpecs.push({
          videoX: leaderX,
          smoothKey: 'distanceDiffLeader:leader'
        });
      }
    } else if (typeId === 'positionDiffSwimmer') {
      const targetBinding = resolveCompareTargetBindingConfig(
        activeConfig?.compareTargetBinding ?? 'auto',
        activeConfig?.compareTargetLaneId ?? 0,
        activeConfig?.compareTargetRank ?? 0
      );
      const explicitTargetLaneId = normalizeCompareTargetLaneId(activeConfig?.compareTargetLaneId ?? 0);
      const explicitTargetRank = normalizeCompareTargetRank(activeConfig?.compareTargetRank ?? 0);
      let targetEntry = null;
      if (targetBinding === 'lane' && explicitTargetLaneId > 0) {
        targetEntry = allEntriesByLaneId.get(explicitTargetLaneId) || null;
      } else if (targetBinding === 'rank' && explicitTargetRank > 0) {
        const targetAthlete = findAthleteInFrameByRank(athletes, explicitTargetRank);
        const targetLaneId = Number(targetAthlete?.id);
        targetEntry = Number.isFinite(targetLaneId) ? (allEntriesByLaneId.get(targetLaneId) || null) : null;
      } else {
        targetEntry = (
          allEntries
            .filter((entry) => Number.isFinite(entry?.progress) && Number.isFinite(entry?.anchorX))
            .sort((a, b) => {
              if (Math.abs((Number(b?.progress) || 0) - (Number(a?.progress) || 0)) > 1e-6) {
                return (Number(b?.progress) || 0) - (Number(a?.progress) || 0);
              }
              return a.laneId - b.laneId;
            })[0] || null
        );
      }
      if (Number.isFinite(targetEntry?.anchorX)) {
        const targetKey = targetBinding === 'lane' && explicitTargetLaneId > 0
          ? `lane:${explicitTargetLaneId}`
          : targetBinding === 'rank' && explicitTargetRank > 0
            ? `rank:${explicitTargetRank}`
            : 'auto';
        mainReferenceSpecs.push({
          videoX: targetEntry.anchorX,
          laneEntry: targetEntry,
          smoothKey: `positionDiffSwimmer:${targetKey}`
        });
      }
      if (Number.isFinite(targetEntry?.laneId)) {
        omitChildLaneIds.add(targetEntry.laneId);
      }
    } else if (typeId === 'positionDiffRecord') {
      recordMotionState = buildRecordLineMotionState(
        frameTimeSec,
        activeConfig?.compareRecordType || 'world',
        athletes
      );
      if (!recordMotionState?.visible) {
        return null;
      }
      const recordX = Number.isFinite(recordMotionState?.videoX)
        ? recordMotionState.videoX
        : estimateReferenceVideoXForProgress(allEntries, recordMotionState?.progressMeters);
      if (Number.isFinite(recordX)) {
        mainReferenceSpecs.push({
          videoX: recordX,
          smoothKey: `positionDiffRecord:${normalizeCompareRecordType(activeConfig?.compareRecordType || 'world')}`
        });
      }
    }

    const videoTop = Math.min(...selectedEntries.map((entry) => Number(entry?.laneBounds?.topY)).filter((value) => Number.isFinite(value)));
    const videoBottom = Math.max(...selectedEntries.map((entry) => Number(entry?.laneBounds?.bottomY)).filter((value) => Number.isFinite(value)));
    const screenTop = Math.min(...selectedEntries.map((entry) => Number(entry?.laneRect?.y)).filter((value) => Number.isFinite(value)));
    const screenBottom = Math.max(...selectedEntries.map((entry) => {
      const top = Number(entry?.laneRect?.y);
      const height = Number(entry?.laneRect?.h);
      return Number.isFinite(top) && Number.isFinite(height) ? top + height : NaN;
    }).filter((value) => Number.isFinite(value)));
    const sampleVideoY = Number.isFinite(videoTop) && Number.isFinite(videoBottom) ? (videoTop + videoBottom) / 2 : null;
    const movingAverageSec = getMetricSmoothingWindowSec(typeId, LIVE_DATA_UPDATE_INTERVAL_SEC);

    const mainSegments = mainReferenceSpecs
      .map(({ videoX, laneEntry = null, smoothKey = null }) => {
        const resolvedVideoX = getSmoothedCompareLineReferenceVideoX(
          smoothKey ? `${smoothKey}|u:${movingAverageSec.toFixed(2)}` : null,
          videoX,
          frameTimeSec,
          movingAverageSec
        );
        if (projected) {
          const topY = Number.isFinite(Number(laneEntry?.laneBounds?.topY)) ? Number(laneEntry.laneBounds.topY) : videoTop;
          const bottomY = Number.isFinite(Number(laneEntry?.laneBounds?.bottomY)) ? Number(laneEntry.laneBounds.bottomY) : videoBottom;
          return buildProjectedCompareLineSegment(resolvedVideoX, topY, bottomY);
        }
        const laneScreenTop = Number.isFinite(Number(laneEntry?.laneRect?.y)) ? Number(laneEntry.laneRect.y) : screenTop;
        const laneScreenBottom = Number.isFinite(Number(laneEntry?.laneRect?.y)) && Number.isFinite(Number(laneEntry?.laneRect?.h))
          ? Number(laneEntry.laneRect.y) + Number(laneEntry.laneRect.h)
          : screenBottom;
        const laneSampleVideoY = Number.isFinite(Number(laneEntry?.yTarget)) ? Number(laneEntry.yTarget) : sampleVideoY;
        return buildBillboardCompareLineSegment(resolvedVideoX, laneSampleVideoY, laneScreenTop, laneScreenBottom);
      })
      .filter(Boolean);

    const childSegments = selectedEntries
      .filter((entry) => !omitChildLaneIds.has(entry.laneId))
      .map((entry) => (
        projected
          ? buildProjectedCompareLineSegment(entry.anchorX, entry?.laneBounds?.topY, entry?.laneBounds?.bottomY)
          : buildBillboardCompareLineSegment(entry.anchorX, entry.yTarget, entry?.laneRect?.y, Number(entry?.laneRect?.y) + Number(entry?.laneRect?.h))
      ))
      .filter(Boolean);

    if (!mainSegments.length && !childSegments.length) return null;
    const out = { mainSegments, childSegments };
    if (typeId === 'positionDiffRecord') {
      out.recordMotionState = recordMotionState;
      out.recordDebugGeometry = buildRecordLineDebugGeometry(recordMotionState, {
        projected,
        videoTop,
        videoBottom,
        screenTop,
        screenBottom,
        sampleVideoY,
        mainSegments
      });
    }
    return out;
  }

  function computeInsightTypes(segments) {
    const types = [];
    const hasLeader = segments.some(s => s.leader_id != null);
    const hasChase = segments.some(s => s.chase_id != null);
    const hasResults = segments.some(s => s.results);
    if (hasLeader) types.push({ id: 'leader', label: 'Leader' });
    if (hasChase) types.push({ id: 'chase', label: 'Chase' });
    if (hasResults) types.push({ id: 'results', label: 'Results' });
    return types;
  }

  function setupInsightControls(segments) {
    Object.keys(insightInputs).forEach(k => delete insightInputs[k]);
  }

  function syncInsightInputs() {
  }

  function clearBadge(entry) {
    if (!entry) return;
    entry.badgeContainer.visible = false;
    entry.badgeBg.clear();
  }

  function setBadge(entry, text, color) {
    if (!entry) return;
    const { badgeContainer, badgeBg, badgeText } = entry;
    badgeText.text = text;
    badgeContainer.visible = true;
    const padX = 8;
    const padY = 4;
    const sample = measurePixiTextBox(badgeText, 'Leader');
    const size = resolveFixedTextBackgroundSize(
      entry,
      'badge',
      sample.width + padX * 2,
      sample.height + padY * 2,
      { minWidth: 56, minHeight: 22 }
    );
    const w = size.width;
    const h = size.height;
    badgeBg.clear();
    badgeBg.beginFill(color, 0.9);
    badgeBg.drawRoundedRect(-w / 2, -h / 2, w, h, 7);
    badgeBg.endFill();
  }

  function updateHighlights({ leaderId, chaseId, results }) {
    athleteGraphics.forEach((entry, id) => {
      clearBadge(entry);
      entry.leaderGlow.visible = false;
      entry.container.visible = false;
      entry.container.renderable = false;
    });
  }

  function updateInfoPanels() {
    if (!awardsBoxEl) return;
    const showBox = infoState.awards || infoState.appearances;
    awardsBoxEl.style.display = showBox ? 'block' : 'none';
    if (!showBox) return;

    awardsListEl.innerHTML = '';
    overlay.athletes.forEach(meta => {
      const li = document.createElement('li');
      const name = document.createElement('div');
      name.className = 'ath-name';
      name.textContent = meta.name || `Athlete ${meta.id}`;

      const metaRow = document.createElement('div');
      metaRow.className = 'ath-meta';
      const parts = [];
      if (infoState.age) {
        const ageVal = meta.age;
        parts.push(ageVal != null ? `Age: ${ageVal}` : 'Age: N/A');
      }
      if (infoState.appearances) {
        const app = meta.olympic_appearances;
        parts.push(`Olympic Appearances: ${app != null ? app : 'N/A'}`);
      }
      metaRow.textContent = parts.join(' · ');

      const awards = document.createElement('div');
      awards.className = meta.major_awards ? 'ath-awards' : 'ath-empty';
      awards.textContent = infoState.awards
        ? (meta.major_awards || 'No awards data provided.')
        : '';

      li.appendChild(name);
      li.appendChild(metaRow);
      if (infoState.awards) li.appendChild(awards);
      awardsListEl.appendChild(li);
    });
  }

  function ensureWideAwardEntry(id) {
    let entry = awardRowById.get(id);
    if (entry) return entry;
    const card = document.createElement('div');
    card.className = 'award-card';
    const name = document.createElement('div');
    name.className = 'award-name';
    const line = document.createElement('div');
    line.className = 'award-line';
    const awards = document.createElement('div');
    awards.className = 'award-awards';
    card.appendChild(name);
    card.appendChild(line);
    card.appendChild(awards);
    awardsOverlayWide.appendChild(card);
    entry = { card, name, line, awards };
    awardRowById.set(id, entry);
    return entry;
  }

  function ensureTrackAwardEntry() {
    if (trackAwardEntry) return trackAwardEntry;
    const card = document.createElement('div');
    card.className = 'award-card';
    const name = document.createElement('div');
    name.className = 'award-name';
    const line = document.createElement('div');
    line.className = 'award-line';
    const country = document.createElement('div');
    country.className = 'award-line';
    const app = document.createElement('div');
    app.className = 'award-line';
    const awards = document.createElement('div');
    awards.className = 'award-awards';
    card.appendChild(name);
    card.appendChild(line);
    card.appendChild(country);
    card.appendChild(app);
    card.appendChild(awards);
    awardsOverlayTrack.appendChild(card);
    trackAwardEntry = { card, name, line, country, app, awards };
    return trackAwardEntry;
  }

  function updateWideAwardsOverlay() {
    if (!awardsOverlayWide) return;
    const shouldShow = currentShotId === 'wide' && (infoState.awards || infoState.appearances);
    awardsOverlayWide.style.display = shouldShow ? 'block' : 'none';
    if (!shouldShow) return;

    const active = new Set();
    const ids = Array.from(trackYById.keys()).sort((a, b) => a - b);
    ids.forEach(id => {
      const y = getTrackYForId(id);
      if (!isFiniteNumber(y)) return;
      const { cy } = projectPointFromCurrentShot(0, y);
      const meta = athleteMetaById.get(id) || { id };
      const entry = ensureWideAwardEntry(id);
      entry.card.style.top = `${cy}px`;
      entry.card.style.left = '12px';
      entry.card.style.right = '';
      entry.card.style.transform = 'translateY(-50%)';
      entry.name.textContent = meta.name || `Athlete ${meta.id ?? id}`;
      const appVal = meta.olympic_appearances != null ? meta.olympic_appearances : 'N/A';
      entry.line.textContent = `Olympic Appearances: ${appVal}`;
      entry.line.style.display = infoState.appearances ? 'block' : 'none';
      entry.awards.textContent = meta.major_awards || 'No awards data provided.';
      entry.awards.style.display = infoState.awards ? 'block' : 'none';
      entry.card.style.display = (infoState.awards || infoState.appearances) ? 'block' : 'none';
      active.add(id);
    });
    awardRowById.forEach((entry, id) => {
      if (!active.has(id)) {
        entry.card.style.display = 'none';
      }
    });
  }

  function updateTrackAwardsOverlay() {
    if (!awardsOverlayTrack) return;
    const meta = (currentShotId === 'track' && focusedLaneId != null)
      ? athleteMetaById.get(focusedLaneId)
      : null;
    const shouldShow = !!meta;
    awardsOverlayTrack.style.display = shouldShow ? 'block' : 'none';
    if (!shouldShow) return;

    const entry = ensureTrackAwardEntry();
    entry.name.textContent = meta.name || `Athlete ${meta.id ?? focusedLaneId}`;
    const ageVal = meta.age != null ? meta.age : 'N/A';
    entry.line.textContent = `Age: ${ageVal}`;
    entry.line.style.display = 'block';
    const countryVal = meta.country || meta.nationality || meta.country_code || 'Country: N/A';
    entry.country.textContent = `Country: ${countryVal}`;
    entry.app.textContent = `Olympic Appearances: ${meta.olympic_appearances != null ? meta.olympic_appearances : 'N/A'}`;
    entry.awards.textContent = meta.major_awards || 'Major awards not provided.';
  }

  function updateAwardsOverlays() {
    hideAwardsOverlays();
  }

  function applyInfoLayersAtTime(t) {
    infoState.awards = false;
    infoState.appearances = false;
    infoState.age = false;
    hideAwardsOverlays();
  }

  function hideAwardsOverlays() {
    if (awardsOverlayWide) awardsOverlayWide.style.display = 'none';
    if (awardsOverlayTrack) awardsOverlayTrack.style.display = 'none';
  }
  videoEl.addEventListener('loadedmetadata', () => {
    if (videoEl.duration && !Number.isNaN(videoEl.duration)) {
      videoDuration = videoEl.duration;
      timelineScrubber.max = String(videoDuration);
    }
    updateVideoTimeLabel(videoEl.currentTime || 0, videoDuration || 0);
    renderElementTimeline();
    renderHighlightMarkers();
  });

  videoEl.addEventListener('canplaythrough', () => {
    if (!videoTexture) {
      videoTexture = PIXI.Texture.from(videoEl);
    } else {
      videoTexture.baseTexture.resource.source = videoEl;
    }

    if (!videoSprite) {
      const Sprite2d = PIXI.projection.Sprite2d;
      videoSprite = new Sprite2d(videoTexture);
      app.stage.addChildAt(videoSprite, 0);
    }

    if (!overviewHighlightBlurSprite) {
      const Sprite2d = PIXI.projection.Sprite2d;
      overviewHighlightBlurSprite = new Sprite2d(videoTexture);
      overviewHighlightBlurSprite.visible = false;
      overviewHighlightBlurSprite.renderable = false;
      overviewHighlightBlurSprite.alpha = 1.0;
      const BlurFilterCtor = PIXI?.filters?.BlurFilter || PIXI?.BlurFilter;
      if (BlurFilterCtor) {
        const blurFilter = new BlurFilterCtor(8);
        if (blurFilter && typeof blurFilter.quality === 'number') blurFilter.quality = 2;
        overviewHighlightBlurSprite.filters = [blurFilter];
        overviewHighlightBlurSupported = true;
      } else {
        overviewHighlightBlurSupported = false;
      }
      overviewHighlightFxLayer.addChildAt(overviewHighlightBlurSprite, 0);
      overviewHighlightBlurSprite.mask = overviewHighlightBlurMask;
    }

    if (!comparisonBlurBgSprite) {
      const Sprite2d = PIXI.projection.Sprite2d;
      comparisonBlurBgSprite = new Sprite2d(videoTexture);
      comparisonBlurBgSprite.visible = false;
      comparisonBlurBgSprite.renderable = false;
      comparisonBlurBgSprite.alpha = 0.96;
      const BlurFilterCtor = PIXI?.filters?.BlurFilter || PIXI?.BlurFilter;
      if (BlurFilterCtor) {
        const blurFilter = new BlurFilterCtor(8);
        if (blurFilter && typeof blurFilter.quality === 'number') blurFilter.quality = 2;
        comparisonBlurBgSprite.filters = [blurFilter];
        comparisonBlurBgSupported = true;
      } else {
        comparisonBlurBgSupported = false;
      }
      comparisonDisplayLayer.addChildAt(comparisonBlurBgSprite, 1);
    }

    videoReady = true;
    applyShotStateToSprite(defaultShot);
    currentShotState = { ...defaultShot };
    arrowGoldTexture = createArrowTexture(0xfcd34d);
    arrowGrayTextures = [1, 2, 3].map((count) => createChaseArrowTexture(0x93c5fd, count));

    if (!videoEl.paused) {
      videoEl.pause();
    }
    setPlaybackUiPlayingState(false);
    applyPlaybackRateValue(1);
    ensureElapsedLayer();
    requestOverlayRefresh();
    stageViewModeTimelineDraft('init-overview');
    commitViewModeTimelineDraft('init-overview');
    playbackRateTimelineState.nextId = 1;
    playbackRateTimelineState.segments = [{
      id: playbackRateTimelineState.nextId++,
      start: 0,
      end: getViewModeTimelineTimeTotal(),
      rate: 1
    }];
    recomputePlaybackRateTimelineSegments();
    playbackRateTimelineState.draft = null;
    playbackRateTimelineState.selectedSegmentId = playbackRateTimelineState.segments[0]?.id ?? null;
    playbackRateTimelineState.lastAppliedSegmentId = playbackRateTimelineState.segments[0]?.id ?? null;
    renderElementTimeline();
  }, { once: true });
  function applyShotStateToProjectedSprite(sprite, state) {
    if (!sprite) return;
    const vw = getViewportWidth();
    const vh = getViewportHeight();

    sprite.x = 0;
    sprite.y = 0;
    sprite.width = vw;
    sprite.height = vh;

    const pLT = new PIXI.Point(state.ltx * vw, state.lty * vh);
    const pRT = new PIXI.Point(state.rtx * vw, state.rty * vh);
    const pRB = new PIXI.Point(state.rbx * vw, state.rby * vh);
    const pLB = new PIXI.Point(state.lbx * vw, state.lby * vh);

    sprite.proj.affine = PIXI.projection.AFFINE.NONE;
    sprite.proj.mapSprite(sprite, [pLT, pRT, pRB, pLB]);

    const zoom = state.zoom;
    const offX = state.offX || 0;
    const offY = state.offY || 0;
    const centerX = vw / 2;
    const centerY = vh / 2;
    const maxPanX = vw * 0.5;
    const maxPanY = vh * 0.5;
    const panX = offX * maxPanX;
    const panY = offY * maxPanY;

    sprite.scale.set(zoom);
    sprite.position.set(
      panX + (1 - zoom) * centerX,
      panY + (1 - zoom) * centerY
    );
  }

  function applyShotStateToSprite(state) {
    currentShotState = { ...state };
    if (!videoSprite) return;
    applyShotStateToProjectedSprite(videoSprite, state);
    if (overviewHighlightBlurSprite) {
      applyShotStateToProjectedSprite(overviewHighlightBlurSprite, state);
    }
    if (comparisonBlurBgSprite) {
      applyShotStateToProjectedSprite(comparisonBlurBgSprite, state);
    }
  }
  function projectPointWithShot(xPix, yPix, shot) {
    const vw = getViewportWidth();
    const vh = getViewportHeight();
    if (!vw || !vh) return { cx: 0, cy: 0 };

    const s = shot;

    const nx = xPix / videoW;
    const ny = yPix / videoH;

    const LT = { x: s.ltx * vw, y: s.lty * vh };
    const RT = { x: s.rtx * vw, y: s.rty * vh };
    const LB = { x: s.lbx * vw, y: s.lby * vh };
    const RB = { x: s.rbx * vw, y: s.rby * vh };

    const topX = LT.x + (RT.x - LT.x) * nx;
    const topY = LT.y + (RT.y - LT.y) * nx;
    const botX = LB.x + (RB.x - LB.x) * nx;
    const botY = LB.y + (RB.y - LB.y) * nx;

    let cx = topX + (botX - topX) * ny;
    let cy = topY + (botY - topY) * ny;

    const zoom = s.zoom;
    const offX = s.offX || 0;
    const offY = s.offY || 0;
    const centerX = vw / 2;
    const centerY = vh / 2;
    const maxPanX = vw * 0.5;
    const maxPanY = vh * 0.5;
    const panX = offX * maxPanX;
    const panY = offY * maxPanY;

    cx = (cx - centerX) * zoom + centerX + panX;
    cy = (cy - centerY) * zoom + centerY + panY;

    return { cx, cy };
  }
  function projectPointFromCurrentShot(xPix, yPix) {
    return projectPointWithShot(xPix, yPix, currentShotState);
  }

  function getTrackYForId(id) {
    const y = trackYById.get(id);
    if (isFiniteNumber(y)) return y + trackConfig.yOffset;
    return null;
  }

  function renderTracks() {
    trackGraphics.clear();
    trackLayer.visible = false;
  }

  function createInstanceContainers() {
    const Container2d = PIXI.projection?.Container2d || PIXI.Container;
    const Sprite2d = PIXI.projection?.Sprite2d || PIXI.Sprite;
    const content = new PIXI.Container();
    const rtSprite = new Sprite2d(PIXI.Texture.EMPTY);
    return {
      container: new Container2d(),
      content,
      rtSprite,
      textBg: new PIXI.Graphics(),
      text: new PIXI.Text('', {
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: '700',
        fontFamily: 'system-ui',
        resolution: Math.max(1, app.renderer?.resolution || 1)
      }),
      barBg: new PIXI.Graphics(),
      barFill: new PIXI.Graphics(),
      barFill2: new PIXI.Graphics(),
      circle: new PIXI.Graphics(),
      flagSprite: new Sprite2d()
    };
  }

  function stopPausedCameraTransitionTick() {
    if (!pausedCameraTransitionRaf) return;
    cancelAnimationFrame(pausedCameraTransitionRaf);
    pausedCameraTransitionRaf = 0;
  }

  function hasPendingOverviewHighlightTransition() {
    if (uiState.viewMode !== 'overview') return false;
    if (resolveOverviewHighlightTransitionType() === 'hardcut') return false;
    if (!overviewHighlightedLaneIds.size) return false;
    for (const laneId of overviewHighlightedLaneIds) {
      const a = Number(overviewHighlightTransitionState.laneAlpha.get(laneId));
      if (!(a >= 0.999)) return true;
    }
    return false;
  }

  function ensurePausedCameraTransitionTick() {
    if (!videoEl || !videoReady) return;
    if (!videoEl.paused) return;
    if (!camAnimating
      && !camVisualTransition
      && !comparisonTransitionState.active
      && !comparisonExitTransitionState.active
      && !hasPendingOverviewHighlightTransition()) return;
    if (pausedCameraTransitionRaf) return;
    const tick = () => {
      pausedCameraTransitionRaf = 0;
      if (!videoEl || !videoReady || !videoEl.paused) return;
      if (!camAnimating
        && !camVisualTransition
        && !comparisonTransitionState.active
        && !comparisonExitTransitionState.active
        && !hasPendingOverviewHighlightTransition()) return;
      updateOverlayForTime(videoEl.currentTime || 0, performance.now());
      pausedCameraTransitionRaf = requestAnimationFrame(tick);
    };
    pausedCameraTransitionRaf = requestAnimationFrame(tick);
  }

  function setOverviewLaneHighlightsFromSnapshot(snapshotOverview) {
    overviewHighlightedLaneIds.clear();
    cloneArrayNums(snapshotOverview?.highlightedLaneIds).forEach((id) => {
      overviewHighlightedLaneIds.add(id);
    });
  }

  function applyModePanelSettingsFromViewModeSnapshot(snapshot) {
    if (!snapshot?.modePanels) return;
    const overviewPanel = snapshot.modePanels.overview || {};
    const trackingPanel = snapshot.modePanels.tracking || {};
    const comparisonPanel = snapshot.modePanels.comparison || {};

    if (typeof overviewPanel.highlightStyle === 'string') {
      uiState.modePanels.overview.highlightStyle = normalizeOverviewHighlightStyle(overviewPanel.highlightStyle);
    }
    if (overviewPanel.highlightTransitionType === 'hardcut' || overviewPanel.highlightTransitionType === 'smooth') {
      uiState.modePanels.overview.highlightTransitionType = overviewPanel.highlightTransitionType;
    }
    if (Number.isFinite(Number(overviewPanel.highlightTransitionDurationSec))) {
      uiState.modePanels.overview.highlightTransitionDurationSec =
        normalizeOverviewHighlightTransitionDurationSec(overviewPanel.highlightTransitionDurationSec);
    }
    if (typeof trackingPanel.transitionType === 'string') {
      uiState.modePanels.tracking.transitionType = trackingPanel.transitionType;
    }
    if (Number.isFinite(Number(trackingPanel.transitionDurationSec))) {
      uiState.modePanels.tracking.transitionDurationSec = normalizeTrackTransitionDurationSec(trackingPanel.transitionDurationSec);
    }
    if (Number.isFinite(Number(trackingPanel.zoomLevel))) {
      uiState.modePanels.tracking.zoomLevel = Number(trackingPanel.zoomLevel);
    }
    if (typeof trackingPanel.trackingBehavior === 'string') {
      uiState.modePanels.tracking.trackingBehavior = trackingPanel.trackingBehavior;
    }
    if (typeof comparisonPanel.layoutMode === 'string') {
      uiState.modePanels.comparison.layoutMode = comparisonPanel.layoutMode;
    }
    if (comparisonPanel.transitionType === 'hardcut' || comparisonPanel.transitionType === 'smooth') {
      uiState.modePanels.comparison.transitionType = comparisonPanel.transitionType;
    }
    if (Number.isFinite(Number(comparisonPanel.transitionDurationSec))) {
      uiState.modePanels.comparison.transitionDurationSec = normalizeComparisonTransitionDurationSec(comparisonPanel.transitionDurationSec);
    }
  }

  function applyTrackingCameraStateFromViewModeSnapshot(snapshot) {
    if (uiState.viewMode !== 'tracking') return;
    const t = videoEl?.currentTime || prevTimeSec || 0;
    const trackingState = snapshot?.tracking || {};
    const shotId = trackingState.shotId === 'track' ? 'track' : 'wide';
    const laneId = Number.isFinite(Number(trackingState.focusedLaneId))
      ? Number(trackingState.focusedLaneId)
      : null;
    if (shotId === 'track') {
      const targetShot = computeTrackTargetShotAtTime(t, laneId);
      const wasTrack = currentShotId === 'track';
      const prevLaneId = focusedLaneId;
      const laneChanged = (prevLaneId ?? null) !== (laneId ?? null);
      if (wasTrack && !laneChanged && shotStatesApproximatelyEqual(currentShotState, targetShot, 8e-4)) {
        return;
      }
      const opts = { focusedLaneId: laneId };
      if (wasTrack) {
        opts.transitionType = laneChanged ? 'zoomlens' : 'hardcut';
      }
      switchCameraShot('track', targetShot, opts);
      return;
    }
    if (currentShotId === 'wide' && (focusedLaneId == null) && shotStatesApproximatelyEqual(currentShotState, defaultShot, 8e-4)) {
      return;
    }
    switchCameraShot('wide', defaultShot, { focusedLaneId: null });
  }

  function applyViewModeTimelineSnapshotImmediate(snapshot, opts = {}) {
    if (!snapshot) return null;
    const prevComparisonState = {
      phase: comparisonState.phase,
      selectionMode: comparisonState.selectionMode,
      selectedLaneIds: Array.from(comparisonSelectedLaneIds).sort((a, b) => a - b),
      displayOrder: cloneArrayNums(comparisonLaneDisplayOrder),
      layoutMode: uiState.modePanels?.comparison?.layoutMode || 'sideBySide'
    };
    const mode = ['overview', 'tracking', 'comparison'].includes(snapshot.viewMode)
      ? snapshot.viewMode
      : 'overview';
    const fromPlayback = !!opts.fromPlayback;
    const pauseOnEnter = opts.pauseOnEnter !== false;
    const skipComparisonExitAnimation = !!opts.skipComparisonExitAnimation;
    const prevApplying = viewModeTimelineState.isApplyingPlaybackState;
    viewModeTimelineState.isApplyingPlaybackState = true;
    try {
      applyModePanelSettingsFromViewModeSnapshot(snapshot);
      setOverviewLaneHighlightsFromSnapshot(snapshot.overview);
      if (mode === 'comparison') {
        setViewMode('comparison', {
          comparisonEnter: {
            pauseOnEnter,
            snapshotState: snapshot.comparison || null,
            prevComparisonState,
            fromPlayback
          }
        });
      } else {
        setViewMode(mode, {
          skipComparisonExitAnimation
        });
      }
      if (mode === 'tracking') {
        applyTrackingCameraStateFromViewModeSnapshot(snapshot);
      } else if (mode === 'overview' && currentShotId !== 'wide') {
        switchCameraShot('wide', defaultShot, {
          focusedLaneId: null,
          transitionType: 'hardcut'
        });
      }
      renderUiShellState();
      markComparisonLayoutDirty();
      updateLaneInteractionAffordances();
      updateExitButtonVisibility();
      requestOverlayRefresh();
      if (!fromPlayback) {
        ensurePausedCameraTransitionTick();
      }
    } finally {
      viewModeTimelineState.isApplyingPlaybackState = prevApplying;
    }
    return mode;
  }

  async function applyViewModeTimelineSnapshotFromPlaybackSequenced(snapshot, opts = {}) {
    if (!snapshot) return;
    const requestSeq = ++timelinePlaybackModeSwitchSeq;
    const targetMode = ['overview', 'tracking', 'comparison'].includes(snapshot.viewMode)
      ? snapshot.viewMode
      : 'overview';
    const prevMode = uiState.viewMode;

    if (prevMode !== targetMode
      && prevMode === 'tracking'
      && targetMode !== 'tracking'
      && currentShotId === 'track') {
      const transitionType = resolveTrackingTransitionType();
      const durationMs = estimateCameraTransitionDurationMs(transitionType);
      switchCameraShot('wide', defaultShot, {
        focusedLaneId: null,
        transitionType
      });
      if (durationMs > 0) {
        ensurePausedCameraTransitionTick();
        await delayMs(durationMs + 20);
      }
      if (requestSeq !== timelinePlaybackModeSwitchSeq) return;
    }

    if (requestSeq !== timelinePlaybackModeSwitchSeq) return;
    applyViewModeTimelineSnapshotImmediate(snapshot, {
      ...opts,
      fromPlayback: true,
      skipComparisonExitAnimation: true
    });
  }

  function applyViewModeTimelineSnapshot(snapshot, opts = {}) {
    if (!snapshot) return;
    const fromPlayback = !!opts.fromPlayback;
    if (fromPlayback && !opts.force) {
      applyViewModeTimelineSnapshotFromPlaybackSequenced(snapshot, opts).catch((err) => {
        console.warn('Failed to apply playback mode snapshot with sequencing', err);
      });
      return;
    }
    timelinePlaybackModeSwitchSeq += 1;
    applyViewModeTimelineSnapshotImmediate(snapshot, opts);
  }

  function applyViewModeTimelineSegmentAtTime(tSec, opts = {}) {
    const seg = findViewModeTimelineSegmentAtTime(tSec);
    if (!seg) {
      viewModeTimelineState.lastAppliedSegmentId = null;
      return null;
    }
    if (!opts.force && viewModeTimelineState.lastAppliedSegmentId === seg.id) {
      return seg;
    }
    applyViewModeTimelineSnapshot(seg.snapshot, opts);
    viewModeTimelineState.lastAppliedSegmentId = seg.id;
    return seg;
  }

  function seekAndApplyViewModeSegment(segOrNull, timeSec) {
    const t = quantizeTimelineSec(timeSec);
    clearViewModeTimelineDraft();
    if (videoEl) {
      videoEl.pause();
      setPlaybackUiPlayingState(false);
      try {
        videoEl.currentTime = t;
      } catch (err) {
        console.warn('Failed to seek view mode segment', err);
      }
    }
    syncUiToSeekTime(t, { resetPlaybackBaseline: true });
    if (segOrNull?.snapshot) {
      applyViewModeTimelineSnapshot(segOrNull.snapshot, {
        fromPlayback: false,
        pauseOnEnter: true,
        force: true,
        skipComparisonExitAnimation: true
      });
      viewModeTimelineState.lastAppliedSegmentId = segOrNull.id ?? null;
      viewModeTimelineState.selectedSegmentId = segOrNull.id ?? null;
    } else {
      viewModeTimelineState.selectedSegmentId = null;
    }
    renderElementTimeline();
  }

  function getTimelineSegmentBorderRadius(startPct, endPct) {
    const startsAtEdge = startPct <= 1e-3;
    const endsAtEdge = endPct >= 1 - 1e-3;
    if (startsAtEdge && endsAtEdge) return '999px';
    if (startsAtEdge) return '999px 3px 3px 999px';
    if (endsAtEdge) return '3px 999px 999px 3px';
    return '3px';
  }

  function appendMetricValidityBandOverlays(bar, totalSec, typeId) {
    if (!bar || !LIVE_DATA_TIMELINE_TYPES.has(String(typeId || ''))) return;
    const total = Math.max(0.001, Number(totalSec) || 0.001);
    const windows = getMetricValidityWindowsForType(typeId);
    windows.forEach((window) => {
      const startPct = Math.max(0, Math.min(1, window.start / total));
      const endPct = Math.max(startPct, Math.min(1, window.end / total));
      if ((endPct - startPct) <= 1e-4) return;
      const band = document.createElement('div');
      band.className = 'et-invalid-band';
      band.style.position = 'absolute';
      band.style.left = `${startPct * 100}%`;
      band.style.width = `${(endPct - startPct) * 100}%`;
      band.style.top = '0';
      band.style.bottom = '0';
      band.style.pointerEvents = 'none';
      band.style.zIndex = '3';
      band.style.background = 'repeating-linear-gradient(135deg, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 7px, rgba(148,163,184,0.10) 7px, rgba(148,163,184,0.10) 14px)';
      band.style.borderLeft = '1px dashed rgba(148,163,184,0.38)';
      band.style.borderRight = '1px dashed rgba(148,163,184,0.38)';
      band.title = `Data unavailable (${window.reason})`;
      bar.appendChild(band);
    });
  }

  function buildViewModeTimelineRow(total) {
    const row = document.createElement('div');
    row.className = 'et-row';
    row.dataset.timelineRow = 'view-mode';
    const head = document.createElement('div');
    head.className = 'et-row-head';
    const label = document.createElement('div');
    label.className = 'et-label';
    label.textContent = 'View Mode';
    const actions = document.createElement('div');
    actions.className = 'et-actions';
    const status = document.createElement('div');
    status.className = 'subtitle';
    status.style.fontSize = '10px';
    status.style.margin = '0';
    status.style.color = getViewModeTimelineDraft() ? 'var(--accent)' : 'var(--text-3)';
    status.textContent = getViewModeTimelineDraft() ? 'Draft pending' : 'Recorded';
    const btnDelSeg = document.createElement('button');
    btnDelSeg.className = 'icon-btn';
    btnDelSeg.type = 'button';
    btnDelSeg.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4"/></svg>';
    btnDelSeg.title = 'Delete selected View Mode segment';
    const selectedSeg = getSelectedViewModeTimelineSegment();
    btnDelSeg.disabled = exportRenderState.active || !selectedSeg || viewModeTimelineState.segments.length <= 1;
    btnDelSeg.style.opacity = btnDelSeg.disabled ? '0.45' : '1';
    btnDelSeg.style.cursor = btnDelSeg.disabled ? 'default' : 'pointer';
    btnDelSeg.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (btnDelSeg.disabled) return;
      deleteViewModeTimelineSegmentById(selectedSeg.id);
    });
    const btnClearViewMode = document.createElement('button');
    btnClearViewMode.className = 'icon-btn';
    btnClearViewMode.type = 'button';
    btnClearViewMode.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
    btnClearViewMode.title = 'Clear all View Mode segments and reset to default overview';
    btnClearViewMode.disabled = exportRenderState.active;
    btnClearViewMode.style.opacity = btnClearViewMode.disabled ? '0.45' : '1';
    btnClearViewMode.style.cursor = btnClearViewMode.disabled ? 'default' : 'pointer';
    btnClearViewMode.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (btnClearViewMode.disabled) return;
      resetViewModeStateToDefaultsAndClearTimeline();
    });
    actions.appendChild(status);
    actions.appendChild(btnDelSeg);
    actions.appendChild(btnClearViewMode);
    head.appendChild(label);
    head.appendChild(actions);

    const bar = document.createElement('div');
    bar.className = 'et-bar';
    bar.style.height = '14px';

    const segments = viewModeTimelineState.segments.slice();
    segments.forEach((seg, idx) => {
      const snapshot = seg.snapshot || {};
      const mode = snapshot.viewMode || 'overview';
      const palette = VIEW_MODE_TIMELINE_PALETTE[mode] || VIEW_MODE_TIMELINE_PALETTE.overview;
      const fill = document.createElement('div');
      fill.className = 'et-fill';
      if (viewModeTimelineState.selectedSegmentId === seg.id) {
        fill.classList.add('active');
      }
      fill.dataset.viewModeSegId = String(seg.id);
      const startPct = Math.max(0, Math.min(1, (seg.start || 0) / total));
      const endPct = Math.max(startPct, Math.min(1, (seg.end || total) / total));
      fill.style.left = `${startPct * 100}%`;
      fill.style.width = `${Math.max(1.2, (endPct - startPct) * 100)}%`;
      fill.style.background = `linear-gradient(90deg, ${palette.fill}, ${palette.fill})`;
      fill.style.border = `1px solid ${palette.border}`;
      fill.style.borderRadius = getTimelineSegmentBorderRadius(startPct, endPct);
      fill.style.opacity = '0.95';
      fill.title = `${snapshot.viewMode || 'overview'} @ ${formatClockLabel(seg.start || 0)}`;
      const txt = document.createElement('span');
      txt.textContent = (snapshot.viewMode || 'overview').slice(0, 1).toUpperCase();
      txt.style.position = 'absolute';
      txt.style.left = '6px';
      txt.style.top = '50%';
      txt.style.transform = 'translateY(-50%)';
      txt.style.fontSize = '9px';
      txt.style.fontWeight = '700';
      txt.style.letterSpacing = '0.08em';
      txt.style.color = palette.text;
      txt.style.pointerEvents = 'none';
      txt.style.opacity = '0.95';
      fill.appendChild(txt);
      fill.addEventListener('click', (ev) => {
        if (exportRenderState.active) return;
        ev.stopPropagation();
        setSelectedViewModeTimelineSegmentId(seg.id);
        seekAndApplyViewModeSegment(seg, seg.start || 0);
      });
      const canDragLeft = idx > 0;
      const canDragRight = idx < segments.length - 1;
      if (canDragLeft) {
        const hLeft = document.createElement('div');
        hLeft.className = 'et-handle left';
        fill.appendChild(hLeft);
        makeViewModeTimelineBoundaryDraggable(hLeft, seg.id, 'left');
      }
      if (canDragRight) {
        const hRight = document.createElement('div');
        hRight.className = 'et-handle right';
        fill.appendChild(hRight);
        makeViewModeTimelineBoundaryDraggable(hRight, seg.id, 'right');
      }
      bar.appendChild(fill);
    });

    const draft = getViewModeTimelineDraft();
    if (draft?.snapshot) {
      const mode = draft.snapshot.viewMode || 'overview';
      const palette = VIEW_MODE_TIMELINE_PALETTE[mode] || VIEW_MODE_TIMELINE_PALETTE.overview;
      const fill = document.createElement('div');
      fill.className = 'et-fill';
      const startPct = Math.max(0, Math.min(1, (draft.start || 0) / total));
      const nextSeg = viewModeTimelineState.segments.find(seg => seg.start > (draft.start || 0));
      const draftEnd = nextSeg ? nextSeg.start : total;
      const endPct = Math.max(startPct, Math.min(1, draftEnd / total));
      fill.style.left = `${startPct * 100}%`;
      fill.style.width = `${Math.max(1.2, (endPct - startPct) * 100)}%`;
      fill.style.background = palette.fillSoft;
      fill.style.border = `1px dashed ${palette.border}`;
      fill.style.borderRadius = getTimelineSegmentBorderRadius(startPct, endPct);
      fill.style.opacity = '0.85';
      fill.title = `Draft · ${draft.snapshot.viewMode || 'overview'} @ ${formatClockLabel(draft.start || 0)}`;
      bar.appendChild(fill);
    }

    bar.addEventListener('click', (e) => {
      if (exportRenderState.active) return;
      const rect = bar.getBoundingClientRect();
      if (!(rect.width > 0)) return;
      const clickX = e.clientX - rect.left;
      const sec = (clickX / rect.width) * total;
      const seg = findViewModeTimelineSegmentAtTime(sec);
      if (seg?.id != null) setSelectedViewModeTimelineSegmentId(seg.id);
      seekAndApplyViewModeSegment(seg, sec);
    });

    row.appendChild(head);
    row.appendChild(bar);
    return row;
  }

  function buildPlaybackRateTimelineRow(total) {
    const row = document.createElement('div');
    row.className = 'et-row';
    row.dataset.timelineRow = 'playback-speed';
    const head = document.createElement('div');
    head.className = 'et-row-head';
    const label = document.createElement('div');
    label.className = 'et-label';
    label.textContent = 'Playback Speed';
    const actions = document.createElement('div');
    actions.className = 'et-actions';
    const status = document.createElement('div');
    status.className = 'subtitle';
    status.style.fontSize = '10px';
    status.style.margin = '0';
    status.style.color = playbackRateTimelineState.draft ? 'rgba(245, 158, 11, 0.85)' : 'rgba(148,163,184,0.75)';
    status.textContent = playbackRateTimelineState.draft
      ? `Draft ${formatPlaybackRateLabel(playbackRateTimelineState.draft.rate)}`
      : `Current ${formatPlaybackRateLabel(getCurrentPlaybackRateValue())}`;
    const selectedSeg = getSelectedPlaybackRateTimelineSegment();
    const btnDelSeg = document.createElement('button');
    btnDelSeg.className = 'icon-btn';
    btnDelSeg.type = 'button';
    btnDelSeg.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4"/></svg>';
    btnDelSeg.title = 'Delete selected Playback Speed segment';
    btnDelSeg.disabled = exportRenderState.active || !selectedSeg || playbackRateTimelineState.segments.length <= 1;
    btnDelSeg.style.opacity = btnDelSeg.disabled ? '0.45' : '1';
    btnDelSeg.style.cursor = btnDelSeg.disabled ? 'default' : 'pointer';
    btnDelSeg.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (btnDelSeg.disabled) return;
      deletePlaybackRateTimelineSegmentById(selectedSeg.id);
    });
    const btnClearPlayback = document.createElement('button');
    btnClearPlayback.className = 'icon-btn';
    btnClearPlayback.type = 'button';
    btnClearPlayback.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
    btnClearPlayback.title = 'Clear all Playback Speed segments and reset to 1.0x';
    btnClearPlayback.disabled = exportRenderState.active;
    btnClearPlayback.style.opacity = btnClearPlayback.disabled ? '0.45' : '1';
    btnClearPlayback.style.cursor = btnClearPlayback.disabled ? 'default' : 'pointer';
    btnClearPlayback.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (btnClearPlayback.disabled) return;
      resetPlaybackRateTimelineToDefaults();
    });
    actions.appendChild(status);
    actions.appendChild(btnDelSeg);
    actions.appendChild(btnClearPlayback);
    head.appendChild(label);
    head.appendChild(actions);

    const bar = document.createElement('div');
    bar.className = 'et-bar';
    bar.style.height = '12px';

    playbackRateTimelineState.segments.forEach((seg, idx) => {
      const fill = document.createElement('div');
      fill.className = 'et-fill';
      if (playbackRateTimelineState.selectedSegmentId === seg.id) {
        fill.classList.add('active');
      }
      const startPct = Math.max(0, Math.min(1, (seg.start || 0) / total));
      const endPct = Math.max(startPct, Math.min(1, (seg.end || total) / total));
      fill.style.left = `${startPct * 100}%`;
      fill.style.width = `${Math.max(1.2, (endPct - startPct) * 100)}%`;
      fill.style.borderRadius = getTimelineSegmentBorderRadius(startPct, endPct);
      fill.style.background = '#79a7da';
      fill.style.border = '1px solid rgba(173, 212, 255, 0.18)';
      fill.style.opacity = '0.92';
      fill.title = `${formatPlaybackRateLabel(seg.rate)} @ ${formatClockLabel(seg.start || 0)}`;
      const txt = document.createElement('span');
      txt.textContent = formatPlaybackRateLabel(seg.rate);
      txt.style.position = 'absolute';
      txt.style.left = '6px';
      txt.style.top = '50%';
      txt.style.transform = 'translateY(-50%)';
      txt.style.fontSize = '9px';
      txt.style.fontWeight = '700';
      txt.style.letterSpacing = '0.02em';
      txt.style.color = 'rgba(241, 245, 249, 0.96)';
      txt.style.pointerEvents = 'none';
      txt.style.opacity = ((endPct - startPct) * 100) >= 7 ? '0.96' : '0';
      fill.appendChild(txt);
      fill.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelectedPlaybackRateTimelineSegmentId(seg.id);
        seekAndApplyPlaybackRateSegment(seg, seg.start || 0);
      });
      const canDragLeft = idx > 0;
      const canDragRight = idx < playbackRateTimelineState.segments.length - 1;
      if (canDragLeft) {
        const hLeft = document.createElement('div');
        hLeft.className = 'et-handle left';
        fill.appendChild(hLeft);
        makePlaybackRateTimelineBoundaryDraggable(hLeft, seg.id, 'left');
      }
      if (canDragRight) {
        const hRight = document.createElement('div');
        hRight.className = 'et-handle right';
        fill.appendChild(hRight);
        makePlaybackRateTimelineBoundaryDraggable(hRight, seg.id, 'right');
      }
      bar.appendChild(fill);
    });

    const draft = playbackRateTimelineState.draft;
    if (draft) {
      const fill = document.createElement('div');
      fill.className = 'et-fill';
      const startPct = Math.max(0, Math.min(1, (draft.start || 0) / total));
      const nextSeg = playbackRateTimelineState.segments.find(seg => seg.start > (draft.start || 0));
      const draftEnd = nextSeg ? nextSeg.start : total;
      const endPct = Math.max(startPct, Math.min(1, draftEnd / total));
      fill.style.left = `${startPct * 100}%`;
      fill.style.width = `${Math.max(1.2, (endPct - startPct) * 100)}%`;
      fill.style.borderRadius = getTimelineSegmentBorderRadius(startPct, endPct);
      fill.style.background = 'rgba(121, 167, 218, 0.28)';
      fill.style.border = '1px dashed rgba(173, 212, 255, 0.24)';
      fill.title = `Draft ${formatPlaybackRateLabel(draft.rate)} @ ${formatClockLabel(draft.start || 0)}`;
      bar.appendChild(fill);
    }

    bar.addEventListener('click', (e) => {
      const rect = bar.getBoundingClientRect();
      if (!(rect.width > 0)) return;
      const clickX = e.clientX - rect.left;
      const sec = (clickX / rect.width) * total;
      const seg = findPlaybackRateTimelineSegmentAtTime(sec);
      setSelectedPlaybackRateTimelineSegmentId(seg?.id ?? null);
      seekAndApplyPlaybackRateSegment(seg, sec);
    });

    row.appendChild(head);
    row.appendChild(bar);
    return row;
  }

  function renderElementTimeline() {
    if (!elementsTimelineEl) return;
    const total = videoDuration || 20;
    elementsTimelineEl.innerHTML = '';
    elementsTimelineEl.appendChild(buildViewModeTimelineRow(total));
    elementsTimelineEl.appendChild(buildPlaybackRateTimelineRow(total));
    const list = Array.from(elements.values());
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'subtitle';
      empty.textContent = 'No layers yet';
      elementsTimelineEl.appendChild(empty);
    } else {
      list.forEach(el => {
        const row = document.createElement('div');
        row.className = 'et-row';
        row.classList.toggle('active-card-selected', activeElementId === el.id);
        const head = document.createElement('div');
        head.className = 'et-row-head';
        const label = document.createElement('div');
        label.className = 'et-label';
        const primaryState = getPrimaryElementState(el) || el;
        label.textContent = `${VIS_LIBRARY[el.typeId]?.label || el.typeId} · ${primaryState.repType}`;
        const intervals = getSortedElementIntervals(el);
        const actions = document.createElement('div');
        actions.className = 'et-actions';
        const btnEye = document.createElement('button');
        btnEye.className = 'icon-btn';
        btnEye.innerHTML = el.visible
          ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><line x1="2" y1="2" x2="14" y2="14"/></svg>';
        btnEye.title = 'Toggle visibility';
        btnEye.addEventListener('click', (ev) => {
          ev.stopPropagation();
          el.visible = !el.visible;
          renderElementTimeline();
          requestOverlayRefresh();
        });
        const btnDel = document.createElement('button');
        btnDel.className = 'icon-btn';
        btnDel.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4"/></svg>';
        const selectedIntervalForRow = (activeElementId === el.id) ? activeIntervalId : null;
        const canDeleteSelectedInterval = !!selectedIntervalForRow && intervals.some(int => int.id === selectedIntervalForRow);
        btnDel.title = 'Delete selected segment';
        btnDel.disabled = !canDeleteSelectedInterval;
        btnDel.style.opacity = btnDel.disabled ? '0.45' : '1';
        btnDel.style.cursor = btnDel.disabled ? 'default' : 'pointer';
        btnDel.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (btnDel.disabled) return;
          deleteElementIntervalById(el.id, selectedIntervalForRow);
        });
        const btnDelBar = document.createElement('button');
        btnDelBar.className = 'icon-btn';
        btnDelBar.type = 'button';
        btnDelBar.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
        btnDelBar.title = 'Delete layer bar';
        btnDelBar.addEventListener('click', (ev) => {
          ev.stopPropagation();
          removeElement(el.id);
        });
        actions.appendChild(btnEye);
        actions.appendChild(btnDel);
        actions.appendChild(btnDelBar);
        head.appendChild(label);
        head.appendChild(actions);
        const bar = document.createElement('div');
        bar.className = 'et-bar';
        const pendingInsertForRow = pendingIntervalInsert?.elementId === el.id ? pendingIntervalInsert : null;
        bar.classList.toggle('et-bar--insert-pending', !!pendingInsertForRow);
        intervals.forEach(int => {
          const fill = document.createElement('div');
          const isSelectedInterval = activeElementId === el.id && activeIntervalId === int.id;
          fill.className = `et-fill ${isSelectedInterval ? 'active' : ''}`;
          const startPct = Math.max(0, Math.min(1, (int.start || 0) / total));
          const endPct = Math.max(startPct, Math.min(1, (int.end || total) / total));
          const left = startPct * 100;
          const width = Math.max(2, (endPct - startPct) * 100);
          fill.style.left = `${left}%`;
          fill.style.width = `${width}%`;
          fill.style.borderRadius = getTimelineSegmentBorderRadius(startPct, endPct);
          fill.dataset.elementId = el.id;
          fill.dataset.intId = int.id;
          const hLeft = document.createElement('div');
          hLeft.className = 'et-handle left';
          const hRight = document.createElement('div');
          hRight.className = 'et-handle right';
          fill.appendChild(hLeft);
          fill.appendChild(hRight);
          fill.addEventListener('click', (e) => {
            e.stopPropagation();
            clearPendingIntervalInsert();
            activeElementId = el.id;
            activeIntervalId = int.id;
            openEditor(el, overlay.athletes);
            renderElementTimeline();
            if (videoEl) {
              videoEl.currentTime = int.start || 0;
            }
            syncUiToSeekTime(int.start || 0, { resetPlaybackBaseline: true });
          });
          makeIntervalDraggable(fill, el, int, hLeft, hRight);
          bar.appendChild(fill);
        });
        appendMetricValidityBandOverlays(bar, total, el.typeId);

        if (pendingInsertForRow) {
          const popover = document.createElement('div');
          popover.className = 'et-insert-popover';
          popover.style.left = `${Math.max(0, Math.min(100, (pendingInsertForRow.timeSec / total) * 100))}%`;
          popover.addEventListener('click', (e) => {
            e.stopPropagation();
          });

          const label = document.createElement('div');
          label.className = 'et-insert-popover-label';
          label.textContent = 'Insert segment?';

          const confirmBtn = document.createElement('button');
          confirmBtn.className = 'et-insert-popover-btn';
          confirmBtn.type = 'button';
          confirmBtn.textContent = 'Insert';
          confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeElementId = el.id;
            addIntervalAtTime(pendingInsertForRow.timeSec);
          });

          popover.appendChild(label);
          popover.appendChild(confirmBtn);
          bar.appendChild(popover);
        }

        bar.addEventListener('mousemove', (e) => {
          const insertTarget = resolveInsertTargetFromPointer(el, bar, e.clientX, total);
          bar.classList.toggle('et-bar--insertable', !!insertTarget && !pendingInsertForRow);
        });

        bar.addEventListener('mouseleave', () => {
          bar.classList.remove('et-bar--insertable');
        });

        bar.addEventListener('click', (e) => {
          const insertTarget = resolveInsertTargetFromPointer(el, bar, e.clientX, total);
          if (insertTarget) {
            e.stopPropagation();
            bar.classList.remove('et-bar--insertable');
            const wasSameElementSelected = activeElementId === el.id;
            activeElementId = el.id;
            activeIntervalId = activeIntervalId && wasSameElementSelected
              ? activeIntervalId
              : getFirstElementInterval(el)?.id || null;
            openEditor(el, overlay.athletes);
            if (videoEl) {
              videoEl.currentTime = insertTarget.sec;
            }
            syncUiToSeekTime(insertTarget.sec, { resetPlaybackBaseline: true });
            pendingIntervalInsert = {
              elementId: el.id,
              timeSec: insertTarget.sec
            };
            renderElementTimeline();
            return;
          }
          const rect = bar.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const sec = (clickX / rect.width) * total;
          if (videoEl) {
            videoEl.currentTime = sec;
          }
          syncUiToSeekTime(sec, { resetPlaybackBaseline: true });
        });

        row.appendChild(head);
        row.appendChild(bar);
        row.addEventListener('click', () => {
          clearPendingIntervalInsert();
          activeElementId = el.id;
          activeIntervalId = getFirstElementInterval(el)?.id || null;
          openEditor(el, overlay.athletes);
          renderElementTimeline();
        });
        elementsTimelineEl.appendChild(row);
      });
    }
    updateVisChipActive();

    let playhead = document.getElementById('et-playhead');
    if (!playhead) {
      playhead = document.createElement('div');
      playhead.id = 'et-playhead';
      playhead.className = 'et-playhead';
      elementsTimelineEl.appendChild(playhead);
    } else {
      elementsTimelineEl.appendChild(playhead);
    }
    updateTimelinePlayhead(prevTimeSec || 0);
  }

  function updateTimelinePlayhead(t) {
    if (!elementsTimelineEl || !timelineScrubber) return;
    let playhead = document.getElementById('et-playhead');
    if (!playhead) {
      playhead = document.createElement('div');
      playhead.id = 'et-playhead';
      playhead.className = 'et-playhead';
      elementsTimelineEl.appendChild(playhead);
    }
    const total = videoDuration || 20;
    const pct = Math.max(0, Math.min(1, t / total));

    const scrubberRect = timelineScrubber.getBoundingClientRect();
    const elementsRect = elementsTimelineEl.getBoundingClientRect();
    const timelineBarRect = timelineBarEl?.getBoundingClientRect();

    if (scrubberRect.width > 0) {
      const clientX = scrubberRect.left + scrubberRect.width * pct;
      const playheadX = Math.max(0, Math.min(elementsRect.width, clientX - elementsRect.left));
      playhead.style.left = `${playheadX}px`;

      if (timelinePointerEl && timelineBarRect && timelineBarRect.width > 0) {
        const pointerX = Math.max(0, Math.min(timelineBarRect.width, clientX - timelineBarRect.left));
        timelinePointerEl.style.left = `${pointerX}px`;
      }
      return;
    }
    playhead.style.left = `${pct * 100}%`;
    if (timelinePointerEl) {
      timelinePointerEl.style.left = `${pct * 100}%`;
    }
  }

  function updateTimelineDisplayedTime(nowSec = 0, totalSec = 0, opts = {}) {
    const displayTime = Number.isFinite(nowSec) ? Math.max(0, nowSec) : 0;
    const playheadTime = Number.isFinite(opts.playheadTimeSec)
      ? Math.max(0, opts.playheadTimeSec)
      : (Number.isFinite(prevTimeSec) ? Math.max(0, prevTimeSec) : displayTime);
    updateVideoTimeLabel(displayTime, totalSec);
    updateTimelinePlayhead(playheadTime);
  }

  function resolveStableTimelinePlayheadTime(observedTimeSec) {
    let next = Number.isFinite(observedTimeSec) ? Math.max(0, observedTimeSec) : 0;
    if (isScrubbing) return next;
    if (!videoEl?.paused) {
      next = Math.max(next, Number.isFinite(lastObservedPlayingTimeSec) ? lastObservedPlayingTimeSec : 0);
    }
    if (playbackResumeGuard && !videoEl?.paused) {
      next = Math.max(next, Number(playbackResumeGuard.targetTimeSec) || 0);
    }
    return next;
  }

  function syncUiToSeekTime(timeSec, opts = {}) {
    const t = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0;
    prevTimeSec = t;
    setPlaybackResumeHint(t);
    if (opts.resetPlaybackBaseline) {
      lastObservedPlayingTimeSec = t;
      clearPlaybackStartAnchor();
      clearPlaybackResumeGuard();
    }
    if (videoEl?.paused) {
      clearPlaybackStartAnchor();
      clearPlaybackResumeGuard();
    }
    if (timelineScrubber && !opts.skipScrubberValue) {
      timelineScrubber.value = t.toFixed(2);
    }
    updateTimelineDisplayedTime(t, videoDuration || videoEl?.duration || 0, {
      playheadTimeSec: t
    });
    if (!opts.skipOverlayRefresh) {
      requestOverlayRefresh();
    }
  }

  function addIntervalAtTime(t) {
    const el = activeElementId ? elements.get(activeElementId) : null;
    if (!el) return;
    const total = videoDuration || 20;
    const gap = findElementGapAtTime(el, t, total);
    if (!gap) return;
    const gapDuration = Math.max(0, gap.end - gap.start);
    if (gapDuration < 0.2) return;
    const desiredDur = 3;
    let start = Math.max(gap.start, Math.min(gap.end - 0.2, t));
    let end = Math.min(gap.end, start + desiredDur);
    if (end - start < 0.2) {
      end = gap.end;
      start = Math.max(gap.start, end - Math.min(desiredDur, gapDuration));
    }
    if (end - start < 0.2) return;
    const seedState = resolveInsertSeedState(el, start) || el;
    const newInt = {
      id: `int_${Date.now()}`,
      start,
      end,
      settings: createSegmentSettingsFromSource(el, seedState)
    };
    if (!el.intervals) el.intervals = [];
    el.intervals.push(newInt);
    activeElementId = el.id;
    activeIntervalId = newInt.id;
    clearPendingIntervalInsert(el.id);
    openEditor(el, overlay.athletes);
    renderElementTimeline();
    requestOverlayRefresh();
  }

  function deleteElementIntervalById(elementId, intervalId) {
    if (!elementId || !intervalId) return false;
    const el = elements.get(elementId);
    if (!el || !Array.isArray(el.intervals)) return false;
    const beforeLen = el.intervals.length;
    el.intervals = el.intervals.filter(int => int.id !== intervalId);
    if (el.intervals.length === beforeLen) return false;

    if (!el.intervals.length) {
      removeElement(el.id);
      activeIntervalId = null;
      return true;
    }

    if (activeElementId === el.id && activeIntervalId === intervalId) {
      activeIntervalId = getFirstElementInterval(el)?.id || null;
    }
    clearPendingIntervalInsert(elementId);
    if (activeElementId === el.id) {
      openEditor(el, overlay.athletes);
    }
    renderElementTimeline();
    requestOverlayRefresh();
    return true;
  }

  function deleteActiveInterval() {
    if (!activeElementId || !activeIntervalId) return;
    deleteElementIntervalById(activeElementId, activeIntervalId);
  }

  function collectLayerTimelineSnapPoints(excludeElementId = null, excludeIntervalId = null) {
    const points = [];
    elements.forEach((el) => {
      const intervals = Array.isArray(el?.intervals) ? el.intervals : [];
      intervals.forEach((int) => {
        if (el.id === excludeElementId && int.id === excludeIntervalId) return;
        if (Number.isFinite(Number(int?.start))) points.push(Number(int.start));
        if (Number.isFinite(Number(int?.end))) points.push(Number(int.end));
      });
    });
    return Array.from(new Set(points.map((value) => Number(value).toFixed(3))))
      .map((value) => Number(value))
      .sort((a, b) => a - b);
  }

  function getAdjacentElementIntervals(el, intervalId) {
    if (!el || !intervalId) return { prev: null, next: null };
    const sorted = getSortedElementIntervals(el);
    const index = sorted.findIndex((int) => int?.id === intervalId);
    if (index < 0) return { prev: null, next: null };
    return {
      prev: index > 0 ? sorted[index - 1] : null,
      next: index < sorted.length - 1 ? sorted[index + 1] : null
    };
  }

  function snapLayerIntervalBoundary(candidateSec, barWidthPx, totalSec, excludeElementId = null, excludeIntervalId = null) {
    const thresholdPx = 10;
    const widthPx = Math.max(1, Number(barWidthPx) || 1);
    const total = Math.max(0.001, Number(totalSec) || 0.001);
    const thresholdSec = (thresholdPx / widthPx) * total;
    let best = candidateSec;
    let bestDist = thresholdSec + 1e-6;
    const snapPoints = collectLayerTimelineSnapPoints(excludeElementId, excludeIntervalId);
    snapPoints.forEach((pointSec) => {
      const dist = Math.abs(pointSec - candidateSec);
      if (dist <= bestDist) {
        best = pointSec;
        bestDist = dist;
      }
    });
    return best;
  }

  function makeIntervalDraggable(fillEl, elementState, interval, handleLeft, handleRight) {
    let resizing = null; // 'left' | 'right'
    let startX = 0;
    let startStart = 0;
    let startEnd = 0;
    const total = videoDuration || 20;
    let prevUserSelect = '';

    const onMouseDownResize = (mode) => (e) => {
      e.stopPropagation();
      resizing = mode;
      startX = e.clientX;
      startStart = interval.start;
      startEnd = interval.end;
      prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      const deltaPx = e.clientX - startX;
      const bar = fillEl.parentElement;
      if (!bar) return;
      const barRect = bar.getBoundingClientRect();
      const deltaSec = (deltaPx / barRect.width) * total;
      const { prev, next } = getAdjacentElementIntervals(elementState, interval?.id);
      let updated = false;
      if (resizing === 'left') {
        let newStart = startStart + deltaSec;
        if (newStart < 0) newStart = 0;
        newStart = snapLayerIntervalBoundary(newStart, barRect.width, total, elementState?.id, interval?.id);
        const minStart = prev ? Number(prev.end) || 0 : 0;
        if (newStart < minStart) newStart = minStart;
        if (newStart < interval.end - 0.2) {
          interval.start = newStart;
          updated = true;
        }
      } else if (resizing === 'right') {
        let newEnd = startEnd + deltaSec;
        if (newEnd > total) newEnd = total;
        newEnd = snapLayerIntervalBoundary(newEnd, barRect.width, total, elementState?.id, interval?.id);
        const maxEnd = next ? Number(next.start) || total : total;
        if (newEnd > maxEnd) newEnd = maxEnd;
        if (newEnd > interval.start + 0.2) {
          interval.end = newEnd;
          updated = true;
        }
      }
      if (updated) {
        const startPct = Math.max(0, Math.min(1, (interval.start || 0) / total));
        const endPct = Math.max(startPct, Math.min(1, (interval.end || total) / total));
        fillEl.style.left = `${startPct * 100}%`;
        fillEl.style.width = `${Math.max(2, (endPct - startPct) * 100)}%`;
      }
    };

    const onMouseUp = () => {
      resizing = null;
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      renderElementTimeline();
      requestOverlayRefresh();
    };

    handleLeft?.addEventListener('mousedown', onMouseDownResize('left'));
    handleRight?.addEventListener('mousedown', onMouseDownResize('right'));
  }

  function getEffectiveRepPropsForRender(activeConfig, repType, autoFontSize = null, typeId = null) {
    const metricDefaults = typeId
      ? buildLayerDefaultRepProps(typeId, repType, activeConfig?.color || '#d3d3d3')
      : {};
    const repProps = {
      ...clonePlainData(metricDefaults),
      ...clonePlainData(activeConfig?.repProps || {})
    };
    if (
      repType === 'text'
      && Number.isFinite(autoFontSize)
      && Number(repProps?.fontSize) === DEFAULT_TEXT_REP_FONT_SIZE
    ) {
      repProps.fontSize = autoFontSize;
    }
    return repProps;
  }

  function getNonProjectedRepresentationScaleAdjustment(typeId, repType, spec) {
    if (
      BASELINE_DELTA_ARROW_TYPES.has(String(typeId || ''))
      && String(repType || '') === 'arrow'
      && spec?.variant === 'baselineDelta'
    ) {
      return 0.34;
    }
    if (String(typeId || '') === 'acceleration' && String(repType || '') === 'arrow') {
      return 0.42;
    }
    return 1;
  }

  function getProjectedRepresentationScaleAdjustment(typeId, repType) {
    const normalizedTypeId = String(typeId || '');
    const normalizedRepType = String(repType || '');
    if (normalizedTypeId === 'currentSpeed' || normalizedTypeId === 'avgSpeed') {
      return 1;
    }
    if (normalizedTypeId === 'speedDiffSwimmer' && (normalizedRepType === 'text' || normalizedRepType === 'bar')) {
      return 1;
    }
    if (normalizedTypeId === 'timeDiffSwimmer' && (normalizedRepType === 'text' || normalizedRepType === 'bar')) {
      return 1;
    }
    if (normalizedTypeId === 'acceleration' && (normalizedRepType === 'text' || normalizedRepType === 'bar')) {
      return 1;
    }
    if (
      ['distanceSwam', 'remainingDistance', 'distanceDiffLeader', 'positionDiffSwimmer', 'positionDiffRecord'].includes(normalizedTypeId)
      && normalizedRepType === 'text'
    ) {
      return 1;
    }
    if (
      ['timeDiffRecord', 'speedDiffRecord', 'estCompletion'].includes(normalizedTypeId)
      && (normalizedRepType === 'text' || normalizedRepType === 'bar')
    ) {
      return 1;
    }
    if (normalizedTypeId === 'rank' && (normalizedRepType === 'text' || normalizedRepType === 'badge')) {
      return 1;
    }
    let scaleAdjust = 2.5;
    if (normalizedTypeId === 'country' && normalizedRepType === 'flag') {
      scaleAdjust = 2.5;
    }
    if (normalizedTypeId === 'awardsInfo' && normalizedRepType === 'medalSummary') {
      scaleAdjust = 2.5;
    }
    if (normalizedTypeId === 'appearancesInfo' && normalizedRepType === 'ringsCount') {
      scaleAdjust = 2.5;
    }
    return Math.max(2.5, scaleAdjust);
  }

  function renderCompareLineLayer(el, metricDef, activeConfig, athletes, frameTimeSec, currentDirection, motionState) {
    const laneSelection = resolveRenderableLaneSelection(
      activeConfig.lanes instanceof Set ? activeConfig.lanes : el.lanes,
      activeConfig.laneSelectionMode ?? el?.laneSelectionMode ?? 'lane',
      athletes
    );
    const allEntries = buildCompareLineLaneEntries(athletes, null, currentDirection);
    const selectedEntries = buildCompareLineLaneEntries(athletes, laneSelection, currentDirection);
    const repType = ensureElementRepStyleState(activeConfig);
    const repPropsForRender = getEffectiveRepPropsForRender(activeConfig, repType, null, el.typeId);
    const geometry = buildCompareLineGeometry(
      el.typeId,
      allEntries,
      selectedEntries,
      athletes,
      activeConfig,
      currentDirection,
      activeConfig.project !== false,
      frameTimeSec,
      repPropsForRender
    );
    const compareKey = '__compare_line__';
    let inst = el.instances.get(compareKey);
    if (!inst) {
      inst = createInstanceContainers();
      inst.content.addChild(inst.barBg, inst.barFill, inst.barFill2, inst.circle, inst.flagSprite, inst.textBg, inst.text);
      inst.container.addChild(inst.content);
      el.container.addChild(inst.container);
      el.instances.set(compareKey, inst);
    }

    if (!geometry?.mainSegments?.length) {
      inst.container.visible = false;
      el.instances.forEach((otherInst, id) => {
        if (id !== compareKey && otherInst?.container) otherInst.container.visible = false;
      });
      return;
    }

    resetInstanceVisualState(inst);
    const color = hexToPixi(activeConfig.color || '#d3d3d3');
    const referenceAthlete = selectedEntries[0]?.athlete || allEntries[0]?.athlete || athletes?.[0] || null;
    const baseSpec = metricDef.buildSpec(repType, {
      value: null,
      athlete: referenceAthlete,
      frameTimeSec,
      direction: currentDirection,
      placementDirection: currentDirection,
      raceLength: getOverlayRaceLength(),
      color,
      runtimeState: metricRuntimeState,
      videoHeight: videoH,
      laneZoneHeight: getAverageLaneZoneHeightPx(),
      formatTime
    }) || {};
    const spec = applyRepresentationStyle(repType, baseSpec, repPropsForRender, activeConfig.styleOverrides, color);
    const widthScale = Math.max(0.25, Number(activeConfig.scale) || 1) * Math.max(0.18, motionState.scaleX || 1);
    spec.mainLineWidth = Math.max(1, Number(spec?.mainLineWidth ?? 6) * widthScale);
    spec.childLineWidth = Math.max(1, Number(spec?.childLineWidth ?? 3.4) * widthScale);
    spec.mainSegments = geometry.mainSegments;
    spec.childSegments = geometry.childSegments || [];
    if (el.typeId === 'positionDiffRecord' && geometry?.recordDebugGeometry && repPropsForRender?.showDebugOverlay !== false) {
      const viewportHeight = Math.max(0, getViewportHeight() || 0);
      spec.debugOverlay = {
        enabled: true,
        guideSegments: geometry.recordDebugGeometry.guideSegments || [],
        labelText: geometry.recordDebugGeometry.labelText || '',
        labelX: geometry.recordDebugGeometry.labelX,
        labelY: (
          viewportHeight > 0
            ? Math.max(18, Math.min(viewportHeight - 12, Number(geometry.recordDebugGeometry.labelY ?? 0) - Number(repPropsForRender.debugLabelOffsetY ?? 16)))
            : Math.max(18, Number(geometry.recordDebugGeometry.labelY ?? 0) - Number(repPropsForRender.debugLabelOffsetY ?? 16))
        ),
        guideLabels: (geometry.recordDebugGeometry.guideLabels || []).map((entry) => ({
          ...entry,
          y: Math.max(14, Number(entry?.y ?? 0) - Number(repPropsForRender.debugEndpointLabelOffsetY ?? 14))
        })),
        color: hexToPixi(repPropsForRender.debugColor || '#fbbf24'),
        alpha: clamp01(repPropsForRender.debugAlpha ?? 0.42),
        lineWidth: Math.max(0.5, Number(repPropsForRender.debugWidth ?? 1.8)),
        labelColor: hexToPixi(repPropsForRender.debugLabelColor || '#f8fafc'),
        labelBgColor: hexToPixi(repPropsForRender.debugLabelBgColor || '#020617'),
        labelBgAlpha: clamp01(repPropsForRender.debugLabelBgAlpha ?? 0.76),
        labelFontSize: Math.max(8, Number(repPropsForRender.debugLabelFontSize ?? 13)),
        labelPaddingX: Math.max(0, Number(repPropsForRender.debugLabelPaddingX ?? 10)),
        labelPaddingY: Math.max(0, Number(repPropsForRender.debugLabelPaddingY ?? 6)),
        labelRadius: Math.max(0, Number(repPropsForRender.debugLabelRadius ?? 8)),
        endpointLabelColor: hexToPixi(repPropsForRender.debugEndpointLabelColor || '#f8fafc'),
        endpointLabelFontSize: Math.max(8, Number(repPropsForRender.debugEndpointLabelFontSize ?? 11))
      };
    }

    renderRepresentation(inst, repType, spec || {}, { normalizeFlagTexture });
    inst.container.visible = true;
    inst.container.position.set(
      normalizeCompareLineOffsetX(el.typeId, repType, activeConfig.offsetX || 0),
      Number(activeConfig.offsetY || 0)
    );
    inst.container.scale.set(1, 1);
    inst.container.rotation = 0;
    inst.container.alpha = (activeConfig.alpha ?? 0.9) * motionState.alpha;
    inst.content.visible = true;
    inst.rtSprite.visible = false;

    el.instances.forEach((otherInst, id) => {
      if (id !== compareKey && otherInst?.container) otherInst.container.visible = false;
    });
  }

  function renderGlobalMetricLayer(el, metricDef, activeConfig, frameAthletes, frameTimeSec, motionAlpha = 1) {
    const key = 'global';
    let inst = el.instances.get(key);
    if (!inst) {
      inst = createInstanceContainers();
      inst.content.addChild(inst.barBg, inst.barFill, inst.barFill2, inst.circle, inst.flagSprite, inst.textBg, inst.text);
      inst.container.addChild(inst.content);
      el.container.addChild(inst.container);
      el.instances.set(key, inst);
    }

    const repType = ensureElementRepStyleState(activeConfig);
    const color = hexToPixi(activeConfig.color || '#ffffff');
    const value = el.typeId === 'elapsed'
      ? (Number.isFinite(frameTimeSec) ? frameTimeSec : 0)
      : getGlobalRecordMetricValue(el.typeId, frameAthletes);
    const baseSpec = metricDef.buildSpec(repType, {
      value,
      frameTimeSec,
      videoDuration,
      raceLength: getOverlayRaceLength(),
      color,
      runtimeState: metricRuntimeState,
      formatTime
    }) || {};
    const repProps = getEffectiveRepPropsForRender(activeConfig, repType, null, el.typeId);
    const spec = applyRepresentationStyle(repType, baseSpec, repProps, activeConfig.styleOverrides, color) || {};
    const anchor = resolveGlobalScreenAnchor(activeConfig.staticPlacement);
    if (repType === 'text') {
      spec.anchorX = anchor.anchorX;
      spec.anchorY = anchor.anchorY;
      spec.x = 0;
      spec.y = 0;
      spec.backgroundKey = `${el.typeId}-global`;
      if (el.typeId === 'elapsed') {
        spec.fontFamily = spec.fontFamily || 'SFMono-Regular, SF Mono, ui-monospace, Menlo, Monaco, Consolas, Liberation Mono, monospace';
        spec.fontWeight = spec.fontWeight || '600';
      }
    }

    resetInstanceVisualState(inst);
    renderRepresentation(inst, repType, spec, { normalizeFlagTexture });
    inst.container.visible = true;
    inst.container.alpha = (activeConfig.alpha ?? 0.95) * motionAlpha;
    inst.container.position.set(anchor.x + (activeConfig.offsetX || 0), anchor.y + (activeConfig.offsetY || 0));
    inst.container.scale.set(activeConfig.scale || 1);
    inst.container.rotation = (activeConfig.rotation || 0) * Math.PI / 180;
  }

  function getLayerSegmentMotionState(el, t) {
    const intervals = getElementIntervalList(el);
    const isStaticInfo = usesGlobalCornerPlacement(el?.typeId);
    if (!intervals.length || !Number.isFinite(t)) {
      return {
        active: false,
        factor: 0,
        alpha: 0,
        scaleX: 1,
        scaleY: 1,
        interval: null,
        settings: null
      };
    }

    const easeInCubic = (u) => {
      const x = clamp01(u);
      return x * x * x;
    };

    let bestMatch = null;
    for (const int of intervals) {
      const start = Number(int?.start);
      const end = Number(int?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

      const settings = ensureIntervalSettings(el, int);
      const motionEnabled = !isStaticInfo && settings?.segmentMotion !== false;
      const span = Math.max(0, end - start);
      const windowSec = motionEnabled
        ? Math.min(LAYER_SEGMENT_MOTION_SEC, Math.max(0.10, span * 0.35))
        : 0;
      const isDuringInterval = t >= start && t <= end;
      const isDuringExitTail = motionEnabled && t > end && t <= end + windowSec;
      if (!isDuringInterval && !isDuringExitTail) continue;

      let factor = 1;
      if (motionEnabled && windowSec > 1e-4) {
        if (t < start + windowSec) {
          factor = Math.min(factor, lerp(0.04, 1, easeOutCubic((t - start) / windowSec)));
        }
        if (t > end) {
          factor = Math.min(factor, lerp(1, 0, easeInCubic((t - end) / windowSec)));
        }
      }

      factor = clamp01(factor);
      const candidate = {
        active: factor > 0.001,
        factor,
        alpha: factor,
        scaleX: lerp(0.14, 1, factor),
        scaleY: 1,
        interval: int,
        settings,
        start
      };
      if (
        !bestMatch
        || start > bestMatch.start
        || (Math.abs(start - bestMatch.start) < 1e-6 && activeElementId === el.id && activeIntervalId === int.id)
      ) {
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      return {
        active: bestMatch.active,
        factor: bestMatch.factor,
        alpha: bestMatch.alpha,
        scaleX: bestMatch.scaleX,
        scaleY: bestMatch.scaleY,
        interval: bestMatch.interval,
        settings: bestMatch.settings
      };
    }

    return {
      active: false,
      factor: 0,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      interval: null,
      settings: null
    };
  }

  function scaleQuadFromDirectionalEdge(quad, scaleX = 1, directionSign = 1) {
    if (!quad || !quad.tl || !quad.tr || !quad.br || !quad.bl) return quad;
    const sx = clamp01(Number.isFinite(scaleX) ? scaleX : 1);
    if (sx >= 0.999) return quad;
    const anchorLeft = directionSign > 0;
    if (anchorLeft) {
      return {
        tl: { ...quad.tl },
        bl: { ...quad.bl },
        tr: {
          cx: lerp(quad.tl.cx, quad.tr.cx, sx),
          cy: lerp(quad.tl.cy, quad.tr.cy, sx)
        },
        br: {
          cx: lerp(quad.bl.cx, quad.br.cx, sx),
          cy: lerp(quad.bl.cy, quad.br.cy, sx)
        }
      };
    }
    return {
      tr: { ...quad.tr },
      br: { ...quad.br },
      tl: {
        cx: lerp(quad.tr.cx, quad.tl.cx, sx),
        cy: lerp(quad.tr.cy, quad.tl.cy, sx)
      },
      bl: {
        cx: lerp(quad.br.cx, quad.bl.cx, sx),
        cy: lerp(quad.br.cy, quad.bl.cy, sx)
      }
    };
  }

  function renderCustomElements(frame, dirSign, currentTimeSec = null, options = {}) {
    const arr = frame.athletes || frame.lanes || [];
    const allowedTypeIds = options.allowedTypeIds instanceof Set ? options.allowedTypeIds : null;
    const frameTimeSec = getFrameTimeSec(frame, overlay?.fps || 50, videoEl?.currentTime || 0);
    const renderTimeSec = Number.isFinite(Number(currentTimeSec))
      ? Number(currentTimeSec)
      : (Number.isFinite(videoEl?.currentTime) ? videoEl.currentTime : frameTimeSec);
    metricRuntimeState.displaySpeedMovingAverageSec = getMetricSmoothingWindowSec('currentSpeed', LIVE_DATA_UPDATE_INTERVAL_SEC);
    const currentDirection = resolveDirection(frame);
    const averageLaneZoneHeightPx = getAverageLaneZoneHeightPx();
    const { derivedById } = buildDerivedMetricsForFrame({
      athletes: arr,
      frameTimeSec,
      fps: overlay?.fps || 50,
      raceLength: getOverlayRaceLength(),
      runtimeState: metricRuntimeState
    });
    currentOverlayRenderContext = {
      frame,
      athletes: arr,
      frameTimeSec,
      renderTimeSec,
      direction: currentDirection,
      derivedById,
      averageLaneZoneHeightPx
    };
    const liveMetricContextByInterval = new Map();
    const getLiveMetricContextForType = (typeId) => {
      if (!supportsLiveDataUpdateInterval(typeId)) {
        const cacheKey = '__continuous__';
        if (liveMetricContextByInterval.has(cacheKey)) {
          return liveMetricContextByInterval.get(cacheKey);
        }
        const athleteById = new Map(
          arr
            .filter((athlete) => Number.isFinite(Number(athlete?.id)))
            .map((athlete) => [Number(athlete.id), athlete])
        );
        const context = {
          intervalSec: 0,
          athletes: arr,
          frameTimeSec,
          derivedById,
          athleteById,
          runtimeState: metricRuntimeState
        };
        liveMetricContextByInterval.set(cacheKey, context);
        return context;
      }
      const intervalSec = getMetricUpdateIntervalSec(typeId, LIVE_DATA_UPDATE_INTERVAL_SEC);
      const cacheKey = intervalSec.toFixed(2);
      if (liveMetricContextByInterval.has(cacheKey)) {
        return liveMetricContextByInterval.get(cacheKey);
      }
      const liveMetricTimeSec = resolveMetricDisplayTimeSec(typeId, renderTimeSec, LIVE_DATA_UPDATE_INTERVAL_SEC);
      const liveMetricFrame = overlay?.getFrameByTime?.(liveMetricTimeSec) || null;
      const liveMetricAthletes = Array.isArray(liveMetricFrame?.athletes)
        ? liveMetricFrame.athletes
        : (Array.isArray(liveMetricFrame?.lanes) ? liveMetricFrame.lanes : arr);
      const liveMetricFrameTimeSec = liveMetricFrame
        ? getFrameTimeSec(liveMetricFrame, overlay?.fps || 50, liveMetricTimeSec)
        : liveMetricTimeSec;
      const runtimeState = getLiveMetricRuntimeStateForInterval(intervalSec);
      const { derivedById: liveMetricDerivedById } = buildDerivedMetricsForFrame({
        athletes: liveMetricAthletes,
        frameTimeSec: liveMetricFrameTimeSec,
        fps: overlay?.fps || 50,
        raceLength: getOverlayRaceLength(),
        runtimeState
      });
      const liveMetricAthleteById = new Map(
        liveMetricAthletes
          .filter((athlete) => Number.isFinite(Number(athlete?.id)))
          .map((athlete) => [Number(athlete.id), athlete])
      );
      const context = {
        intervalSec,
        athletes: liveMetricAthletes,
        frameTimeSec: liveMetricFrameTimeSec,
        derivedById: liveMetricDerivedById,
        athleteById: liveMetricAthleteById,
        runtimeState
      };
      liveMetricContextByInterval.set(cacheKey, context);
      return context;
    };

    elements.forEach(el => {
      const typeId = String(el?.typeId || '');
      if (allowedTypeIds && !allowedTypeIds.has(typeId)) {
        if (el?.container) el.container.visible = false;
        el?.instances?.forEach?.((inst) => {
          if (inst?.container) inst.container.visible = false;
        });
        return;
      }
      if (!el.container) return;
      const t = renderTimeSec;
      const segmentMotionState = getLayerSegmentMotionState(el, t);
      const activeConfig = segmentMotionState.settings || getPrimaryElementState(el) || el;
      const validityMotionState = getMetricValidityMotionState(el.typeId, t, {
        motionEnabled: activeConfig?.segmentMotion !== false && !usesGlobalCornerPlacement(el.typeId)
      });
      const combinedMotionFactor = clamp01(
        (segmentMotionState.factor ?? 0) * (validityMotionState.factor ?? 1)
      );
      const motionState = {
        active: combinedMotionFactor > 0.001,
        factor: combinedMotionFactor,
        alpha: combinedMotionFactor,
        scaleX: lerp(0.14, 1, combinedMotionFactor),
        scaleY: 1,
        interval: segmentMotionState.interval,
        settings: segmentMotionState.settings
      };
      const currentIntervalId = motionState.interval?.id || null;
      const previousIntervalId = el._activeRenderIntervalId || null;
      const segmentChanged = currentIntervalId !== previousIntervalId;
      const wasMotionActive = !!el._segmentMotionActive;
      const justEntered = motionState.active && (!wasMotionActive || segmentChanged);
      el._segmentMotionActive = motionState.active;
      el._activeRenderIntervalId = currentIntervalId;
      const segmentVisible = activeConfig?.visible !== false;
      const metricDef = METRIC_DEFINITIONS[el.typeId];
      const suppressForComparisonRowRerender = comparisonIsConfirmed() && INSIGHT_LAYER_TYPES.has(String(el.typeId || ''));
      const shouldRender = !!(el.visible && segmentVisible && metricDef && motionState.active && !suppressForComparisonRowRerender);
      el.container.visible = shouldRender;
      if (!shouldRender) {
        el.instances.forEach((inst) => {
          if (inst?.container) inst.container.visible = false;
        });
        return;
      }
      const placementDirection = currentDirection;
      const placementDirSign = resolveDirectionSign(placementDirection);

      if (typeof el.zIndex === 'number') {
        const idx = Math.min(Math.max(el.zIndex, 0), overlayLayer.children.length - 1);
        try {
          overlayLayer.setChildIndex(el.container, idx);
        } catch (e) {  }
      }

      if (usesGlobalCornerPlacement(el.typeId)) {
        renderGlobalMetricLayer(el, metricDef, activeConfig, arr, frameTimeSec, motionState.alpha);
        return;
      }
      const repType = ensureElementRepStyleState(activeConfig);
      const isLiveDataMetric = LIVE_DATA_TIMELINE_TYPES.has(typeId);
      const liveMetricContext = isLiveDataMetric ? getLiveMetricContextForType(typeId) : null;
      const uniformStaticAutoFontSize = repType === 'text'
        ? getSuggestedStaticTextFontSize(el.typeId, averageLaneZoneHeightPx)
        : null;
      const laneSelection = resolveRenderableLaneSelection(
        activeConfig.lanes instanceof Set ? activeConfig.lanes : el.lanes,
        activeConfig.laneSelectionMode ?? el?.laneSelectionMode ?? 'lane',
        arr
      );
      if (repType === 'line' && COMPARE_LINE_TYPES.has(typeId)) {
        if (segmentChanged) {
          el.staticPos.clear();
        }
        renderCompareLineLayer(
          el,
          metricDef,
          activeConfig,
          liveMetricContext?.athletes || arr,
          liveMetricContext?.frameTimeSec ?? frameTimeSec,
          currentDirection,
          motionState
        );
        return;
      }
      const needed = new Set();
      if (segmentChanged) {
        el.staticPos.clear();
      }
      arr.forEach(a => {
        if (laneSelection && !laneSelection.has(a.id)) return;
        needed.add(a.id);

        const rawY = (typeof a.y === 'number' ? a.y : (typeof a.cy === 'number' ? a.cy : 0));
        const rawX = resolveAthleteCenterX(a);
        const followAnchorX = resolveFollowPlacementAnchorX(a, placementDirection);
        if (!isFiniteNumber(rawX) || !isFiniteNumber(rawY)) return;
        const yTarget = getTrackYForId(a.id) ?? rawY;
        const laneStaticPlacement = activeConfig.follow === false && usesStaticLanePosition(el.typeId)
          ? normalizeStaticPlacement(el.typeId, activeConfig.staticPlacement)
          : '';
        const laneStaticRect = laneStaticPlacement ? getLaneScreenRectFromClickZone(a.id) : null;
        const laneZoneBounds = getLaneClickZoneBoundsVideoY(a.id, yTarget);
        const laneZoneHeight = Number.isFinite(laneZoneBounds?.bottomY) && Number.isFinite(laneZoneBounds?.topY)
          ? Math.max(1, laneZoneBounds.bottomY - laneZoneBounds.topY)
          : averageLaneZoneHeightPx;

        let pos;
        if (activeConfig.follow !== false) {
          const smoothKey = `el${el.id}_${a.id}`;
          if (justEntered) smoothedPosById.delete(smoothKey);
          pos = getSmoothedPos(smoothKey, followAnchorX, yTarget);
        } else if (laneStaticPlacement && laneStaticRect) {
          pos = { x: rawX, y: yTarget };
        } else {
          const prev = el.staticPos.get(a.id);
          if (prev) pos = prev; else {
            pos = { x: rawX, y: yTarget };
            el.staticPos.set(a.id, pos);
          }
        }

        let inst = el.instances.get(a.id);
        if (!inst) {
          inst = createInstanceContainers();
          inst.content.addChild(inst.barBg, inst.barFill, inst.barFill2, inst.circle, inst.flagSprite, inst.textBg, inst.text);
          inst.container.addChild(inst.content);
          inst.container.addChild(inst.rtSprite);
          el.container.addChild(inst.container);
          el.instances.set(a.id, inst);
        }

        const effectiveOffsetX = activeConfig.follow !== false
          ? resolveBehindSwimmerOffsetX(activeConfig.offsetX || 0, placementDirection)
          : (activeConfig.offsetX || 0);
        const px = pos.x + effectiveOffsetX;
        const py = pos.y + (activeConfig.offsetY || 0);
        const proj = projectPointFromCurrentShot(px, py);
        const projX = projectPointFromCurrentShot(px + 1, py);
        const projY = projectPointFromCurrentShot(px, py + 1);
        const dxX = projX.cx - proj.cx;
        const dyX = projX.cy - proj.cy;
        const dxY = projY.cx - proj.cx;
        const dyY = projY.cy - proj.cy;
        const rotRad = (activeConfig.rotation || 0) * Math.PI / 180;
        const cosR = Math.cos(rotRad);
        const sinR = Math.sin(rotRad);
        const scaleVal = activeConfig.scale || 1;
        const rotVec = (x, y) => ({ x: x * cosR - y * sinR, y: x * sinR + y * cosR });
        const axisX = rotVec(dxX * scaleVal, dyX * scaleVal);
        const axisY = rotVec(dxY * scaleVal, dyY * scaleVal);
        const cx = proj.cx;
        const cy = proj.cy;

        inst.container.visible = true;
        inst.container.alpha = (activeConfig.alpha ?? 0.9) * motionState.alpha;
        inst.content.visible = true;
        inst.rtSprite.visible = false;

        resetInstanceVisualState(inst);

        const metricAthlete = isLiveDataMetric
          ? (liveMetricContext?.athleteById.get(Number(a.id)) || a)
          : a;
        const meta = athleteMetaById.get(a.id) || {};
        const derived = isLiveDataMetric
          ? (liveMetricContext?.derivedById.get(Number(a.id)) || {})
          : (derivedById.get(a.id) || {});
        const metricAthletes = isLiveDataMetric ? (liveMetricContext?.athletes || arr) : arr;
        const metricFrameTimeSec = isLiveDataMetric ? (liveMetricContext?.frameTimeSec ?? frameTimeSec) : frameTimeSec;
        const metricRuntime = isLiveDataMetric ? (liveMetricContext?.runtimeState || metricRuntimeState) : metricRuntimeState;
        const color = hexToPixi(activeConfig.color || '#d3d3d3');
        let val = metricDef.getValue({
          athlete: metricAthlete,
          meta,
          derived,
          frameTimeSec: metricFrameTimeSec,
          raceLength: getOverlayRaceLength(),
          insightState: currentInsightLayerState,
          direction: currentDirection
        });
        if (TARGET_SWIMMER_METRIC_TYPES.has(el.typeId)) {
          val = computeSwimmerComparisonMetricValue(
            el.typeId,
            metricAthlete,
            metricAthletes,
            metricFrameTimeSec,
            activeConfig.compareTargetLaneId,
            activeConfig.compareTargetBinding,
            activeConfig.compareTargetRank
          );
        } else if (TARGET_RECORD_METRIC_TYPES.has(el.typeId)) {
          val = computeRecordComparisonMetricValue(
            el.typeId,
            metricAthlete,
            metricFrameTimeSec,
            activeConfig.compareRecordType
          );
        }
        if ((el.typeId === 'leaderStatus' || el.typeId === 'chaseStatus' || el.typeId === 'insightText' || el.typeId === 'resultStatus') && !val) {
          inst.container.visible = false;
          return;
        }
        const baseSpec = metricDef.buildSpec(repType, {
          value: val,
          athlete: metricAthlete,
          meta,
          derived,
          frameTimeSec: metricFrameTimeSec,
          direction: currentDirection,
          placementDirection,
          insightState: currentInsightLayerState,
          videoDuration,
          raceLength: getOverlayRaceLength(),
          color,
          runtimeState: metricRuntime,
          videoHeight: videoH,
          laneZoneHeight,
          flagWidth: FLAG_DISPLAY_W,
          flagHeight: FLAG_DISPLAY_H,
          formatTime
        }) || {};
        let laneStaticLayout = null;
        if ((repType === 'text' || repType === 'medalSummary' || repType === 'ringsCount' || repType === 'flag') && laneStaticPlacement && laneStaticRect) {
          laneStaticLayout = resolveLaneStaticScreenPlacement(
            laneStaticRect,
            laneStaticPlacement,
            supportsStaticTextAlign(el.typeId, repType)
              ? activeConfig.staticAlign
              : null
          );
          baseSpec.anchorX = laneStaticLayout.anchorX;
          baseSpec.anchorY = laneStaticLayout.anchorY;
          baseSpec.x = 0;
          baseSpec.y = 0;
          baseSpec.align = laneStaticLayout.align;
          baseSpec.maxWidth = laneStaticLayout.maxWidth;
          baseSpec.backgroundKey = `${el.typeId}-${a.id}`;
        }
        const autoFontSize = repType === 'text' && laneStaticPlacement && laneStaticRect
          ? uniformStaticAutoFontSize
          : null;
        const repPropsForRender = getEffectiveRepPropsForRender(activeConfig, repType, autoFontSize, el.typeId);
        const spec = applyRepresentationStyle(repType, baseSpec, repPropsForRender, activeConfig.styleOverrides, color);
        renderRepresentation(inst, repType, spec || {}, { normalizeFlagTexture });
        const projectedStaticLaneRep = !!laneStaticPlacement;
        const forceBillboardMetricText = repType === 'text' && (el.typeId === 'currentSpeed' || el.typeId === 'avgSpeed');
        let projected = false;
        if (!forceBillboardMetricText && activeConfig.project !== false && (!laneStaticPlacement || projectedStaticLaneRep)) {
          try {
            inst.content.updateTransform();
            const bounds = inst.content.getBounds();
            const padding = 16;
            const oversample = Math.max(2, Math.min(3, Math.ceil((app.renderer?.resolution || 1) + 0.25)));
            const minSize = 128;
            const safeW = Math.max(16, bounds.width || 0);
            const safeH = Math.max(16, bounds.height || 0);
            const rtW = Math.max(minSize, Math.ceil((safeW + padding * 2) * oversample));
            const rtH = Math.max(minSize, Math.ceil((safeH + padding * 2) * oversample));

            if (!inst._rt || inst._rt.width < rtW || inst._rt.height < rtH) {
              inst._rt?.destroy?.(true);
              inst._rt = PIXI.RenderTexture.create({ width: rtW, height: rtH, scaleMode: PIXI.SCALE_MODES.LINEAR });
            }
            const matrix = new PIXI.Matrix()
              .translate(-bounds.x + padding, -bounds.y + padding)
              .scale(oversample, oversample);
            app.renderer.render(inst.content, inst._rt, true, matrix);
            inst.rtSprite.texture = inst._rt;
            const projectedSpriteAnchor = laneStaticPlacement
              ? (
                  laneStaticLayout && supportsStaticTextAlign(el.typeId, repType)
                    ? { x: laneStaticLayout.anchorX, y: laneStaticLayout.anchorY }
                    : resolveProjectedSpriteAnchorFromMatrix(matrix, rtW, rtH)
                )
              : { x: 0.5, y: 0.5 };
            inst.rtSprite.anchor.set(projectedSpriteAnchor.x, projectedSpriteAnchor.y);
            const projectedScaleAdjust = getProjectedRepresentationScaleAdjustment(el.typeId, repType);
            const projectedScaleVal = scaleVal * projectedScaleAdjust;
            const halfW = (rtW / oversample) * projectedScaleVal / 2;
            const halfH = (rtH / oversample) * projectedScaleVal / 2;
            const projectedAnchor = projectedStaticLaneRep
              ? resolveLaneStaticVideoPlacement(laneZoneBounds, laneStaticPlacement, activeConfig.offsetX || 0, activeConfig.offsetY || 0)
              : { x: px, y: py };
            const anchorXForProjection = Number.isFinite(Number(projectedAnchor?.x)) ? Number(projectedAnchor.x) : px;
            const anchorYForProjection = Number.isFinite(Number(projectedAnchor?.y)) ? Number(projectedAnchor.y) : py;
            const quad = scaleQuadFromDirectionalEdge(
              buildProjectedQuad(projectPointFromCurrentShot, anchorXForProjection, anchorYForProjection, halfW, halfH, rotRad),
              motionState.scaleX,
              activeConfig.follow !== false ? placementDirSign : dirSign
            );

            if (quad && inst.rtSprite.proj) {
              inst.content.visible = false;
              inst.rtSprite.visible = true;
              mapSpriteToQuad(inst.rtSprite, quad);
              inst.container.position.set(0, 0);
              inst.container.scale.set(1, 1);
              inst.container.rotation = 0;
              projected = true;
            }
          } catch (err) {
            console.warn('Projection failed:', err);
          }
        }

        if (!projected) {
          inst.content.visible = true;
          inst.rtSprite.visible = false;
          const billboardScaleAdjust = laneStaticPlacement ? 1 : getNonProjectedRepresentationScaleAdjustment(el.typeId, repType, spec);
          const effectiveScaleVal = scaleVal * billboardScaleAdjust;
          if (laneStaticPlacement && laneStaticRect) {
            const lanePlacement = resolveLaneStaticScreenPlacement(laneStaticRect, laneStaticPlacement);
            inst.container.position.set(
              lanePlacement.x + (activeConfig.offsetX || 0),
              lanePlacement.y + (activeConfig.offsetY || 0)
            );
            inst.container.scale.set(effectiveScaleVal * motionState.scaleX, effectiveScaleVal);
            inst.container.rotation = rotRad;
          } else {
            const localBounds = inst.content.getLocalBounds();
            const baseHalfW = Math.max(1, localBounds.width || 0) * effectiveScaleVal * 0.5;
            const activeDirSign = activeConfig.follow !== false ? placementDirSign : dirSign;
            const anchorSide = activeDirSign > 0 ? -1 : 1;
            const anchorShift = -anchorSide * baseHalfW * (1 - motionState.scaleX);
            const anchorShiftVec = rotVec(anchorShift, 0);
            inst.container.position.set(cx + anchorShiftVec.x, cy + anchorShiftVec.y);
            inst.container.scale.set(effectiveScaleVal * motionState.scaleX, effectiveScaleVal);
            inst.container.rotation = rotRad;
          }
        }
      });

      el.instances.forEach((inst, id) => {
        if (!needed.has(id)) {
          inst.container.visible = false;
        }
      });
    });
  }
  function getChipIconMarkup(typeId) {
    const figmaIcon = (name) =>
      `<img src="assets/figma-icons/${name}.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
    const figmaStack = (base, overlay) =>
      `<span class="chip-icon-stack" aria-hidden="true"><span class="chip-icon-layer chip-icon-layer--base">${figmaIcon(base)}</span><span class="chip-icon-layer chip-icon-layer--overlay">${figmaIcon(overlay)}</span></span>`;
    const icons = {
      currentSpeed: figmaStack('layer-current-speed-base', 'layer-current-speed-needle'),
      avgSpeed: figmaStack('layer-current-speed-base', 'layer-current-speed-needle'),
      leaderStatus: figmaIcon('layer-generic'),
      chaseStatus: figmaIcon('layer-generic'),
      insightText: figmaIcon('layer-generic'),
      resultStatus: figmaIcon('layer-generic'),
      speedDiffSwimmer: figmaStack('layer-current-speed-base', 'layer-current-speed-needle'),
      timeDiffSwimmer: figmaIcon('layer-generic'),
      acceleration: figmaStack('layer-acceleration-base', 'layer-acceleration-needle'),
      rank: figmaIcon('layer-generic'),
      elapsed: figmaIcon('layer-generic'),
      distanceSwam: figmaIcon('layer-generic'),
      remainingDistance: figmaIcon('layer-generic'),
      distanceDiffLeader: figmaIcon('layer-generic'),
      positionDiffSwimmer: figmaIcon('layer-generic'),
      timeDiffRecord: figmaIcon('layer-generic'),
      speedDiffRecord: figmaStack('layer-current-speed-base', 'layer-current-speed-needle'),
      positionDiffRecord: figmaIcon('layer-generic'),
      estCompletion: figmaIcon('layer-generic'),
      splitTime: figmaIcon('layer-generic'),
      finalTime: figmaIcon('layer-generic'),
      name: figmaIcon('layer-generic'),
      country: figmaIcon('layer-generic'),
      age: figmaIcon('layer-generic'),
      worldRecord: figmaIcon('layer-generic'),
      olympicsRecord: figmaIcon('layer-generic'),
      personalRecord: figmaIcon('layer-generic'),
      awardsInfo: figmaIcon('layer-generic'),
      appearancesInfo: figmaIcon('layer-generic')
    };
    return icons[typeId] || figmaIcon('layer-generic');
  }

  function populateVisSelect() {
    if (selectVis) selectVis.innerHTML = '';
    if (liveDataChips) liveDataChips.innerHTML = '';
    if (insightContainer) insightContainer.innerHTML = '';
    if (athleteInfoChips) athleteInfoChips.innerHTML = '';
    if (recordsChips) recordsChips.innerHTML = '';
    const availableVisIds = [];
    VIS_GROUPS.forEach(group => {
      group.items.forEach(id => {
        const v = VIS_LIBRARY[id];
        if (!v) return;
        if (!isVisTypeAvailable(v.id)) return;
        availableVisIds.push(v.id);
        if (selectVis) {
          const opt = document.createElement('option');
          opt.value = v.id;
          opt.textContent = v.label;
          selectVis.appendChild(opt);
        }
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.dataset.visId = v.id;
        if (v.id === 'awardsInfo') chip.id = 'chip-awards';
        if (v.id === 'appearancesInfo') chip.id = 'chip-appearances';
        const chipInner = document.createElement('div');
        chipInner.className = 'chip-inner';
        const chipMain = document.createElement('div');
        chipMain.className = 'chip-main';
        const toggle = document.createElement('button');
        toggle.className = 'chip-toggle';
        toggle.type = 'button';
        toggle.title = `Toggle ${v.label}`;
        const label = document.createElement('span');
        label.className = 'chip-label';
        label.textContent = v.label;
        chipMain.appendChild(toggle);
        chipMain.appendChild(label);
        chipInner.appendChild(chipMain);
        chip.appendChild(chipInner);
        const defaultChipRepId = getDefaultRepIdForType(v.id, v);
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          handleVisChipToggle(v.id, defaultChipRepId);
        });
        chip.addEventListener('click', (e) => {
          if (e.target.closest('.chip-toggle')) return;
          handleVisChipRowClick(v.id, defaultChipRepId);
        });
        if (group.id === 'live' && liveDataChips) liveDataChips.appendChild(chip);
        if (group.id === 'insights' && insightContainer) insightContainer.appendChild(chip);
        if (group.id === 'info' && athleteInfoChips) athleteInfoChips.appendChild(chip);
        if (group.id === 'records' && recordsChips) recordsChips.appendChild(chip);
      });
    });
    const firstItem = availableVisIds[0];
    if (!availableVisIds.includes(librarySelection.vis)) {
      librarySelection.vis = firstItem || '';
      librarySelection.rep = librarySelection.vis
        ? getDefaultRepIdForType(librarySelection.vis, VIS_LIBRARY[librarySelection.vis])
        : '';
    }
    if (selectVis) {
      selectVis.value = librarySelection.vis || firstItem || '';
    }
    renderRepOptions();
    updateVisChipActive();
  }

  function updateVisChipActive() {
    const containers = [liveDataChips, insightContainer, athleteInfoChips, recordsChips];
    containers.forEach(c => {
      if (!c) return;
      Array.from(c.querySelectorAll('.chip')).forEach(chip => {
        const id = chip.dataset.visId;
        const exists = Array.from(elements.values()).some(el => el.typeId === id);
        chip.classList.toggle('active', exists);
        chip.classList.toggle('is-selected', uiState.selectedLayerTypeId === id);
        chip.querySelector('.chip-gear')?.remove();
      });
    });
  }

  function ensureLayerEnabled(typeId, repId) {
    let existing = [...elements.values()].find(el => el.typeId === typeId);
    if (existing) return existing;

    librarySelection.vis = typeId;
    librarySelection.rep = repId;
    addElement(typeId, repId, overlay.athletes);
    const added = [...elements.values()].find(el => el.typeId === typeId);
    if (added && usesGlobalCornerPlacement(typeId)) {
      added.follow = false;
      added.project = false;
      added.zIndex = 999;
    }
    return added || null;
  }

  function handleVisChipRowClick(typeId, repId) {
    const el = ensureLayerEnabled(typeId, repId);
    updateVisChipActive();
    requestOverlayRefresh();
    if (el) {
      openSettingsForType(typeId);
    }
  }

  function handleVisChipToggle(typeId, repId) {
    const existing = [...elements.values()].find(el => el.typeId === typeId);
    if (existing) {
      removeElement(existing.id);
    } else {
      ensureLayerEnabled(typeId, repId);
    }
    updateVisChipActive();
    requestOverlayRefresh();
  }

  function ensureElapsedLayer() {
    const existing = [...elements.values()].find(el => el.typeId === 'elapsed');
    if (existing) return;
    addElement('elapsed', 'text', overlay.athletes);
    const added = [...elements.values()].find(el => el.typeId === 'elapsed');
    if (added) {
      added.follow = false;
      added.project = false;
      added.snap = false;
      added.zIndex = 999;
      added.staticPlacement = 'screenTopRight';
      added.intervals = [{ id: `int_${Date.now()}`, start: 0, end: videoDuration || 20 }];
      updateVisChipActive();
    }
    if (uiState.selectedLayerTypeId === 'elapsed' && uiState.rightPanelSurface === 'layer') {
      uiState.selectedLayerTypeId = null;
      closeLayerSettingsToModePanel();
    }
  }

  function openSettingsForType(typeId) {
    const el = [...elements.values()].find(e => e.typeId === typeId);
    if (!el) return;
    uiState.selectedLayerTypeId = typeId;
    activeElementId = el.id;
    activeIntervalId = getFirstElementInterval(el)?.id || null;
    openEditor(el, overlay.athletes);
  }

  function renderRepOptions() {
    if (!selectRep) return;
    selectRep.innerHTML = '';
    const vis = VIS_LIBRARY[librarySelection.vis];
    if (!vis) return;
    vis.reps.forEach(r => {
      const pill = document.createElement('div');
      pill.className = `pill ${librarySelection.rep === r.id ? 'active' : ''}`;
      pill.textContent = r.label;
      pill.dataset.rep = r.id;
      pill.addEventListener('click', () => {
        librarySelection.rep = r.id;
        renderRepOptions();
      });
      selectRep.appendChild(pill);
    });
    if (!librarySelection.rep && vis.reps.length) {
      librarySelection.rep = getDefaultRepIdForType(librarySelection.vis, vis);
    }
  }

  function hexToPixi(hex) {
    const h = hex.replace('#', '');
    return Number.parseInt(h, 16);
  }

  function defaultScaleFor(typeId) {
    if (typeId === 'country') return 0.75;
    if (usesLaneStaticPlacement(typeId)) return 0.82;
    if (usesGlobalCornerPlacement(typeId)) return 0.9;
    return 1.5;
  }

  function defaultScaleForRep(typeId, repType) {
    if (
      (String(typeId || '') === 'distanceSwam' || String(typeId || '') === 'remainingDistance')
      && (String(repType || '') === 'bar' || String(repType || '') === 'pie')
    ) {
      return 1;
    }
    if (String(typeId || '') === 'resultStatus' && String(repType || '') === 'medal') {
      return 1;
    }
    if (
      (String(typeId || '') === 'leaderStatus' || String(typeId || '') === 'chaseStatus')
      && String(repType || '') === 'arrow'
    ) {
      return 1.5;
    }
    if (BASELINE_DELTA_ARROW_TYPES.has(String(typeId || '')) && String(repType || '') === 'arrow') {
      return 2.8;
    }
    if (String(typeId || '') === 'acceleration' && String(repType || '') === 'arrow') {
      return 2.4;
    }
    return defaultScaleFor(typeId);
  }

  function defaultScaleForProjectionMode(typeId, repType, project = true) {
    const baseScale = defaultScaleForRep(typeId, repType);
    if (
      BASELINE_DELTA_ARROW_TYPES.has(String(typeId || ''))
      && String(repType || '') === 'arrow'
      && project !== false
    ) {
      return Math.max(0.25, Math.round(baseScale * 0.34 * 2.5 * 100) / 100);
    }
    if (String(typeId || '') === 'acceleration' && String(repType || '') === 'arrow' && project !== false) {
      return Math.max(0.25, Math.round(baseScale * 0.42 * 1.5 * 2 * 100) / 100);
    }
    return baseScale;
  }

  function getScaleControlConfig(typeId, repType, project = true) {
    const baseScale = defaultScaleForProjectionMode(typeId, repType, project);
    const isStaticTextLayer = usesLaneStaticPlacement(typeId) || usesGlobalCornerPlacement(typeId);
    return {
      baseScale,
      minScale: isStaticTextLayer
        ? Math.max(0.12, baseScale * 0.36)
        : baseScale * 0.5,
      maxScale: isStaticTextLayer
        ? Math.max(baseScale, baseScale * 1.25)
        : baseScale * 1.5,
      step: isStaticTextLayer ? 0.02 : (baseScale / 20)
    };
  }

  function syncPanelScaleControl(typeId, repType, scaleValue, project = true) {
    if (!panelScale) return;
    const { baseScale, minScale, maxScale, step } = getScaleControlConfig(typeId, repType, project);
    panelScale.min = minScale.toFixed(2);
    panelScale.max = maxScale.toFixed(2);
    panelScale.step = Number(step).toFixed(3);
    const nextValue = Number.isFinite(Number(scaleValue)) ? Number(scaleValue) : baseScale;
    panelScale.value = String(Math.max(minScale, Math.min(maxScale, nextValue)));
  }

  function getRepProjectionModeKey(repType, project = true) {
    return `${String(repType || 'text')}::${project !== false ? 'projected' : 'billboard'}`;
  }

  function ensureRepModeVariantStore(target) {
    if (!target || typeof target !== 'object') return {};
    if (!target.repModeVariants || typeof target.repModeVariants !== 'object' || Array.isArray(target.repModeVariants)) {
      target.repModeVariants = {};
    }
    return target.repModeVariants;
  }

  function hasStoredRepModeVariant(target, repType, project = true) {
    const store = target?.repModeVariants;
    const key = getRepProjectionModeKey(repType, project);
    return !!(store && typeof store === 'object' && store[key] && typeof store[key] === 'object');
  }

  function createDefaultRepModeVariant(typeId, repType, color, project = true) {
    const variantColor = normalizeColorInputValue(color, '#d3d3d3');
    const { offsetX, offsetY } = getDefaultLayerOffsets(typeId);
    const variant = {
      offsetX,
      offsetY,
      scale: defaultScaleForProjectionMode(typeId, repType, project),
      rotation: 0,
      alpha: 0.9,
      color: variantColor,
      staticAlign: getDefaultStaticTextAlign(typeId),
      repProps: clonePlainData(buildLayerDefaultRepProps(typeId, repType, variantColor)),
      styleCss: ''
    };
    if (typeId === 'currentSpeed' && repType === 'bar') {
      variant.offsetX = DEFAULT_LAYER_OFFSET_X;
      variant.scale = 1.5;
    }
    if (
      project !== false
      && (typeId === 'speedDiffSwimmer' || typeId === 'timeDiffSwimmer')
      && repType === 'bar'
    ) {
      variant.offsetY = 15;
    }
    if (
      project !== false
      && typeId === 'acceleration'
      && (repType === 'text' || repType === 'bar')
    ) {
      variant.offsetY = 15;
    }
    if (
      project !== false
      && typeId === 'acceleration'
      && repType === 'arrow'
    ) {
      variant.offsetY = 40;
    }
    if (repType === 'line' && COMPARE_LINE_TYPES.has(String(typeId || ''))) {
      variant.offsetX = 0;
      variant.offsetY = 0;
    }
    if (ARROW_FORCE_PROJECT_FALSE_TYPES.has(String(typeId || '')) && repType === 'arrow' && project === false) {
      variant.offsetX = DEFAULT_LAYER_OFFSET_X;
    }
    return variant;
  }

  function normalizeRepModeVariant(typeId, repType, project, rawVariant, fallbackColor) {
    const defaults = createDefaultRepModeVariant(typeId, repType, fallbackColor, project);
    const color = normalizeColorInputValue(rawVariant?.color ?? defaults.color, defaults.color);
    return {
      offsetX: Number.isFinite(Number(rawVariant?.offsetX))
        ? normalizeCompareLineOffsetX(typeId, repType, rawVariant.offsetX)
        : defaults.offsetX,
      offsetY: Number.isFinite(Number(rawVariant?.offsetY)) ? Number(rawVariant.offsetY) : defaults.offsetY,
      scale: Number.isFinite(Number(rawVariant?.scale)) ? Number(rawVariant.scale) : defaults.scale,
      rotation: Number.isFinite(Number(rawVariant?.rotation)) ? Number(rawVariant.rotation) : defaults.rotation,
      alpha: Number.isFinite(Number(rawVariant?.alpha)) ? Number(rawVariant.alpha) : defaults.alpha,
      color,
      staticAlign: normalizeStaticTextAlign(rawVariant?.staticAlign, defaults.staticAlign),
      repProps: ensureRepProps(repType, clonePlainData(rawVariant?.repProps ?? defaults.repProps), color),
      styleCss: String(rawVariant?.styleCss ?? defaults.styleCss ?? '')
    };
  }

  function captureCurrentRepModeVariant(target) {
    if (!target) return null;
    const repType = ensureElementRepStyleState(target);
    const project = target.project !== false;
    const store = ensureRepModeVariantStore(target);
    const key = getRepProjectionModeKey(repType, project);
    store[key] = normalizeRepModeVariant(
      target.typeId,
      repType,
      project,
      {
        offsetX: target.offsetX,
        offsetY: target.offsetY,
        scale: target.scale,
        rotation: target.rotation,
        alpha: target.alpha,
        color: target.color,
        staticAlign: target.staticAlign,
        repProps: clonePlainData(target.repProps),
        styleCss: target.styleCss || ''
      },
      target.color || '#d3d3d3'
    );
    return store[key];
  }

  function getStoredRepModeVariant(target, repType, project, { createIfMissing = false } = {}) {
    if (!target) return null;
    const store = ensureRepModeVariantStore(target);
    const key = getRepProjectionModeKey(repType, project);
    const existing = store[key];
    if (existing && typeof existing === 'object') {
      store[key] = normalizeRepModeVariant(target.typeId, repType, project, existing, target.color || '#d3d3d3');
      return store[key];
    }
    if (!createIfMissing) return null;
    store[key] = createDefaultRepModeVariant(target.typeId, repType, target.color || '#d3d3d3', project);
    return store[key];
  }

  function applyRepModeVariant(target, repType, project, snapshot) {
    if (!target) return null;
    const normalized = normalizeRepModeVariant(target.typeId, repType, project, snapshot, target.color || '#d3d3d3');
    target.repType = repType;
    target.project = project !== false;
    target.offsetX = normalized.offsetX;
    target.offsetY = normalized.offsetY;
    target.scale = normalized.scale;
    target.rotation = normalized.rotation;
    target.alpha = normalized.alpha;
    target.color = normalized.color;
    target.staticAlign = normalized.staticAlign;
    target.repProps = clonePlainData(normalized.repProps);
    setElementStyleCss(target, normalized.styleCss || '');
    ensureRepModeVariantStore(target)[getRepProjectionModeKey(repType, project)] = clonePlainData(normalized);
    return normalized;
  }

  function resolvePreferredProjectForRep(target, repType, preferredProject = true) {
    const desiredProject = preferredProject !== false;
    if (hasStoredRepModeVariant(target, repType, desiredProject)) {
      return desiredProject;
    }
    if (String(target?.typeId || '') === 'resultStatus') {
      return false;
    }
    if (String(target?.typeId || '') === 'speedDiffSwimmer') {
      return String(repType || '') === 'arrow' ? false : true;
    }
    if (ARROW_FORCE_PROJECT_FALSE_TYPES.has(String(target?.typeId || '')) && String(repType || '') === 'arrow') {
      return false;
    }
    return desiredProject;
  }

  function switchRepModeVariant(target, repType, project) {
    if (!target) return null;
    captureCurrentRepModeVariant(target);
    const desiredProject = project !== false;
    const snapshot = getStoredRepModeVariant(target, repType, desiredProject, { createIfMissing: true });
    return applyRepModeVariant(target, repType, desiredProject, snapshot);
  }

  function getDefaultLayerOffsets(typeId) {
    if (typeId === 'resultStatus') {
      return { offsetX: 0, offsetY: 5 };
    }
    if (typeId === 'leaderStatus' || typeId === 'chaseStatus') {
      return { offsetX: -130, offsetY: 0 };
    }
    if (typeId === 'insightText') {
      return { offsetX: 250, offsetY: 0 };
    }
    if (typeId === 'country') {
      return { offsetX: 0, offsetY: 0 };
    }
    if (ATHLETE_INFO_STATIC_TYPES.has(String(typeId || '')) || STATIC_TIMED_TEXT_TYPES.has(String(typeId || '')) || usesGlobalCornerPlacement(typeId)) {
      return { offsetX: 0, offsetY: 0 };
    }
    return { offsetX: DEFAULT_LAYER_OFFSET_X, offsetY: 0 };
  }

  function getDefaultRepIdForType(typeId, vis = VIS_LIBRARY[typeId]) {
    if (typeId === 'currentSpeed' || typeId === 'avgSpeed') return 'bar';
    if (typeId === 'country') return 'flag';
    if (typeId === 'speedDiffSwimmer') return 'arrow';
    if (typeId === 'leaderStatus') return 'arrow';
    if (typeId === 'chaseStatus') return 'arrow';
    if (typeId === 'resultStatus') return 'medal';
    return vis?.reps?.[0]?.id || 'text';
  }

  function normalizeColorInputValue(value, fallback = '#d3d3d3') {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;
    }
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw.slice(1).split('').map((ch) => ch + ch).join('').toLowerCase()}`;
    }
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toLowerCase()}`;
    return fallback;
  }

  function cloneLaneSelection(lanes) {
    if (lanes instanceof Set) return new Set(Array.from(lanes));
    if (Array.isArray(lanes)) return new Set(lanes);
    return new Set();
  }

  function normalizeRankSelectionValues(values) {
    const source = values instanceof Set
      ? Array.from(values)
      : Array.isArray(values)
        ? values
        : [];
    const maxRank = Math.max(1, laneCountGlobal || 8);
    const normalized = [];
    const seen = new Set();
    source.forEach((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      const mapped = Math.max(1, Math.min(maxRank, Math.round(numeric)));
      if (seen.has(mapped)) return;
      seen.add(mapped);
      normalized.push(mapped);
    });
    return normalized;
  }

  function normalizePresetLaneSelection(lanes, laneIdSpace = null) {
    const source = lanes instanceof Set
      ? Array.from(lanes)
      : Array.isArray(lanes)
        ? lanes
        : [];
    const normalized = [];
    const seen = new Set();
    const shouldApplyLegacyCompetition2Migration =
      !laneIdSpace && String(currentCompetition?.id || '') === 'swimming_competition2';
    source.forEach((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      let mapped = numeric;
      if (laneIdSpace === 'canonical') {
        mapped = numeric;
      } else if (competitionLaneIdRemap.enabled) {
        mapped = mapRawLaneIdToCanonical(numeric);
      } else if (shouldApplyLegacyCompetition2Migration) {
        mapped = (laneCountGlobal + 1) - numeric;
      }
      if (!Number.isFinite(mapped) || seen.has(mapped)) return;
      seen.add(mapped);
      normalized.push(mapped);
    });
    return normalized;
  }

  function normalizeElementLaneSelection(values, selectionMode = 'lane', laneIdSpace = null) {
    return normalizeElementLaneSelectionMode(selectionMode) === 'rank'
      ? normalizeRankSelectionValues(values)
      : normalizePresetLaneSelection(values, laneIdSpace);
  }

  function resolveRenderableLaneSelection(selectionValues, selectionMode = 'lane', athletes = null) {
    const normalizedMode = normalizeElementLaneSelectionMode(selectionMode);
    if (normalizedMode === 'rank') {
      const athleteList = Array.isArray(athletes) ? athletes : getCurrentFrameAthletes();
      return new Set(
        normalizeRankSelectionValues(selectionValues)
          .map((rankValue) => normalizeCompareTargetLaneId(findAthleteInFrameByRank(athleteList, rankValue)?.id))
          .filter((laneId) => laneId > 0)
      );
    }
    return new Set(normalizePresetLaneSelection(selectionValues, 'canonical'));
  }

  function remapLaneSelectionValues(values, fromMode = 'lane', toMode = 'lane', athletes = null) {
    const prevMode = normalizeElementLaneSelectionMode(fromMode);
    const nextMode = normalizeElementLaneSelectionMode(toMode);
    if (prevMode === nextMode) {
      return new Set(normalizeElementLaneSelection(values, nextMode, 'canonical'));
    }
    const athleteList = Array.isArray(athletes) ? athletes : getCurrentFrameAthletes();
    const sourceValues = normalizeElementLaneSelection(values, prevMode, 'canonical');
    const mapped = sourceValues.map((value) => {
      if (prevMode === 'lane' && nextMode === 'rank') {
        const rankValue = getAthleteRankValue(findAthleteInFrameByLaneId(athleteList, value));
        return Number.isFinite(rankValue) ? rankValue : normalizeCompareTargetRank(value);
      }
      if (prevMode === 'rank' && nextMode === 'lane') {
        const laneId = normalizeCompareTargetLaneId(findAthleteInFrameByRank(athleteList, value)?.id);
        return laneId > 0 ? laneId : normalizeCompareTargetLaneId(value);
      }
      return value;
    });
    return new Set(normalizeElementLaneSelection(mapped, nextMode, 'canonical'));
  }

  function clonePlainData(value) {
    if (!value || typeof value !== 'object') return {};
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return { ...value };
    }
  }

  function shouldResetLegacyStroke(repType) {
    const normalizedRepType = String(repType || '').toLowerCase();
    return normalizedRepType === 'text' || normalizedRepType === 'badge';
  }

  function shouldStripLegacyCountSuffix(repType) {
    const normalizedRepType = String(repType || '').toLowerCase();
    return normalizedRepType === 'medalsummary' || normalizedRepType === 'ringscount';
  }

  function shouldStripLegacyMovingAverage(repType, sourceVersion) {
    if (Number(sourceVersion || 1) >= 6) return false;
    const normalizedRepType = String(repType || '').toLowerCase();
    return normalizedRepType === 'text'
      || normalizedRepType === 'bar'
      || normalizedRepType === 'circular'
      || normalizedRepType === 'line';
  }

  function shouldResetLegacyCountPrefix(repType, sourceVersion) {
    return Number(sourceVersion || 1) < 5 && shouldStripLegacyCountSuffix(repType);
  }

  function shouldResetLegacyDistanceMetricScale(typeId, repType, sourceVersion) {
    if (Number(sourceVersion || 1) >= 9) return false;
    const normalizedTypeId = String(typeId || '');
    const normalizedRepType = String(repType || '').toLowerCase();
    return (
      (normalizedTypeId === 'distanceSwam' || normalizedTypeId === 'remainingDistance')
      && (normalizedRepType === 'bar' || normalizedRepType === 'pie')
    );
  }

  function normalizeLegacyDistanceMetricScale(typeId, repType, scaleValue, sourceVersion) {
    if (!shouldResetLegacyDistanceMetricScale(typeId, repType, sourceVersion)) {
      return scaleValue;
    }
    const numeric = Number(scaleValue);
    if (!Number.isFinite(numeric)) return scaleValue;
    return Math.abs(numeric - 1.5) < 1e-6 ? 1 : scaleValue;
  }

  function clearLegacyStrokeWidthFromRepProps(repType, repProps, sourceVersion = PRESET_SCHEMA_VERSION) {
    const next = clonePlainData(repProps);
    if (shouldResetLegacyStroke(repType)) {
      next.strokeWidth = 0;
    }
    if (shouldStripLegacyCountSuffix(repType)) {
      delete next.countSuffix;
    }
    if (shouldStripLegacyMovingAverage(repType, sourceVersion)) {
      delete next.movingAverageSec;
    }
    if (shouldResetLegacyCountPrefix(repType, sourceVersion) && String(next.countPrefix ?? '') === '×') {
      next.countPrefix = '';
    }
    return next;
  }

  function clearLegacyStrokeWidthFromStyleCss(repType, styleCss, sourceVersion = PRESET_SCHEMA_VERSION) {
    const rawStyleCss = String(styleCss || '');
    if (
      (!shouldResetLegacyStroke(repType) && !shouldStripLegacyCountSuffix(repType) && !shouldStripLegacyMovingAverage(repType, sourceVersion))
      || !rawStyleCss
    ) {
      return rawStyleCss;
    }
    return rawStyleCss
      .split(/\r?\n/)
      .flatMap((line) => {
        if (
          shouldResetLegacyCountPrefix(repType, sourceVersion)
          && /^\s*count-?prefix\s*:\s*×\s*;?\s*$/i.test(line)
        ) {
          return [];
        }
        if (shouldStripLegacyCountSuffix(repType) && /^\s*count-?suffix\s*:/i.test(line)) {
          return [];
        }
        if (shouldStripLegacyMovingAverage(repType, sourceVersion) && /^\s*moving-?average-?sec\s*:/i.test(line)) {
          return [];
        }
        if (shouldResetLegacyStroke(repType) && /^\s*stroke-width\s*:/i.test(line)) {
          return ['stroke-width: 0;'];
        }
        return [line];
      })
      .join('\n');
  }

  function migrateLegacyPresetVariantStore(store, sourceVersion = PRESET_SCHEMA_VERSION, typeId = '') {
    if (!store || typeof store !== 'object' || Array.isArray(store)) return clonePlainData(store);
    const nextStore = {};
    Object.entries(store).forEach(([key, variant]) => {
      const repType = String(key || '').split('::')[0] || variant?.repType || 'text';
      nextStore[key] = migrateLegacyPresetVisualConfig(variant, repType, sourceVersion, typeId);
    });
    return nextStore;
  }

  function migrateLegacyPresetVisualConfig(source, repType, sourceVersion = PRESET_SCHEMA_VERSION, typeId = source?.typeId || '') {
    if (!source || typeof source !== 'object') return source;
    const next = { ...source };
    next.repProps = clearLegacyStrokeWidthFromRepProps(repType, source.repProps, sourceVersion);
    next.styleCss = clearLegacyStrokeWidthFromStyleCss(repType, source.styleCss, sourceVersion);
    next.scale = normalizeLegacyDistanceMetricScale(typeId, repType, source.scale, sourceVersion);
    if (source.repModeVariants && typeof source.repModeVariants === 'object') {
      next.repModeVariants = migrateLegacyPresetVariantStore(source.repModeVariants, sourceVersion, typeId);
    }
    return next;
  }

  function migrateLegacyPresetLayer(layer, sourceVersion = PRESET_SCHEMA_VERSION) {
    if (!layer || typeof layer !== 'object') return layer;
    const repType = normalizeMetricRepType(layer.typeId, layer.repType || 'text');
    const nextLayer = migrateLegacyPresetVisualConfig(layer, repType, sourceVersion, layer.typeId);
    if (Array.isArray(layer.intervals)) {
      nextLayer.intervals = layer.intervals.map((interval) => {
        if (!interval || typeof interval !== 'object') return interval;
        const nextInterval = { ...interval };
        if (interval.settings && typeof interval.settings === 'object') {
          const settingsRepType = normalizeMetricRepType(
            interval.settings.typeId || layer.typeId,
            interval.settings.repType || repType
          );
          nextInterval.settings = migrateLegacyPresetVisualConfig(
            interval.settings,
            settingsRepType,
            sourceVersion,
            interval.settings.typeId || layer.typeId
          );
        }
        return nextInterval;
      });
    }
    return nextLayer;
  }

  function migrateLegacyPresetPayload(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const sourceVersion = Number(payload.version) || 1;
    const rawLayers = Array.isArray(payload.layers) ? payload.layers : [];
    const migratedLayers = sourceVersion < PRESET_SCHEMA_VERSION
      ? rawLayers.map((layer) => migrateLegacyPresetLayer(layer, sourceVersion))
      : rawLayers;
    return {
      version: Math.max(sourceVersion, PRESET_SCHEMA_VERSION),
      layers: migratedLayers,
      viewModeTimeline: payload.viewModeTimeline ?? null,
      playbackRateTimeline: payload.playbackRateTimeline ?? null
    };
  }

  function getElementIntervalList(el) {
    return Array.isArray(el?.intervals) ? el.intervals : [];
  }

  function getSortedElementIntervals(el) {
    return getElementIntervalList(el)
      .slice()
      .sort((a, b) => (Number(a?.start) || 0) - (Number(b?.start) || 0) || (Number(a?.end) || 0) - (Number(b?.end) || 0));
  }

  function getElementIntervalById(el, intervalId) {
    if (!el || !intervalId) return null;
    return getElementIntervalList(el).find((int) => int?.id === intervalId) || null;
  }

  function getFirstElementInterval(el) {
    return getSortedElementIntervals(el)[0] || null;
  }

  function createSegmentSettingsFromSource(el, source = null) {
    const base = source && typeof source === 'object' ? source : el;
    const typeId = el?.typeId || base?.typeId || '';
    const repType = normalizeMetricRepType(typeId, base?.repType || el?.repType || 'text');
    const color = normalizeColorInputValue(base?.color ?? el?.color ?? '#d3d3d3');
    const styleCss = String(base?.styleCss ?? el?.styleCss ?? '');
    const scale = Number(base?.scale ?? el?.scale ?? 1);
    const rotation = Number(base?.rotation ?? el?.rotation ?? 0);
    const alpha = Number(base?.alpha ?? el?.alpha ?? 0.9);
    const snapshot = {
      typeId,
      repType,
      follow: base?.follow ?? el?.follow ?? true,
      project: base?.project ?? el?.project ?? true,
      snap: base?.snap ?? el?.snap ?? true,
      offsetX: normalizeCompareLineOffsetX(typeId, repType, base?.offsetX ?? el?.offsetX ?? 0),
      offsetY: Number(base?.offsetY ?? el?.offsetY ?? 0),
      scale: Number.isFinite(scale) ? scale : 1,
      rotation: Number.isFinite(rotation) ? rotation : 0,
      color,
      alpha: Number.isFinite(alpha) ? alpha : 0.9,
      visible: base?.visible ?? el?.visible ?? true,
      segmentMotion: base?.segmentMotion ?? el?.segmentMotion ?? true,
      staticPlacement: normalizeStaticPlacement(typeId, base?.staticPlacement ?? el?.staticPlacement),
      staticAlign: normalizeStaticTextAlign(base?.staticAlign ?? el?.staticAlign, getDefaultStaticTextAlign(typeId)),
      compareTargetBinding: resolveCompareTargetBindingConfig(
        base?.compareTargetBinding ?? el?.compareTargetBinding ?? 'auto',
        base?.compareTargetLaneId ?? el?.compareTargetLaneId ?? 0,
        base?.compareTargetRank ?? el?.compareTargetRank ?? 0
      ),
      compareTargetLaneId: normalizeCompareTargetLaneId(base?.compareTargetLaneId ?? el?.compareTargetLaneId ?? 0),
      compareTargetRank: normalizeCompareTargetRank(base?.compareTargetRank ?? el?.compareTargetRank ?? 0),
      compareRecordType: normalizeCompareRecordType(base?.compareRecordType ?? el?.compareRecordType ?? 'world'),
      repProps: mergeRepPropsWithMetricDefaults(typeId, repType, base?.repProps ?? el?.repProps, color),
      styleCss,
      styleOverrides: parseCssLikeStyleText(styleCss),
      laneSelectionMode: normalizeElementLaneSelectionMode(base?.laneSelectionMode ?? el?.laneSelectionMode ?? 'lane'),
      lanes: cloneLaneSelection(base?.lanes ?? el?.lanes),
      repModeVariants: clonePlainData(base?.repModeVariants)
    };
    snapshot.lanes = new Set(normalizeElementLaneSelection(snapshot.lanes, snapshot.laneSelectionMode, 'canonical'));
    if (!snapshot.lanes.size && el?.lanes) {
      snapshot.lanes = new Set(normalizeElementLaneSelection(el.lanes, snapshot.laneSelectionMode, 'canonical'));
    }
    captureCurrentRepModeVariant(snapshot);
    return snapshot;
  }

  function ensureIntervalSettings(el, interval, seedSource = null) {
    if (!interval) return null;
    if (!interval.settings || typeof interval.settings !== 'object') {
      interval.settings = createSegmentSettingsFromSource(el, seedSource || el);
      return interval.settings;
    }
    const current = interval.settings;
    current.typeId = el?.typeId || current.typeId || '';
    current.repType = normalizeMetricRepType(current.typeId, current.repType || el?.repType || 'text');
    current.follow = current.follow ?? el?.follow ?? true;
    current.project = current.project ?? el?.project ?? true;
    current.snap = current.snap ?? el?.snap ?? true;
    current.offsetX = Number.isFinite(Number(current.offsetX))
      ? normalizeCompareLineOffsetX(current.typeId, current.repType, current.offsetX)
      : normalizeCompareLineOffsetX(current.typeId, current.repType, el?.offsetX ?? 0);
    current.offsetY = Number.isFinite(Number(current.offsetY)) ? Number(current.offsetY) : Number(el?.offsetY ?? 0);
    current.scale = Number.isFinite(Number(current.scale)) ? Number(current.scale) : Number(el?.scale ?? 1);
    current.rotation = Number.isFinite(Number(current.rotation)) ? Number(current.rotation) : Number(el?.rotation ?? 0);
    current.color = normalizeColorInputValue(current.color ?? el?.color ?? '#d3d3d3');
    current.alpha = Number.isFinite(Number(current.alpha)) ? Number(current.alpha) : Number(el?.alpha ?? 0.9);
    current.visible = current.visible ?? el?.visible ?? true;
    current.segmentMotion = current.segmentMotion ?? el?.segmentMotion ?? true;
    current.staticPlacement = normalizeStaticPlacement(current.typeId, current.staticPlacement ?? el?.staticPlacement);
    current.staticAlign = normalizeStaticTextAlign(current.staticAlign ?? el?.staticAlign, getDefaultStaticTextAlign(current.typeId));
    current.laneSelectionMode = normalizeElementLaneSelectionMode(current.laneSelectionMode ?? el?.laneSelectionMode ?? 'lane');
    current.compareTargetBinding = resolveCompareTargetBindingConfig(
      current.compareTargetBinding ?? el?.compareTargetBinding ?? 'auto',
      current.compareTargetLaneId ?? el?.compareTargetLaneId ?? 0,
      current.compareTargetRank ?? el?.compareTargetRank ?? 0
    );
    current.compareTargetLaneId = normalizeCompareTargetLaneId(current.compareTargetLaneId ?? el?.compareTargetLaneId ?? 0);
    current.compareTargetRank = normalizeCompareTargetRank(current.compareTargetRank ?? el?.compareTargetRank ?? 0);
    current.compareRecordType = normalizeCompareRecordType(current.compareRecordType ?? el?.compareRecordType ?? 'world');
    current.repProps = mergeRepPropsWithMetricDefaults(current.typeId, current.repType, current.repProps, current.color);
    current.styleCss = String(current.styleCss ?? '');
    current.styleOverrides = parseCssLikeStyleText(current.styleCss);
    current.lanes = new Set(normalizeElementLaneSelection(current.lanes ?? el?.lanes, current.laneSelectionMode, 'canonical'));
    current.repModeVariants = clonePlainData(current.repModeVariants);
    if (!current.lanes.size && el?.lanes) {
      current.lanes = new Set(normalizeElementLaneSelection(el.lanes, current.laneSelectionMode, 'canonical'));
    }
    captureCurrentRepModeVariant(current);
    return current;
  }

  function getElementEditableState(el, intervalId = activeIntervalId) {
    if (!el) return null;
    const interval = getElementIntervalById(el, intervalId);
    if (interval) return ensureIntervalSettings(el, interval);
    return el;
  }

  function getPrimaryElementState(el) {
    const firstInterval = getFirstElementInterval(el);
    return firstInterval ? ensureIntervalSettings(el, firstInterval) : el;
  }

  function findElementIntervalAtTime(el, t) {
    if (!el || !Number.isFinite(t)) return null;
    let best = null;
    getElementIntervalList(el).forEach((int) => {
      const start = Number(int?.start);
      const end = Number(int?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;
      if (t < start || t > end) return;
      if (!best || start > Number(best.start) || (Math.abs(start - Number(best.start)) < 1e-6 && activeElementId === el.id && activeIntervalId === int.id)) {
        best = int;
      }
    });
    return best;
  }

  function findElementGapAtTime(el, t, total = videoDuration || 20) {
    if (!el || !Number.isFinite(t)) return null;
    const sorted = getSortedElementIntervals(el);
    const clampedT = Math.max(0, Math.min(total, t));
    let cursor = 0;
    for (const int of sorted) {
      const start = Math.max(0, Math.min(total, Number(int?.start) || 0));
      const end = Math.max(start, Math.min(total, Number(int?.end) || start));
      if (clampedT >= start && clampedT <= end) return null;
      if (clampedT >= cursor && clampedT <= start) {
        return { start: cursor, end: start };
      }
      cursor = Math.max(cursor, end);
    }
    if (clampedT >= cursor && clampedT <= total) {
      return { start: cursor, end: total };
    }
    return null;
  }

  function resolveInsertTargetFromPointer(el, barEl, clientX, total = videoDuration || 20) {
    if (!el || !barEl) return null;
    const rect = barEl.getBoundingClientRect();
    if (!(rect.width > 0)) return null;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = x / rect.width;
    const sec = pct * total;
    const gap = findElementGapAtTime(el, sec, total);
    if (!gap || gap.end - gap.start < 0.2) return null;
    return { sec, pct, gap, rect };
  }

  function resolveInsertSeedState(el, t) {
    if (!el) return null;
    if (activeElementId === el.id && activeIntervalId) {
      const selected = getElementIntervalById(el, activeIntervalId);
      if (selected) return ensureIntervalSettings(el, selected);
    }
    const sorted = getSortedElementIntervals(el);
    let prev = null;
    let next = null;
    for (const int of sorted) {
      const start = Number(int?.start) || 0;
      if (start <= t) {
        prev = int;
      } else {
        next = int;
        break;
      }
    }
    if (prev) return ensureIntervalSettings(el, prev);
    if (next) return ensureIntervalSettings(el, next);
    return el;
  }

  function clearPendingIntervalInsert(elementId = null) {
    if (!pendingIntervalInsert) return false;
    if (elementId && pendingIntervalInsert.elementId !== elementId) return false;
    pendingIntervalInsert = null;
    return true;
  }

  function serializeSegmentSettings(settings) {
    if (!settings) return null;
    captureCurrentRepModeVariant(settings);
    return {
      laneIdSpace: competitionLaneIdSpace,
      repType: settings.repType,
      follow: settings.follow,
      project: settings.project,
      snap: settings.snap,
      laneSelectionMode: normalizeElementLaneSelectionMode(settings.laneSelectionMode || 'lane'),
      offsetX: settings.offsetX,
      offsetY: settings.offsetY,
      scale: settings.scale,
      rotation: settings.rotation,
      color: settings.color,
      alpha: settings.alpha,
      visible: settings.visible,
      segmentMotion: settings.segmentMotion,
      staticPlacement: settings.staticPlacement,
      staticAlign: settings.staticAlign || getDefaultStaticTextAlign(settings.typeId),
      compareTargetBinding: settings.compareTargetBinding || 'auto',
      compareTargetLaneId: settings.compareTargetLaneId ?? 0,
      compareTargetRank: settings.compareTargetRank ?? 0,
      compareRecordType: settings.compareRecordType || 'world',
      repProps: clonePlainData(settings.repProps),
      styleCss: settings.styleCss || '',
      repModeVariants: clonePlainData(settings.repModeVariants || {}),
      lanes: Array.from(settings.lanes || [])
    };
  }

  function setElementStyleCss(el, cssText) {
    if (!el) return;
    const text = String(cssText || '');
    el.styleCss = text;
    el.styleOverrides = parseCssLikeStyleText(text);
  }

  const ADVANCED_STYLE_CORE_KEYS = new Set([
    'repType',
    'visible',
    'follow',
    'project',
    'segmentMotion',
    'staticPlacement',
    'staticAlign',
    'laneSelectionMode',
    'compareTargetBinding',
    'compareTargetLaneId',
    'compareTargetRank',
    'compareRecordType',
    'lanes',
    'offsetX',
    'offsetY',
    'scale',
    'rotation',
    'alpha',
    'color'
  ]);

  function camelToKebab(key) {
    return String(key || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  function formatAdvancedStyleNumber(raw) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return '0';
    if (Math.abs(num - Math.round(num)) < 1e-6) return String(Math.round(num));
    return num.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatAdvancedStyleValue(key, value) {
    if (key === 'lanes') {
      const arr = Array.isArray(value) ? value : Array.from(value || []);
      return arr.join(', ');
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return formatAdvancedStyleNumber(value);
    if (value == null) return '';
    if (String(key || '').toLowerCase().includes('color')) {
      return normalizeColorInputValue(value, '#d3d3d3');
    }
    return String(value);
  }

  function getAdvancedStyleRepKeys(target) {
    if (!target) return [];
    const repType = normalizeMetricRepType(target.typeId, target.repType);
    const schemaKeys = getRepStyleSchema(repType)
      .map((control) => control.key)
      .filter((key) => !shouldHideRepStyleControl(target.typeId, repType, key));
    if (repType === 'medal') {
      return Array.from(new Set(schemaKeys));
    }
    const repProps = mergeRepPropsWithMetricDefaults(target.typeId, repType, target.repProps, target.color || '#d3d3d3');
    const propKeys = Object.keys(repProps || {})
      .filter((key) => !shouldHideRepStyleControl(target.typeId, repType, key));
    return Array.from(new Set([...schemaKeys, ...propKeys]));
  }

  function collectAdvancedStyleExtraOverrides(target, repKeySet) {
    const repType = normalizeMetricRepType(target?.typeId, target?.repType);
    const source = target?.styleOverrides && typeof target.styleOverrides === 'object'
      ? target.styleOverrides
      : {};
    return Object.fromEntries(
      Object.entries(source)
        .filter(([key]) => (
          !ADVANCED_STYLE_CORE_KEYS.has(key)
          && !repKeySet.has(key)
          && !shouldHideRepStyleControl(target?.typeId, repType, key)
        ))
        .sort(([a], [b]) => a.localeCompare(b))
    );
  }

  function buildAdvancedStyleDraftText(target, extraOverrides = null) {
    if (!target) return '';
    const repType = ensureElementRepStyleState(target);
    const repKeys = getAdvancedStyleRepKeys(target);
    const repKeySet = new Set(repKeys);
    const repProps = mergeRepPropsWithMetricDefaults(target.typeId, repType, target.repProps, target.color || '#d3d3d3');
    const extras = extraOverrides && typeof extraOverrides === 'object'
      ? Object.fromEntries(
          Object.entries(extraOverrides)
            .filter(([key]) => (
              !ADVANCED_STYLE_CORE_KEYS.has(key)
              && !repKeySet.has(key)
              && !shouldHideRepStyleControl(target.typeId, repType, key)
            ))
            .sort(([a], [b]) => a.localeCompare(b))
        )
      : collectAdvancedStyleExtraOverrides(target, repKeySet);
    const lines = [];
    const pushLine = (key, value) => {
      const formatted = formatAdvancedStyleValue(key, value);
      if (!formatted) return;
      lines.push(`${camelToKebab(key)}: ${formatted};`);
    };

    pushLine('repType', repType);
    pushLine('visible', target.visible !== false);
    pushLine('follow', target.follow !== false);
    pushLine('project', target.project !== false);
    pushLine('segmentMotion', target.segmentMotion !== false);
    pushLine('staticPlacement', normalizeStaticPlacement(target.typeId, target.staticPlacement));
    if (supportsStaticTextAlign(target.typeId, repType)) {
      pushLine('staticAlign', normalizeStaticTextAlign(target.staticAlign, getDefaultStaticTextAlign(target.typeId)));
    }
    if (TARGET_SWIMMER_METRIC_TYPES.has(String(target.typeId || ''))) {
      pushLine(
        'compareTargetBinding',
        resolveCompareTargetBindingConfig(target.compareTargetBinding || 'auto', target.compareTargetLaneId ?? 0, target.compareTargetRank ?? 0)
      );
      pushLine('compareTargetLaneId', normalizeCompareTargetLaneId(target.compareTargetLaneId ?? 0));
      pushLine('compareTargetRank', normalizeCompareTargetRank(target.compareTargetRank ?? 0));
    }
    if (TARGET_RECORD_METRIC_TYPES.has(String(target.typeId || ''))) {
      pushLine('compareRecordType', normalizeCompareRecordType(target.compareRecordType || 'world'));
    }
    pushLine('laneSelectionMode', normalizeElementLaneSelectionMode(target.laneSelectionMode || 'lane'));
    pushLine('lanes', Array.from(target.lanes || []).sort((a, b) => a - b));
    pushLine('offsetX', Number(target.offsetX ?? 0));
    pushLine('offsetY', Number(target.offsetY ?? 0));
    pushLine('scale', Number(target.scale ?? 1));
    pushLine('rotation', Number(target.rotation ?? 0));
    pushLine('alpha', Number(target.alpha ?? 0.9));
    if (!(String(target.typeId || '') === 'resultStatus' && repType === 'medal')) {
      pushLine('color', normalizeColorInputValue(target.color, '#d3d3d3'));
    }

    repKeys.forEach((key) => {
      pushLine(key, repProps?.[key]);
    });

    Object.entries(extras).forEach(([key, value]) => {
      pushLine(key, value);
    });

    return lines.join('\n');
  }

  function syncPanelStyleCssFromState(target, extraOverrides = null) {
    if (!target) return;
    const draftText = buildAdvancedStyleDraftText(target, extraOverrides);
    setElementStyleCss(target, draftText);
    if (panelStyleCss) panelStyleCss.value = draftText;
  }

  function parseAdvancedStyleLaneSelection(rawValue, selectionMode = 'lane') {
    if (rawValue == null) return null;
    const text = String(rawValue).trim();
    if (!text) return new Set();
    const tokens = text
      .split(/[,\s]+/)
      .map((token) => Number(token))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (!tokens.length) return null;
    return new Set(normalizeElementLaneSelection(tokens, selectionMode, 'canonical'));
  }

  function coerceAdvancedStyleRepPropValue(repType, key, rawValue, fallbackValue) {
    const schema = getRepStyleSchema(repType);
    const control = schema.find((entry) => entry.key === key) || null;
    if (control?.type === 'checkbox') return !!rawValue;
    if (control?.type === 'range') {
      const numeric = Number(rawValue);
      return Number.isFinite(numeric) ? numeric : fallbackValue;
    }
    if (control?.type === 'color') {
      return normalizeColorInputValue(rawValue, normalizeColorInputValue(fallbackValue, '#d3d3d3'));
    }
    if (control?.type === 'font') return String(rawValue ?? '');
    if (control?.type === 'select') return String(rawValue ?? '');
    if (typeof fallbackValue === 'boolean') return !!rawValue;
    if (typeof fallbackValue === 'number') {
      const numeric = Number(rawValue);
      return Number.isFinite(numeric) ? numeric : fallbackValue;
    }
    if (String(key || '').toLowerCase().includes('color')) {
      return normalizeColorInputValue(rawValue, normalizeColorInputValue(fallbackValue, '#d3d3d3'));
    }
    return rawValue;
  }

  function applyAdvancedStyleDraft(el, athleteMeta) {
    if (!el || !panelStyleCss) return;
    const target = getElementEditableState(el);
    if (!target) return;

    const parsed = parseCssLikeStyleText(panelStyleCss.value || '');
    const currentRepType = normalizeMetricRepType(target.typeId, target.repType);
    const currentProject = target.project !== false;
    const requestedRepType = Object.prototype.hasOwnProperty.call(parsed, 'repType')
      ? normalizeMetricRepType(target.typeId, parsed.repType)
      : currentRepType;
    const requestedProject = Object.prototype.hasOwnProperty.call(parsed, 'project')
      ? !!parsed.project
      : (requestedRepType !== currentRepType
          ? resolvePreferredProjectForRep(target, requestedRepType, currentProject)
          : currentProject);
    const modeChanged = requestedRepType !== currentRepType || requestedProject !== currentProject;
    const prevLaneSelectionMode = normalizeElementLaneSelectionMode(target.laneSelectionMode || 'lane');
    const nextColor = Object.prototype.hasOwnProperty.call(parsed, 'color')
      ? normalizeColorInputValue(parsed.color, normalizeColorInputValue(target.color, '#d3d3d3'))
      : normalizeColorInputValue(target.color, '#d3d3d3');

    if (modeChanged) {
      switchRepModeVariant(target, requestedRepType, requestedProject);
    } else {
      captureCurrentRepModeVariant(target);
      target.repType = requestedRepType;
      target.project = requestedProject;
    }
    target.visible = Object.prototype.hasOwnProperty.call(parsed, 'visible') ? !!parsed.visible : target.visible;
    target.follow = Object.prototype.hasOwnProperty.call(parsed, 'follow') ? !!parsed.follow : target.follow;
    target.project = requestedProject;
    target.segmentMotion = Object.prototype.hasOwnProperty.call(parsed, 'segmentMotion') ? !!parsed.segmentMotion : target.segmentMotion;
    target.staticPlacement = Object.prototype.hasOwnProperty.call(parsed, 'staticPlacement')
      ? normalizeStaticPlacement(target.typeId, parsed.staticPlacement)
      : normalizeStaticPlacement(target.typeId, target.staticPlacement);
    target.staticAlign = Object.prototype.hasOwnProperty.call(parsed, 'staticAlign')
      ? normalizeStaticTextAlign(parsed.staticAlign, getDefaultStaticTextAlign(target.typeId))
      : normalizeStaticTextAlign(target.staticAlign, getDefaultStaticTextAlign(target.typeId));
    target.laneSelectionMode = Object.prototype.hasOwnProperty.call(parsed, 'laneSelectionMode')
      ? normalizeElementLaneSelectionMode(parsed.laneSelectionMode)
      : normalizeElementLaneSelectionMode(target.laneSelectionMode || 'lane');
    if (!Object.prototype.hasOwnProperty.call(parsed, 'lanes') && target.laneSelectionMode !== prevLaneSelectionMode) {
      target.lanes = remapLaneSelectionValues(target.lanes, prevLaneSelectionMode, target.laneSelectionMode, getCurrentFrameAthletes());
    }
    if (TARGET_SWIMMER_METRIC_TYPES.has(String(target.typeId || ''))) {
      if (Object.prototype.hasOwnProperty.call(parsed, 'compareTargetBinding')) {
        target.compareTargetBinding = normalizeCompareTargetBinding(parsed.compareTargetBinding);
      }
      if (Object.prototype.hasOwnProperty.call(parsed, 'compareTargetLaneId')) {
        target.compareTargetLaneId = normalizeCompareTargetLaneId(parsed.compareTargetLaneId);
      }
      if (Object.prototype.hasOwnProperty.call(parsed, 'compareTargetRank')) {
        target.compareTargetRank = normalizeCompareTargetRank(parsed.compareTargetRank);
      }
      target.compareTargetBinding = resolveCompareTargetBindingConfig(
        target.compareTargetBinding,
        target.compareTargetLaneId,
        target.compareTargetRank
      );
    }
    if (TARGET_RECORD_METRIC_TYPES.has(String(target.typeId || '')) && Object.prototype.hasOwnProperty.call(parsed, 'compareRecordType')) {
      target.compareRecordType = normalizeCompareRecordType(parsed.compareRecordType);
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'lanes')) {
      target.lanes = parseAdvancedStyleLaneSelection(parsed.lanes, target.laneSelectionMode);
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'offsetX') && Number.isFinite(Number(parsed.offsetX))) target.offsetX = Number(parsed.offsetX);
    if (Object.prototype.hasOwnProperty.call(parsed, 'offsetY') && Number.isFinite(Number(parsed.offsetY))) target.offsetY = Number(parsed.offsetY);
    if (Object.prototype.hasOwnProperty.call(parsed, 'scale') && Number.isFinite(Number(parsed.scale))) target.scale = Number(parsed.scale);
    if (Object.prototype.hasOwnProperty.call(parsed, 'rotation') && Number.isFinite(Number(parsed.rotation))) target.rotation = Number(parsed.rotation);
    if (Object.prototype.hasOwnProperty.call(parsed, 'alpha') && Number.isFinite(Number(parsed.alpha))) target.alpha = Number(parsed.alpha);
    target.color = nextColor;

    target.repProps = ensureRepProps(
      target.repType,
      clonePlainData(target.repProps),
      target.color || '#d3d3d3'
    );
    const repKeys = getAdvancedStyleRepKeys(target);
    const repKeySet = new Set(repKeys);
    let hasExplicitFillColor = false;
    let hasExplicitOverlayColor = false;
    repKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(parsed, key)) return;
      target.repProps[key] = coerceAdvancedStyleRepPropValue(target.repType, key, parsed[key], target.repProps[key]);
      if (key === 'fillColor') hasExplicitFillColor = true;
      if (key === 'overlayColor') hasExplicitOverlayColor = true;
    });
    if (!hasExplicitFillColor && target.repProps && Object.prototype.hasOwnProperty.call(target.repProps, 'fillColor')) {
      target.repProps.fillColor = target.color;
    }
    if (!hasExplicitOverlayColor && target.repProps && Object.prototype.hasOwnProperty.call(target.repProps, 'overlayColor')) {
      target.repProps.overlayColor = target.color;
    }

    const extraOverrides = Object.fromEntries(
      Object.entries(parsed)
        .filter(([key]) => (
          !ADVANCED_STYLE_CORE_KEYS.has(key)
          && !repKeySet.has(key)
          && !(key === 'updateIntervalSec' && !supportsLiveDataUpdateInterval(target.typeId))
        ))
        .sort(([a], [b]) => a.localeCompare(b))
    );

    el.staticPos.clear();
    captureCurrentRepModeVariant(target);
    syncPanelStyleCssFromState(target, extraOverrides);
    resetTemporalMetricCaches();
    openEditor(el, athleteMeta);
    renderElementTimeline();
    requestOverlayRefresh();
  }

  function ensureElementRepStyleState(el) {
    if (!el) return 'text';
    const repType = normalizeMetricRepType(el.typeId, el.repType);
    el.repType = repType;
    el.repProps = ensureRepProps(
      repType,
      {
        ...buildLayerDefaultRepProps(el.typeId, repType, el.color || '#d3d3d3'),
        ...clonePlainData(el.repProps)
      },
      el.color || '#d3d3d3'
    );
    if (!el.styleOverrides || typeof el.styleOverrides !== 'object') {
      el.styleOverrides = parseCssLikeStyleText(el.styleCss || '');
    }
    return repType;
  }

  function updatePanelCoreReadouts(el) {
    if (!el) return;
    if (panelOffsetXReadout) panelOffsetXReadout.textContent = `${Math.round(Number(el.offsetX || 0))}`;
    if (panelOffsetYReadout) panelOffsetYReadout.textContent = `${Math.round(Number(el.offsetY || 0))}`;
    if (panelScaleReadout) panelScaleReadout.textContent = formatDecimalReadout(Number(el.scale || 1));
    if (panelRotationReadout) panelRotationReadout.textContent = `${Math.round(Number(el.rotation || 0))}\u00b0`;
    if (panelAlphaReadout) panelAlphaReadout.textContent = formatDecimalReadout(Number(el.alpha || 1));
  }

  function updatePanelPlacementControls(el, target) {
    if (!el || !target) return;
    const isGlobalCornerType = usesGlobalCornerPlacement(el.typeId);
    const canUseStaticLaneSlots = !isGlobalCornerType && target.follow === false;
    const showStaticAlign = canUseStaticLaneSlots && supportsStaticTextAlign(el.typeId, target.repType);
    if (panelFollowLabel) panelFollowLabel.textContent = 'Moving With Swimmer';
    if (panelOffsetXLabel) panelOffsetXLabel.textContent = target.follow !== false ? 'Behind Swimmer' : 'Offset X';
    panelFollow?.closest('label')?.style && (panelFollow.closest('label').style.display = isGlobalCornerType ? 'none' : 'flex');
    panelProjection?.closest('label')?.style && (panelProjection.closest('label').style.display = isGlobalCornerType ? 'none' : 'flex');
    if (panelStaticSlotRow) panelStaticSlotRow.classList.toggle('is-hidden', !canUseStaticLaneSlots);
    if (panelStaticSlot) panelStaticSlot.value = normalizeStaticPlacement(el.typeId, target.staticPlacement);
    if (panelStaticAlignRow) panelStaticAlignRow.classList.toggle('is-hidden', !showStaticAlign);
    if (panelStaticAlign) panelStaticAlign.value = normalizeStaticTextAlign(target.staticAlign, getDefaultStaticTextAlign(el.typeId));
    if (panelScreenAnchorRow) panelScreenAnchorRow.classList.toggle('is-hidden', !isGlobalCornerType);
    if (panelScreenAnchor) panelScreenAnchor.value = normalizeStaticPlacement(el.typeId, target.staticPlacement);
    const panelSegmentMotionRow = panelSegmentMotion?.closest('label');
    if (panelSegmentMotionRow) panelSegmentMotionRow.style.display = isGlobalCornerType ? 'none' : 'flex';
    if (panelLanesSection) panelLanesSection.style.display = isGlobalCornerType ? 'none' : 'block';
  }

  function castRepControlValue(control, inputEl) {
    if (!control || !inputEl) return null;
    if (control.type === 'range') return Number(inputEl.value);
    if (control.type === 'checkbox') return !!inputEl.checked;
    if (control.type === 'color') return normalizeColorInputValue(inputEl.value);
    if (control.type === 'font') return String(inputEl.value || '');
    if (control.type === 'select') return String(inputEl.value || '');
    return inputEl.value;
  }

  function resetMetricRuntimeDisplaySamples(state) {
    if (!state || typeof state !== 'object') return;
    state.displaySpeedById?.clear?.();
    state.displaySpeedTimeById?.clear?.();
    state.displaySpeedSamplesById?.clear?.();
  }

  function getLiveMetricRuntimeStateForInterval(updateIntervalSec) {
    const normalizedIntervalSec = normalizeMetricUpdateIntervalSec(updateIntervalSec, LIVE_DATA_UPDATE_INTERVAL_SEC);
    const cacheKey = normalizedIntervalSec.toFixed(2);
    let state = liveMetricRuntimeStatesByInterval.get(cacheKey) || null;
    if (!state) {
      state = createMetricRuntimeState();
      liveMetricRuntimeStatesByInterval.set(cacheKey, state);
    }
    state.displaySpeedMovingAverageSec = normalizedIntervalSec;
    return state;
  }

  function resetTemporalMetricCaches() {
    resetMetricRuntimeDisplaySamples(metricRuntimeState);
    liveMetricRuntimeStatesByInterval.forEach((state) => {
      resetMetricRuntimeDisplaySamples(state);
    });
    liveMetricRuntimeStatesByInterval.clear();
    compareLineReferenceByKey.clear();
    comparisonHistorySeriesCache = null;
  }

  function normalizeFontProbeFamily(fontName) {
    return String(fontName || '').trim().replace(/^['"]+|['"]+$/g, '');
  }

  function isBrowserFontSupported(fontName) {
    const normalized = normalizeFontProbeFamily(fontName);
    if (!normalized) return false;
    const cacheKey = normalized.toLowerCase();
    if (fontAvailabilityCache.has(cacheKey)) return fontAvailabilityCache.get(cacheKey);
    let supported = false;
    if (/^(serif|sans-serif|monospace|system-ui|ui-serif|ui-sans-serif|ui-monospace)$/i.test(normalized)) {
      supported = true;
    }
    if (!supported) {
      try {
        if (document?.fonts?.check) {
          supported = document.fonts.check(`12px "${normalized}"`);
        }
      } catch (err) {
        supported = false;
      }
    }
    if (!supported && typeof document !== 'undefined') {
      fontMeasureCanvas ||= document.createElement('canvas');
      const ctx = fontMeasureCanvas.getContext('2d');
      if (ctx) {
        const sampleText = 'abcdefghijklmnopqrstuvwxyz0123456789';
        ctx.font = '72px monospace';
        const monoWidth = ctx.measureText(sampleText).width;
        ctx.font = `72px "${normalized}", monospace`;
        const monoProbeWidth = ctx.measureText(sampleText).width;
        ctx.font = '72px serif';
        const serifWidth = ctx.measureText(sampleText).width;
        ctx.font = `72px "${normalized}", serif`;
        const serifProbeWidth = ctx.measureText(sampleText).width;
        supported = Math.abs(monoProbeWidth - monoWidth) > 0.1 || Math.abs(serifProbeWidth - serifWidth) > 0.1;
      }
    }
    fontAvailabilityCache.set(cacheKey, supported);
    return supported;
  }

  function getFontOptionLabel(fontValue) {
    const primary = String(fontValue || '')
      .split(',')[0]
      .trim()
      .replace(/^['"]+|['"]+$/g, '');
    return primary || 'Custom Font Stack';
  }

  function getAvailableFontFamilyOptions(currentValue = '') {
    const options = FONT_FAMILY_LIBRARY.filter((option) => {
      if (option.alwaysAvailable) return true;
      const probes = Array.isArray(option.probes) && option.probes.length
        ? option.probes
        : [option.value];
      return probes.some((probe) => isBrowserFontSupported(probe));
    });
    const currentFontValue = String(currentValue || '').trim();
    if (currentFontValue && !options.some((option) => option.value === currentFontValue)) {
      options.unshift({
        label: `${getFontOptionLabel(currentFontValue)} (Current)`,
        value: currentFontValue,
        alwaysAvailable: true
      });
    }
    return options;
  }

  function shouldHideRepStyleControl(typeId, repType, controlKey) {
    const normalizedTypeId = String(typeId || '');
    const normalizedRepType = String(repType || '');
    const normalizedKey = String(controlKey || '');
    if (normalizedRepType === 'line' && ['mainGlowAlpha', 'childGlowAlpha'].includes(normalizedKey)) {
      return true;
    }
    if (normalizedRepType === 'line' && COMPARE_LINE_TYPES.has(normalizedTypeId)) {
      if (['height', 'width', 'fillColor', 'strokeColor', 'fillAlpha'].includes(normalizedKey)) {
        return true;
      }
    }
    if (normalizedRepType === 'line' && !COMPARE_LINE_TYPES.has(normalizedTypeId)) {
      if ([
        'mainLineWidth',
        'childLineWidth',
        'mainStrokeWidth',
        'childStrokeWidth',
        'mainLineColor',
        'childLineColor',
        'mainStrokeColor',
        'childStrokeColor',
        'mainLineAlpha',
        'childLineAlpha',
        'mainStrokeAlpha',
        'childStrokeAlpha'
      ].includes(normalizedKey)) {
        return true;
      }
    }
    if (
      normalizedRepType === 'line'
      && normalizedTypeId !== 'positionDiffRecord'
      && [
        'showDebugOverlay',
        'debugColor',
        'debugAlpha',
        'debugWidth',
        'debugLabelColor',
        'debugLabelBgColor',
        'debugLabelBgAlpha',
        'debugLabelFontSize',
        'debugLabelPaddingX',
        'debugLabelPaddingY',
        'debugLabelRadius',
        'debugLabelOffsetY',
        'debugEndpointLabelColor',
        'debugEndpointLabelFontSize',
        'debugEndpointLabelOffsetY'
      ].includes(normalizedKey)
    ) {
      return true;
    }
    if (
      DYNAMIC_ARROW_LENGTH_TYPES.has(normalizedTypeId)
      && normalizedRepType === 'arrow'
      && normalizedKey === 'width'
    ) {
      return true;
    }
    if (
      normalizedTypeId === 'acceleration'
      && normalizedRepType === 'arrow'
      && ['originRadius', 'originStrokeColor', 'originCoreColor'].includes(normalizedKey)
    ) {
      return true;
    }
    if (
      ['leaderStatus', 'chaseStatus'].includes(normalizedTypeId)
      && normalizedRepType === 'arrow'
      && ['headLen', 'tailRatio', 'originRadius', 'originStrokeColor', 'originCoreColor'].includes(normalizedKey)
    ) {
      return true;
    }
    if (
      (normalizedTypeId === 'distanceSwam' || normalizedTypeId === 'remainingDistance')
      && normalizedRepType === 'pie'
      && normalizedKey === 'height'
    ) {
      return true;
    }
    if (
      normalizedRepType === 'bar'
      && normalizedKey === 'showTicks'
      && !['speedDiffSwimmer', 'timeDiffSwimmer', 'acceleration', 'timeDiffRecord', 'speedDiffRecord'].includes(normalizedTypeId)
    ) {
      return true;
    }
    return false;
  }

  function getRepStyleControlLabel(typeId, repType, control) {
    const normalizedTypeId = String(typeId || '');
    const normalizedRepType = String(repType || '');
    const controlKey = String(control?.key || '');
    if (normalizedTypeId === 'positionDiffRecord' && normalizedRepType === 'line') {
      if (controlKey === 'mainLineWidth') return 'Record Weight';
      if (controlKey === 'mainStrokeWidth') return 'Record Stroke Weight';
      if (controlKey === 'mainLineColor') return 'Record Color';
      if (controlKey === 'mainStrokeColor') return 'Record Stroke Color';
      if (controlKey === 'mainLineAlpha') return 'Record Opacity';
      if (controlKey === 'mainStrokeAlpha') return 'Record Stroke Opacity';
    }
    return control?.label || controlKey;
  }

  function appendLiveDataUpdateIntervalControl(panelEl, target) {
    if (!panelEl || !target || !supportsLiveDataUpdateInterval(target.typeId)) return;
    const row = document.createElement('label');
    row.className = 'field';
    row.dataset.controlType = LIVE_DATA_UPDATE_INTERVAL_CONTROL.type;

    const label = document.createElement('span');
    label.textContent = LIVE_DATA_UPDATE_INTERVAL_CONTROL.label;
    row.appendChild(label);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(LIVE_DATA_UPDATE_INTERVAL_CONTROL.min);
    input.max = String(LIVE_DATA_UPDATE_INTERVAL_CONTROL.max);
    input.step = String(LIVE_DATA_UPDATE_INTERVAL_CONTROL.step);
    input.value = String(
      normalizeMetricUpdateIntervalSec(
        target.repProps?.updateIntervalSec ?? target.styleOverrides?.updateIntervalSec ?? LIVE_DATA_UPDATE_INTERVAL_SEC,
        LIVE_DATA_UPDATE_INTERVAL_SEC
      )
    );

    const output = document.createElement('output');
    output.textContent = formatRepPropReadout(LIVE_DATA_UPDATE_INTERVAL_CONTROL, input.value);

    input.addEventListener('input', () => {
      if (!activeElementId) return;
      const currentEl = elements.get(activeElementId);
      const current = getElementEditableState(currentEl);
      if (!currentEl || !current) return;
      ensureElementRepStyleState(current);
      current.repProps.updateIntervalSec = normalizeMetricUpdateIntervalSec(input.value, LIVE_DATA_UPDATE_INTERVAL_SEC);
      output.textContent = formatRepPropReadout(LIVE_DATA_UPDATE_INTERVAL_CONTROL, current.repProps.updateIntervalSec);
      syncPanelStyleCssFromState(current);
      resetTemporalMetricCaches();
      requestOverlayRefresh();
    });

    row.appendChild(input);
    row.appendChild(output);
    panelEl.appendChild(row);
  }

  function renderPanelLiveDataControls(el) {
    if (!panelLiveDataSection || !panelLiveDataControls) return;
    panelLiveDataControls.innerHTML = '';
    const target = getElementEditableState(el);
    const showLiveDataControls = !!target && supportsLiveDataUpdateInterval(target.typeId);
    panelLiveDataSection.classList.toggle('is-hidden', !showLiveDataControls);
    panelLiveDataSection.style.display = showLiveDataControls ? 'block' : 'none';
    if (!showLiveDataControls) return;
    appendLiveDataUpdateIntervalControl(panelLiveDataControls, target);
  }

  function renderPanelRepProps(el) {
    if (!panelRepProps) return;
    panelRepProps.innerHTML = '';
    const target = getElementEditableState(el);
    if (!target) {
      if (panelRepPropsSection) panelRepPropsSection.style.display = 'none';
      if (panelRepPropsNote) panelRepPropsNote.textContent = '';
      return;
    }

    const repType = ensureElementRepStyleState(target);
    const schema = getRepStyleSchema(repType);
    if (!schema.length) {
      if (panelRepPropsSection) panelRepPropsSection.style.display = 'none';
      if (panelRepPropsNote) panelRepPropsNote.textContent = '';
      return;
    }

    if (panelRepPropsSection) panelRepPropsSection.style.display = 'block';
    if (panelRepPropsNote) panelRepPropsNote.textContent = '';

    schema.forEach((control) => {
      if (shouldHideRepStyleControl(target.typeId, repType, control.key)) {
        return;
      }
      if (control.requiresRepProp && !Object.prototype.hasOwnProperty.call(target.repProps || {}, control.key)) {
        return;
      }
      const row = document.createElement('label');
      row.className = 'field';
      row.dataset.controlType = control.type;

      const label = document.createElement('span');
      label.textContent = getRepStyleControlLabel(target.typeId, repType, control);
      row.appendChild(label);

      if (control.type === 'range') {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(control.min ?? 0);
        input.max = String(control.max ?? 100);
        input.step = String(control.step ?? 1);
        input.value = String(target.repProps?.[control.key] ?? control.defaultValue ?? 0);

        const output = document.createElement('output');
        output.textContent = formatRepPropReadout(control, input.value);

        input.addEventListener('input', () => {
          if (!activeElementId) return;
          const currentEl = elements.get(activeElementId);
          const current = getElementEditableState(currentEl);
          if (!currentEl || !current) return;
          ensureElementRepStyleState(current);
          current.repProps[control.key] = castRepControlValue(control, input);
          output.textContent = formatRepPropReadout(control, input.value);
          syncPanelStyleCssFromState(current);
          comparisonHistorySeriesCache = null;
          requestOverlayRefresh();
        });

        row.appendChild(input);
        row.appendChild(output);
      } else if (control.type === 'color') {
        const spacer = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'color';
        input.value = normalizeColorInputValue(target.repProps?.[control.key], '#d3d3d3');
        input.addEventListener('input', () => {
          if (!activeElementId) return;
          const currentEl = elements.get(activeElementId);
          const current = getElementEditableState(currentEl);
          if (!currentEl || !current) return;
          ensureElementRepStyleState(current);
          current.repProps[control.key] = castRepControlValue(control, input);
          syncPanelStyleCssFromState(current);
          comparisonHistorySeriesCache = null;
          requestOverlayRefresh();
        });
        row.appendChild(spacer);
        row.appendChild(input);
      } else if (control.type === 'checkbox') {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!(target.repProps?.[control.key] ?? control.defaultValue);
        const helper = document.createElement('em');
        helper.textContent = input.checked ? 'on' : 'off';
        input.addEventListener('input', () => {
          if (!activeElementId) return;
          const currentEl = elements.get(activeElementId);
          const current = getElementEditableState(currentEl);
          if (!currentEl || !current) return;
          ensureElementRepStyleState(current);
          current.repProps[control.key] = castRepControlValue(control, input);
          helper.textContent = input.checked ? 'on' : 'off';
          syncPanelStyleCssFromState(current);
          comparisonHistorySeriesCache = null;
          requestOverlayRefresh();
        });
        row.appendChild(input);
        row.appendChild(helper);
      } else if (control.type === 'font') {
        const input = document.createElement('select');
        getAvailableFontFamilyOptions(target.repProps?.[control.key] ?? control.defaultValue ?? '').forEach((option) => {
          const opt = document.createElement('option');
          opt.value = String(option.value ?? '');
          opt.textContent = String(option.label ?? option.value ?? '');
          input.appendChild(opt);
        });
        input.value = String(target.repProps?.[control.key] ?? control.defaultValue ?? '');
        const helper = document.createElement('em');
        helper.textContent = 'browser fonts';
        input.addEventListener('input', () => {
          if (!activeElementId) return;
          const currentEl = elements.get(activeElementId);
          const current = getElementEditableState(currentEl);
          if (!currentEl || !current) return;
          ensureElementRepStyleState(current);
          current.repProps[control.key] = castRepControlValue(control, input);
          syncPanelStyleCssFromState(current);
          comparisonHistorySeriesCache = null;
          requestOverlayRefresh();
        });
        row.appendChild(input);
        row.appendChild(helper);
      } else if (control.type === 'select') {
        const input = document.createElement('select');
        (control.options || []).forEach((option) => {
          const opt = document.createElement('option');
          if (option && typeof option === 'object') {
            opt.value = String(option.value ?? '');
            opt.textContent = String(option.label ?? option.value ?? '');
          } else {
            opt.value = String(option ?? '');
            opt.textContent = String(option ?? '');
          }
          input.appendChild(opt);
        });
        input.value = String(target.repProps?.[control.key] ?? control.defaultValue ?? '');
        input.addEventListener('input', () => {
          if (!activeElementId) return;
          const currentEl = elements.get(activeElementId);
          const current = getElementEditableState(currentEl);
          if (!currentEl || !current) return;
          ensureElementRepStyleState(current);
          current.repProps[control.key] = castRepControlValue(control, input);
          syncPanelStyleCssFromState(current);
          comparisonHistorySeriesCache = null;
          requestOverlayRefresh();
        });
        const helper = document.createElement('em');
        helper.textContent = '';
        row.appendChild(input);
        row.appendChild(helper);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = String(target.repProps?.[control.key] ?? control.defaultValue ?? '');
        const helper = document.createElement('em');
        helper.textContent = control.suffix || '';
        input.addEventListener('input', () => {
          if (!activeElementId) return;
          const currentEl = elements.get(activeElementId);
          const current = getElementEditableState(currentEl);
          if (!currentEl || !current) return;
          ensureElementRepStyleState(current);
          current.repProps[control.key] = castRepControlValue(control, input);
          syncPanelStyleCssFromState(current);
          comparisonHistorySeriesCache = null;
          requestOverlayRefresh();
        });
        row.appendChild(input);
        row.appendChild(helper);
      }

      panelRepProps.appendChild(row);
    });
  }

  function defaultElementState(typeId, repId, athleteIds) {
    const v = VIS_LIBRARY[typeId];
    let laneCountSafe = 8;
    try {
      laneCountSafe = laneCountGlobal || 8;
    } catch (e) {
      laneCountSafe = 8;
    }
    const lanes = new Set(Array.from({ length: laneCountSafe }, (_, i) => i + 1));
    const baseEnd = videoDuration || 20;
    const infoStatic = usesGlobalCornerPlacement(typeId);
    const athleteInfoStatic = ATHLETE_INFO_STATIC_TYPES.has(String(typeId || '')) || STATIC_TIMED_TEXT_TYPES.has(String(typeId || ''));
    const resultStatic = String(typeId || '') === 'resultStatus';
    const startsStatic = infoStatic || athleteInfoStatic || resultStatic;
    const defaultRepId = repId || getDefaultRepIdForType(typeId, v);
    const normalizedRepType = normalizeMetricRepType(typeId, defaultRepId);
    const defaultRepProps = buildLayerDefaultRepProps(typeId, normalizedRepType, (v && v.defaultColor) || '#d3d3d3');
    if (typeId === 'elapsed' && normalizedRepType === 'text') {
      defaultRepProps.fontFamily = 'SFMono-Regular, SF Mono, ui-monospace, Menlo, Monaco, Consolas, Liberation Mono, monospace';
      defaultRepProps.fontWeight = '600';
      defaultRepProps.fillColor = '#ffffff';
      defaultRepProps.strokeWidth = 0;
      defaultRepProps.showBackground = true;
      defaultRepProps.backgroundAlpha = 0.45;
      defaultRepProps.backgroundPaddingX = 9;
      defaultRepProps.backgroundPaddingY = 5;
      defaultRepProps.backgroundRadius = 8;
    }
    if ((typeId === 'worldRecord' || typeId === 'olympicsRecord') && normalizedRepType === 'text') {
      defaultRepProps.showBackground = true;
      defaultRepProps.backgroundAlpha = 0.42;
      defaultRepProps.backgroundPaddingX = 12;
      defaultRepProps.backgroundPaddingY = 6;
      defaultRepProps.backgroundRadius = 8;
      defaultRepProps.fontSize = 26;
      defaultRepProps.strokeWidth = 0;
    }
    const { offsetX: defaultOffsetX, offsetY: defaultOffsetY } = getDefaultLayerOffsets(typeId);
    const state = {
      id: `el_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      typeId,
      repType: normalizedRepType,
      follow: startsStatic ? false : true,
      project: startsStatic ? false : true,
      snap: startsStatic ? false : true,
      offsetX: normalizeCompareLineOffsetX(typeId, normalizedRepType, defaultOffsetX),
      offsetY: defaultOffsetY,
      scale: defaultScaleForRep(typeId, normalizedRepType),
      rotation: 0,
      color: (v && v.defaultColor) || '#d3d3d3',
      alpha: 0.9,
      visible: true,
      segmentMotion: true,
      staticPlacement: getDefaultStaticPlacementForType(typeId),
      staticAlign: getDefaultStaticTextAlign(typeId),
      laneSelectionMode: 'lane',
      compareTargetBinding: 'auto',
      compareTargetLaneId: 0,
      compareTargetRank: 0,
      compareRecordType: 'world',
      zIndex: usesGlobalCornerPlacement(typeId) ? 999 : 10,
      lanes,
      intervals: usesInsightLayerTimeline(typeId)
        ? buildInsightIntervalsForType(typeId, baseEnd)
        : typeId === 'splitTime'
          ? buildMetricValidityIntervalsForType(typeId, baseEnd, { excludeReasons: ['prestart'] })
        : typeId === 'finalTime'
          ? buildFinalTimeIntervals(baseEnd)
        : [{ id: `int_${Date.now()}`, start: 0, end: baseEnd }],
      repProps: defaultRepProps,
      styleCss: '',
      styleOverrides: {},
      repModeVariants: {},
      container: null,
      instances: new Map(),
      staticPos: new Map()
    };
    if (typeId === 'currentSpeed' && normalizedRepType === 'bar') {
      state.follow = true;
      state.project = true;
      state.snap = true;
      state.offsetX = DEFAULT_LAYER_OFFSET_X;
      state.offsetY = 0;
      state.scale = 1.5;
      state.rotation = 0;
      state.alpha = 0.9;
      state.visible = true;
      state.segmentMotion = true;
      state.staticPlacement = getDefaultStaticPlacementForType(typeId);
      state.color = '#d3d3d3';
      state.lanes = new Set(Array.from({ length: laneCountSafe }, (_, i) => i + 1));
    }
    if (ARROW_FORCE_PROJECT_FALSE_TYPES.has(String(typeId || '')) && normalizedRepType === 'arrow') {
      state.follow = true;
      state.project = false;
      state.snap = true;
      state.offsetX = DEFAULT_LAYER_OFFSET_X;
      state.offsetY = 0;
      state.scale = defaultScaleForRep(typeId, normalizedRepType);
    }
    if (state.intervals[0]) {
      state.intervals[0].settings = createSegmentSettingsFromSource(state, state);
    }
    captureCurrentRepModeVariant(state);
    return state;
  }

  function renderActiveElements() { }

  function removeElement(id) {
    const el = elements.get(id);
    if (el && el.container) {
      overlayLayer.removeChild(el.container);
    }
    elements.delete(id);
    clearPendingIntervalInsert(id);
    if (uiState.selectedLayerTypeId === el?.typeId) {
      uiState.selectedLayerTypeId = null;
    }
    if (activeElementId === id) {
      activeElementId = null;
      activeIntervalId = null;
      closeLayerSettingsToModePanel();
    }
    renderElementTimeline();
    updateVisChipActive();
    comparisonHistorySeriesCache = null;
    requestOverlayRefresh();
  }

  function openEditor(el, athleteMeta) {
    uiState.selectedLayerTypeId = el.typeId;
    activeElementId = el.id;
    const selectedInterval = getElementIntervalById(el, activeIntervalId) || getFirstElementInterval(el);
    if (selectedInterval) {
      activeIntervalId = selectedInterval.id;
    }
    const target = getElementEditableState(el, activeIntervalId);
    const repType = ensureElementRepStyleState(target);
    const segmentIndex = selectedInterval
      ? getSortedElementIntervals(el).findIndex((int) => int.id === selectedInterval.id) + 1
      : 0;
    panelTitle.textContent = segmentIndex > 0
      ? `Editing: ${VIS_LIBRARY[el.typeId]?.label || el.typeId} · Segment ${segmentIndex}`
      : `Editing: ${VIS_LIBRARY[el.typeId]?.label || el.typeId}`;
    syncPanelScaleControl(el.typeId, repType, target.scale, target.project !== false);
    panelVisible.checked = target.visible !== false;
    panelFollow.checked = target.follow !== false;
    panelProjection.checked = target.project !== false;
    if (panelSegmentMotion) panelSegmentMotion.checked = target.segmentMotion !== false;
    if (panelStaticAlign) panelStaticAlign.value = normalizeStaticTextAlign(target.staticAlign, getDefaultStaticTextAlign(el.typeId));
    panelOffsetX.value = target.offsetX;
    panelOffsetY.value = target.offsetY;
    panelRotation.value = target.rotation;
    panelAlpha.value = target.alpha;
    panelColor.value = normalizeColorInputValue(target.color, '#d3d3d3');
    if (panelColor) {
      const colorField = panelColor.closest('.field');
      if (colorField) {
        colorField.style.display = hidesAppearanceColorControl(el.typeId, repType) ? 'none' : '';
      }
    }
    updatePanelCoreReadouts(target);
    syncPanelStyleCssFromState(target);
    updatePanelPlacementControls(el, target);
    renderCompareTargetControls(el);
    renderPanelLiveDataControls(el);
    renderPanelReps(el);
    renderPanelRepProps(el);
    renderPanelLanes(el, athleteMeta);
    if (panelRepPropsNote) panelRepPropsNote.textContent = '';
    showLayerSettingsSurface(el.typeId);
  }

  function closeEditor() {
    activeElementId = null;
    uiState.selectedLayerTypeId = null;
    if (panelLiveDataControls) panelLiveDataControls.innerHTML = '';
    if (panelLiveDataSection) {
      panelLiveDataSection.classList.add('is-hidden');
      panelLiveDataSection.style.display = 'none';
    }
    if (panelRepProps) panelRepProps.innerHTML = '';
    if (panelRepPropsSection) panelRepPropsSection.style.display = 'none';
    if (panelRepPropsNote) panelRepPropsNote.textContent = '';
    if (panelStyleCss) panelStyleCss.value = '';
    closeLayerSettingsToModePanel();
  }

  function renderPanelReps(el) {
    const target = getElementEditableState(el);
    panelReps.innerHTML = '';
    const vis = VIS_LIBRARY[target?.typeId || el?.typeId];
    if (!vis) return;
    const panelRepPriority = ['text', 'bar', 'circular', 'glyph', 'arrow', 'line', 'badge', 'medal', 'medalSummary', 'ringsCount', 'flag', 'pie', 'progressBar'];
    const orderedReps = (vis.reps || []).slice().sort((a, b) => {
      const ai = panelRepPriority.indexOf(a.id);
      const bi = panelRepPriority.indexOf(b.id);
      if (ai >= 0 || bi >= 0) {
        return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
      }
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    orderedReps.forEach(r => {
      const pill = document.createElement('div');
      pill.className = `pill ${target?.repType === r.id ? 'active' : ''}`;
      pill.textContent = r.label;
      pill.dataset.rep = r.id;
      pill.addEventListener('click', () => {
        if (!activeElementId) return;
        const currentEl = elements.get(activeElementId);
        const current = getElementEditableState(currentEl);
        if (!currentEl || !current) return;
        const nextRepType = normalizeMetricRepType(current.typeId, r.id);
        const preferredProject = usesFollowDrivenProjection(current.typeId, nextRepType)
          ? (current.follow !== false)
          : (current.project !== false);
        const nextProject = resolvePreferredProjectForRep(current, nextRepType, preferredProject);
        switchRepModeVariant(current, nextRepType, nextProject);
        syncPanelScaleControl(current.typeId, nextRepType, current.scale, current.project !== false);
        syncPanelStyleCssFromState(current);
        updatePanelPlacementControls(currentEl, current);
        updatePanelCoreReadouts(current);
        openEditor(currentEl, overlay?.athletes || []);
        renderElementTimeline();
        requestOverlayRefresh();
      });
      panelReps.appendChild(pill);
    });
  }

  function renderPanelLanes(el, athleteMeta) {
    const target = getElementEditableState(el);
    panelLanes.innerHTML = '';
    const laneCount = laneCountGlobal || 8;
    const selectionMode = normalizeElementLaneSelectionMode(target?.laneSelectionMode || 'lane');
    if (panelLaneSelectionMode) panelLaneSelectionMode.value = selectionMode;
    for (let i = 1; i <= laneCount; i++) {
      const div = document.createElement('div');
      div.className = `lane-chip ${target?.lanes?.has(i) ? 'active' : ''}`;
      div.textContent = selectionMode === 'rank' ? `Top ${i}` : String(i);
      div.title = selectionMode === 'rank' ? `Top ${i}` : `Lane ${i}`;
      div.addEventListener('click', () => {
        if (!activeElementId) return;
        const currentEl = elements.get(activeElementId);
        const current = getElementEditableState(currentEl);
        if (!currentEl || !current) return;
        if (current.lanes.has(i)) current.lanes.delete(i);
        else current.lanes.add(i);
        syncPanelStyleCssFromState(current);
        renderPanelLanes(currentEl, athleteMeta);
        requestOverlayRefresh();
      });
      panelLanes.appendChild(div);
    }
  }

  function renderCompareTargetControls(el) {
    const target = getElementEditableState(el);
    const typeId = String(target?.typeId || el?.typeId || '');
    const showSwimmerTarget = TARGET_SWIMMER_METRIC_TYPES.has(typeId);
    const showRecordTarget = TARGET_RECORD_METRIC_TYPES.has(typeId);

    if (panelCompareTargetSection) panelCompareTargetSection.classList.toggle('is-hidden', !showSwimmerTarget && !showRecordTarget);
    if (panelTargetLaneRow) panelTargetLaneRow.classList.toggle('is-hidden', !showSwimmerTarget);
    if (panelTargetRecordRow) panelTargetRecordRow.classList.toggle('is-hidden', !showRecordTarget);

    if (showSwimmerTarget && panelTargetLane) {
      const prev = panelTargetLane.value;
      panelTargetLane.innerHTML = '';
      const autoOption = document.createElement('option');
      autoOption.value = 'auto';
      autoOption.textContent = 'Auto (Ahead Swimmer)';
      panelTargetLane.appendChild(autoOption);
      for (let laneId = 1; laneId <= (laneCountGlobal || 8); laneId += 1) {
        const option = document.createElement('option');
        option.value = `lane:${laneId}`;
        option.textContent = `Lane ${laneId}`;
        panelTargetLane.appendChild(option);
      }
      for (let rankValue = 1; rankValue <= (laneCountGlobal || 8); rankValue += 1) {
        const option = document.createElement('option');
        option.value = `rank:${rankValue}`;
        option.textContent = `Rank ${rankValue}`;
        panelTargetLane.appendChild(option);
      }
      const nextValue = buildCompareTargetSelectValue(target);
      panelTargetLane.value = nextValue || prev || 'auto';
    }

    if (showRecordTarget && panelTargetRecord) {
      panelTargetRecord.value = normalizeCompareRecordType(target?.compareRecordType || 'world');
    }
  }

  function attachPanelBindings(athleteMeta) {
    const simpleBindings = [
      [panelVisible, (el, target, v) => { target.visible = v; }],
      [panelFollow, (el, target, v) => {
        target.follow = v;
        const repType = ensureElementRepStyleState(target);
        if (usesFollowDrivenProjection(el.typeId, repType)) {
          switchRepModeVariant(target, repType, v);
        }
        if (!usesGlobalCornerPlacement(el.typeId) && !v) {
          target.staticPlacement = normalizeStaticPlacement(el.typeId, target.staticPlacement);
          if (target.repType === 'text' && Number(target.repProps?.fontSize) === DEFAULT_TEXT_REP_FONT_SIZE) {
            target.repProps.fontSize = getSuggestedStaticTextFontSize(el.typeId, getAverageLaneZoneHeightPx());
          }
        }
        el.staticPos.clear();
        updatePanelPlacementControls(el, target);
        renderCompareTargetControls(el);
      }],
      [panelProjection, (el, target, v) => {
        switchRepModeVariant(target, target.repType, v);
      }],
      [panelSegmentMotion, (el, target, v) => { target.segmentMotion = v; }],
      [panelOffsetX, (el, target, v) => { target.offsetX = Number(v); }],
      [panelOffsetY, (el, target, v) => { target.offsetY = Number(v); }],
      [panelScale, (el, target, v) => { target.scale = Number(v); }],
      [panelRotation, (el, target, v) => { target.rotation = Number(v); }],
      [panelAlpha, (el, target, v) => { target.alpha = Number(v); }],
      [panelColor, (el, target, v) => {
        const nextColor = normalizeColorInputValue(v, '#d3d3d3');
        target.color = nextColor;
        ensureElementRepStyleState(target);
        if (target.repProps && Object.prototype.hasOwnProperty.call(target.repProps, 'fillColor')) {
          target.repProps.fillColor = nextColor;
        }
        if (target.repProps && Object.prototype.hasOwnProperty.call(target.repProps, 'overlayColor')) {
          target.repProps.overlayColor = nextColor;
        }
        renderPanelRepProps(el);
      }]
    ];

    simpleBindings.forEach(([input, setter]) => {
      input?.addEventListener('input', () => {
        if (!activeElementId) return;
        const el = elements.get(activeElementId);
        const target = getElementEditableState(el);
        if (!el || !target) return;
        setter(el, target, input.type === 'checkbox' ? input.checked : input.value);
        captureCurrentRepModeVariant(target);
        updatePanelCoreReadouts(target);
        syncPanelStyleCssFromState(target);
        if (input === panelFollow || input === panelProjection) {
          openEditor(el, athleteMeta);
        }
        renderElementTimeline();
        requestOverlayRefresh();
      });
    });

    panelLaneSelectionMode?.addEventListener('input', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      const prevMode = normalizeElementLaneSelectionMode(target.laneSelectionMode || 'lane');
      const nextMode = normalizeElementLaneSelectionMode(panelLaneSelectionMode.value);
      if (prevMode === nextMode) {
        panelLaneSelectionMode.value = nextMode;
        return;
      }
      target.laneSelectionMode = nextMode;
      target.lanes = remapLaneSelectionValues(target.lanes, prevMode, nextMode, getCurrentFrameAthletes());
      syncPanelStyleCssFromState(target);
      renderPanelLanes(el, athleteMeta);
      requestOverlayRefresh();
    });

    panelStaticSlot?.addEventListener('input', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      target.staticPlacement = normalizeStaticPlacement(el.typeId, panelStaticSlot.value);
      el.staticPos.clear();
      syncPanelStyleCssFromState(target);
      renderElementTimeline();
      requestOverlayRefresh();
    });

    panelStaticAlign?.addEventListener('input', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      target.staticAlign = normalizeStaticTextAlign(panelStaticAlign.value, getDefaultStaticTextAlign(el.typeId));
      el.staticPos.clear();
      syncPanelStyleCssFromState(target);
      renderElementTimeline();
      requestOverlayRefresh();
    });

    panelScreenAnchor?.addEventListener('input', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      target.staticPlacement = normalizeStaticPlacement(el.typeId, panelScreenAnchor.value);
      syncPanelStyleCssFromState(target);
      renderElementTimeline();
      requestOverlayRefresh();
    });

    panelTargetLane?.addEventListener('input', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      const parsedTarget = parseCompareTargetSelectValue(panelTargetLane.value);
      target.compareTargetBinding = parsedTarget.binding;
      target.compareTargetLaneId = parsedTarget.laneId;
      target.compareTargetRank = parsedTarget.rank;
      comparisonHistorySeriesCache = null;
      syncPanelStyleCssFromState(target);
      requestOverlayRefresh();
    });

    panelTargetRecord?.addEventListener('input', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      target.compareRecordType = normalizeCompareRecordType(panelTargetRecord.value);
      comparisonHistorySeriesCache = null;
      syncPanelStyleCssFromState(target);
      requestOverlayRefresh();
    });

    panelStyleApply?.addEventListener('click', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      if (!el) return;
      applyAdvancedStyleDraft(el, athleteMeta);
    });

    panelStyleReset?.addEventListener('click', () => {
      if (!activeElementId) return;
      const el = elements.get(activeElementId);
      const target = getElementEditableState(el);
      if (!el || !target) return;
      syncPanelStyleCssFromState(target);
    });

    btnSaveDefault?.addEventListener('click', () => {
      commitViewModeTimelineDraft('save-default');
      commitPlaybackRateTimelineDraft('save-default');
      const preset = collectCurrentPresetPayload();
      try {
        savePresetPayloadToLocalStorage(preset);
        alert('Layer settings, View Mode, and playback speed timeline have been saved as local defaults for this competition.');
      } catch (err) {
        console.error('Failed to save preset', err);
      }
    });

    btnImportSettings?.addEventListener('click', () => {
      importSettingsInput?.click();
    });

    importSettingsInput?.addEventListener('change', async () => {
      const file = importSettingsInput.files?.[0] || null;
      if (!file) return;
      try {
        const rawText = await file.text();
        let parsed = null;
        try {
          parsed = JSON.parse(rawText);
        } catch (err) {
          alert('The selected file is not valid JSON.');
          return;
        }
        const normalized = normalizePresetPayload(parsed);
        if (!normalized) {
          alert('The selected file is not a supported settings JSON.');
          return;
        }
        const confirmed = window.confirm('Import this settings JSON and replace the current layers and timelines for this competition?');
        if (!confirmed) return;
        const applied = replaceCurrentAuthoringStateFromPreset(normalized, overlay.athletes);
        if (!applied) {
          alert('Failed to import the selected settings JSON.');
          return;
        }
      } catch (err) {
        console.error('Failed to import preset JSON', err);
        alert('Failed to import the selected settings JSON.');
      } finally {
        importSettingsInput.value = '';
      }
    });

    btnClearDefault?.addEventListener('click', () => {
      const storageKey = getPresetStorageKey();
      const hasSavedDefaults = !!localStorage.getItem(storageKey);
      if (!hasSavedDefaults) {
        alert('No saved local settings for this competition.');
        return;
      }
      const confirmed = window.confirm('Reset saved local settings for this competition and reload?');
      if (!confirmed) return;
      try {
        localStorage.removeItem(storageKey);
        window.location.reload();
      } catch (err) {
        console.error('Failed to clear local preset', err);
      }
    });
  }

  function addElement(typeId, repId, athleteMeta) {
    const existing = [...elements.values()].find(el => el.typeId === typeId);
    if (existing) {
      removeElement(existing.id);
    }
    const ids = (athleteMeta || []).map(a => a.id);
    const state = defaultElementState(typeId, repId, ids);
    const container = new PIXI.Container();
    state.container = container;
    overlayLayer.addChild(container);
    elements.set(state.id, state);
    comparisonHistorySeriesCache = null;
    activeElementId = state.id;
    activeIntervalId = getFirstElementInterval(state)?.id || null;
    openEditor(state, athleteMeta);
    renderElementTimeline();
  }

  function getPresetStorageKey() {
    return `vis_preset_${currentCompetition?.id || 'default'}`;
  }

  function serializeElementPreset(el) {
    if (!el) return null;
    const primary = getPrimaryElementState(el) || el;
    captureCurrentRepModeVariant(primary);
    return {
      laneIdSpace: competitionLaneIdSpace,
      typeId: el.typeId,
      repType: primary.repType,
      follow: primary.follow,
      project: primary.project,
      snap: primary.snap,
      staticPlacement: primary.staticPlacement,
      staticAlign: primary.staticAlign || getDefaultStaticTextAlign(el.typeId),
      compareTargetBinding: primary.compareTargetBinding || 'auto',
      compareTargetLaneId: primary.compareTargetLaneId ?? 0,
      compareTargetRank: primary.compareTargetRank ?? 0,
      compareRecordType: primary.compareRecordType || 'world',
      offsetX: primary.offsetX,
      offsetY: primary.offsetY,
      scale: primary.scale,
      rotation: primary.rotation,
      color: primary.color,
      alpha: primary.alpha,
      visible: el.visible,
      segmentMotion: primary.segmentMotion,
      zIndex: el.zIndex,
      repProps: clonePlainData(primary.repProps),
      styleCss: primary.styleCss || '',
      repModeVariants: clonePlainData(primary.repModeVariants || {}),
      laneSelectionMode: normalizeElementLaneSelectionMode(primary.laneSelectionMode || 'lane'),
      lanes: Array.from(primary.lanes || []),
      intervals: getElementIntervalList(el).map((int) => ({
        start: int.start,
        end: int.end,
        settings: serializeSegmentSettings(ensureIntervalSettings(el, int, primary))
      }))
    };
  }

  function collectCurrentElementPresets() {
    return Array.from(elements.values())
      .map(serializeElementPreset)
      .filter(Boolean);
  }

  function serializeViewModeTimelineForPreset() {
    return {
      segments: viewModeTimelineState.segments
        .slice()
        .sort((a, b) => (a.start - b.start) || (a.id - b.id))
        .map((seg) => ({
          start: quantizeTimelineSec(seg.start),
          snapshot: clonePlainData(seg.snapshot)
        }))
        .filter((seg) => seg.snapshot && Number.isFinite(seg.start))
    };
  }

  function serializePlaybackRateTimelineForPreset() {
    return {
      segments: playbackRateTimelineState.segments
        .slice()
        .sort((a, b) => (a.start - b.start) || (a.id - b.id))
        .map((seg) => ({
          start: quantizeTimelineSec(seg.start),
          rate: normalizePlaybackRateValue(seg.rate)
        }))
        .filter((seg) => Number.isFinite(seg.start) && Number.isFinite(seg.rate))
    };
  }

  function collectCurrentPresetPayload() {
    return {
      version: PRESET_SCHEMA_VERSION,
      layers: collectCurrentElementPresets(),
      viewModeTimeline: serializeViewModeTimelineForPreset(),
      playbackRateTimeline: serializePlaybackRateTimelineForPreset()
    };
  }

  function normalizePresetPayload(raw) {
    if (Array.isArray(raw)) {
      return migrateLegacyPresetPayload({
        version: 1,
        layers: raw,
        viewModeTimeline: null,
        playbackRateTimeline: null
      });
    }
    if (!raw || typeof raw !== 'object') return null;
    const layers = Array.isArray(raw.layers)
      ? raw.layers
      : Array.isArray(raw.presetArray)
        ? raw.presetArray
        : [];
    const viewModeTimeline = raw.viewModeTimeline && typeof raw.viewModeTimeline === 'object'
      ? raw.viewModeTimeline
      : null;
    const playbackRateTimeline = raw.playbackRateTimeline && typeof raw.playbackRateTimeline === 'object'
      ? raw.playbackRateTimeline
      : raw.speedTimeline && typeof raw.speedTimeline === 'object'
        ? raw.speedTimeline
        : null;
    return migrateLegacyPresetPayload({
      version: Number(raw.version) || 2,
      layers,
      viewModeTimeline,
      playbackRateTimeline
    });
  }

  function savePresetPayloadToLocalStorage(payload) {
    const key = getPresetStorageKey();
    const normalized = normalizePresetPayload(payload) || {
      version: PRESET_SCHEMA_VERSION,
      layers: [],
      viewModeTimeline: null,
      playbackRateTimeline: null
    };
    localStorage.setItem(key, JSON.stringify(normalized));
  }

  function readPresetPayloadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(getPresetStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const normalized = normalizePresetPayload(parsed);
      if (normalized && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        localStorage.setItem(getPresetStorageKey(), JSON.stringify(normalized));
      }
      return normalized;
    } catch (err) {
        return null;
    }
  }

  function savePresetArrayToLocalStorage(presetArray) {
    savePresetPayloadToLocalStorage({
      version: PRESET_SCHEMA_VERSION,
      layers: Array.isArray(presetArray) ? presetArray : [],
      viewModeTimeline: null,
      playbackRateTimeline: null
    });
  }

  function readPresetArrayFromLocalStorage() {
    return readPresetPayloadFromLocalStorage()?.layers ?? null;
  }

  function mergePresetArrayWithLayer(presetArray, layerPreset) {
    const list = Array.isArray(presetArray) ? presetArray.slice() : [];
    const idx = list.findIndex(item => item?.typeId === layerPreset?.typeId);
    if (idx >= 0) {
      list[idx] = layerPreset;
    } else {
      list.push(layerPreset);
    }
    return list;
  }

  function downloadPresetJsonSnapshot(presetPayload) {
    const normalized = normalizePresetPayload(presetPayload) || {
      version: PRESET_SCHEMA_VERSION,
      layers: [],
      viewModeTimeline: null,
      playbackRateTimeline: null
    };
    const json = JSON.stringify(normalized, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const competitionIdSafe = String(currentCompetition?.id || 'default').replace(/[^a-z0-9_-]+/ig, '_');
    a.href = url;
    a.download = `${competitionIdSafe}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function writePresetArrayToPresetFile(presetPayload) {
    const competitionId = String(currentCompetition?.id || 'default');
    const normalized = normalizePresetPayload(presetPayload) || {
      version: PRESET_SCHEMA_VERSION,
      layers: [],
      viewModeTimeline: null,
      playbackRateTimeline: null
    };
    const json = JSON.stringify(normalized, null, 2);
    if (typeof window.showSaveFilePicker !== 'function') {
      downloadPresetJsonSnapshot(normalized);
      return 'download';
    }

    let handle = presetFileHandleByCompetitionId.get(competitionId) || null;
    try {
      if (!handle) {
        handle = await window.showSaveFilePicker({
          id: `swimvis-preset-${competitionId}`,
          suggestedName: `${competitionId}.json`,
          types: [{
            description: 'SwimVis preset JSON',
            accept: { 'application/json': ['.json'] }
          }]
        });
        if (handle) {
          presetFileHandleByCompetitionId.set(competitionId, handle);
        }
      }
      if (!handle) return 'skipped';
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return 'file';
    } catch (err) {
      if (err?.name === 'AbortError') {
        return 'cancelled';
      }
      presetFileHandleByCompetitionId.delete(competitionId);
      throw err;
    }
  }

  function restoreViewModeTimelineFromPreset(rawTimeline) {
    const rawSegments = Array.isArray(rawTimeline?.segments) ? rawTimeline.segments : [];
    const normalizedSegments = rawSegments
      .map((seg) => ({
        start: quantizeTimelineSec(seg?.start),
        snapshot: seg?.snapshot && typeof seg.snapshot === 'object' ? clonePlainData(seg.snapshot) : null
      }))
      .filter((seg) => seg.snapshot && Number.isFinite(seg.start))
      .sort((a, b) => (a.start - b.start));
    if (!normalizedSegments.length) return false;
    normalizedSegments[0].start = 0;
    viewModeTimelineState.nextId = 1;
    viewModeTimelineState.segments = normalizedSegments.map((seg) => ({
      id: viewModeTimelineState.nextId++,
      start: seg.start,
      end: seg.start,
      snapshot: seg.snapshot
    }));
    clearViewModeTimelineDraft();
    recomputeViewModeTimelineSegments();
    viewModeTimelineState.lastAppliedSegmentId = null;
    const active = findViewModeTimelineSegmentAtTime(getCurrentPlaybackTimeForViewModeTimeline())
      || viewModeTimelineState.segments[0]
      || null;
    viewModeTimelineState.selectedSegmentId = active?.id ?? null;
    if (active?.snapshot) {
      applyViewModeTimelineSnapshot(active.snapshot, {
        fromPlayback: false,
        pauseOnEnter: true,
        force: true,
        skipComparisonExitAnimation: true
      });
      viewModeTimelineState.lastAppliedSegmentId = active.id ?? null;
    }
    return true;
  }

  function restorePlaybackRateTimelineFromPreset(rawTimeline) {
    const rawSegments = Array.isArray(rawTimeline?.segments) ? rawTimeline.segments : [];
    const normalizedSegments = rawSegments
      .map((seg) => ({
        start: quantizeTimelineSec(seg?.start),
        rate: normalizePlaybackRateValue(seg?.rate)
      }))
      .filter((seg) => Number.isFinite(seg.start) && Number.isFinite(seg.rate))
      .sort((a, b) => (a.start - b.start));
    if (!normalizedSegments.length) return false;
    normalizedSegments[0].start = 0;
    playbackRateTimelineState.nextId = 1;
    playbackRateTimelineState.segments = normalizedSegments.map((seg) => ({
      id: playbackRateTimelineState.nextId++,
      start: seg.start,
      end: seg.start,
      rate: seg.rate
    }));
    playbackRateTimelineState.draft = null;
    recomputePlaybackRateTimelineSegments();
    playbackRateTimelineState.lastAppliedSegmentId = null;
    const active = findPlaybackRateTimelineSegmentAtTime(getCurrentPlaybackTimeForViewModeTimeline())
      || playbackRateTimelineState.segments[0]
      || null;
    playbackRateTimelineState.selectedSegmentId = active?.id ?? null;
    if (active) {
      applyPlaybackRateTimelineSegmentAtTime(getCurrentPlaybackTimeForViewModeTimeline(), { force: true });
      playbackRateTimelineState.lastAppliedSegmentId = active.id ?? null;
    }
    return true;
  }

  function applyPresetPayload(rawPresetPayload, athleteMeta) {
    const payload = normalizePresetPayload(rawPresetPayload);
    if (!payload) return false;
    if (Array.isArray(payload.layers)) {
      payload.layers.forEach((p) => addElementFromPreset(p, athleteMeta));
    }
    restoreViewModeTimelineFromPreset(payload.viewModeTimeline);
    restorePlaybackRateTimelineFromPreset(payload.playbackRateTimeline);
    uiState.selectedLayerTypeId = null;
    closeLayerSettingsToModePanel();
    requestOverlayRefresh();
    renderElementTimeline();
    return true;
  }

  function replaceCurrentAuthoringStateFromPreset(rawPresetPayload, athleteMeta) {
    const payload = normalizePresetPayload(rawPresetPayload);
    if (!payload) return false;
    const existingIds = Array.from(elements.keys());
    existingIds.forEach((id) => removeElement(id));
    resetViewModeStateToDefaultsAndClearTimeline();
    resetPlaybackRateTimelineToDefaults();
    const applied = applyPresetPayload(payload, athleteMeta);
    if (!applied) return false;
    if (![...elements.values()].some((entry) => entry?.typeId === 'elapsed')) {
      ensureElapsedLayer();
    }
    resetTemporalMetricCaches();
    requestOverlayRefresh();
    renderElementTimeline();
    return true;
  }

  function addElementFromPreset(preset, athleteMeta) {
    const ids = (athleteMeta || []).map(a => a.id);
    const normalizedPresetRepType = normalizeMetricRepType(preset.typeId, preset.repType);
    const base = defaultElementState(preset.typeId, normalizedPresetRepType, ids);
    const presetLaneIdSpace = String(preset?.laneIdSpace || '');
    let rawIntervals = Array.isArray(preset.intervals) && preset.intervals.length
      ? preset.intervals
      : base.intervals;
    if (
      usesInsightLayerTimeline(preset.typeId || base.typeId)
      && rawIntervals.length === 1
      && Number(rawIntervals[0]?.start ?? 0) <= 1e-3
      && Number(rawIntervals[0]?.end ?? 0) >= (videoDuration || 20) - 1e-3
    ) {
      rawIntervals = buildInsightIntervalsForType(preset.typeId || base.typeId, videoDuration || 20);
    }
    const state = {
      ...base,
      typeId: preset.typeId || base.typeId,
      repType: normalizeMetricRepType(preset.typeId || base.typeId, preset.repType || base.repType),
      follow: preset.follow ?? base.follow,
      project: preset.project ?? base.project,
      snap: preset.snap ?? base.snap,
      offsetX: normalizeCompareLineOffsetX(
        preset.typeId || base.typeId,
        normalizeMetricRepType(preset.typeId || base.typeId, preset.repType || base.repType),
        preset.offsetX ?? base.offsetX
      ),
      offsetY: preset.offsetY ?? base.offsetY,
      scale: preset.scale ?? base.scale,
      rotation: preset.rotation ?? base.rotation,
      color: preset.color ?? base.color,
      alpha: preset.alpha ?? base.alpha,
      visible: preset.visible ?? base.visible,
      segmentMotion: preset.segmentMotion ?? base.segmentMotion,
      staticPlacement: normalizeStaticPlacement(preset.typeId || base.typeId, preset.staticPlacement ?? base.staticPlacement),
      staticAlign: normalizeStaticTextAlign(preset.staticAlign ?? base.staticAlign, getDefaultStaticTextAlign(preset.typeId || base.typeId)),
      laneSelectionMode: normalizeElementLaneSelectionMode(preset.laneSelectionMode ?? base.laneSelectionMode ?? 'lane'),
      compareTargetBinding: resolveCompareTargetBindingConfig(
        preset.compareTargetBinding ?? base.compareTargetBinding ?? 'auto',
        preset.compareTargetLaneId ?? base.compareTargetLaneId ?? 0,
        preset.compareTargetRank ?? base.compareTargetRank ?? 0
      ),
      compareTargetLaneId: normalizeCompareTargetLaneId(preset.compareTargetLaneId ?? base.compareTargetLaneId ?? 0),
      compareTargetRank: normalizeCompareTargetRank(preset.compareTargetRank ?? base.compareTargetRank ?? 0),
      compareRecordType: normalizeCompareRecordType(preset.compareRecordType ?? base.compareRecordType ?? 'world'),
      zIndex: preset.zIndex ?? base.zIndex,
      repProps: ensureRepProps(
        normalizeMetricRepType(preset.typeId || base.typeId, preset.repType || base.repType),
        preset.repProps || base.repProps,
        preset.color ?? base.color
      ),
      styleCss: String(preset.styleCss || ''),
      styleOverrides: parseCssLikeStyleText(String(preset.styleCss || '')),
      repModeVariants: clonePlainData(preset.repModeVariants ?? base.repModeVariants),
      lanes: new Set(
        normalizeElementLaneSelection(preset.lanes, preset.laneSelectionMode ?? base.laneSelectionMode ?? 'lane', presetLaneIdSpace).length
          ? normalizeElementLaneSelection(preset.lanes, preset.laneSelectionMode ?? base.laneSelectionMode ?? 'lane', presetLaneIdSpace)
          : Array.from(base.lanes)
      ),
      intervals: rawIntervals.map(int => ({
        id: int.id || `int_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        start: int.start ?? 0,
        end: int.end ?? (videoDuration || 20)
      }))
    };
    state.intervals.forEach((int, idx) => {
      const sourceSettings = rawIntervals[idx]?.settings;
      int.settings = createSegmentSettingsFromSource(
        state,
        sourceSettings && typeof sourceSettings === 'object'
          ? {
            ...state,
            ...sourceSettings,
            laneSelectionMode: normalizeElementLaneSelectionMode(sourceSettings.laneSelectionMode ?? state.laneSelectionMode ?? 'lane'),
            lanes: Array.isArray(sourceSettings.lanes) || sourceSettings.lanes instanceof Set
              ? normalizeElementLaneSelection(
                sourceSettings.lanes,
                sourceSettings.laneSelectionMode ?? state.laneSelectionMode ?? 'lane',
                sourceSettings.laneIdSpace ?? presetLaneIdSpace
              )
              : normalizeElementLaneSelection(Array.from(state.lanes || []), state.laneSelectionMode || 'lane', 'canonical'),
            repProps: sourceSettings.repProps ?? state.repProps,
            styleCss: sourceSettings.styleCss ?? state.styleCss,
            repModeVariants: sourceSettings.repModeVariants ?? state.repModeVariants
          }
          : state
      );
    });
    const container = new PIXI.Container();
    state.container = container;
    overlayLayer.addChild(container);
    elements.set(state.id, state);
    comparisonHistorySeriesCache = null;
    activeElementId = state.id;
    activeIntervalId = getFirstElementInterval(state)?.id || null;
    openEditor(state, athleteMeta);
    renderElementTimeline();
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clipPolygonByHalfPlane(points, signedDistanceFn) {
    if (!Array.isArray(points) || points.length < 3) return [];
    const out = [];
    for (let i = 0; i < points.length; i += 1) {
      const curr = points[i];
      const prev = points[(i + points.length - 1) % points.length];
      const dCurr = signedDistanceFn(curr);
      const dPrev = signedDistanceFn(prev);
      const currInside = dCurr >= 0;
      const prevInside = dPrev >= 0;

      if (currInside !== prevInside) {
        const denom = dPrev - dCurr;
        if (Math.abs(denom) > 1e-6) {
          const tt = dPrev / denom;
          out.push({
            x: prev.x + (curr.x - prev.x) * tt,
            y: prev.y + (curr.y - prev.y) * tt
          });
        }
      }
      if (currInside) out.push(curr);
    }
    return out;
  }

  function getViewportDiagonalWipePolygon(vw, vh, frontX, frontY) {
    if (!(vw > 0 && vh > 0)) return [];
    const invSqrt2 = Math.SQRT1_2;
    const threshold = (frontX + frontY) * invSqrt2;
    const baseRect = [
      { x: 0, y: 0 },
      { x: vw, y: 0 },
      { x: vw, y: vh },
      { x: 0, y: vh }
    ];
    return clipPolygonByHalfPlane(baseRect, (p) => ((p.x + p.y) * invSqrt2) - threshold);
  }

  function clamp01(v) {
    if (!Number.isFinite(v)) return 0;
    if (v <= 0) return 0;
    if (v >= 1) return 1;
    return v;
  }

  function resolveTrackingTransitionType() {
    const raw = uiState.modePanels?.tracking?.transitionType;
    if (raw === 'hardcut' || raw === 'zoomlens' || raw === 'dissolve' || raw === 'wipe') {
      return raw;
    }
    return 'zoomlens';
  }

  function normalizeTrackTransitionDurationSec(raw) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0.75;
    return Math.max(0.25, Math.min(1.5, Math.round(num * 20) / 20));
  }

  function formatTrackTransitionDurationLabel(raw) {
    const sec = normalizeTrackTransitionDurationSec(raw);
    return formatDecimalReadout(sec, 's');
  }

  function resolveTrackingTransitionDurationMs(type = resolveTrackingTransitionType()) {
    if (type === 'hardcut') return 0;
    const sec = normalizeTrackTransitionDurationSec(uiState.modePanels?.tracking?.transitionDurationSec);
    return Math.round(sec * 1000);
  }

  function resolveTrackingBehaviorMode() {
    return uiState.modePanels?.tracking?.trackingBehavior === 'pan' ? 'pan' : 'follow';
  }

  function resolveTrackZoomLevel() {
    const raw = Number(uiState.modePanels?.tracking?.zoomLevel);
    if (!Number.isFinite(raw)) return baseTrackShot.zoom;
    return Math.max(1, Math.min(3, raw));
  }

  function getBaseTrackShotForCurrentBehavior() {
    const preset = resolveTrackingBehaviorMode() === 'pan' ? baseTrackPanShot : baseTrackShot;
    return {
      ...preset,
      zoom: resolveTrackZoomLevel(),
      offX: 0.0,
      offY: 0.0
    };
  }

  function shotStatesApproximatelyEqual(a, b, eps = 1e-4) {
    if (!a || !b) return false;
    const keys = ['zoom', 'offX', 'offY', 'ltx', 'lty', 'rtx', 'rty', 'rbx', 'rby', 'lbx', 'lby'];
    for (const k of keys) {
      const av = Number(a[k]);
      const bv = Number(b[k]);
      if (!Number.isFinite(av) || !Number.isFinite(bv)) return false;
      if (Math.abs(av - bv) > eps) return false;
    }
    return true;
  }

  function cancelCameraAnimation() {
    camAnimating = false;
    camFrom = null;
    camTo = null;
  }

  function applyShotHardcut(targetState) {
    cancelCameraAnimation();
    applyShotStateToSprite(targetState);
  }

  function clearCameraVisualTransition() {
    if (camVisualTransition?.snapshotSprite) {
      const snapshotSprite = camVisualTransition.snapshotSprite;
      const snapshotTexture = snapshotSprite.texture;
      snapshotSprite.mask = null;
      if (snapshotSprite.parent) snapshotSprite.parent.removeChild(snapshotSprite);
      snapshotSprite.destroy();
      if (snapshotTexture?.destroy) {
        try {
          snapshotTexture.destroy(true);
        } catch (err) {
          console.warn('Failed to destroy camera transition snapshot texture', err);
        }
      }
    }

    cameraTransitionOverlay.clear();
    cameraTransitionBrandBand.clear();
    cameraTransitionWipeMask.clear();
    cameraTransitionWipeEdge.clear();
    cameraTransitionLogoPlate.clear();
    cameraTransitionLogoSprite.visible = false;
    cameraTransitionLogoSprite.renderable = false;
    cameraTransitionLogoSprite.alpha = 0;
    cameraTransitionLogoSprite.rotation = 0;
    cameraTransitionLogoSprite.mask = null;
    if (cameraTransitionWipeMask.parent) cameraTransitionWipeMask.parent.removeChild(cameraTransitionWipeMask);
    if (cameraTransitionOverlay.parent) cameraTransitionOverlay.parent.removeChild(cameraTransitionOverlay);
    if (cameraTransitionBrandBand.parent) cameraTransitionBrandBand.parent.removeChild(cameraTransitionBrandBand);
    if (cameraTransitionWipeEdge.parent) cameraTransitionWipeEdge.parent.removeChild(cameraTransitionWipeEdge);
    if (cameraTransitionLogoPlate.parent) cameraTransitionLogoPlate.parent.removeChild(cameraTransitionLogoPlate);
    if (cameraTransitionLogoSprite.parent) cameraTransitionLogoSprite.parent.removeChild(cameraTransitionLogoSprite);
    cameraTransitionLayer.visible = false;
    cameraTransitionLayer.renderable = false;
    camVisualTransition = null;
  }

  function captureCameraTransitionSnapshot() {
    if (!videoReady) return null;
    try {
      const wasVisible = cameraTransitionLayer.visible;
      const wasRenderable = cameraTransitionLayer.renderable;
      cameraTransitionLayer.visible = false;
      cameraTransitionLayer.renderable = false;
      const tex = app.renderer.generateTexture(app.stage);
      cameraTransitionLayer.visible = wasVisible;
      cameraTransitionLayer.renderable = wasRenderable;
      return tex;
    } catch (err) {
      console.warn('Camera transition snapshot failed, falling back', err);
      return null;
    }
  }

  function startCameraVisualTransition(kind) {
    clearCameraVisualTransition();

    if (kind !== 'dissolve' && kind !== 'wipe') return false;
    const tex = captureCameraTransitionSnapshot();
    if (!tex) return false;

    const snapshotSprite = new PIXI.Sprite(tex);
    snapshotSprite.position.set(0, 0);
    snapshotSprite.width = getViewportWidth();
    snapshotSprite.height = getViewportHeight();
    snapshotSprite.alpha = 1;

    cameraTransitionLayer.addChild(snapshotSprite);
    cameraTransitionLayer.visible = true;
    cameraTransitionLayer.renderable = true;
    cameraTransitionLayer.addChild(cameraTransitionOverlay);
    cameraTransitionLayer.addChild(cameraTransitionBrandBand);
    cameraTransitionLayer.addChild(cameraTransitionWipeEdge);
    cameraTransitionLayer.addChild(cameraTransitionLogoPlate);
    cameraTransitionLayer.addChild(cameraTransitionLogoSprite);
    cameraTransitionOverlay.clear();
    cameraTransitionBrandBand.clear();
    cameraTransitionWipeEdge.clear();
    cameraTransitionLogoPlate.clear();
    cameraTransitionLogoSprite.visible = false;
    cameraTransitionLogoSprite.renderable = false;
    cameraTransitionLogoSprite.alpha = 0;
    cameraTransitionLogoSprite.rotation = 0;

    if (kind === 'wipe') {
      snapshotSprite.mask = cameraTransitionWipeMask;
      cameraTransitionLayer.addChild(cameraTransitionWipeMask);
    }

    camVisualTransition = {
      kind,
      startMs: performance.now(),
      durationMs: resolveTrackingTransitionDurationMs(kind),
      snapshotSprite
    };

    return true;
  }

  function animateShotTo(targetState, durationMs = camAnimDurationDefault) {
    if (!videoSprite) {
      applyShotStateToSprite(targetState);
      return;
    }
    camAnimDurationActive = Math.max(1, Number.isFinite(durationMs) ? durationMs : camAnimDurationDefault);
    camFrom = { ...currentShotState };
    camTo = { ...targetState };
    camAnimStart = performance.now();
    camAnimating = true;
  }

  function updateCameraAnimation(now) {
    if (!camAnimating || !camFrom || !camTo) return;

    const t = Math.min((now - camAnimStart) / Math.max(1, camAnimDurationActive), 1);
    const e = easeOutCubic(t);

    const inter = {};
    Object.keys(camFrom).forEach(k => {
      inter[k] = camFrom[k] + (camTo[k] - camFrom[k]) * e;
    });

    applyShotStateToSprite(inter);
    currentShotState = { ...inter };

    if (t >= 1) {
      camAnimating = false;
      applyShotStateToSprite(camTo);
      currentShotState = { ...camTo };
      if (typeof camTo.offX === 'number') {
        cameraFollowOffX = camTo.offX;
      }
    }
  }

  function updateCameraVisualTransition(now) {
    if (!camVisualTransition?.snapshotSprite) return;
    const fx = camVisualTransition;
    const sprite = fx.snapshotSprite;
    const t = clamp01((now - fx.startMs) / fx.durationMs);
    const e = easeOutCubic(t);
    const vw = getViewportWidth();
    const vh = getViewportHeight();

    cameraTransitionOverlay.clear();
    cameraTransitionBrandBand.clear();
    cameraTransitionWipeEdge.clear();
    cameraTransitionLogoPlate.clear();
    cameraTransitionWipeMask.clear();
    cameraTransitionLogoSprite.visible = false;
    cameraTransitionLogoSprite.renderable = false;
    cameraTransitionLogoSprite.alpha = 0;
    cameraTransitionLogoSprite.rotation = 0;
    cameraTransitionBrandBand.position.set(0, 0);
    cameraTransitionBrandBand.rotation = 0;
    cameraTransitionWipeEdge.position.set(0, 0);
    cameraTransitionWipeEdge.rotation = 0;
    cameraTransitionLogoPlate.position.set(0, 0);
    cameraTransitionLogoPlate.rotation = 0;

    if (fx.kind === 'dissolve') {
      const mix = t;
      sprite.alpha = 1 - mix;

    } else if (fx.kind === 'wipe') {
      const introEnd = 0.40;
      const coverEnd = 0.63;
      const outroStart = 0.56;
      const outroT = clamp01((t - outroStart) / (1 - outroStart));
      const introT = clamp01(t / introEnd);
      const coverIn = clamp01((t - 0.20) / 0.18);
      const coverOut = clamp01((t - coverEnd) / (1 - coverEnd));
      const coverAlpha = t < coverEnd ? easeInOutCubic(coverIn) : 1 - easeInOutCubic(coverOut);
      if (t < 0.44) {
        sprite.alpha = 1;
      } else if (t < 0.53) {
        sprite.alpha = 1 - easeInOutCubic((t - 0.44) / 0.09);
      } else {
        sprite.alpha = 0;
      }
      cameraTransitionWipeMask.beginFill(0xffffff, 1);
      cameraTransitionWipeMask.drawRect(0, 0, Math.max(1, vw), Math.max(1, vh));
      cameraTransitionWipeMask.endFill();

      if (vw > 0 && vh > 0) {
        const diag = Math.hypot(vw, vh);
        const stripLen = diag * 2.8;
        const stripCount = 10;
        const stripPitch = Math.max(34, Math.min(60, vh * 0.085));
        const mainStripW = stripPitch * 0.70;
        const subStripW = stripPitch * 0.34;
        const offscreen = diag + stripLen * 0.55;
        const stripCenterYBase = -((stripCount - 1) * stripPitch) / 2;
        const rotation = -Math.PI / 4;
        const mainTravelOut = Math.max(offscreen, diag * 1.15);
        if (coverAlpha > 0.001) {
          cameraTransitionOverlay.beginFill(0xffffff, coverAlpha);
          cameraTransitionOverlay.drawRect(0, 0, vw, vh);
          cameraTransitionOverlay.endFill();
        }
        cameraTransitionBrandBand.position.set(vw / 2, vh / 2);
        cameraTransitionBrandBand.rotation = rotation;
        for (let i = 0; i < stripCount; i += 1) {
          const y = stripCenterYBase + (i * stripPitch);
          const dir = (i % 2 === 0) ? -1 : 1;
          const inDelay = i * 0.035;
          const outDelay = (stripCount - 1 - i) * 0.028;
          const inT = easeOutCubic(clamp01((t - inDelay) / 0.30));
          const outTStrip = easeInOutCubic(clamp01((t - outroStart - outDelay) / 0.26));
          let xCenter = lerp(dir * offscreen, 0, inT);
          if (t >= outroStart) {
            xCenter = lerp(0, -dir * mainTravelOut, outTStrip);
          }
          cameraTransitionBrandBand.beginFill(0xffffff, 0.98);
          cameraTransitionBrandBand.drawRect(xCenter - stripLen / 2, y - mainStripW / 2, stripLen, mainStripW);
          cameraTransitionBrandBand.endFill();
        }
        for (let i = 0; i < stripCount; i += 1) {
          const y = stripCenterYBase + (i * stripPitch) + (stripPitch * 0.34);
          const dir = (i % 2 === 0) ? 1 : -1;
          const inDelay = 0.05 + i * 0.022;
          const outDelay = i * 0.020;
          const inT = easeOutCubic(clamp01((t - inDelay) / 0.26));
          const outTStrip = easeInOutCubic(clamp01((t - outroStart - outDelay) / 0.22));
          let xCenter = lerp(dir * (offscreen * 1.06), 0, inT);
          if (t >= outroStart) {
            xCenter = lerp(0, -dir * (mainTravelOut * 1.02), outTStrip);
          }
          cameraTransitionBrandBand.beginFill(0xf4f6fb, 0.95);
          cameraTransitionBrandBand.drawRect(xCenter - stripLen / 2, y - subStripW / 2, stripLen, subStripW);
          cameraTransitionBrandBand.endFill();
        }
        cameraTransitionWipeEdge.position.set(vw / 2, vh / 2);
        cameraTransitionWipeEdge.rotation = rotation;
        for (let i = 0; i < stripCount; i += 1) {
          const y = stripCenterYBase + (i * stripPitch) - (stripPitch * 0.36);
          const dir = (i % 2 === 0) ? -1 : 1;
          const inDelay = 0.03 + i * 0.026;
          const outDelay = (stripCount - 1 - i) * 0.018;
          const inT = easeOutCubic(clamp01((t - inDelay) / 0.24));
          const outTStrip = easeInOutCubic(clamp01((t - outroStart - outDelay) / 0.24));
          let xCenter = lerp(dir * (offscreen * 1.12), 0, inT);
          if (t >= outroStart) {
            xCenter = lerp(0, -dir * (mainTravelOut * 1.08), outTStrip);
          }
          const accentLen = stripLen * 0.86;
          cameraTransitionWipeEdge.beginFill(0xd4af37, 0.82);
          cameraTransitionWipeEdge.drawRect(xCenter - accentLen / 2, y - 2.2, accentLen, 4.4);
          cameraTransitionWipeEdge.endFill();
          cameraTransitionWipeEdge.beginFill(0x111827, 0.25);
          cameraTransitionWipeEdge.drawRect(xCenter - accentLen / 2, y + 4.2, accentLen, 2.6);
          cameraTransitionWipeEdge.endFill();
        }
        const logoPulse = 0.94 + 0.08 * Math.pow(Math.sin(Math.PI * clamp01((t - 0.12) / 0.76)), 1.15);
        const tex = cameraTransitionLogoSprite.texture;
        const texValid = !!tex?.baseTexture?.valid;
        const texW = texValid ? (tex?.orig?.width || tex?.width || 167) : 167;
        const texH = texValid ? (tex?.orig?.height || tex?.height || 73) : 73;
        const logoTargetWMax = vw * 0.92;
        const logoTargetHMax = vh * 0.92;
        const logoScaleBase = Math.min(
          logoTargetWMax / Math.max(1, texW),
          logoTargetHMax / Math.max(1, texH)
        );
        const logoScale = logoScaleBase * logoPulse;
        const logoTargetW = texW * logoScale;
        const logoTargetH = texH * logoScale;
        const logoInEnd = 0.34;
        const logoOutStart = 0.64;
        const logoTravelX = Math.max(vw * 0.32, logoTargetW * 0.60);
        const logoTravelY = Math.max(vh * 0.32, logoTargetH * 0.60);
        let logoX = vw * 0.5;
        let logoY = vh * 0.5;
        if (t < logoInEnd) {
          const u = easeOutCubic(t / logoInEnd);
          logoX = lerp(-logoTravelX, vw * 0.5, u);
          logoY = lerp(-logoTravelY, vh * 0.5, u);
        } else if (t > logoOutStart) {
          const u = easeInOutCubic((t - logoOutStart) / (1 - logoOutStart));
          logoX = lerp(vw * 0.5, vw + logoTravelX, u);
          logoY = lerp(vh * 0.5, vh + logoTravelY, u);
        }
        cameraTransitionLogoPlate.position.set(0, 0);
        cameraTransitionLogoPlate.rotation = 0;
        const shadowPadX = Math.max(16, logoTargetW * 0.03);
        const shadowPadY = Math.max(10, logoTargetH * 0.08);
        const shadowAlpha = Math.max(0, coverAlpha * 0.26);
        if (shadowAlpha > 0.001) {
          cameraTransitionLogoPlate.beginFill(0x000000, shadowAlpha);
          cameraTransitionLogoPlate.drawRoundedRect(
            logoX - (logoTargetW / 2) - shadowPadX,
            logoY - (logoTargetH / 2) - shadowPadY,
            logoTargetW + shadowPadX * 2,
            logoTargetH + shadowPadY * 2,
            18
          );
          cameraTransitionLogoPlate.endFill();
        }

        if (texValid) {
          const logoAlphaIn = easeOutCubic(clamp01((t - 0.14) / 0.16));
          const logoAlphaOut = 1 - easeInOutCubic(clamp01((t - 0.70) / 0.18));
          const logoAlpha = Math.min(1, logoAlphaIn, logoAlphaOut) * (0.92 + 0.08 * Math.sin(Math.PI * t));
          cameraTransitionLogoSprite.visible = true;
          cameraTransitionLogoSprite.renderable = true;
          cameraTransitionLogoSprite.position.set(logoX, logoY);
          cameraTransitionLogoSprite.scale.set(logoScale);
          cameraTransitionLogoSprite.rotation = -0.05 + 0.10 * clamp01((t - 0.5) * 1.4);
          cameraTransitionLogoSprite.alpha = Math.max(0, logoAlpha);
        }
      }
    }

    if (t >= 1) {
      clearCameraVisualTransition();
    }
  }

  function runCameraShotTransition(targetState, transitionType) {
    const type = transitionType || resolveTrackingTransitionType();

    if (type === 'hardcut') {
      clearCameraVisualTransition();
      applyShotHardcut(targetState);
      return;
    }

    if (type === 'zoomlens') {
      clearCameraVisualTransition();
      animateShotTo(targetState, resolveTrackingTransitionDurationMs('zoomlens'));
      return;
    }

    if (type === 'dissolve' || type === 'wipe') {
      startCameraVisualTransition(type);
      applyShotHardcut(targetState);
      return;
    }

    clearCameraVisualTransition();
    animateShotTo(targetState, resolveTrackingTransitionDurationMs(type));
  }

  function updateCameraButtons(id) {
    const wideActive = id === 'wide';
    btnCamWide.classList.toggle('active', wideActive);
    btnCamTrack.classList.toggle('active', !wideActive);
  }
  function updateExitButtonVisibility() {
    if (btnExitTrack) {
      const comparisonActive = comparisonIsConfirmed();
      const overviewHighlightsActive = uiState.viewMode === 'overview' && overviewHighlightedLaneIds.size > 0;
      btnExitTrack.style.display = (currentShotId === 'track' || comparisonActive || overviewHighlightsActive) ? 'flex' : 'none';
      btnExitTrack.title = comparisonActive
        ? 'Reset comparison selection'
        : overviewHighlightsActive
          ? 'Clear overview highlights'
          : 'Exit track mode';
    }
  }

  function switchCameraShot(cameraId, targetShot, opts = {}) {
    if (!targetShot) return;
    const prevShotId = currentShotId;

    if (Object.prototype.hasOwnProperty.call(opts, 'focusedLaneId')) {
      focusedLaneId = opts.focusedLaneId;
    } else if (cameraId === 'wide' && opts.resetLaneFocus !== false) {
      focusedLaneId = null;
    }

    currentShotId = cameraId;
    updateCameraButtons(cameraId);
    updateExitButtonVisibility();

    if (cameraId === 'track' && typeof targetShot.offX === 'number') {
      cameraFollowOffX = targetShot.offX || 0;
    }

    let transitionTypeToUse = opts.transitionType;
    if (!transitionTypeToUse) {
      const isWideTrackSwitch =
        (prevShotId === 'wide' && cameraId === 'track')
        || (prevShotId === 'track' && cameraId === 'wide');
      transitionTypeToUse = isWideTrackSwitch ? resolveTrackingTransitionType() : 'hardcut';
    }

    runCameraShotTransition(targetShot, transitionTypeToUse);
    ensurePausedCameraTransitionTick();

    if (opts.refreshAwards !== false) {
      updateAwardsOverlays();
    }
  }

  function computeTrackTargetShotAtTime(timeSec, laneId = focusedLaneId) {
    const targetShot = computeTrackShotAtTime(timeSec);
    const offY = laneId != null ? (laneOffsetY[laneId] ?? 0) : 0;
    return {
      ...targetShot,
      offY
    };
  }

  function refreshTrackCameraFromTrackingControls() {
    if (currentShotId !== 'track') return;
    const t = videoEl?.currentTime || 0;
    const targetShot = computeTrackTargetShotAtTime(t, focusedLaneId);
    switchCameraShot('track', targetShot, {
      focusedLaneId,
      transitionType: 'hardcut'
    });
    requestOverlayRefresh();
  }
  function switchToLane(laneId) {
    const nextLaneId = Number(laneId);
    if (!Number.isFinite(nextLaneId)) return;
    if (currentShotId === 'track' && (focusedLaneId ?? null) === nextLaneId) {
      return;
    }
    const t = videoEl?.currentTime || 0;
    const targetShot = computeTrackTargetShotAtTime(t, nextLaneId);
    const isLaneToLaneSwitch = currentShotId === 'track';
    switchCameraShot('track', targetShot, isLaneToLaneSwitch
      ? { focusedLaneId: nextLaneId, transitionType: 'zoomlens' }
      : { focusedLaneId: nextLaneId });
    noteViewModeStateChanged(`tracking:lane-${nextLaneId}`);
  }
  function exitTrackMode() {
    switchCameraShot('wide', defaultShot, { focusedLaneId: null });
    noteViewModeStateChanged('tracking:exit-track');
  }
  btnExitTrack?.addEventListener('click', () => {
    if (comparisonIsConfirmed()) {
      resetComparisonConfirmedToSelection();
      return;
    }
    if (uiState.viewMode === 'overview' && overviewHighlightedLaneIds.size > 0) {
      resetOverviewLaneHighlights();
      return;
    }
    exitTrackMode();
  });
  function getSmoothedPos(id, rawX, rawY) {
    if (!smoothingEnabled) {
      const v = { x: rawX, y: rawY };
      smoothedPosById.set(id, v);
      return v;
    }
    const prev = smoothedPosById.get(id);
    if (!prev) {
      const v = { x: rawX, y: rawY };
      smoothedPosById.set(id, v);
      return v;
    }
    const x = prev.x + smoothAlpha * (rawX - prev.x);
    const y = prev.y + smoothAlpha * (rawY - prev.y);
    const v = { x, y };
    smoothedPosById.set(id, v);
    return v;
  }

  function resetSmoothing() {
    smoothedPosById.clear();
  }
  function computeTrackShotAtTime(timeSec) {
    const baseTrackShotState = getBaseTrackShotForCurrentBehavior();
    const frame = overlay.getFrameByTime(timeSec);
    if (!frame) return { ...baseTrackShotState, offX: 0.0 };

    const arr = frame.athletes || frame.lanes || [];

    let rawXRef = null;
    let rawYRef = null;
    for (const a of arr) {
      if (a.id === trackReferenceLaneId) {
        const rawY = (typeof a.y === 'number' ? a.y
          : typeof a.cy === 'number' ? a.cy
            : 0);
        const yBaseline = baselineYById.get(a.id) ?? rawY;
        const xRaw = a.x ?? a.cx ?? 0;
        if (!isFiniteNumber(xRaw) || !isFiniteNumber(yBaseline)) break;
        rawXRef = xRaw;
        rawYRef = yBaseline;
        break;
      }
    }
    if (rawXRef == null) {
      return { ...baseTrackShotState, offX: 0.0 };
    }

    const posRef = getSmoothedPos(trackReferenceLaneId, rawXRef, rawYRef);

    const vw = getViewportWidth();
    const centerX = vw / 2;
    const maxPanX = vw * 0.5;

    const shotNoPan = { ...baseTrackShotState, offX: 0.0 };
    const pNoPan = projectPointWithShot(posRef.x, posRef.y, shotNoPan);

    const deltaX = centerX - pNoPan.cx;
    let desiredOffX = 0;
    if (maxPanX > 1e-3) {
      desiredOffX = deltaX / maxPanX;
      if (desiredOffX > 1.2) desiredOffX = 1.2;
      if (desiredOffX < -1.2) desiredOffX = -1.2;
    }

    return { ...baseTrackShotState, offX: desiredOffX };
  }
  function updateTrackCameraFollow(lane4XPix, lane4YPix) {
    if (!videoReady) return;
    const baseTrackShotState = getBaseTrackShotForCurrentBehavior();

    const vw = getViewportWidth();
    const centerX = vw / 2;
    const maxPanX = vw * 0.5;
    const currentOffY = focusedLaneId != null ? (laneOffsetY[focusedLaneId] ?? 0) : 0;

    const shotNoPan = { ...baseTrackShotState, offX: 0.0, offY: currentOffY };
    const pNoPan = projectPointWithShot(lane4XPix, lane4YPix, shotNoPan);
    const deltaX = centerX - pNoPan.cx;

    let desiredOffX = 0;
    if (maxPanX > 1e-3) {
      desiredOffX = deltaX / maxPanX;
      if (desiredOffX > 1.2) desiredOffX = 1.2;
      if (desiredOffX < -1.2) desiredOffX = -1.2;
    }

    if (smoothingEnabled) {
      cameraFollowOffX =
        cameraFollowOffX + cameraFollowAlpha * (desiredOffX - cameraFollowOffX);
    } else {
      cameraFollowOffX = desiredOffX;
    }

    const shotWithFollow = {
      ...baseTrackShotState,
      offX: cameraFollowOffX,
      offY: currentOffY // preserve lane-specific Y offset
    };
    applyShotStateToSprite(shotWithFollow);
  }

  function renderNoOverlayFrameState(t, now, seg, leaderFromInsight, chaseFromInsight) {
    const displayedElapsedTimeSec = mapVideoTimeToElapsedTimeSec(t);
    currentOverlayRenderContext = null;
    currentInsightLayerState.segment = seg || null;
    currentInsightLayerState.leaderId = leaderFromInsight ?? null;
    currentInsightLayerState.chaseId = chaseFromInsight ?? null;
    currentInsightLayerState.results = seg?.results || null;
    hidePerFrameAthleteGraphics();
    const overviewHighlightStyle = resolveOverviewHighlightStyle();
    const allowStaticOverviewHighlights =
      uiState.viewMode === 'overview'
      && overviewHighlightedLaneIds.size > 0
      && overviewHighlightStyle !== 'spotlight';
    if (allowStaticOverviewHighlights) {
      updateLaneClickZones();
      renderOverviewLaneHighlights(null, now);
    } else {
      clearOverviewLaneHighlights();
    }
    renderComparisonFramePresentation(now);
    updateTimelineDisplayedTime(displayedElapsedTimeSec, videoDuration || 0, {
      playheadTimeSec: resolveStableTimelinePlayheadTime(t)
    });
    logEl.textContent = `t=${t.toFixed(2)}s | no overlay data`;
    hideAwardsOverlays();

    const hasFallbackLayers = [...elements.values()].some((el) => {
      const primary = getPrimaryElementState(el) || el;
      return usesNoFrameFallbackPlacement(el?.typeId) && el?.visible !== false && primary?.visible !== false;
    });

    overlayLayer.visible = hasFallbackLayers;
    if (hasFallbackLayers) {
      renderNoFrameFallbackElements(t);
    }
    prevTimeSec = t;
  }

  function frameHasRenderableAthleteData(frame) {
    const arr = frame?.athletes || frame?.lanes || [];
    return arr.some((a) => {
      const x = a?.x ?? a?.cx;
      const y = a?.y ?? a?.cy;
      return isFiniteNumber(x) && isFiniteNumber(y);
    });
  }
  function updateOverlayForTime(t, now) {
    if (!videoReady) return;
    if (playbackRateTimelineState.segments.length) {
      const shouldApplyPlaybackRate = (!!isScrubbing) || !(videoEl?.paused);
      if (shouldApplyPlaybackRate) {
        applyPlaybackRateTimelineSegmentAtTime(t, { nowMs: now });
      }
      updatePlaybackRateTransition(now);
    }
    if (!viewModeTimelineState.isApplyingPlaybackState && viewModeTimelineState.segments.length) {
      const shouldApplyFromTimeline = (!!isScrubbing) || !(videoEl?.paused);
      if (shouldApplyFromTimeline) {
        applyViewModeTimelineSegmentAtTime(t, {
          fromPlayback: !isScrubbing,
          pauseOnEnter: false
        });
      }
    }
    if (exportRenderState.active) {
      updateExportRenderProgressUi(t, videoDuration || videoEl?.duration || 0);
    }
    renderComparisonLiveDataChart(t);

    if (overlay.hasTimeSec) {
      if (t < overlayStartTime || (overlayEndTime != null && t > overlayEndTime)) {
        renderNoOverlayFrameState(t, now, null, null, null);
        return;
      }
    }

    if (playbackResumeGuard && !videoEl?.paused) {
      const nowMs = Number.isFinite(now) ? now : performance.now();
      if (nowMs > playbackResumeGuard.expiresAtMs || playbackResumeGuard.correctionsRemaining <= 0) {
        clearPlaybackResumeGuard();
      } else if (t + 0.1 < playbackResumeGuard.targetTimeSec) {
        const target = playbackResumeGuard.targetTimeSec;
        playbackResumeGuard.correctionsRemaining -= 1;
        try {
          videoEl.currentTime = target;
        } catch (err) {
        }
        prevTimeSec = target;
        setPlaybackResumeHint(target);
        debugPlaybackResume('playbackResumeGuard:corrected', {
          resolvedTime: Number(target).toFixed(3),
          observedTime: Number(t).toFixed(3),
          correctionsRemaining: playbackResumeGuard.correctionsRemaining
        });
        return;
      } else if (t >= playbackResumeGuard.targetTimeSec - 0.02) {
        clearPlaybackResumeGuard();
      }
    }

    if (!videoEl?.paused) {
      lastObservedPlayingTimeSec = Math.max(lastObservedPlayingTimeSec, t);
    }

    applyInfoLayersAtTime(t);
    const seg = findSegmentAtTime(insight.segments, t);
    const leaderFromInsight = getLeaderIdAtTime(insight.segments, t);
    const chaseFromInsight = getChaseIdAtTime(insight.segments, t);

    if (insightTextEl) {
      if (seg && seg.text) {
        insightTextEl.textContent = seg.text;
        insightTextEl.classList.remove('muted');
        insightTextEl.style.color = '#fde047'; // yellow highlight
      } else {
        insightTextEl.textContent = 'No insight right now.';
        insightTextEl.classList.add('muted');
        insightTextEl.style.color = '#7c7c7c';
      }
    }

    updateInfoPanels();
    updateHighlights({
      leaderId: leaderFromInsight,
      chaseId: chaseFromInsight,
      results: seg?.results
    });
    updateCameraAnimation(now);
    updateCameraVisualTransition(now);

    const frame = overlay.getFrameByTime(t);
    if (!frame) {
      renderNoOverlayFrameState(t, now, seg, leaderFromInsight, chaseFromInsight);
      return;
    }
    if (!frameHasRenderableAthleteData(frame)) {
      renderNoOverlayFrameState(t, now, seg, leaderFromInsight, chaseFromInsight);
      return;
    }
    const displayedElapsedTimeSec = getFrameTimeSec(frame, overlay?.fps || 50, t);
    if (playbackStartAnchor && t > playbackStartAnchor.timeSec + 0.05) {
      clearPlaybackStartAnchor();
    }
    updateTimelineDisplayedTime(displayedElapsedTimeSec, videoDuration || 0, {
      playheadTimeSec: resolveStableTimelinePlayheadTime(t)
    });
    overlayLayer.visible = true;
    const direction = resolveDirection(frame);
    const dirSign = direction === 'ltr' ? -1 : 1;
    currentInsightLayerState.segment = seg || null;
    currentInsightLayerState.leaderId = leaderFromInsight ?? null;
    currentInsightLayerState.chaseId = chaseFromInsight ?? null;
    currentInsightLayerState.results = seg?.results || null;
    logEl.textContent =
      `t=${t.toFixed(2)}s | frame ${frame?.frame ?? '-'} | leader ${leaderFromInsight ?? '-'}`;

    const arr = frame.athletes || frame.lanes || [];
    const athleteScreenPositions = new Map();
    let trackReferenceSmoothed = null;
    {
      let rawXRef = null;
      let rawYRef = null;
      for (const a of arr) {
        if (a.id === trackReferenceLaneId) {
          const rawY = (typeof a.y === 'number' ? a.y
            : typeof a.cy === 'number' ? a.cy
              : 0);
          const yBaseline = baselineYById.get(a.id) ?? rawY;
          const yTarget = getTrackYForId(a.id) ?? yBaseline;
          const xRaw = a.x ?? a.cx ?? 0;
          if (!isFiniteNumber(xRaw) || !isFiniteNumber(yTarget)) break;
          rawXRef = xRaw;
          rawYRef = yTarget;
          break;
        }
      }
      if (rawXRef != null && rawYRef != null) {
        trackReferenceSmoothed = getSmoothedPos(trackReferenceLaneId, rawXRef, rawYRef);
      }
    }
    if (!camAnimating && currentShotId === 'track' && trackReferenceSmoothed) {
      updateTrackCameraFollow(trackReferenceSmoothed.x, trackReferenceSmoothed.y);
    }

    renderTracks();
    updateLaneClickZones();
    updateAwardsOverlays();
    if (uiState.viewMode === 'comparison') {
      hideAwardsOverlays();
    }
    for (const a of arr) {
      const entry = athleteGraphics.get(a.id);
      if (!entry) continue;
      const {
        container,
        arrowLeader,
        arrowChase
      } = entry;

      const rawY = (typeof a.y === 'number' ? a.y
        : typeof a.cy === 'number' ? a.cy
          : 0);
      const xRaw = a.x ?? a.cx ?? 0;
      const yBaseline = baselineYById.get(a.id) ?? rawY;
      const yTarget = getTrackYForId(a.id) ?? yBaseline;
      if (!isFiniteNumber(xRaw) || !isFiniteNumber(yTarget)) continue;

      let pos;
      if (a.id === trackReferenceLaneId && trackReferenceSmoothed) {
        pos = trackReferenceSmoothed;
      } else {
        pos = getSmoothedPos(a.id, xRaw, yTarget);
      }

      const { cx, cy } = projectPointFromCurrentShot(pos.x, pos.y);
      container.position.set(cx, cy);
      athleteScreenPositions.set(a.id, { cx, cy });

      const isHighlighted = entry.leaderGlow.visible;
      container.alpha = isHighlighted ? 1 : 0.95;
      const shouldShowLeaderArrow = highlightState.leader && leaderFromInsight != null && a.id === leaderFromInsight;
      const shouldShowChaseArrow = highlightState.chase && chaseFromInsight != null && a.id === chaseFromInsight;
      const arrowW = 120;
      const arrowH = 60;
      const arrowCenter = { x: pos.x - arrowW * 0.2 * dirSign, y: pos.y };

      if (arrowLeader && shouldShowLeaderArrow && arrowGoldTexture) {
        if (!arrowLeader.texture) arrowLeader.texture = arrowGoldTexture;
        const halfW = arrowW / 2;
        const halfH = arrowH / 2;
        const tl = projectPointFromCurrentShot(arrowCenter.x - halfW, arrowCenter.y - halfH);
        const tr = projectPointFromCurrentShot(arrowCenter.x + halfW, arrowCenter.y - halfH);
        const br = projectPointFromCurrentShot(arrowCenter.x + halfW, arrowCenter.y + halfH);
        const bl = projectPointFromCurrentShot(arrowCenter.x - halfW, arrowCenter.y + halfH);
        arrowLeader.width = arrowW;
        arrowLeader.height = arrowH;
        mapSpriteToQuad(arrowLeader, { tl, tr, br, bl });
      } else if (arrowLeader) {
        arrowLeader.visible = false;
      }

      if (arrowChase && shouldShowChaseArrow && arrowGrayTextures.length) {
        const chaseTextureIndex = Math.floor((t * 4.5) % arrowGrayTextures.length);
        const chaseTexture = arrowGrayTextures[chaseTextureIndex] || arrowGrayTextures[arrowGrayTextures.length - 1];
        if (chaseTexture && arrowChase.texture !== chaseTexture) arrowChase.texture = chaseTexture;
        const halfW = arrowW / 2;
        const halfH = arrowH / 2;
        const tl = projectPointFromCurrentShot(arrowCenter.x - halfW, arrowCenter.y - halfH);
        const tr = projectPointFromCurrentShot(arrowCenter.x + halfW, arrowCenter.y - halfH);
        const br = projectPointFromCurrentShot(arrowCenter.x + halfW, arrowCenter.y + halfH);
        const bl = projectPointFromCurrentShot(arrowCenter.x - halfW, arrowCenter.y + halfH);
        arrowChase.width = arrowW;
        arrowChase.height = arrowH;
        mapSpriteToQuad(arrowChase, { tl, tr, br, bl });
      } else if (arrowChase) {
        arrowChase.visible = false;
      }
    }

    renderOverviewLaneHighlights(athleteScreenPositions, now);
    renderCustomElements(frame, dirSign, t);
    renderComparisonFramePresentation(now);

    prevTimeSec = t;
  }
  function startOverlayLoop() {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const cb = (now, metadata) => {
        const t = metadata?.mediaTime ?? videoEl.currentTime ?? 0;
        updateOverlayForTime(t, now);
        videoEl.requestVideoFrameCallback(cb);
      };
      videoEl.requestVideoFrameCallback(cb);
    } else {
      const loop = (now) => {
        const t = videoEl.currentTime || 0;
        updateOverlayForTime(t, now || performance.now());
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }
  timelineScrubber.addEventListener('input', () => {
    isScrubbing = true;
    const t = parseFloat(timelineScrubber.value) || 0;
    videoEl.currentTime = t;
    syncUiToSeekTime(t, { skipScrubberValue: true, resetPlaybackBaseline: true });
  });

  timelineScrubber.addEventListener('change', () => {
    isScrubbing = false;
    const t = parseFloat(timelineScrubber.value) || videoEl.currentTime || 0;
    videoEl.currentTime = t;
    syncUiToSeekTime(t, { resetPlaybackBaseline: true });
  });
  function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
  }

  function renderHighlightMarkers() {
    if (!videoDuration || !timelineMarkersEl || !insight.segments?.length) return;
    timelineMarkersEl.querySelectorAll('.highlight-marker').forEach(el => el.remove());
    insight.segments.forEach(seg => {
      const ratio = (seg.start_sec ?? 0) / videoDuration;
      if (ratio < 0 || ratio > 1) return;
      if (!seg.leader_id && !seg.chase_id && !seg.results && !seg.athlete_texts && !seg.category) return;
      const div = document.createElement('div');
      const category = String(seg.category || '').toLowerCase();
      let markerClass = 'insight';
      if (seg.results || category === 'result') markerClass = 'results';
      else if (category === 'lead_change') markerClass = 'lead-change';
      else if (category === 'record_watch') markerClass = 'record-watch';
      else if (category === 'tech_review') markerClass = 'tech-review';
      else if (seg.chase_id || category === 'chase') markerClass = 'chase';
      else if (seg.leader_id || category === 'lead_status') markerClass = 'leader';
      div.className = `highlight-marker ${markerClass}`;
      div.style.left = `${ratio * 100}%`;
      div.title = `Jump to ${formatTime(seg.start_sec ?? 0)}`;
      div.addEventListener('click', () => {
        const t = seg.start_sec ?? 0;
        videoEl.currentTime = t;
        syncUiToSeekTime(t, { resetPlaybackBaseline: true });
      });
      timelineMarkersEl.appendChild(div);
    });
  }
  function syncInfoChips() {
    return;
  }

  function toggleInfoChip(kind) {
    return;
  }

  btnCamWide.addEventListener('click', () => {
    switchCameraShot('wide', defaultShot, { focusedLaneId: null });
    if (uiState.viewMode === 'tracking') {
      noteViewModeStateChanged('camera-btn:wide');
    }
  });

  btnCamTrack.addEventListener('click', () => {
    const t = videoEl.currentTime || 0;
    const targetShot = computeTrackTargetShotAtTime(t, null);
    switchCameraShot('track', targetShot, { focusedLaneId: null });
    if (uiState.viewMode === 'tracking') {
      noteViewModeStateChanged('camera-btn:track');
    }
  });

  videoEl.addEventListener('seeked', () => {
    const t = videoEl.currentTime || 0;
    debugPlaybackResume('video:seeked', { resolvedTime: Number(t).toFixed(3) });
    syncUiToSeekTime(t);
  });

  videoEl.addEventListener('ended', () => {
    const dur = videoDuration || videoEl.duration || 0;
    if (dur > 0) {
      try {
        videoEl.currentTime = dur;
      } catch (err) {
      }
      if (timelineScrubber) {
        timelineScrubber.value = String(dur.toFixed(2));
      }
    }
    setPlaybackResumeHint(dur);
    clearPlaybackStartAnchor();
    clearPlaybackResumeGuard();
    setPlaybackUiPlayingState(false);
    requestOverlayRefresh();
    if (exportRenderState.active) {
      setExportRenderUiState(true, {
        statusText: 'Finalizing video…',
        timeText: `${formatClockLabel(dur)} / ${formatClockLabel(dur)}`,
        progressPct: 100
      });
      stopExportRenderCaptureIfActive();
    }
  });

  btnPlay.addEventListener('click', () => {
    if (exportRenderState.active) {
      return;
    }
    if (playbackRestartPending) {
      return;
    }
    if (comparisonIsSelecting()) {
      if (!videoEl.paused) {
        videoEl.pause();
        setPlaybackUiPlayingState(false);
      }
      return;
    }
    if (videoEl.paused) {
      const startPlaybackFromCurrentPosition = () => {
        commitViewModeTimelineDraft('btn-play');
        commitPlaybackRateTimelineDraft('btn-play');
        stopPausedCameraTransitionTick();
        prevTimeSec = videoEl.currentTime || 0;
        setPlaybackStartAnchor(prevTimeSec);
        setPlaybackResumeGuard(prevTimeSec);
        debugPlaybackResume('btnPlay:play-call', {
          resolvedTime: Number(prevTimeSec).toFixed(3)
        });
        videoEl.play().then(() => {
          clearPlaybackResumeHint();
        }).catch(() => { });
        setPlaybackUiPlayingState(true);
      };
      const dur = videoDuration || videoEl.duration || 0;
      let currentTime = restorePausedPlaybackPositionIfNeeded();
      debugPlaybackResume('btnPlay:resume-attempt', {
        resolvedTime: Number(currentTime).toFixed(3)
      });
      const shouldRestartFromBeginning = dur > 0 && currentTime >= Math.max(0, dur - 0.05);
      if (shouldRestartFromBeginning) {
        playbackRestartPending = true;
        clearPlaybackResumeHint();
        seekVideoForExportStart(0).then(() => {
          syncUiToSeekTime(0, { resetPlaybackBaseline: true });
          startPlaybackFromCurrentPosition();
        }).finally(() => {
          playbackRestartPending = false;
        });
        return;
      }
      startPlaybackFromCurrentPosition();
    } else {
      cacheCurrentPlaybackPosition();
      videoEl.pause();
      clearPlaybackStartAnchor();
      clearPlaybackResumeGuard();
      btnPlay.textContent = 'Play';
      btnPlay.classList.remove('is-playing');
    }
  });

  seedExportSettingsDefaults({ force: true });
  renderExportSettingsPanel();
  setExportSettingsPanelOpen(false);

  exportModeInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('change', () => {
      if (exportRenderState.active) return;
      if (!input.checked) return;
      const nextMode = String(input.value);
      if (
        nextMode === EXPORT_OUTPUT_MODE.metrics
        || nextMode === EXPORT_OUTPUT_MODE.composite
        || nextMode === EXPORT_OUTPUT_MODE.preset
      ) {
        exportSettingsState.outputMode = nextMode;
      } else {
        exportSettingsState.outputMode = EXPORT_OUTPUT_MODE.video;
      }
      renderExportSettingsPanel();
    });
  });

  btnExportSettingsToggle?.addEventListener('click', (ev) => {
    if (exportRenderState.active) return;
    ev.stopPropagation();
    const nextOpen = !exportSettingsState.panelOpen;
    if (nextOpen) {
      seedExportSettingsDefaults({ force: true });
      renderExportSettingsPanel();
    }
    setExportSettingsPanelOpen(nextOpen);
  });

  exportSettingsPopoverEl?.addEventListener('click', (ev) => {
    ev.stopPropagation();
  });

  document.addEventListener('click', (ev) => {
    if (!exportSettingsState.panelOpen) return;
    const target = ev.target;
    if (exportControlEl && target instanceof Node && exportControlEl.contains(target)) return;
    setExportSettingsPanelOpen(false);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && exportSettingsState.panelOpen) {
      setExportSettingsPanelOpen(false);
      return;
    }
    if (ev.key === 'Escape' && modalHelp?.style.display === 'flex') {
      modalHelp.style.display = 'none';
      modalHelp.setAttribute('aria-hidden', 'true');
    }
  });

  btnExportRender?.addEventListener('click', () => {
    if (exportRenderState.active) return;
    if (exportSettingsState.outputMode === EXPORT_OUTPUT_MODE.preset) {
      exportCurrentStateJson();
      return;
    }
    startExportRenderCapture().catch((err) => {
      console.error('Export render failed', err);
      teardownExportRenderState({ saveBlob: false });
    });
  });

  btnExportRenderCancel?.addEventListener('click', () => {
    cancelExportRenderCapture();
  });

  function setHelpModalOpen(open) {
    if (!modalHelp) return;
    modalHelp.style.display = open ? 'flex' : 'none';
    modalHelp.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  btnProjHelp?.addEventListener('click', () => {
    setHelpModalOpen(true);
  });

  modalHelpClose?.addEventListener('click', () => {
    setHelpModalOpen(false);
  });

  modalHelp?.addEventListener('click', (e) => {
    if (e.target === modalHelp) {
      setHelpModalOpen(false);
    }
  });
  if (btnIllustration && modalIllustration && modalClose) {
    btnIllustration.addEventListener('click', () => {
      modalIllustration.style.display = 'flex';
    });
    modalClose.addEventListener('click', () => {
      modalIllustration.style.display = 'none';
    });
    modalIllustration.addEventListener('click', (e) => {
      if (e.target === modalIllustration) {
        modalIllustration.style.display = 'none';
      }
    });
  }
  viewportRefreshListenersReady = true;
  onViewportMaybeChanged();

  if (videoEl.readyState >= 1) {
    startOverlayLoop();
  } else {
    videoEl.addEventListener('loadedmetadata', () => {
      startOverlayLoop();
    }, { once: true });
  }
  if (!defaultPresetLoaded) {
    const key = `vis_preset_${currentCompetition?.id || 'default'}`;
    let loaded = false;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const presets = JSON.parse(raw);
        loaded = applyPresetPayload(presets, overlay.athletes);
      }
    } catch (err) {
      }
    if (!loaded && currentCompetition?.id) {
      const presetUrl = `./assets/presets/${currentCompetition.id}.json`;
      fetch(presetUrl)
        .then(r => r.ok ? r.json() : null)
        .then(presets => {
          if (presets) applyPresetPayload(presets, overlay.athletes);
        })
        .catch(() => { });
    }
    defaultPresetLoaded = true;
  }

  updateCameraButtons('wide');
}

init();
