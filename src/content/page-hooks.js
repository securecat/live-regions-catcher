// Runs in the page's MAIN world at document_start (all frames).
// Wraps ariaNotify() (spec §4.4) and attachShadow() so the isolated world
// can observe them via DOM events. Wrappers always call the original with
// unchanged this/arguments, pass the return value through, and rethrow
// exceptions — page behavior is never altered (spec §18). Event payloads are
// JSON strings because objects do not cross the world boundary.
(() => {
  'use strict';

  if (window.__lrcPageHooks) {
    return;
  }
  window.__lrcPageHooks = true;

  function dispatchNotify(target, message, options, threw) {
    try {
      const detail = JSON.stringify({
        message: typeof message === 'string' ? message : String(message ?? ''),
        priority:
          options && typeof options === 'object' && options.priority === 'high' ? 'high' : 'normal',
        threw: Boolean(threw)
      });
      const eventTarget =
        target && target.nodeType === Node.ELEMENT_NODE && target.isConnected ? target : document;
      eventTarget.dispatchEvent(new CustomEvent('lrc-arianotify', { detail, bubbles: true, composed: true }));
    } catch {
      // Observation must never break the page.
    }
  }

  function wrapAriaNotify(proto) {
    const original = proto?.ariaNotify;
    if (typeof original !== 'function') {
      return;
    }
    proto.ariaNotify = function ariaNotify(...args) {
      let threw = false;
      try {
        return original.apply(this, args);
      } catch (error) {
        threw = true;
        throw error;
      } finally {
        dispatchNotify(this, args[0], args[1], threw);
      }
    };
  }

  wrapAriaNotify(Document.prototype);
  wrapAriaNotify(Element.prototype);

  const originalAttachShadow = Element.prototype.attachShadow;
  if (typeof originalAttachShadow === 'function') {
    Element.prototype.attachShadow = function attachShadow(init) {
      const shadowRoot = originalAttachShadow.call(this, init);
      // Open roots only; closed shadow DOM stays untouched (spec §5.4).
      if (init && init.mode === 'open') {
        try {
          this.dispatchEvent(new CustomEvent('lrc-attachshadow', { bubbles: true, composed: true }));
        } catch {
          // Observation must never break the page.
        }
      }
      return shadowRoot;
    };
  }
})();
