/* eslint-disable no-undef */
// Pure 2FA rules (no Firebase imports) so they can be unit-tested from src/.
const crypto = require("crypto");

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 12 * 60 * 60 * 1000;
const TRUST_DAYS = 15;
const TRUST_DURATION_MS = TRUST_DAYS * 24 * 60 * 60 * 1000;
const SMS_CODE_TTL_MS = 10 * 60 * 1000;
const SMS_SEND_LIMIT = 3;
const SMS_SEND_WINDOW_MS = 15 * 60 * 1000;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

// "rod@example.com" -> "r***@example.com", so the UI can say where the code went
// without exposing the whole address.
function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
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

// Trusted browsers: "remember this browser" trusts a device for TRUST_DAYS from
// the day it was ticked (fixed, not extended by later sign-ins).
function pruneTrustedDevices(devices, now = Date.now()) {
  return (Array.isArray(devices) ? devices : []).filter((d) => toMillis(d.expiresAt) > now);
}

function addTrustedDevice(devices, deviceHash, now = Date.now()) {
  const kept = pruneTrustedDevices(devices, now).filter((d) => d.hash !== deviceHash);
  return [...kept, { hash: deviceHash, createdAt: now, expiresAt: now + TRUST_DURATION_MS }];
}

function isDeviceTrusted(devices, deviceHash, now = Date.now()) {
  if (!deviceHash || !Array.isArray(devices)) return false;
  return devices.some((d) => d.hash === deviceHash && toMillis(d.expiresAt) > now);
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

// SMS codes: 6 digits, stored salted-hashed with an expiry. The caller deletes the
// challenge after a successful check so a code is single use.
function generateSmsCode(randomInt = crypto.randomInt) {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

function hashSmsCode(code, salt = crypto.randomBytes(8).toString("hex")) {
  const hash = crypto.createHash("sha256").update(`${salt}:${String(code).trim()}`).digest("hex");
  return `${salt}:${hash}`;
}

function createSmsChallenge(code, now = Date.now()) {
  return { hash: hashSmsCode(code), expiresAt: now + SMS_CODE_TTL_MS };
}

function verifySmsCode(challenge, input, now = Date.now()) {
  if (!challenge || !challenge.hash || toMillis(challenge.expiresAt) <= now) return false;
  const code = typeof input === "string" ? input.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return false;
  const [salt, stored] = challenge.hash.split(":");
  const a = Buffer.from(hashSmsCode(code, salt).split(":")[1], "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Rate limit: SMS_SEND_LIMIT sends per SMS_SEND_WINDOW_MS. Returns the new
// { sendCount, windowStart } or null when the limit has been reached.
function registerSmsSend(state, now = Date.now()) {
  const windowStart = toMillis(state && state.windowStart);
  const inWindow = windowStart && now - windowStart < SMS_SEND_WINDOW_MS;
  const sendCount = inWindow ? (state.sendCount || 0) : 0;
  if (sendCount >= SMS_SEND_LIMIT) return null;
  return { sendCount: sendCount + 1, windowStart: inWindow ? windowStart : now };
}

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
  TRUST_DAYS,
  TRUST_DURATION_MS,
  SMS_CODE_TTL_MS,
  SMS_SEND_LIMIT,
  BACKUP_CODE_COUNT,
  toMillis,
  maskEmail,
  isLocked,
  currentLockState,
  registerFailure,
  registerSuccess,
  attemptsRemaining,
  pruneTrustedDevices,
  addTrustedDevice,
  isDeviceTrusted,
  hashDeviceToken,
  normaliseBackupCode,
  generateBackupCodes,
  hashBackupCode,
  consumeBackupCode,
  generateSmsCode,
  hashSmsCode,
  createSmsChallenge,
  verifySmsCode,
  registerSmsSend,
};
