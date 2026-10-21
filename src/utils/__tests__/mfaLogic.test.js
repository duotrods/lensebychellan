import { describe, it, expect } from "vitest";
import { createRequire } from "module";

// The authoritative 2FA rules live in functions/ (CommonJS) so the Cloud
// Functions and these tests exercise the same code.
const require = createRequire(import.meta.url);
const mfa = require("../../../functions/mfaLogic.js");

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("normaliseUkMobile", () => {
  it("accepts common UK formats and returns E.164", () => {
    expect(mfa.normaliseUkMobile("07123 456789")).toBe("+447123456789");
    expect(mfa.normaliseUkMobile("+44 7123 456789")).toBe("+447123456789");
    expect(mfa.normaliseUkMobile("0044 (7123) 456-789")).toBe("+447123456789");
    expect(mfa.normaliseUkMobile("447987654321")).toBe("+447987654321");
  });

  it("rejects non-UK, landline, pager and malformed numbers", () => {
    expect(mfa.normaliseUkMobile("+639171234567")).toBeNull(); // PH
    expect(mfa.normaliseUkMobile("020 7946 0958")).toBeNull(); // London landline
    expect(mfa.normaliseUkMobile("07612 345678")).toBeNull(); // 076 pagers
    expect(mfa.normaliseUkMobile("07123 45678")).toBeNull(); // too short
    expect(mfa.normaliseUkMobile("07123 4567890")).toBeNull(); // too long
    expect(mfa.normaliseUkMobile("0712345abcd")).toBeNull();
    expect(mfa.normaliseUkMobile(undefined)).toBeNull();
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

describe("trusted devices (10 logouts)", () => {
  const hash = mfa.hashDeviceToken("device-token");

  it("stays trusted until the 10th logout, then is dropped", () => {
    let devices = [{ hash, logoutCount: 0 }];
    for (let i = 0; i < 9; i++) devices = mfa.registerDeviceLogout(devices, hash);
    expect(devices[0].logoutCount).toBe(9);
    expect(mfa.isDeviceTrusted(devices, hash)).toBe(true);
    devices = mfa.registerDeviceLogout(devices, hash);
    expect(devices).toEqual([]);
    expect(mfa.isDeviceTrusted(devices, hash)).toBe(false);
  });

  it("only touches the matching device", () => {
    const other = mfa.hashDeviceToken("other");
    const devices = mfa.registerDeviceLogout([{ hash, logoutCount: 2 }, { hash: other, logoutCount: 4 }], hash);
    expect(devices.find((d) => d.hash === other).logoutCount).toBe(4);
    expect(devices.find((d) => d.hash === hash).logoutCount).toBe(3);
  });

  it("does not trust a missing or unknown token", () => {
    expect(mfa.isDeviceTrusted([{ hash, logoutCount: 0 }], "")).toBe(false);
    expect(mfa.isDeviceTrusted([{ hash, logoutCount: 0 }], "nope")).toBe(false);
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
