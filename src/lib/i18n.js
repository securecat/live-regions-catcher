// Runtime UI language layer (spec §15).
// The language defaults to Chrome's UI language (ja → ja, otherwise en);
// the Options page will later override it via setLanguage().
import { MESSAGES } from './messages.js';

export function detectUiLanguage() {
  return /^ja(-|$)/i.test(chrome.i18n.getUILanguage()) ? 'ja' : 'en';
}

let language = detectUiLanguage();

export function getLanguage() {
  return language;
}

export function setLanguage(value) {
  language = value === 'ja' || value === 'en' ? value : detectUiLanguage();
}

export function t(key, substitutions = {}) {
  const template = MESSAGES[language]?.[key] ?? MESSAGES.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(substitutions, name) ? String(substitutions[name]) : match
  );
}

export function applyI18n() {
  document.documentElement.lang = language;
  for (const element of document.querySelectorAll('[data-msg]')) {
    element.textContent = t(element.dataset.msg);
  }
}
