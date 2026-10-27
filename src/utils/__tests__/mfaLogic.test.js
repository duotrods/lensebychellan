import { describe, it, expect } from "vitest";
import { createRequire } from "module";

// The authoritative 2FA rules live in functions/ (CommonJS) so the Cloud
// Functions and these tests exercise the same code.
const require = createRequire(import.meta.url);
const mfa = require("../../../functions/mfaLogic.js");

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(mfa.maskEmail("rod@example.com")).toBe("r***@example.com");
  });
  it("returns an empty string for anything that is not an email", () => {
    expect(mfa.maskEmail(undefined)).toBe("");
    expect(mfa.maskEmail("nope")).toBe("");
  });
});

describe("lock rules (3 attempts -> 12 hours)", () => {
  it("counts failures without locking before the third", () => {
    let s = mfa.registerFailure({}, T0);
    expect(s).toEqual({ failedAttempts: 1, lockedUntil: 0 });
    s = mfa.registerFailure(s, T0);
    expect(s).toEqual({ failedAttempts: 2, lockedUntil: 0 });
    expect(mfa.attemptsRemaining(s, T0)).toBe(1);
  });

  it("locks for exactly 12 hours on the third failure", () => {
    let s = {};
    for (let i = 0; i < 3; i++) s = mfa.registerFailure(s, T0);
    expect(s.lockedUntil).toBe(T0 + 12 * HOUR);
    expect(mfa.isLocked(s, T0 + 12 * HOUR - 1)).toBe(true);
    expect(mfa.isLocked(s, T0 + 12 * HOUR)).toBe(false);
    expect(mfa.attemptsRemaining(s, T0)).toBe(0);
  });

  it("does not extend an active lock when more failures arrive", () => {
    let s = {};
    for (let i = 0; i < 3; i++) s = mfa.registerFailure(s, T0);
    const again = mfa.registerFailure(s, T0 + HOUR);
    expect(again.lockedUntil).toBe(s.lockedUntil);
  });

  it("gives a fresh 3 attempts once the lock has expired", () => {
    let s = {};
    for (let i = 0; i < 3; i++) s = mfa.registerFailure(s, T0);
    const later = T0 + 13 * HOUR;
    expect(mfa.attemptsRemaining(s, later)).toBe(3);
    expect(mfa.registerFailure(s, later)).toEqual({ failedAttempts: 1, lockedUntil: 0 });
  });

  it("success clears the counter; admin unlock is the same reset", () => {
    expect(mfa.registerSuccess()).toEqual({ failedAttempts: 0, lockedUntil: 0 });
  });

  it("reads Firestore Timestamp-like values", () => {
    const ts = { toMillis: () => T0 + HOUR };
    expect(mfa.isLocked({ lockedUntil: ts }, T0)).toBe(true);
  });
});

describe("trusted browsers (15 days)", () => {
  const DAY = 24 * HOUR;
  const hash = mfa.hashDeviceToken("device-token");

  it("is trusted for exactly 15 days from when it was ticked", () => {
    const devices = mfa.addTrustedDevice([], hash, T0);
    expect(mfa.TRUST_DAYS).toBe(15);
    expect(mfa.isDeviceTrusted(devices, hash, T0 + 15 * DAY - 1)).toBe(true);
    expect(mfa.isDeviceTrusted(devices, hash, T0 + 15 * DAY)).toBe(false);
  });

  it("does not trust a missing or unknown token", () => {
    const devices = mfa.addTrustedDevice([], hash, T0);
    expect(mfa.isDeviceTrusted(devices, "", T0)).toBe(false);
    expect(mfa.isDeviceTrusted(devices, mfa.hashDeviceToken("nope"), T0)).toBe(false);
    expect(mfa.isDeviceTrusted(undefined, hash, T0)).toBe(false);
  });

  it("re-trusting replaces the entry and prunes expired ones", () => {
    const other = mfa.hashDeviceToken("other");
    let devices = mfa.addTrustedDevice([], other, T0);
    devices = mfa.addTrustedDevice(devices, hash, T0 + 20 * DAY);
    expect(devices).toHaveLength(1); // `other` expired and was pruned
    devices = mfa.addTrustedDevice(devices, hash, T0 + 21 * DAY);
    expect(devices).toHaveLength(1);
    expect(devices[0].expiresAt).toBe(T0 + 36 * DAY);
  });

  it("reads Firestore Timestamp-like expiry values", () => {
    const devices = [{ hash, expiresAt: { toMillis: () => T0 + HOUR } }];
    expect(mfa.isDeviceTrusted(devices, hash, T0)).toBe(true);
    expect(mfa.pruneTrustedDevices(devices, T0 + 2 * HOUR)).toEqual([]);
  });
});

