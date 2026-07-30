import { applyI18n, setLanguage } from '../lib/i18n.js';
import { loadSettings, saveSettings, onSettingsChanged } from '../lib/settings.js';

const form = document.getElementById('settings-form');

function reflect(settings) {
  form.elements.language.value = settings.language;
  form.elements.catchExplicit.checked = settings.catchExplicit;
  form.elements.catchImplicit.checked = settings.catchImplicit;
  form.elements.catchEmpty.checked = settings.catchEmpty;
  form.elements.catchIframes.checked = settings.catchIframes;
  form.elements.catchShadowDom.checked = settings.catchShadowDom;
  form.elements.batchMode.value = settings.batchMode;
  form.elements.batchWindowMs.value = String(settings.batchWindowMs);
  form.elements.busyHandling.value = settings.busyHandling;
  form.elements.timePrecision.value = settings.timePrecision;
  form.elements.detailsInitial.value = settings.detailsInitiallyOpen ? 'open' : 'closed';
  form.elements.duplicateHandling.value = settings.duplicateHandling;
  form.elements.autoScroll.value = settings.autoScroll;
  form.elements.retention.value = settings.retention;
  form.elements.debug.checked = settings.debug;
}

function collect() {
  const windowMs = Number.parseInt(form.elements.batchWindowMs.value, 10);
  return {
    language: form.elements.language.value,
    catchExplicit: form.elements.catchExplicit.checked,
    catchImplicit: form.elements.catchImplicit.checked,
    catchEmpty: form.elements.catchEmpty.checked,
    catchIframes: form.elements.catchIframes.checked,
    catchShadowDom: form.elements.catchShadowDom.checked,
    batchMode: form.elements.batchMode.value,
    batchWindowMs: Number.isFinite(windowMs) ? Math.min(Math.max(windowMs, 0), 2000) : 100,
    busyHandling: form.elements.busyHandling.value,
    timePrecision: form.elements.timePrecision.value,
    detailsInitiallyOpen: form.elements.detailsInitial.value === 'open',
    duplicateHandling: form.elements.duplicateHandling.value,
    autoScroll: form.elements.autoScroll.value,
    retention: form.elements.retention.value,
    debug: form.elements.debug.checked
  };
}

// The UI language switches immediately on change (spec §15.7); applyI18n only
// rewrites text, so focus stays where it is (spec §17).
function applyLanguage(language) {
  setLanguage(language);
  applyI18n();
}

form.addEventListener('change', async () => {
  const settings = collect();
  applyLanguage(settings.language);
  await saveSettings(settings);
});

onSettingsChanged((settings) => {
  reflect(settings);
  applyLanguage(settings.language);
});

(async () => {
  const settings = await loadSettings();
  reflect(settings);
  applyLanguage(settings.language);
})();
