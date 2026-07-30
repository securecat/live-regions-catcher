// Settings storage (chrome.storage.local, key "settings").
// Content scripts cannot import this module; keep LRC.DEFAULT_SETTINGS in
// src/content/shared.js in sync for the keys the engine consumes.
export const BATCH_WINDOW_LIMITS = { min: 0, max: 2000 };

export const DEFAULT_SETTINGS = {
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
  retention: 'tab-close', // 'navigation' | 'tab-close' (spec §16.8)
  exportDetail: 'simple', // 'simple' | 'detailed' (spec §14.8, §16.7)
  exportIncludeHtml: false,
  exportIncludeDomPath: true,
  exportIncludeMutations: false,
  exportIncludeFrameInfo: true,
  exportIncludeNotes: true,
  exportIncludePage: true,
  debug: false
};

export async function loadSettings() {
  const stored = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(stored.settings ?? {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

export function onSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      callback({ ...DEFAULT_SETTINGS, ...(changes.settings.newValue ?? {}) });
    }
  });
}
