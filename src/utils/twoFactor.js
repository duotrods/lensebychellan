// Pure 2FA helpers for the UI (no Firebase imports so they can be unit-tested).
// The authoritative rules live in functions/mfaLogic.js.

// Digits only, max 6 - for the emailed code box.
export function cleanCodeInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

// Backup codes look like ABCDE-FGHJK. Uppercases, drops junk, inserts the dash.
export function formatBackupCodeInput(value) {
  const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
}

export function isBackupCodeComplete(value) {
  return /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(value);
}

// The mfaAuthTime claim is only valid for the sign-in it was issued on.
export function isMfaSessionVerified(claims) {
  return !!claims && claims.mfaAuthTime != null && claims.mfaAuthTime === claims.auth_time;
}

// Firestore Timestamp | Date | number | null -> ms
export function toMillis(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

// "11h 59m" / "42m" / "less than a minute"
export function formatLockRemaining(lockedUntil, now = Date.now()) {
  const ms = toMillis(lockedUntil) - now;
  if (ms <= 0) return null;
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes < 1) return 'less than a minute';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// The text file offered after enrolment.
export function backupCodesFileText(codes, email) {
  return [
    'LENSE by Chellan - 2FA backup codes',
    email ? `Account: ${email}` : null,
    '',
    'Each code works once. Use one when you cannot get an emailed code.',
    '',
    ...codes,
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
