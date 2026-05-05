// Centralized policy constants. Backend mirrors these; if you change one,
// change both. Single source of truth for client-side validation so the UI
// can stop the user before the request goes out.

export const MIN_AGE_YEARS = 18;

// Lowercase letters, digits, underscore, dot. 3–20 chars. Mirrors
// User.USERNAME_REGEX on the backend.
export const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 200;

// Calculate age in years given a Date instance. Used by signup +
// onboarding for client-side preflight; backend re-validates.
export function ageInYears(dob) {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}
