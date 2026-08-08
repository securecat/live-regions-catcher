// Settings storage (chrome.storage.local, key "settings").
// Content scripts cannot import this module; keep LRC.DEFAULT_SETTINGS in
// src/content/shared.js in sync for the keys the engine consumes.
export const BATCH_WINDOW_LIMITS = { min: 0, max: 2000 };

// Amplitude multipliers for the sound volume setting: -8 dB and -16 dB.
export const SOUND_VOLUME_LEVELS = { standard: 1, quiet: 0.4, quieter: 0.16 };

export const DEFAULT_SETTINGS = {
  monitoringEnabled: true, // popup switch: while off, nothing new is caught
  language: 'auto', // 'auto' | 'en' | 'ja' (spec §16.1)
  catchExplicit: true, // spec §16.2
  catchImplicit: true,
  catchEmpty: true,
  catchIframes: true,
  catchShadowDom: true,
  catchAriaNotify: true,
  batchMode: 'batch', // 'batch' | 'individual' (spec §16.3)
  batchWindowMs: 100,
  busyHandling: 'respect', // 'respect' | 'record' (spec §16.4)
  modalHandling: 'note-outside', // 'catch-outside' | 'ignore-outside' | 'note-outside' (spec §16.5)
  timePrecision: 'seconds', // 'seconds' | 'milliseconds' (spec §16.6)
  detailsInitiallyOpen: false,
  duplicateHandling: 'all', // 'all' | 'collapse' | 'count' (spec §12.5)
  autoScroll: 'when-at-end', // 'always' | 'when-at-end' | 'never' (spec §12.6)
  // 'on' | 'off'. Unset means "follow prefers-reduced-motion"; an explicit
  // choice wins over the OS setting in both directions.
  fadeInNew: null,
  retention: 'tab-close', // 'navigation' | 'tab-close' (spec §16.8)
  soundFile: 'none', // 'none' | a file name under sounds/ (per-catch sound, opt-in)
  soundVolume: 'standard', // key of SOUND_VOLUME_LEVELS
  // Export detail items (spec §14.8, §16.7). The basic set (DOM paths,
  // frame info, notes, per-catch page URLs) is always exported and has no
  // settings; only these four additions are selectable.
  exportIncludeContents: false,
  exportIncludeExplicitValues: false,
  exportIncludeMutations: false,
  exportIncludeHtml: false,
  debug: false
};

export async function loadSettings() {
  const stored = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(stored.settings ?? {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

// Resolves the fade-in preference: an explicit choice wins, otherwise the
// OS reduced-motion setting decides.
export function fadeInEnabled(settings) {
  if (settings.fadeInNew === 'on' || settings.fadeInNew === 'off') {
    return settings.fadeInNew === 'on';
  }
  return !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function onSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      callback({ ...DEFAULT_SETTINGS, ...(changes.settings.newValue ?? {}) });
    }
  });
}
