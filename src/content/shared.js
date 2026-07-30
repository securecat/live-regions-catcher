// Shared namespace for the content scripts.
// Content scripts cannot be ES modules, so they are classic scripts loaded in
// the order declared in manifest.json and communicate through `LRC`.
var LRC = globalThis.LRC || {};
globalThis.LRC = LRC;

LRC.MONITORED_ATTRIBUTES = [
  'role',
  'aria-live',
  'aria-atomic',
  'aria-relevant',
  'aria-busy',
  'aria-label',
  'aria-labelledby',
  'aria-hidden',
  'aria-valuenow',
  'aria-valuetext',
  'hidden',
  'alt',
  'title',
  'value',
  'style',
  'class',
  'lang',
  'dir'
];

// Changes to these attributes are not treated as content changes by
// themselves; they only trigger a re-evaluation of the rendered content
// (spec §5.1).
LRC.SOFT_ATTRIBUTES = ['style', 'class'];

// Implicit live region semantics per role (spec §4.2).
// `atomic: null` means the role has no implicit aria-atomic value.
LRC.IMPLICIT_LIVE_ROLES = {
  status: { live: 'polite', atomic: true },
  log: { live: 'polite', atomic: null },
  alert: { live: 'assertive', atomic: true },
  timer: { live: 'off', atomic: null },
  marquee: { live: 'off', atomic: null }
};

// Defaults follow the spec's initial values. The Options page will make these
// configurable in a later phase.
LRC.DEFAULT_SETTINGS = {
  batchMode: 'batch', // 'batch' | 'individual' (spec §10)
  batchWindowMs: 100,
  busyHandling: 'respect', // 'respect' | 'record' (spec §6.4)
  catchEmpty: true, // spec §7.4
  debug: true
};

LRC.isLivePoliteness = (value) => value === 'polite' || value === 'assertive';

// Parent in the composed tree: crosses shadow boundaries via the host.
LRC.composedParent = (node) => {
  if (node.parentElement) {
    return node.parentElement;
  }
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
};

LRC.firstRole = (el) => {
  const raw = el.getAttribute?.('role');
  if (!raw) {
    return null;
  }
  const token = raw.trim().split(/\s+/)[0];
  return token ? token.toLowerCase() : null;
};

LRC.nearestLang = (node) => {
  for (let el = node.nodeType === Node.ELEMENT_NODE ? node : LRC.composedParent(node); el; el = LRC.composedParent(el)) {
    const lang = el.getAttribute('lang');
    if (lang && lang.trim()) {
      return lang.trim();
    }
  }
  return null;
};

LRC.nearestDir = (node) => {
  for (let el = node.nodeType === Node.ELEMENT_NODE ? node : LRC.composedParent(node); el; el = LRC.composedParent(el)) {
    const dir = (el.getAttribute('dir') || '').trim().toLowerCase();
    if (dir === 'ltr' || dir === 'rtl' || dir === 'auto') {
      return dir;
    }
  }
  return null;
};
