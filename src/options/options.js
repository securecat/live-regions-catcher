import { applyI18n, setLanguage, t } from '../lib/i18n.js';
import { BATCH_WINDOW_LIMITS, DEFAULT_SETTINGS, SOUND_VOLUME_LEVELS, fadeInEnabled, loadSettings, saveSettings, onSettingsChanged } from '../lib/settings.js';

const form = document.getElementById('settings-form');
const windowInput = form.elements.batchWindowMs;
const windowError = document.getElementById('batch-window-error');
const resetAllButton = document.getElementById('reset-all');

windowInput.min = String(BATCH_WINDOW_LIMITS.min);
windowInput.max = String(BATCH_WINDOW_LIMITS.max);

function reflect(settings) {
  form.elements.language.value = settings.language;
  form.elements.catchExplicit.checked = settings.catchExplicit;
  form.elements.catchImplicit.checked = settings.catchImplicit;
  form.elements.catchEmpty.checked = settings.catchEmpty;
  form.elements.catchIframes.checked = settings.catchIframes;
  form.elements.catchShadowDom.checked = settings.catchShadowDom;
  form.elements.catchAriaNotify.checked = settings.catchAriaNotify;
  form.elements.batchMode.value = settings.batchMode;
  form.elements.batchWindowMs.value = String(settings.batchWindowMs);
  form.elements.busyHandling.value = settings.busyHandling;
  form.elements.modalHandling.value = settings.modalHandling;
  form.elements.timePrecision.value = settings.timePrecision;
  form.elements.detailsInitial.value = settings.detailsInitiallyOpen ? 'open' : 'closed';
  form.elements.duplicateHandling.value = settings.duplicateHandling;
  form.elements.autoScroll.value = settings.autoScroll;
  // Until the user chooses, the radio shows what prefers-reduced-motion
  // implies; picking either option then overrides the OS setting.
  form.elements.fadeInNew.value = fadeInEnabled(settings) ? 'on' : 'off';
  form.elements.retention.value = settings.retention;
  form.elements.soundFile.value = settings.soundFile;
  form.elements.soundVolume.value = settings.soundVolume;
  form.elements.debug.checked = settings.debug;
}

function collect() {
  const { min, max } = BATCH_WINDOW_LIMITS;
  const windowMs = Number.parseInt(windowInput.value, 10);
  return {
    language: form.elements.language.value,
    catchExplicit: form.elements.catchExplicit.checked,
    catchImplicit: form.elements.catchImplicit.checked,
    catchEmpty: form.elements.catchEmpty.checked,
    catchIframes: form.elements.catchIframes.checked,
    catchShadowDom: form.elements.catchShadowDom.checked,
    catchAriaNotify: form.elements.catchAriaNotify.checked,
    batchMode: form.elements.batchMode.value,
    batchWindowMs: Number.isFinite(windowMs)
      ? Math.min(Math.max(windowMs, min), max)
      : DEFAULT_SETTINGS.batchWindowMs,
    busyHandling: form.elements.busyHandling.value,
    modalHandling: form.elements.modalHandling.value,
    timePrecision: form.elements.timePrecision.value,
    detailsInitiallyOpen: form.elements.detailsInitial.value === 'open',
    duplicateHandling: form.elements.duplicateHandling.value,
    autoScroll: form.elements.autoScroll.value,
    fadeInNew: form.elements.fadeInNew.value,
    retention: form.elements.retention.value,
    soundFile: form.elements.soundFile.value,
    soundVolume: form.elements.soundVolume.value,
    debug: form.elements.debug.checked
  };
}

// The UI language switches immediately on change (spec §15.7); applyI18n only
// rewrites text, so focus stays where it is (spec §17).
function applyLanguage(language) {
  setLanguage(language);
  applyI18n();
  // The three preview buttons share the visible label "Preview"; each gets a
  // distinct accessible name that starts with that visible label.
  for (const button of document.querySelectorAll('.sound-preview')) {
    button.textContent = t('previewLabel');
    button.setAttribute('aria-label', t('previewAria', { name: t(button.dataset.nameMsg) }));
  }
}

// Preview reuses one Audio element: starting a preview stops the one that is
// still playing, matching the catch-sound behavior. It also plays at the
// currently selected notification volume.
const previewPlayer = new Audio();
for (const button of document.querySelectorAll('.sound-preview')) {
  button.addEventListener('click', () => {
    previewPlayer.volume = SOUND_VOLUME_LEVELS[form.elements.soundVolume.value] ?? 1;
    const url = chrome.runtime.getURL(`sounds/${button.dataset.sound}`);
    if (previewPlayer.src !== url) {
      previewPlayer.src = url;
    } else {
      previewPlayer.currentTime = 0;
    }
    previewPlayer.play().catch(() => {
      // Playback failures must not break the page.
    });
  });
}

function showWindowError(key, substitutions) {
  windowError.textContent = t(key, substitutions);
  windowError.hidden = false;
}

// The error is never auto-dismissed; it disappears when the user's attention
// has clearly moved on — editing the field again, operating another control,
// or leaving the Options page.
function clearWindowError() {
  windowError.hidden = true;
  windowError.textContent = '';
}

windowInput.addEventListener('input', clearWindowError);
window.addEventListener('blur', clearWindowError);

windowInput.addEventListener('focusout', async () => {
  const { min, max } = BATCH_WINDOW_LIMITS;
  const raw = windowInput.value.trim();
  const value = Number.parseInt(raw, 10);
  if (raw === '' || Number.isNaN(value)) {
    windowInput.value = String(min);
    showWindowError('mutationWindowErrorEmpty', { min });
  } else if (value < min) {
    windowInput.value = String(min);
    showWindowError('mutationWindowErrorBelowMin', { min });
  } else if (value > max) {
    windowInput.value = String(max);
    showWindowError('mutationWindowErrorAboveMax', { max });
  } else {
    return; // valid values are saved by the form's change handler
  }
  await saveSettings(collect());
});

resetAllButton.addEventListener('click', async () => {
  if (!window.confirm(t('resetAllConfirm'))) {
    return;
  }
  const defaults = { ...DEFAULT_SETTINGS };
  reflect(defaults);
  applyLanguage(defaults.language);
  clearWindowError();
  await saveSettings(defaults);
});

form.addEventListener('change', async (event) => {
  if (event.target !== windowInput) {
    clearWindowError();
  }
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
