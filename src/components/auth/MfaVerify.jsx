import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import { mfaService } from '../../services/mfaService';
import { useAuth } from '../../hooks/useAuth';
import {
  cleanCodeInput,
  formatBackupCodeInput,
  isBackupCodeComplete,
  formatLockRemaining,
  toMillis,
} from '../../utils/twoFactor';
import LoadingSpinner from '../common/LoadingSpinner';
import MfaCard from './MfaCard';

const RESEND_SECONDS = 30;

// Sign-in code screen for users who already set up 2FA. `onDone` runs when verified.
const MfaVerify = ({ onDone }) => {
  const { userProfile } = useAuth();
  const [checking, setChecking] = useState(true); // looking for a remembered browser
  const [sent, setSent] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [errorLockedUntil, setErrorLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    mfaService
      .tryTrustedDevice()
      .then((result) => {
        if (cancelled) return;
        if (result.success) onDone();
        else setChecking(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.lockedUntil) setErrorLockedUntil(toMillis(err.lockedUntil));
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onDone]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const lockedUntil = Math.max(errorLockedUntil, toMillis(userProfile?.mfaLockedUntil));
  const lockText = lockedUntil > now ? formatLockRemaining(lockedUntil, now) : null;

  const describe = (err) => {
    if (err.lockedUntil) setErrorLockedUntil(toMillis(err.lockedUntil));
    if (err.code === 'resource-exhausted' && err.lockedUntil) return '';
    if (err.code === 'permission-denied' && typeof err.attemptsRemaining === 'number') {
      return `That code is not right. ${err.attemptsRemaining} attempt${err.attemptsRemaining === 1 ? '' : 's'} left.`;
    }
    return err.message;
  };

  const sendCode = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await mfaService.sendLoginCode();
      setEmailHint(result.emailHint || '');
      setSent(true);
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (useBackup) await mfaService.verifyBackupCode(backupCode, trust);
      else await mfaService.verifyCode(code, trust);
      onDone();
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  };

  if (checking) return <LoadingSpinner />;

  const canSubmit = useBackup ? isBackupCodeComplete(backupCode) : code.length === 6;

  if (lockText) {
    return (
      <MfaCard
        title="Account locked"
        subtitle={`Too many wrong codes. You can try again in ${lockText}, or ask an administrator to unlock it.`}
      >
        <button onClick={() => authService.signOut()} className="btn btn-outline w-full">
          Sign Out
        </button>
      </MfaCard>
    );
  }

  return (
    <MfaCard
      title="Two-factor authentication"
      subtitle={
        useBackup
          ? 'Enter one of your backup codes. Each code works once.'
          : sent
            ? `Enter the 6-digit code we emailed to ${emailHint || 'your email address'}.`
            : "We'll email a code to confirm it's you."
      }
    >
      <div className="space-y-3">
        {useBackup ? (
          <input
            type="text"
            autoComplete="off"
            placeholder="ABCDE-FGHJK"
            aria-label="Backup code"
            className="input input-bordered w-full text-center text-lg font-mono tracking-widest"
            value={backupCode}
            onChange={(e) => setBackupCode(formatBackupCodeInput(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
            autoFocus
          />
        ) : sent ? (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            aria-label="6-digit code"
            className="input input-bordered w-full text-center text-xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(cleanCodeInput(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
            autoFocus
          />
        ) : null}

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        {(useBackup || sent) && (
          <>
            <label className="flex items-center gap-2 justify-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={trust}
                onChange={(e) => setTrust(e.target.checked)}
              />
              Remember this browser for 15 days
            </label>
            <button
              onClick={submit}
              disabled={busy || !canSubmit}
              className="btn bg-brand-500 hover:bg-brand-600 text-white w-full"
            >
              {busy ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}

        {!useBackup && (
          <button
            onClick={sendCode}
            disabled={busy || cooldown > 0}
            className={`btn w-full ${sent ? 'btn-outline' : 'bg-brand-500 hover:bg-brand-600 text-white'}`}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : sent ? 'Resend code' : busy ? 'Sending...' : 'Email me a code'}
          </button>
        )}

        <button
          onClick={() => { setUseBackup((v) => !v); setError(''); }}
          className="btn btn-ghost w-full"
        >
          {useBackup ? 'Use an emailed code instead' : "Can't get the email? Use a backup code"}
        </button>

        <button onClick={() => authService.signOut()} className="btn btn-ghost btn-sm w-full">
          Sign Out
        </button>
      </div>
    </MfaCard>
  );
};

export default MfaVerify;
