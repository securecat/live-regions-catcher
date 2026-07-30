// Simplified accessible content computation (spec §7).
// This intentionally does not claim to reproduce what any screen reader
// speaks; it produces the "notification candidate" text from the information
// listed in spec §7.2. Works best-effort on detached nodes (removals), where
// computed styles are unavailable and only attributes are checked.
(() => {
  'use strict';

  function isHiddenElement(el) {
    if (el.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    if (el.hasAttribute('hidden')) {
      return true;
    }
    if (el.isConnected && el.ownerDocument?.defaultView) {
      const style = el.ownerDocument.defaultView.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
        return true;
      }
    }
    return false;
  }

  function pseudoContent(el, pseudo) {
    if (!el.isConnected || !el.ownerDocument?.defaultView) {
      return '';
    }
    const content = el.ownerDocument.defaultView.getComputedStyle(el, pseudo).content;
    if (!content || content === 'none' || content === 'normal') {
      return '';
    }
    const strings = content.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g);
    return strings ? strings.map((s) => s.slice(1, -1)).join('') : '';
  }

  function resolveLabelledby(el, ctx) {
    const raw = el.getAttribute('aria-labelledby').trim();
    if (!raw) {
      return null;
    }
    const rootNode = el.getRootNode();
    if (typeof rootNode.querySelectorAll !== 'function') {
      return null;
    }
    const texts = [];
    let found = false;
    for (const id of raw.split(/\s+/)) {
      let matches;
      try {
        matches = rootNode.querySelectorAll(`#${CSS.escape(id)}`);
      } catch {
        matches = [];
      }
      if (matches.length === 0) {
        ctx.notes.add('labelledby-reference-not-found');
        continue;
      }
      if (matches.length > 1) {
        ctx.notes.add('labelledby-id-not-unique');
      }
      const target = matches[0];
      if (ctx.labelChain.has(target)) {
        continue;
      }
      ctx.labelChain.add(target);
      // Referenced elements contribute their text even when hidden.
      texts.push(compute(target, ctx, { ignoreHidden: true }));
      ctx.labelChain.delete(target);
      found = true;
    }
    return found ? texts.join(' ') : null;
  }

  function childrenContent(node, ctx) {
    const parts = [];
    for (const child of node.childNodes) {
      parts.push(compute(child, ctx));
    }
    return parts.join(' ');
  }

  function compute(node, ctx, options = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.data;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return childrenContent(node, ctx);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    const el = node;
    if (!options.ignoreHidden && isHiddenElement(el)) {
      return '';
    }

    if (el.hasAttribute('aria-labelledby')) {
      const label = resolveLabelledby(el, ctx);
      if (label !== null) {
        return label;
      }
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }
    if (el.hasAttribute('aria-valuetext')) {
      return el.getAttribute('aria-valuetext');
    }
    if (el.hasAttribute('aria-valuenow')) {
      return el.getAttribute('aria-valuenow');
    }

    const name = el.localName;
    if (name === 'img' || name === 'area') {
      return el.getAttribute('alt') ?? '';
    }
    if (name === 'input') {
      // Password values are never collected (spec §18).
      if ((el.getAttribute('type') || '').toLowerCase() === 'password') {
        return '';
      }
      return el.value ?? '';
    }
    if (name === 'textarea') {
      return el.value ?? '';
    }
    if (name === 'select') {
      return [...el.selectedOptions].map((option) => option.label || option.textContent).join(' ');
    }
    if (name === 'slot' && typeof el.assignedNodes === 'function') {
      const assigned = el.assignedNodes();
      if (assigned.length > 0) {
        return assigned.map((assignedNode) => compute(assignedNode, ctx)).join(' ');
      }
    }

    // An element with an open shadow root renders its shadow tree, not its
    // light children (those surface through <slot> above).
    const children = el.shadowRoot ? el.shadowRoot.childNodes : el.childNodes;
    const parts = [pseudoContent(el, '::before')];
    for (const child of children) {
      parts.push(compute(child, ctx));
    }
    parts.push(pseudoContent(el, '::after'));
    return parts.join(' ');
  }

  LRC.computeAccessibleContent = (node, { notes } = {}) => {
    const ctx = { notes: notes ?? new Set(), labelChain: new Set() };
    return compute(node, ctx).replace(/\s+/g, ' ').trim();
  };
})();
