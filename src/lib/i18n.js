export function detectUiLanguage() {
  return /^ja(-|$)/i.test(chrome.i18n.getUILanguage()) ? 'ja' : 'en';
}

export function applyI18n() {
  document.documentElement.lang = detectUiLanguage();
  for (const element of document.querySelectorAll('[data-msg]')) {
    const message = chrome.i18n.getMessage(element.dataset.msg);
    if (message) {
      element.textContent = message;
    }
  }
}
