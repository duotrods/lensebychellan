import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import { mfaService } from '../../services/mfaService';
import { useAuth } from '../../hooks/useAuth';
import {
  cleanCodeInput,
  formatLockRemaining,
  backupCodesFileText,
} from '../../utils/twoFactor';
import MfaCard from './MfaCard';

const RESEND_SECONDS = 30;

// First-time two-factor setup: emailed code -> backup codes.
// `onDone` runs once the user has saved their backup codes.
const MfaSetup = ({ onDone }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('start'); // start | code | backup
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [backupCodes, setBackupCodes] = useState([]);
  const [emailed, setEmailed] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const describe = (err) => {
    if (err.code === 'resource-exhausted' && err.lockedUntil) {
      return `Too many wrong codes. Locked for ${formatLockRemaining(err.lockedUntil) || 'a while'}. Contact an administrator to unlock sooner.`;
    }
    if (err.code === 'permission-denied' && typeof err.attemptsRemaining === 'number') {
      return `That code is not right. ${err.attemptsRemaining} attempt${err.attemptsRemaining === 1 ? '' : 's'} left.`;
    }
    return err.message;
  };

  const sendCode = async () => {
    setError('');
    setBusy(true);
    try {
      await mfaService.sendEnrolCode();
      setStep('code');
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const result = await mfaService.confirmEnrol(code);
      setBackupCodes(result.backupCodes);
      setEmailed(result.emailed !== false);
      setStep('backup');
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.success('Backup codes copied');
    } catch {
      toast.error('Could not copy. Use Download instead.');
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([backupCodesFileText(backupCodes, currentUser?.email)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lense-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'backup') {
    return (
      <MfaCard
        title="Save your backup codes"
        subtitle="If you cannot get an emailed code, you can sign in with one of these. Each code works once."
      >
        <div className="grid grid-cols-2 gap-2 mb-4">
          {backupCodes.map((c) => (
            <code key={c} className="bg-gray-100 rounded px-2 py-2 text-sm font-mono">
              {c}
            </code>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={copyCodes} className="btn btn-outline flex-1">Copy</button>
          <button onClick={downloadCodes} className="btn btn-outline flex-1">Download</button>
        </div>

        <p className={`text-sm mb-4 ${emailed ? 'text-gray-500' : 'text-amber-600'}`}>
          {emailed
            ? `A copy was emailed to ${currentUser?.email}. We won't send them again, so store them safely.`
            : "We couldn't email a copy. Copy or download these codes now, because they are shown only once."}
        </p>

        <label className="flex items-center gap-2 justify-center text-sm text-gray-700 mb-4 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
          />
          I have saved my backup codes
        </label>

        <button
          onClick={onDone}
          disabled={!saved}
          className="btn bg-brand-500 hover:bg-brand-600 text-white w-full"
        >
          Continue
        </button>
      </MfaCard>
    );
  }

  return (
    <MfaCard
      title="Set up two-factor authentication"
      subtitle={
        step === 'start'
          ? "We'll email a code to your account address to keep your account secure."
          : `Enter the 6-digit code we emailed to ${currentUser?.email}.`
      }
    >
      {step === 'start' ? (
        <div className="space-y-3 text-left">
          <p className="text-sm text-gray-600">
            The code will be sent to <strong>{currentUser?.email}</strong>.
          </p>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button
            onClick={sendCode}
            disabled={busy}
            className="btn bg-brand-500 hover:bg-brand-600 text-white w-full"
          >
            {busy ? 'Sending...' : 'Email me a code'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
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
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
            autoFocus
          />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button
            onClick={confirm}
            disabled={busy || code.length !== 6}
            className="btn bg-brand-500 hover:bg-brand-600 text-white w-full"
          >
            {busy ? 'Verifying...' : 'Verify and continue'}
          </button>
          <button
            onClick={sendCode}
            disabled={busy || cooldown > 0}
            className="btn btn-outline w-full"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      )}

      <button onClick={() => authService.signOut()} className="btn btn-ghost btn-sm w-full mt-4">
        Sign Out
      </button>
    </MfaCard>
  );
};

export default MfaSetup;
