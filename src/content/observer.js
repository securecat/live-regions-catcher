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

  const settings = { ...LRC.DEFAULT_SETTINGS };

  function emit(catchRecord) {
    catchRecord.source.frameUrl = location.href;
    catchRecord.source.isTopFrame = window === window.top;
    if (settings.debug) {
      console.log(`[Live Regions Catcher] ${catchRecord.politeness}:`, catchRecord.content, catchRecord);
    }
    try {
      chrome.runtime.sendMessage({ type: 'lrc:catch', payload: catchRecord }).catch(() => {
        // No receiver yet; the background pipeline arrives in a later phase.
      });
    } catch {
      // Extension context is gone (e.g. the extension was reloaded).
    }
  }

  const engine = LRC.createEngine(settings, emit);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.start(), { once: true });
  } else {
    engine.start();
  }
})();
