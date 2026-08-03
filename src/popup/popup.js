import { applyI18n, setLanguage } from '../lib/i18n.js';
import { loadSettings, saveSettings, onSettingsChanged } from '../lib/settings.js';

const monitoringSwitch = document.getElementById('monitoring-switch');
let settings = null;

monitoringSwitch.addEventListener('change', async () => {
  if (settings === null) {
    return;
  }
  settings = { ...settings, monitoringEnabled: monitoringSwitch.checked };
  await saveSettings(settings);
});

document.getElementById('open-panel').addEventListener('click', async () => {
  const currentWindow = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({ windowId: currentWindow.id });
  window.close();
});

document.getElementById('open-options').addEventListener('click', (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
  window.close();
});

onSettingsChanged((next) => {
  settings = next;
  monitoringSwitch.checked = next.monitoringEnabled;
  setLanguage(next.language);
  applyI18n();
});

(async () => {
  settings = await loadSettings();
  setLanguage(settings.language);
  applyI18n();
  monitoringSwitch.checked = settings.monitoringEnabled;
})();
