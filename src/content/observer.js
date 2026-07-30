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
  let notifyCounter = 0;

  // ariaNotify() calls observed by the MAIN-world hook (spec §4.3, §4.4).
  // Capture phase so page-level stopPropagation cannot swallow the event.
  document.addEventListener(
    'lrc-arianotify',
    (event) => {
      if (!settings.catchAriaNotify) {
        return;
      }
      let detail = {};
      try {
        detail = JSON.parse(typeof event.detail === 'string' ? event.detail : '{}') ?? {};
      } catch {
        detail = {};
      }
      const target = event.target instanceof Element ? event.target : null;
      const referenceNode = target ?? document.documentElement;
      const modalPosition = referenceNode ? engine.modalPositionFor(referenceNode) : 'none';
      const notes = [];
      if (modalPosition === 'outside') {
        if (settings.modalHandling === 'ignore-outside') {
          return;
        }
        if (settings.modalHandling === 'note-outside') {
          notes.push('outside-modal');
        }
      }
      if (detail.threw) {
        notes.push('arianotify-call-failed');
      }
      const content = typeof detail.message === 'string' ? detail.message : '';
      if (!content.trim() && !settings.catchEmpty) {
        return;
      }
      const contentLanguage = referenceNode ? LRC.nearestLang(referenceNode) : null;
      if (!contentLanguage) {
        notes.push('content-language-unknown');
      }
      if (!content.trim()) {
        notes.push('empty-content');
      }
      notifyCounter += 1;
      emit({
        id: `notify-${notifyCounter}-${Math.random().toString(36).slice(2, 8)}`,
        sourceType: 'aria-notify',
        timestamp: new Date().toISOString(),
        content,
        emptyContent: !content.trim(),
        priority: detail.priority === 'high' ? 'high' : 'normal',
        politeness: detail.priority === 'high' ? 'assertive' : 'polite',
        targetType: target ? 'element' : 'document',
        source: target
          ? LRC.buildSourceInfo(target)
          : { domPath: '#document', inShadowDom: false, tagName: null, elementId: null },
        contentLanguage,
        direction: referenceNode ? LRC.nearestDir(referenceNode) : null,
        modalPosition,
        notes
      });
    },
    true
  );

  // Open shadow roots attached after the host is connected (spec §5.2, §5.4);
  // detached hosts are covered by childList detection when inserted.
  document.addEventListener(
    'lrc-attachshadow',
    (event) => {
      const host = event.target;
      if (settings.catchShadowDom && host instanceof Element && host.shadowRoot) {
        engine.observeShadowRoot(host.shadowRoot);
      }
    },
    true
  );

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
