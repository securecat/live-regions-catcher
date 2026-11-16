// Active modal dialog detection (spec §11.3).
// CSS stacking and accessibility-tree modality do not always agree, so the
// result is "the modal as judged by this extension": the last candidate in
// scan order (document first, then shadow roots). Candidates are
// - <dialog> elements opened with showModal() (matching :modal), and
// - visible aria-modal="true" elements whose role is dialog or alertdialog
//   (explicit role, or the implicit role of <dialog>).
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

  // :modal also matches fullscreen elements, so only <dialog> is tested.
  function isShownModalDialog(el) {
    if (el.localName !== 'dialog') {
      return false;
    }
    try {
      return el.matches(':modal');
    } catch {
      return false;
    }
  }

  function isAriaModalDialog(el) {
    if (el.getAttribute('aria-modal') !== 'true') {
      return false;
    }
    const role = LRC.firstRole(el) ?? (el.localName === 'dialog' ? 'dialog' : null);
    return (role === 'dialog' || role === 'alertdialog') && isVisibleCandidate(el);
  }

  LRC.findActiveModal = (roots) => {
    let candidate = null;
    for (const root of roots) {
      if (typeof root.querySelectorAll !== 'function') {
        continue;
      }
      for (const el of root.querySelectorAll('dialog, [aria-modal="true"]')) {
        if (isShownModalDialog(el) || isAriaModalDialog(el)) {
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
