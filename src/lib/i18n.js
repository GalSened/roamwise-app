// src/lib/i18n.js
// Simple i18n module for loading and translating text

let translations = {};
let currentLang = 'he';

/**
 * Initialize i18n with current language
 */
export async function initI18n() {
  currentLang = document.documentElement.getAttribute('data-lang') || 'he';
  await loadTranslations(currentLang);
}

/**
 * Load translations for a specific language
 */
async function loadTranslations(lang) {
  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (!response.ok) {
      console.warn(`Failed to load translations for ${lang}, falling back to hardcoded values`);
      return;
    }
    translations = await response.json();
  } catch (error) {
    console.warn(`Error loading translations for ${lang}:`, error);
    translations = {};
  }
}

/**
 * Translate a key
 * @param {string} key - The translation key (e.g., "comfort.UV")
 * @returns {string} The translated text, or the key if not found
 */
export function t(key) {
  return translations[key] || key;
}

/**
 * Change language and reload translations
 */
export async function setLanguage(lang) {
  currentLang = lang;
  await loadTranslations(lang);
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
}
