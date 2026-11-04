import { describe, it, expect } from 'vitest';
import {
  cleanCodeInput,
  isMfaSessionVerified,
  formatLockRemaining,
} from '../twoFactor';

describe('code inputs', () => {
  it('keeps only 6 digits for emailed codes', () => {
    expect(cleanCodeInput('12a3 456789')).toBe('123456');
  });
});

describe('isMfaSessionVerified', () => {
  it('needs mfaAuthTime to match this sign-in', () => {
    expect(isMfaSessionVerified({ mfaAuthTime: 100, auth_time: 100 })).toBe(true);
    expect(isMfaSessionVerified({ mfaAuthTime: 100, auth_time: 200 })).toBe(false);
    expect(isMfaSessionVerified({ auth_time: 200 })).toBe(false);
    expect(isMfaSessionVerified(null)).toBe(false);
  });
});

describe('formatLockRemaining', () => {
  const now = 1_700_000_000_000;
  it('formats hours and minutes, rounding up', () => {
    expect(formatLockRemaining(now + 12 * 3600e3, now)).toBe('12h 0m');
    expect(formatLockRemaining(now + 42 * 60e3 - 1000, now)).toBe('42m');
  });
  it('is null when not locked, and reads Timestamp-like values', () => {
    expect(formatLockRemaining(now - 1, now)).toBeNull();
    expect(formatLockRemaining(null, now)).toBeNull();
    expect(formatLockRemaining({ toMillis: () => now + 3600e3 }, now)).toBe('1h 0m');
  });
});
