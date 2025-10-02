// Locale-aware formatters for RoamWise i18n
import { getLang, t } from './i18n.js';

/**
 * Format a number with locale-aware formatting
 * @param {number} n - Number to format
 * @returns {string} Formatted number
 */
export function fmtNumber(n) {
  const locale = t('format.number_format'); // e.g., 'en-US' or 'he-IL'
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch (error) {
    // Fallback to simple formatting
    return String(n);
  }
}

/**
 * Format duration in seconds to human-readable string with i18n labels
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted string like "7 min" or "1 hr 23 min"
 */
export function fmtDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const hrLabel = t('format.hr');
  const minLabel = t('format.min');

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} ${hrLabel} ${minutes} ${minLabel}`;
    }
    return `${hours} ${hrLabel}`;
  }
  return `${minutes} ${minLabel}`;
}

/**
 * Format distance in meters to human-readable string with i18n labels
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted string like "3.6 km" or "850 m"
 */
export function fmtDistance(meters) {
  const kmLabel = t('format.km');
  const mLabel = t('format.m');

  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    return `${km} ${kmLabel}`;
  }
  return `${Math.round(meters)} ${mLabel}`;
}

/**
 * Format ISO timestamp to localized time string
 * @param {string} iso - ISO 8601 timestamp
 * @returns {string} Formatted time string
 */
export function fmtTimeLocal(iso) {
  const locale = t('format.number_format'); // Reuse locale from translations
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).format(date);
  } catch (error) {
    // Fallback to simple formatting
    return new Date(iso).toLocaleTimeString();
  }
}
