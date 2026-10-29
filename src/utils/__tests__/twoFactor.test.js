import { describe, it, expect } from 'vitest';
import {
  cleanCodeInput,
  formatBackupCodeInput,
  isBackupCodeComplete,
  isMfaSessionVerified,
  formatLockRemaining,
  backupCodesFileText,
} from '../twoFactor';

describe('code inputs', () => {
  it('keeps only 6 digits for emailed codes', () => {
    expect(cleanCodeInput('12a3 456789')).toBe('123456');
  });
  it('formats backup codes as ABCDE-FGHJK', () => {
    expect(formatBackupCodeInput('abcdefghjk')).toBe('ABCDE-FGHJK');
    expect(formatBackupCodeInput('abcde fghjk')).toBe('ABCDE-FGHJK');
    expect(formatBackupCodeInput('abc')).toBe('ABC');
    expect(isBackupCodeComplete('ABCDE-FGHJK')).toBe(true);
    expect(isBackupCodeComplete('ABCDE-FGH')).toBe(false);
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

describe('backupCodesFileText', () => {
  it('lists every code', () => {
    const text = backupCodesFileText(['AAAAA-BBBBB', 'CCCCC-DDDDD'], 'a@b.com');
    expect(text).toContain('AAAAA-BBBBB');
    expect(text).toContain('CCCCC-DDDDD');
    expect(text).toContain('a@b.com');
  });
});
