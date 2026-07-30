// Source path construction for catch items (spec §5.4, §12.3).
// Shadow boundaries are represented explicitly, e.g.
// "my-component → #shadow-root → div[role] > span".
(() => {
  'use strict';

  function pathWithinRoot(el, root) {
    const parts = [];
    let node = el;
    while (node && node !== root && node.nodeType === Node.ELEMENT_NODE) {
      if (node.id) {
        let matches = [];
        try {
          matches = root.querySelectorAll(`#${CSS.escape(node.id)}`);
        } catch {
          // Unusual id values: fall through to the positional selector.
        }
        if (matches.length === 1) {
          parts.unshift(`#${node.id}`);
          return parts.join(' > ');
        }
      }
      let selector = node.localName;
      const parent = node.parentNode;
      if (parent && parent.children) {
        const sameTag = [...parent.children].filter((child) => child.localName === node.localName);
        if (sameTag.length > 1) {
          selector += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(selector);
      node = parent;
    }
    return parts.join(' > ');
  }

  LRC.buildSourceInfo = (el) => {
    const segments = [];
    let inShadowDom = false;
    let current = el;
    while (current) {
      const root = current.getRootNode();
      const path = pathWithinRoot(current, root);
      if (path) {
        segments.unshift(path);
      }
      if (root instanceof ShadowRoot) {
        inShadowDom = true;
        segments.unshift('#shadow-root');
        current = root.host;
      } else {
        current = null;
      }
    }
    return {
      domPath: segments.join(' → '),
      inShadowDom,
      tagName: el.localName ?? null,
      elementId: el.id || null
    };
  };
})();
