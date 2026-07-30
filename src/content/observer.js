// Bootstrap for the detection engine.
// Declared at document_start so that later phases can hook page APIs early
// (ariaNotify observation); DOM observation itself starts once the initial
// DOM exists, because parser-inserted content is initial state, not an
// update.
(() => {
  'use strict';

  if (globalThis.__lrcStarted) {
    return;
  }
  globalThis.__lrcStarted = true;

  // Mutated in place so the engine always reads current values.
  const settings = { ...LRC.DEFAULT_SETTINGS };

  function mergeSettings(stored) {
    for (const key of Object.keys(LRC.DEFAULT_SETTINGS)) {
      settings[key] = LRC.DEFAULT_SETTINGS[key];
    }
    if (stored && typeof stored === 'object') {
      for (const key of Object.keys(LRC.DEFAULT_SETTINGS)) {
        if (key in stored) {
          settings[key] = stored[key];
        }
      }
    }
  }

  function emit(catchRecord) {
    if (!settings.catchIframes && window !== window.top) {
      return;
    }
    catchRecord.source.frameUrl = location.href;
    catchRecord.source.isTopFrame = window === window.top;
    if (settings.debug) {
      console.log(`[Live Regions Catcher] ${catchRecord.politeness}:`, catchRecord.content, catchRecord);
    }
    try {
      chrome.runtime.sendMessage({ type: 'lrc:catch', payload: catchRecord }).catch(() => {
        // No receiver; safe to ignore.
      });
    } catch {
      // Extension context is gone (e.g. the extension was reloaded).
    }
  }

  const engine = LRC.createEngine(settings, emit);

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.settings) {
        return;
      }
      const hadShadowDom = settings.catchShadowDom;
      mergeSettings(changes.settings.newValue);
      if (!hadShadowDom && settings.catchShadowDom) {
        engine.rescan();
      }
    });
  } catch {
    // Extension context is gone.
  }

  const settingsReady = chrome.storage.local
    .get('settings')
    .then((stored) => mergeSettings(stored.settings))
    .catch(() => {});

  function start() {
    settingsReady.then(() => engine.start());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
