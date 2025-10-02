// i18n runtime for RoamWise
// Supports English (en) and Hebrew (he) with RTL/LTR switching

let currentLang = 'he'; // Default language
let bundle = {}; // Translation bundle

/**
 * Initialize i18n system
 * Loads saved language from localStorage or uses default
 * @param {string} defaultLang - Default language code ('en' or 'he')
 * @returns {Promise<void>}
 */
export async function i18nInit(defaultLang = 'he') {
  // Load saved language preference or use default
  const saved = localStorage.getItem('app-lang');
  currentLang = saved || defaultLang;

  // Fetch translation bundle
  try {
    const response = await fetch(`/i18n/${currentLang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${currentLang}.json`);
    }
    bundle = await response.json();
    console.log(`[i18n] Loaded ${currentLang} bundle`);
  } catch (error) {
    console.error('[i18n] Failed to load bundle:', error);
    // Fallback to empty bundle
    bundle = {};
  }

  // Apply direction attribute
  applyDir();
}

/**
 * Switch to a different language
 * Saves preference, loads new bundle, and dispatches change event
 * @param {string} lang - Language code ('en' or 'he')
 * @returns {Promise<void>}
 */
export async function i18nSet(lang) {
  if (lang === currentLang) return; // Already set

  currentLang = lang;
  localStorage.setItem('app-lang', lang);

  // Load new bundle
  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    bundle = await response.json();
    console.log(`[i18n] Switched to ${lang}`);
  } catch (error) {
    console.error('[i18n] Failed to load bundle:', error);
    bundle = {};
  }

  // Apply direction
  applyDir();

  // Dispatch custom event for reactive UI updates
  window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
}

/**
 * Translate a key with optional variable interpolation
 * Supports dot notation for nested keys (e.g., 'signin.title')
 * Supports variable replacement: {name}, {amount}, etc.
 * @param {string} key - Translation key (dot notation)
 * @param {Object} vars - Variables for interpolation
 * @returns {string} Translated text
 */
export function t(key, vars = {}) {
  // Split key by dots and traverse bundle
  const parts = key.split('.');
  let value = bundle;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      // Key not found - return key itself as fallback
      console.warn(`[i18n] Missing translation key: ${key}`);
      return key;
    }
  }

  // If value is not a string, return key
  if (typeof value !== 'string') {
    console.warn(`[i18n] Translation is not a string: ${key}`);
    return key;
  }

  // Replace variables {varName} with values
  let result = value;
  for (const [varName, varValue] of Object.entries(vars)) {
    const placeholder = `{${varName}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(varValue));
  }

  return result;
}

/**
 * Get current language code
 * @returns {string} Current language code ('en' or 'he')
 */
export function getLang() {
  return currentLang;
}

/**
 * Apply text direction attribute to HTML element
 * Sets dir="rtl" for Hebrew, dir="ltr" for English
 */
export function applyDir() {
  const html = document.documentElement;
  const isRTL = currentLang === 'he';
  html.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  html.setAttribute('lang', currentLang);
  console.log(`[i18n] Applied dir="${isRTL ? 'rtl' : 'ltr'}" lang="${currentLang}"`);
}
