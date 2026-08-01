import { applyI18n, getLanguage, setLanguage, t } from '../lib/i18n.js';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, saveSettings } from '../lib/settings.js';
import { buildJsonExport, buildMarkdown, sanitizeFileNamePart, timestampSlug } from '../lib/export.js';

let settings = { ...DEFAULT_SETTINGS }; // replaced by stored values in init

const emptyMessage = document.getElementById('empty-message');
const clearButton = document.getElementById('clear-log');
const catchesKey = (tabId) => `catches:${tabId}`;
let currentTabId = null;

// The list is created here rather than in the static HTML: an empty <ol>
// with no listitem children fails accessibility checks.
const list = document.createElement('ol');
list.className = 'catch-list';
list.id = 'catch-list';
list.hidden = true;
emptyMessage.parentElement.append(list);

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function locale() {
  return getLanguage() === 'ja' ? 'ja-JP' : 'en-US';
}

function formatTime(iso) {
  return settings.timePrecision === 'milliseconds'
    ? formatTimeDetailed(iso)
    : new Date(iso).toLocaleTimeString(locale());
}

function formatTimeDetailed(iso) {
  const date = new Date(iso);
  return `${date.toLocaleTimeString(locale())}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function chip(text, modifier) {
  const span = document.createElement('span');
  span.className = modifier ? `chip ${modifier}` : 'chip';
  span.textContent = text;
  return span;
}

function hiddenLabel(text) {
  const span = document.createElement('span');
  span.className = 'visually-hidden';
  span.textContent = text;
  return span;
}

// Applies the caught content's language and direction (spec §15.10, §15.11).
function contentSpan(text, record) {
  const span = document.createElement('span');
  span.textContent = text;
  if (record.contentLanguage) {
    span.lang = record.contentLanguage;
  }
  if (record.direction) {
    span.dir = record.direction;
  }
  return span;
}

// Common prefix/suffix diff, good enough to highlight the changed part of a
// text mutation ("Items left: 5" → "Items left: 4").
function diffStrings(oldStr, newStr) {
  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start += 1;
  }
  let endOld = oldStr.length;
  let endNew = newStr.length;
  while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
    endOld -= 1;
    endNew -= 1;
  }
  return {
    prefix: newStr.slice(0, start),
    removed: oldStr.slice(start, endOld),
    added: newStr.slice(start, endNew),
    suffix: newStr.slice(endNew)
  };
}

function contextSpan(text) {
  const span = document.createElement('span');
  span.className = 'diff-context';
  span.textContent = text;
  return span;
}

function renderTextChange(change, record) {
  const container = contentSpan('', record);
  container.textContent = '';
  const { prefix, removed, added, suffix } = diffStrings(change.oldValue ?? '', change.newValue ?? '');
  if (prefix) {
    container.append(contextSpan(prefix));
  }
  if (added) {
    const segment = document.createElement('span');
    segment.className = removed ? 'diff-changed' : 'diff-added';
    segment.append(hiddenLabel(`[${t(removed ? 'diffChangedLabel' : 'diffAddedLabel')}] `));
    segment.append(document.createTextNode(added));
    container.append(segment);
  } else if (removed) {
    const segment = document.createElement('span');
    segment.className = 'diff-removed';
    segment.append(hiddenLabel(`[${t('diffRemovedLabel')}] `));
    segment.append(document.createTextNode(removed));
    container.append(segment);
  }
  if (suffix) {
    container.append(contextSpan(suffix));
  }
  if (!prefix && !added && !removed && !suffix) {
    container.textContent = change.newValue ?? '';
  }
  return container;
}

function renderBody(record) {
  const body = document.createElement('div');
  body.className = 'catch-body';

  if (record.emptyContent) {
    const p = document.createElement('p');
    p.className = 'catch-content catch-content-empty';
    p.textContent = t('emptyCatchContent');
    body.append(p);
    return body;
  }

  // aria-atomic=true: the whole region is the notification range (spec §8.4).
  if (record.effective?.atomic) {
    const p = document.createElement('p');
    p.className = 'catch-content';
    p.append(chip(t('diffWholeLabel'), 'chip-context'), contentSpan(record.content, record));
    body.append(p);
    return body;
  }

  const rows = document.createElement('ul');
  rows.className = 'catch-changes';
  for (const change of record.changes ?? []) {
    const row = document.createElement('li');
    row.className = 'catch-change-row';
    if (change.kind === 'text') {
      row.append(chip(t('diffChangedLabel'), 'chip-changed'), renderTextChange(change, record));
    } else if (change.kind === 'addition') {
      if (!change.content) {
        continue;
      }
      row.append(chip(t('diffAddedLabel'), 'chip-added'), contentSpan(change.content, record));
    } else if (change.kind === 'removal') {
      const span = contentSpan(change.content ?? '', record);
      span.classList.add('diff-removed');
      row.append(chip(t('diffRemovedLabel'), 'chip-removed'), span);
    } else {
      continue;
    }
    rows.append(row);
  }

  if (rows.children.length === 0) {
    const p = document.createElement('p');
    p.className = 'catch-content';
    p.append(contentSpan(record.content ?? '', record));
    body.append(p);
  } else {
    body.append(rows);
  }
  return body;
}

function renderDetails(record) {
  const details = document.createElement('details');
  details.className = 'catch-details';
  details.open = settings.detailsInitiallyOpen;
  const summary = document.createElement('summary');
  summary.textContent = t('detailsSummary');
  details.append(summary);

  const dl = document.createElement('dl');
  dl.className = 'detail-list';

  const addRow = (label, build) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    build(dd);
    dl.append(dt, dd);
  };
  const addCodeRow = (label, value) => {
    addRow(label, (dd) => {
      const code = document.createElement('code');
      code.textContent = value;
      dd.append(code);
    });
  };

  const none = t('valueNone');
  const isAriaNotify = record.sourceType === 'aria-notify';

  if (isAriaNotify) {
    addCodeRow(t('detailTargetType'), record.targetType ?? t('valueUnknown'));
    addCodeRow(t('detailPriority'), record.priority ?? 'normal');
  } else {
    const explicit = record.explicit ?? {};
    const effective = record.effective ?? {};
    const pair = (explicitValue, effectiveValue) =>
      `${explicitValue ?? none} / ${effectiveValue}`;

    addCodeRow('role', explicit.role ?? none);
    addCodeRow(`aria-live (${t('detailExplicit')} / ${t('detailEffective')})`, pair(explicit.ariaLive, effective.live ?? record.politeness));
    addCodeRow(`aria-atomic (${t('detailExplicit')} / ${t('detailEffective')})`, pair(explicit.ariaAtomic, String(effective.atomic ?? false)));
    addCodeRow(`aria-relevant (${t('detailExplicit')} / ${t('detailEffective')})`, pair(explicit.ariaRelevant, (effective.relevant ?? []).join(' ')));
    if (explicit.ariaBusy) {
      addCodeRow('aria-busy', explicit.ariaBusy);
    }

    const changeTypeNames = {
      additions: t('changeTypeAdditions'),
      removals: t('changeTypeRemovals'),
      text: t('changeTypeText')
    };
    addRow(t('detailChangeTypes'), (dd) => {
      dd.textContent = (record.changeTypes ?? []).map((type) => changeTypeNames[type] ?? type).join(', ') || none;
    });
  }

  addRow(t('detailTime'), (dd) => {
    const first = record.firstTimestamp ?? record.timestamp;
    const last = record.lastTimestamp ?? record.timestamp;
    dd.textContent = first === last
      ? formatTimeDetailed(last)
      : `${formatTimeDetailed(first)} – ${formatTimeDetailed(last)}`;
  });
  if (!isAriaNotify) {
    addRow(t('detailMutationCount'), (dd) => {
      dd.textContent = String(record.mutationCount ?? 1);
    });
  }
  if (record.modalPosition === 'inside' || record.modalPosition === 'outside') {
    addRow(t('detailModalPosition'), (dd) => {
      dd.textContent = t(record.modalPosition === 'inside' ? 'modalInside' : 'modalOutside');
    });
  }

  if (record.source?.domPath) {
    addCodeRow(t('detailDomPath'), record.source.domPath);
  }
  addRow(t('detailFrame'), (dd) => {
    if (record.source?.isTopFrame !== false) {
      dd.textContent = t('frameTop');
    } else {
      const code = document.createElement('code');
      code.textContent = record.source?.frameUrl ?? t('valueUnknown');
      dd.append(code);
    }
  });

  if (typeof record.previousContent === 'string' && record.previousContent !== '') {
    addRow(t('detailPreviousContent'), (dd) => {
      dd.append(contentSpan(record.previousContent, record));
    });
  }
  if (typeof record.regionContent === 'string' && record.regionContent !== '') {
    addRow(t('detailCurrentContent'), (dd) => {
      dd.append(contentSpan(record.regionContent, record));
    });
  }

  addRow(t('detailContentLanguage'), (dd) => {
    dd.textContent = record.contentLanguage ?? t('valueUnknown');
  });
  if (record.direction) {
    addCodeRow(t('detailDirection'), record.direction);
  }

  details.append(dl);

  const htmlChanges = (record.changes ?? []).filter((change) => change.html);
  if (htmlChanges.length > 0) {
    const heading = document.createElement('p');
    heading.className = 'detail-block-heading';
    heading.textContent = t('detailHtml');
    details.append(heading);
    for (const change of htmlChanges) {
      const block = document.createElement('div');
      block.className = 'code-block';
      const code = document.createElement('code');
      code.textContent = change.html;
      block.append(code);
      details.append(block);
    }
  }

  if (record.notes?.length > 0) {
    const heading = document.createElement('p');
    heading.className = 'detail-block-heading';
    heading.textContent = t('detailNotes');
    const notesList = document.createElement('ul');
    notesList.className = 'detail-notes';
    for (const note of record.notes) {
      const li = document.createElement('li');
      li.textContent = t(`note-${note}`);
      notesList.append(li);
    }
    details.append(heading, notesList);
  }

  return details;
}

function renderItem(record, count = 1) {
  const item = document.createElement('li');
  item.className = 'catch-item';

  const meta = document.createElement('p');
  meta.className = 'catch-meta';

  // politeness, role, and ariaNotify are tokens and are never localized
  // (spec §15.2).
  const isAriaNotify = record.sourceType === 'aria-notify';
  const politeness = document.createElement('span');
  politeness.className = 'chip catch-politeness';
  politeness.dataset.politeness = record.politeness;
  politeness.textContent = isAriaNotify ? 'ariaNotify()' : record.politeness;
  meta.append(politeness);

  if (isAriaNotify && record.priority === 'high') {
    meta.append(chip(t('chipHighPriority')));
  }
  if (record.role) {
    const role = document.createElement('span');
    role.className = 'catch-token';
    role.textContent = `role="${record.role}"`;
    meta.append(role);
  }
  if (record.modalPosition === 'outside') {
    meta.append(chip(t('chipOutsideModal')));
  }
  if (record.emptyContent) {
    meta.append(chip(t('chipEmpty')));
  }
  if (record.notes?.length > 0) {
    meta.append(chip(t('chipNote')));
  }
  if (record.source?.isTopFrame === false) {
    meta.append(chip(t('chipIframe')));
  }
  if (record.source?.inShadowDom) {
    meta.append(chip(t('chipShadow')));
  }
  if (count > 1 && settings.duplicateHandling === 'count') {
    meta.append(chip(t('occurrenceCount', { count })));
  }

  const time = document.createElement('time');
  time.dateTime = record.timestamp;
  time.textContent = formatTime(record.timestamp);
  meta.append(time);

  item.append(meta, renderBody(record), renderDetails(record));
  return item;
}

// Groups consecutive identical notifications (spec §12.5); the latest
// occurrence represents the group.
function groupCatches(catches) {
  if (settings.duplicateHandling === 'all') {
    return catches.map((record) => ({ record, count: 1 }));
  }
  const grouped = [];
  for (const record of catches) {
    const previous = grouped[grouped.length - 1];
    if (
      previous &&
      previous.record.politeness === record.politeness &&
      previous.record.content === record.content &&
      previous.record.emptyContent === record.emptyContent &&
      previous.record.source?.domPath === record.source?.domPath &&
      previous.record.source?.frameUrl === record.source?.frameUrl
    ) {
      previous.record = record;
      previous.count += 1;
    } else {
      grouped.push({ record, count: 1 });
    }
  }
  return grouped;
}

function render(catches, { forceBottom = false } = {}) {
  const doc = document.documentElement;
  const wasAtBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 8;
  const entries = groupCatches(catches);
  list.replaceChildren(...entries.map((entry) => renderItem(entry.record, entry.count)));
  list.hidden = entries.length === 0;
  emptyMessage.hidden = entries.length > 0;
  // Auto-scroll per spec §12.6; never move focus (spec §17).
  const stick =
    settings.autoScroll === 'always' ||
    (settings.autoScroll === 'when-at-end' && wasAtBottom);
  if (forceBottom || stick) {
    window.scrollTo(0, doc.scrollHeight);
  }
}

async function refresh({ initial = false } = {}) {
  if (currentTabId === null) {
    render([], { forceBottom: false });
    return;
  }
  const stored = await chrome.storage.session.get(catchesKey(currentTabId));
  render(stored[catchesKey(currentTabId)] ?? [], { forceBottom: initial });
  try {
    await chrome.runtime.sendMessage({ type: 'lrc:mark-read', tabId: currentTabId });
  } catch {
    // Service worker unavailable; the badge will catch up on the next event.
  }
}

const EXPORT_CHECKBOXES = [
  'exportIncludeDomPath',
  'exportIncludeFrameInfo',
  'exportIncludeNotes',
  'exportIncludePage',
  'exportIncludeContents',
  'exportIncludeExplicitValues',
  'exportIncludeMutations',
  'exportIncludeHtml'
];
const exportForm = document.getElementById('export-form');

function reflectExportSettings() {
  for (const key of EXPORT_CHECKBOXES) {
    exportForm.elements[key].checked = Boolean(settings[key]);
  }
}

// Export choices persist as settings (spec §16.7) while remaining selectable
// at export time (spec §14.8).
exportForm.addEventListener('change', async () => {
  const next = { ...settings };
  for (const key of EXPORT_CHECKBOXES) {
    next[key] = exportForm.elements[key].checked;
  }
  settings = next;
  await saveSettings(next);
});

function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportLog(format) {
  if (currentTabId === null) {
    return;
  }
  const stored = await chrome.storage.session.get(catchesKey(currentTabId));
  const catches = stored[catchesKey(currentTabId)] ?? [];
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const now = new Date();
  const meta = {
    url: tab?.url ?? null,
    exportedAt: now.toISOString(),
    uiLocale: getLanguage(),
    extensionVersion: chrome.runtime.getManifest().version
  };
  const flags = {
    includeDomPath: settings.exportIncludeDomPath,
    includeFrameInfo: settings.exportIncludeFrameInfo,
    includeNotes: settings.exportIncludeNotes,
    includePage: settings.exportIncludePage,
    includeContents: settings.exportIncludeContents,
    includeExplicitValues: settings.exportIncludeExplicitValues,
    includeMutations: settings.exportIncludeMutations,
    includeHtml: settings.exportIncludeHtml
  };
  let hostname = 'page';
  try {
    hostname = sanitizeFileNamePart(new URL(tab?.url ?? '').hostname);
  } catch {
    // Non-URL pages (chrome://, about:blank, …) fall back to "page".
  }
  const base = `${hostname}-live-region-log-${timestampSlug(now)}`;
  if (format === 'markdown') {
    downloadFile(`${base}.md`, buildMarkdown(catches, meta, flags), 'text/markdown');
  } else {
    downloadFile(`${base}.json`, buildJsonExport(catches, meta, flags), 'application/json');
  }
}

document.getElementById('export-markdown').addEventListener('click', () => exportLog('markdown'));
document.getElementById('export-json').addEventListener('click', () => exportLog('json'));

clearButton.addEventListener('click', async () => {
  if (currentTabId === null || !window.confirm(t('clearLogConfirm'))) {
    return;
  }
  await chrome.storage.session.remove(catchesKey(currentTabId));
  try {
    await chrome.runtime.sendMessage({ type: 'lrc:mark-read', tabId: currentTabId });
  } catch {
    // Badge cleanup only; safe to ignore.
  }
});

chrome.storage.session.onChanged.addListener((changes) => {
  if (currentTabId !== null && changes[catchesKey(currentTabId)]) {
    refresh();
  }
});

chrome.tabs.onActivated.addListener(async () => {
  currentTabId = await activeTabId();
  refresh({ initial: true });
});

// Language and other display settings apply immediately (spec §15.7); text
// is rewritten in place, so focus and reading position are kept (spec §17).
onSettingsChanged((next) => {
  settings = next;
  setLanguage(settings.language);
  applyI18n();
  reflectExportSettings();
  refresh();
});

(async () => {
  settings = await loadSettings();
  setLanguage(settings.language);
  applyI18n();
  reflectExportSettings();
  currentTabId = await activeTabId();
  refresh({ initial: true });
})();
