import { applyI18n, detectUiLanguage } from '../lib/i18n.js';

applyI18n();

const emptyMessage = document.getElementById('empty-message');

// The list is created here rather than in the static HTML: an empty <ol>
// with no listitem children fails accessibility checks.
const list = document.createElement('ol');
list.className = 'catch-list';
list.id = 'catch-list';
list.hidden = true;
emptyMessage.parentElement.append(list);
const catchesKey = (tabId) => `catches:${tabId}`;
let currentTabId = null;

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function formatTime(iso) {
  const locale = detectUiLanguage() === 'ja' ? 'ja-JP' : 'en-US';
  return new Date(iso).toLocaleTimeString(locale);
}

function renderItem(record) {
  const item = document.createElement('li');
  item.className = 'catch-item';

  const meta = document.createElement('p');
  meta.className = 'catch-meta';

  // politeness and role are ARIA tokens and are never localized (spec §15.2).
  const politeness = document.createElement('span');
  politeness.className = 'catch-politeness';
  politeness.dataset.politeness = record.politeness;
  politeness.textContent = record.politeness;
  meta.append(politeness);

  if (record.role) {
    const role = document.createElement('span');
    role.className = 'catch-token';
    role.textContent = `role="${record.role}"`;
    meta.append(role);
  }

  const time = document.createElement('time');
  time.dateTime = record.timestamp;
  time.textContent = formatTime(record.timestamp);
  meta.append(time);
  item.append(meta);

  const content = document.createElement('p');
  content.className = 'catch-content';
  if (record.emptyContent) {
    content.classList.add('catch-content-empty');
    content.textContent = chrome.i18n.getMessage('emptyCatchContent');
  } else {
    content.textContent = record.content;
    if (record.contentLanguage) {
      content.lang = record.contentLanguage;
    }
    if (record.direction) {
      content.dir = record.direction;
    }
  }
  item.append(content);

  if (record.notes?.length > 0) {
    const notes = document.createElement('p');
    notes.className = 'catch-notes';
    notes.textContent = record.notes.join(', ');
    item.append(notes);
  }

  return item;
}

function render(catches, { forceBottom = false } = {}) {
  const doc = document.documentElement;
  const wasAtBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 8;
  list.replaceChildren(...catches.map(renderItem));
  list.hidden = catches.length === 0;
  emptyMessage.hidden = catches.length > 0;
  // Scroll only when the user is already at the end (spec §12.6 default);
  // never move focus (spec §17).
  if (forceBottom || wasAtBottom) {
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

chrome.storage.session.onChanged.addListener((changes) => {
  if (currentTabId !== null && changes[catchesKey(currentTabId)]) {
    refresh();
  }
});

chrome.tabs.onActivated.addListener(async () => {
  currentTabId = await activeTabId();
  refresh({ initial: true });
});

(async () => {
  currentTabId = await activeTabId();
  refresh({ initial: true });
})();
