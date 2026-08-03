// Catch pipeline (spec §12, §13): receives catches from content scripts,
// stores them per tab in session storage (local only, cleared when the
// browser closes — spec §18), tracks unread counts, and renders the badge.
// All state lives in chrome.storage.session because the service worker can
// be shut down at any time.

import { SOUND_VOLUME_LEVELS, loadSettings } from '../lib/settings.js';

const MAX_CATCHES_PER_TAB = 1000;
const BADGE_COLOR_NORMAL = '#1a56a8';
const BADGE_COLOR_ASSERTIVE = '#b3261e';

const catchesKey = (tabId) => `catches:${tabId}`;
const unreadKey = (tabId) => `unread:${tabId}`;

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => {
    console.error('Live Regions Catcher: failed to set side panel behavior', error);
  });

// Storage writes are read-modify-write; serialize them so rapid catches
// from multiple frames cannot clobber each other.
let queue = Promise.resolve();
function enqueue(task) {
  queue = queue.then(task).catch((error) => {
    console.error('Live Regions Catcher: background task failed', error);
  });
  return queue;
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'lrc:catch' && sender.tab?.id !== undefined) {
    const record = message.payload;
    if (record && typeof record === 'object') {
      record.tabId = sender.tab.id;
      record.source = record.source ?? {};
      record.source.frameId = sender.frameId ?? 0;
      enqueue(() => storeCatch(sender.tab.id, record));
    }
  } else if (message?.type === 'lrc:mark-read' && typeof message.tabId === 'number') {
    enqueue(() => markRead(message.tabId));
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  enqueue(() => chrome.storage.session.remove([catchesKey(tabId), unreadKey(tabId)]));
});

// Data retention "clear on page navigation" (spec §16.8).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') {
    return;
  }
  enqueue(async () => {
    const settings = await loadSettings();
    if (settings.retention === 'navigation') {
      await chrome.storage.session.remove([catchesKey(tabId), unreadKey(tabId)]);
      await updateBadge(tabId, { count: 0, assertive: false });
    }
  });
});

// The offscreen document is auto-closed by Chrome after ~30 s of silence,
// so it is (re)created on demand; "document already exists" is expected.
async function playCatchSound(file, volume) {
  try {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play the notification sound for caught live region updates'
    });
  } catch {
    // Already open.
  }
  try {
    await chrome.runtime.sendMessage({ type: 'lrc:play-sound', file, volume });
  } catch {
    // No receiver; nothing to do.
  }
}

async function storeCatch(tabId, record) {
  const stored = await chrome.storage.session.get([catchesKey(tabId), unreadKey(tabId)]);
  const catches = stored[catchesKey(tabId)] ?? [];
  catches.push(record);
  if (catches.length > MAX_CATCHES_PER_TAB) {
    catches.splice(0, catches.length - MAX_CATCHES_PER_TAB);
  }
  const unread = stored[unreadKey(tabId)] ?? { count: 0, assertive: false };
  unread.count += 1;
  unread.assertive = unread.assertive || record.politeness === 'assertive';
  await chrome.storage.session.set({
    [catchesKey(tabId)]: catches,
    [unreadKey(tabId)]: unread
  });
  await updateBadge(tabId, unread);

  const settings = await loadSettings();
  if (settings.soundFile !== 'none') {
    await playCatchSound(settings.soundFile, SOUND_VOLUME_LEVELS[settings.soundVolume] ?? 1);
  }
}

async function markRead(tabId) {
  await chrome.storage.session.remove(unreadKey(tabId));
  await updateBadge(tabId, { count: 0, assertive: false });
}

async function updateBadge(tabId, unread) {
  const text = unread.count === 0 ? '' : unread.count > 99 ? '99+' : String(unread.count);
  try {
    await chrome.action.setBadgeText({ tabId, text });
    if (unread.count > 0) {
      await chrome.action.setBadgeBackgroundColor({
        tabId,
        color: unread.assertive ? BADGE_COLOR_ASSERTIVE : BADGE_COLOR_NORMAL
      });
      await chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
    }
  } catch {
    // The tab is already gone.
  }
}
