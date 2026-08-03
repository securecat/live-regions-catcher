// Catch pipeline (spec §12, §13): receives catches from content scripts,
// stores them per tab in session storage (local only, cleared when the
// browser closes — spec §18), tracks unread counts, and renders the badge.
// All state lives in chrome.storage.session because the service worker can
// be shut down at any time.

import { SOUND_VOLUME_LEVELS, loadSettings } from '../lib/settings.js';
import { setLanguage, t } from '../lib/i18n.js';

const MAX_CATCHES_PER_TAB = 1000;
const BADGE_COLOR_NORMAL = '#1a56a8';
const BADGE_COLOR_ASSERTIVE = '#b3261e';

const catchesKey = (tabId) => `catches:${tabId}`;
const unreadKey = (tabId) => `unread:${tabId}`;

// Leading slashes: setIcon resolves relative paths against the caller
// (this service worker lives under src/background/), not the extension root.
const ICON_PATHS = {
  normal: {
    16: '/icons/icon16.png',
    32: '/icons/icon32.png',
    48: '/icons/icon48.png',
    128: '/icons/icon128.png'
  },
  off: {
    16: '/icons/icon16-off.png',
    32: '/icons/icon32-off.png',
    48: '/icons/icon48-off.png',
    128: '/icons/icon128-off.png'
  }
};

// While monitoring is off, the icon turns gray and the tooltip says so;
// badges are cleared (counts stay in storage). The runtime tooltip follows
// the extension's UI language setting (spec §15.7).
async function applyMonitoringState(enabled, language) {
  setLanguage(language);
  try {
    await chrome.action.setIcon({ path: enabled ? ICON_PATHS.normal : ICON_PATHS.off });
  } catch (error) {
    console.error('Live Regions Catcher: failed to switch the toolbar icon', error);
  }
  await chrome.action.setTitle({ title: t(enabled ? 'sidePanelTitle' : 'actionTitleOff') });
  await chrome.action.setBadgeText({ text: '' });
  if (enabled) {
    const stored = await chrome.storage.session.get(null);
    for (const [key, unread] of Object.entries(stored)) {
      if (key.startsWith('unread:')) {
        await updateBadge(Number(key.slice('unread:'.length)), unread);
      }
    }
  } else {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        // null clears the per-tab override.
        await chrome.action.setBadgeText({ tabId: tab.id, text: null });
      } catch {
        // Tab gone.
      }
    }
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) {
    return;
  }
  const before = changes.settings.oldValue ?? {};
  const after = changes.settings.newValue ?? {};
  const enabledBefore = before.monitoringEnabled ?? true;
  const enabledAfter = after.monitoringEnabled ?? true;
  if (enabledBefore !== enabledAfter || before.language !== after.language) {
    enqueue(() => applyMonitoringState(enabledAfter, after.language));
  }
});

// Reflect the persisted state whenever the service worker wakes up.
// (Not via enqueue: this runs at module evaluation, before `queue` exists.)
loadSettings()
  .then((settings) => applyMonitoringState(settings.monitoringEnabled, settings.language))
  .catch((error) => {
    console.error('Live Regions Catcher: failed to restore the toolbar state', error);
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
  const settings = await loadSettings();
  if (!settings.monitoringEnabled) {
    return;
  }
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
