import { useCallback, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import MfaSetup from './MfaSetup';
import MfaVerify from './MfaVerify';

// Shown by ProtectedRoute until this sign-in has passed two-factor.
// The mode is fixed when the gate mounts: enrolling flips `mfaEnrolled` to true
// mid-flow, and switching screens then would throw away the one-time backup codes.
const MfaGate = () => {
  const { mfaEnrolled, refreshMfa } = useAuth();
  const [mode] = useState(() => (mfaEnrolled ? 'verify' : 'setup'));

  // The mfa Cloud Functions have set the claim; re-read it so the route opens.
  // Stable, so MfaVerify's remembered-browser check runs once.
  const handleDone = useCallback(() => {
    refreshMfa().catch(() => window.location.reload());
  }, [refreshMfa]);

  return mode === 'verify' ? <MfaVerify onDone={handleDone} /> : <MfaSetup onDone={handleDone} />;
};

export default MfaGate;
