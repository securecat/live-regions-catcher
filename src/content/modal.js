// Active modal dialog detection (spec §11.3).
// CSS stacking and accessibility-tree modality do not always agree, so the
// result is "the modal as judged by this extension": the last visible
// aria-modal dialog in scan order (document first, then shadow roots).
(() => {
  'use strict';

  function isVisibleCandidate(el) {
    if (!el.isConnected) {
      return false;
    }
    if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) {
      return false;
    }
    const view = el.ownerDocument?.defaultView;
    if (view) {
      const style = view.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    }
    return true;
  }

  LRC.findActiveModal = (roots) => {
    let candidate = null;
    for (const root of roots) {
      if (typeof root.querySelectorAll !== 'function') {
        continue;
      }
      for (const el of root.querySelectorAll('[aria-modal="true"]')) {
        const role = LRC.firstRole(el);
        if ((role === 'dialog' || role === 'alertdialog') && isVisibleCandidate(el)) {
          candidate = el;
        }
      }
    }
    return candidate;
  };

  LRC.isInsideModal = (node, modal) => {
    for (
      let el = node.nodeType === Node.ELEMENT_NODE ? node : LRC.composedParent(node);
      el;
      el = LRC.composedParent(el)
    ) {
      if (el === modal) {
        return true;
      }
    }
    return false;
  };
})();
