// Pure 2FA rules (no Firebase imports) so they can be unit-tested from src/.
// Authoritative copy: the UK-number check is mirrored in src/utils/twoFactor.js
// for form validation. Change both together.
const crypto = require("crypto");

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 12 * 60 * 60 * 1000;
const TRUST_MAX_LOGOUTS = 10;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

// Accepts 07123 456789, 7123456789, +44 7123 456789, 0044..., 447...
// Returns "+447XXXXXXXXX" or null. Mobile ranges 071-075 and 077-079
// (076 is pagers, 070 is personal numbering).
function normaliseUkMobile(input) {
  if (typeof input !== "string") return null;
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("44")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^7[1-57-9]\d{8}$/.test(digits) ? `+44${digits}` : null;
}

function toMillis(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  return 0;
}

function isLocked(state, now = Date.now()) {
  return toMillis(state && state.lockedUntil) > now;
}

// A lock that has run out is cleared (attempts reset) the next time we look.
function currentLockState(state, now = Date.now()) {
  const lockedUntil = toMillis(state && state.lockedUntil);
  if (lockedUntil > now) {
    return { failedAttempts: (state && state.failedAttempts) || 0, lockedUntil };
  }
  return { failedAttempts: lockedUntil ? 0 : (state && state.failedAttempts) || 0, lockedUntil: 0 };
}

function registerFailure(state, now = Date.now()) {
  const current = currentLockState(state, now);
  if (current.lockedUntil > now) return current; // already locked, no extension
  const failedAttempts = current.failedAttempts + 1;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return { failedAttempts, lockedUntil: now + LOCK_DURATION_MS };
  }
  return { failedAttempts, lockedUntil: 0 };
}

function registerSuccess() {
  return { failedAttempts: 0, lockedUntil: 0 };
}

function attemptsRemaining(state, now = Date.now()) {
  const current = currentLockState(state, now);
  if (current.lockedUntil > now) return 0;
  return Math.max(0, MAX_FAILED_ATTEMPTS - current.failedAttempts);
}

// Trusted devices: each logout on a device counts; at TRUST_MAX_LOGOUTS the
// device is dropped and the next login there needs a code again.
function registerDeviceLogout(devices, deviceHash) {
  const list = Array.isArray(devices) ? devices : [];
  return list.flatMap((d) => {
    if (d.hash !== deviceHash) return [d];
    const logoutCount = (d.logoutCount || 0) + 1;
    return logoutCount >= TRUST_MAX_LOGOUTS ? [] : [{ ...d, logoutCount }];
  });
}

function isDeviceTrusted(devices, deviceHash) {
  if (!deviceHash || !Array.isArray(devices)) return false;
  return devices.some((d) => d.hash === deviceHash && (d.logoutCount || 0) < TRUST_MAX_LOGOUTS);
}

function hashDeviceToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function normaliseBackupCode(input) {
  return typeof input === "string" ? input.replace(/[\s-]/g, "").toUpperCase() : "";
}

function generateBackupCodes(count = BACKUP_CODE_COUNT, randomInt = crypto.randomInt) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    for (let j = 0; j < 10; j++) raw += BACKUP_CODE_ALPHABET[randomInt(BACKUP_CODE_ALPHABET.length)];
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

function hashBackupCode(code, salt = crypto.randomBytes(8).toString("hex")) {
  const hash = crypto.createHash("sha256").update(`${salt}:${normaliseBackupCode(code)}`).digest("hex");
  return `${salt}:${hash}`;
}

// Returns the remaining hashes if `input` matched one (single use), else null.
function consumeBackupCode(hashes, input) {
  const code = normaliseBackupCode(input);
  if (!code || !Array.isArray(hashes)) return null;
  for (let i = 0; i < hashes.length; i++) {
    const [salt, stored] = hashes[i].split(":");
    const candidate = hashBackupCode(code, salt).split(":")[1];
    const a = Buffer.from(candidate, "hex");
    const b = Buffer.from(stored, "hex");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return hashes.filter((_, idx) => idx !== i);
    }
  }
  return null;
}

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
  TRUST_MAX_LOGOUTS,
  BACKUP_CODE_COUNT,
  normaliseUkMobile,
  isLocked,
  currentLockState,
  registerFailure,
  registerSuccess,
  attemptsRemaining,
  registerDeviceLogout,
  isDeviceTrusted,
  hashDeviceToken,
  normaliseBackupCode,
  generateBackupCodes,
  hashBackupCode,
  consumeBackupCode,
};
