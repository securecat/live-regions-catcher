// Effective value computation for aria-live / aria-atomic / aria-relevant /
// aria-busy (spec §6). Values are resolved from the node upwards through the
// composed tree so that shadow hosts and inherited values are taken into
// account. Explicit values win over implicit role values on the same element.
(() => {
  'use strict';

  const LIVE_VALUES = ['off', 'polite', 'assertive'];
  const RELEVANT_TOKENS = ['additions', 'removals', 'text', 'all'];

  function startElement(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : LRC.composedParent(node);
  }

  function explicitLive(el) {
    if (!el.hasAttribute('aria-live')) {
      return null;
    }
    const value = el.getAttribute('aria-live').trim().toLowerCase();
    return LIVE_VALUES.includes(value) ? value : null;
  }

  function implicitLive(el) {
    const role = LRC.firstRole(el);
    const entry = role ? LRC.IMPLICIT_LIVE_ROLES[role] : null;
    return entry ? entry.live : null;
  }

  // Nearest ancestor-or-self that establishes liveness, or null.
  LRC.findLiveRegion = (node) => {
    for (let el = startElement(node); el; el = LRC.composedParent(el)) {
      const explicit = explicitLive(el);
      if (explicit !== null) {
        if (explicit === 'off') {
          const implicit = implicitLive(el);
          if (LRC.isLivePoliteness(implicit)) {
            // An implicit live role muted with aria-live="off" (spec §19):
            // effectively off, but caught with a note so that testers notice
            // the conflict. Display priority comes from the role.
            return { root: el, politeness: implicit, source: 'role', offConflictsWithRole: true };
          }
          return { root: el, politeness: 'off', source: 'explicit', offConflictsWithRole: false };
        }
        return { root: el, politeness: explicit, source: 'explicit', offConflictsWithRole: false };
      }
      const implicit = implicitLive(el);
      if (implicit !== null) {
        return { root: el, politeness: implicit, source: 'role', offConflictsWithRole: false };
      }
    }
    return null;
  };

  LRC.effectiveAtomic = (node) => {
    for (let el = startElement(node); el; el = LRC.composedParent(el)) {
      if (el.hasAttribute('aria-atomic')) {
        const value = el.getAttribute('aria-atomic').trim().toLowerCase();
        if (value === 'true') {
          return true;
        }
        if (value === 'false') {
          return false;
        }
      }
      const role = LRC.firstRole(el);
      if (role && LRC.IMPLICIT_LIVE_ROLES[role]?.atomic === true) {
        return true;
      }
    }
    return false;
  };

  LRC.effectiveRelevant = (node) => {
    for (let el = startElement(node); el; el = LRC.composedParent(el)) {
      if (!el.hasAttribute('aria-relevant')) {
        continue;
      }
      const raw = el.getAttribute('aria-relevant');
      const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const valid = tokens.filter((token) => RELEVANT_TOKENS.includes(token));
      const invalidTokens = tokens.filter((token) => !RELEVANT_TOKENS.includes(token));
      if (valid.length === 0) {
        // Only invalid tokens: fall back to the default (spec §6.3).
        return { tokens: ['additions', 'text'], invalidTokens, explicitValue: raw };
      }
      const expanded = valid.includes('all') ? ['additions', 'removals', 'text'] : [...new Set(valid)];
      return { tokens: expanded, invalidTokens, explicitValue: raw };
    }
    return { tokens: ['additions', 'text'], invalidTokens: [], explicitValue: null };
  };

  LRC.isBusy = (node) => {
    for (let el = startElement(node); el; el = LRC.composedParent(el)) {
      if ((el.getAttribute('aria-busy') || '').trim().toLowerCase() === 'true') {
        return true;
      }
    }
    return false;
  };

  // Raw attribute snapshot of the region root, for the details view.
  LRC.explicitAria = (el) => ({
    role: el.getAttribute('role'),
    ariaLive: el.getAttribute('aria-live'),
    ariaAtomic: el.getAttribute('aria-atomic'),
    ariaRelevant: el.getAttribute('aria-relevant'),
    ariaBusy: el.getAttribute('aria-busy')
  });
})();
