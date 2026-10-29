import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// Wrappers around the two-factor Cloud Functions (functions/mfa.js).
// "Remember this browser" works with a random token kept in localStorage; the server
// only stores its hash and a 15-day expiry.

const DEVICE_TOKEN_KEY = 'mfaDeviceToken';

export function getDeviceToken() {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null; // storage blocked: the browser just can't be remembered
  }
}

// Turn a callable error into one with the fields the UI needs.
function toMfaError(error) {
  const err = new Error(error?.message || 'Something went wrong. Please try again.');
  err.code = String(error?.code || '').replace('functions/', '');
  err.attemptsRemaining = error?.details?.attemptsRemaining;
  err.lockedUntil = error?.details?.lockedUntil;
  return err;
}

async function call(name, data) {
  try {
    const result = await httpsCallable(functions, name)(data);
    return result.data;
  } catch (error) {
    throw toMfaError(error);
  }
}

export const mfaService = {
  sendEnrolCode: () => call('mfaSendEnrolCode', {}),

  // Resolves { backupCodes, emailed }. The codes are shown once and never returned again.
  confirmEnrol: (code) => call('mfaConfirmEnrol', { code }),

  sendLoginCode: () => call('mfaSendLoginCode', {}),

  // Skips the code when this browser was remembered. Resolves { success: true } or
  // { success: false, status: 'code_required' }. Never counts as a failed attempt.
  tryTrustedDevice: () => call('mfaVerify', { deviceToken: getDeviceToken() }),

  verifyCode: (code, trustDevice) =>
    call('mfaVerify', { code, trustDevice: !!trustDevice, deviceToken: getDeviceToken() }),

  verifyBackupCode: (backupCode, trustDevice) =>
    call('mfaVerify', { backupCode, trustDevice: !!trustDevice, deviceToken: getDeviceToken() }),

  // Admin only
  adminUnlock: (targetUid) => call('mfaAdminUnlock', { targetUid }),
  adminReset: (targetUid) => call('mfaAdminReset', { targetUid }),
};
