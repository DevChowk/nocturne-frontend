// Curated picklists for ProfileEditModal. We store ISO codes; display names
// are resolved at render time via the browser's Intl.DisplayNames so we
// don't have to bundle translations.

// BCP-47 short codes for the most-spoken / most-likely-here languages.
// Keep this list curated — letting users free-text a code fragments the
// matchmaking queue ("english", "ENG", "en-GB" all bucketed differently).
export const LANGUAGE_CODES = [
  'en', // English
  'hi', // Hindi
  'es', // Spanish
  'zh', // Chinese
  'ar', // Arabic
  'pt', // Portuguese
  'ru', // Russian
  'ja', // Japanese
  'de', // German
  'fr', // French
  'ko', // Korean
  'it', // Italian
  'tr', // Turkish
  'vi', // Vietnamese
  'pl', // Polish
  'nl', // Dutch
  'th', // Thai
  'id', // Indonesian
  'bn', // Bengali
  'ur', // Urdu
  'ta', // Tamil
  'te', // Telugu
  'ml', // Malayalam
  'mr', // Marathi
  'gu', // Gujarati
  'pa', // Punjabi
  'fa', // Persian
  'he', // Hebrew
  'sv', // Swedish
  'el', // Greek
];

// ISO 3166-1 alpha-2 codes for ~80 of the most populous countries. Add more
// as needed — names come from Intl.DisplayNames at render time.
export const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AR', 'AU', 'AT', 'BD', 'BE', 'BR', 'BG',
  'CA', 'CL', 'CN', 'CO', 'HR', 'CZ', 'DK', 'EG', 'EE', 'FI',
  'FR', 'DE', 'GH', 'GR', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR',
  'IQ', 'IE', 'IL', 'IT', 'JP', 'JO', 'KZ', 'KE', 'KR', 'KW',
  'LV', 'LB', 'LT', 'MY', 'MX', 'MA', 'NL', 'NZ', 'NG', 'NO',
  'OM', 'PK', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RU', 'SA',
  'RS', 'SG', 'SK', 'ZA', 'ES', 'LK', 'SE', 'CH', 'TW', 'TH',
  'TR', 'UA', 'AE', 'GB', 'US', 'VE', 'VN',
];

const tryDisplayName = (type, code, fallback) => {
  try {
    return new Intl.DisplayNames([typeof navigator !== 'undefined' ? navigator.language : 'en'], { type }).of(code) || fallback;
  } catch {
    return fallback;
  }
};

export const languageName = (code) => tryDisplayName('language', code, code);
export const countryName = (code) => tryDisplayName('region', code, code);

// Best-effort flag emoji from a 2-letter country code. Falls back to the
// raw code if the host can't render regional indicators.
export const countryFlag = (code) => {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => c.charCodeAt(0) + A));
};

export const MAX_LANGUAGES = 5;