describe("SMS codes", () => {
  it("generates 6 digits, zero padded", () => {
    expect(mfa.generateSmsCode(() => 42)).toBe("000042");
    expect(mfa.generateSmsCode()).toMatch(/^\d{6}$/);
  });

  it("verifies the right code until it expires, tolerating spaces", () => {
    const c = mfa.createSmsChallenge("123456", T0);
    expect(c.expiresAt).toBe(T0 + 10 * 60 * 1000);
    expect(mfa.verifySmsCode(c, "123456", T0 + 1000)).toBe(true);
    expect(mfa.verifySmsCode(c, "123 456", T0 + 1000)).toBe(true);
    expect(mfa.verifySmsCode(c, "123456", T0 + 10 * 60 * 1000)).toBe(false);
  });

  it("rejects wrong, malformed and missing input", () => {
    const c = mfa.createSmsChallenge("123456", T0);
    expect(mfa.verifySmsCode(c, "654321", T0)).toBe(false);
    expect(mfa.verifySmsCode(c, "12345", T0)).toBe(false);
    expect(mfa.verifySmsCode(c, undefined, T0)).toBe(false);
    expect(mfa.verifySmsCode(null, "123456", T0)).toBe(false);
  });

  it("never stores the plain code", () => {
    expect(mfa.createSmsChallenge("123456", T0).hash).not.toContain("123456");
  });

  it("allows 3 sends per 15 minutes, then a fresh window", () => {
    let s = mfa.registerSmsSend({}, T0);
    expect(s).toEqual({ sendCount: 1, windowStart: T0 });
    s = mfa.registerSmsSend(s, T0 + 1000);
    s = mfa.registerSmsSend(s, T0 + 2000);
    expect(s.sendCount).toBe(3);
    expect(mfa.registerSmsSend(s, T0 + 3000)).toBeNull();
    expect(mfa.registerSmsSend(s, T0 + 15 * 60 * 1000)).toEqual({ sendCount: 1, windowStart: T0 + 15 * 60 * 1000 });
  });
});

describe("backup codes", () => {
  it("generates 10 unique, readable codes", () => {
    const codes = mfa.generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });

  it("consumes a code once and tolerates case, spaces and missing dash", () => {
    const codes = mfa.generateBackupCodes(3);
    const hashes = codes.map((c) => mfa.hashBackupCode(c));
    const typed = codes[1].toLowerCase().replace("-", " ");
    const remaining = mfa.consumeBackupCode(hashes, typed);
    expect(remaining).toHaveLength(2);
    expect(mfa.consumeBackupCode(remaining, typed)).toBeNull(); // second use fails
    expect(mfa.consumeBackupCode(remaining, codes[0])).toHaveLength(1); // others still work
  });

  it("rejects wrong or empty input", () => {
    const hashes = mfa.generateBackupCodes(2).map((c) => mfa.hashBackupCode(c));
    expect(mfa.consumeBackupCode(hashes, "AAAAA-AAAAA")).toBeNull();
    expect(mfa.consumeBackupCode(hashes, "")).toBeNull();
    expect(mfa.consumeBackupCode(undefined, "AAAAA-AAAAA")).toBeNull();
  });

  it("never stores the plain code", () => {
    const code = mfa.generateBackupCodes(1)[0];
    expect(mfa.hashBackupCode(code)).not.toContain(mfa.normaliseBackupCode(code));
  });
});
