import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { CheckCircle, XCircle, Loader2, Mail, KeyRound } from 'lucide-react';
import headerLogo from '../../assets/headerlogo.svg';

const AuthActionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('');

  // For password reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const handleAction = async () => {
      const actionMode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      setMode(actionMode);

      if (!oobCode) {
        setStatus('error');
        setMessage('Invalid or missing action code.');
        return;
      }

      try {
        switch (actionMode) {
          case 'verifyEmail':
            await applyActionCode(auth, oobCode);
            // If the user is already signed in, force-refresh their token so
            // Firestore rules see email_verified: true without needing to sign out.
            if (auth.currentUser) {
              await auth.currentUser.reload();
              await auth.currentUser.getIdToken(true);
            }
            setStatus('success');
            setMessage('Your email has been verified successfully!');
            break;

          case 'resetPassword':
            // Verify the code and get the email
            const userEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(userEmail);
            setStatus('resetPassword');
            break;

          case 'recoverEmail':
            await applyActionCode(auth, oobCode);
            setStatus('success');
            setMessage('Your email has been recovered successfully!');
            break;

          default:
            setStatus('error');
            setMessage('Unknown action type.');
        }
      } catch (error) {
        console.error('Auth action error:', error);
        setStatus('error');

        switch (error.code) {
          case 'auth/expired-action-code':
            setMessage('This link has expired. Please request a new one.');
            break;
          case 'auth/invalid-action-code':
            setMessage('This link is invalid or has already been used.');
            break;
          case 'auth/user-disabled':
            setMessage('This account has been disabled.');
            break;
          case 'auth/user-not-found':
            setMessage('No account found with this email.');
            break;
          default:
            setMessage('An error occurred. Please try again.');
        }
      }
    };

    handleAction();
  }, [searchParams]);

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setIsResetting(true);
    const oobCode = searchParams.get('oobCode');

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      setMessage('Your password has been reset successfully!');
    } catch (error) {
      console.error('Password reset error:', error);
      setStatus('error');
      setMessage('Failed to reset password. The link may have expired.');
    } finally {
      setIsResetting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'verifyEmail':
        return 'Email Verification';
      case 'resetPassword':
        return 'Reset Password';
      case 'recoverEmail':
        return 'Email Recovery';
      default:
        return 'Account Action';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'verifyEmail':
        return <Mail className="w-8 h-8" />;
      case 'resetPassword':
        return <KeyRound className="w-8 h-8" />;
      default:
        return <Mail className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={headerLogo} alt="Lens by Chellan" className="h-12 mx-auto mb-4" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Title */}
          {/* <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-teal-100 rounded-full text-teal-600">
              {getIcon()}
            </div>
          </div> */}  
          <h3 className="text-2xl font-bold text-gray-800 text-center mb-6">
            {getTitle()}
          </h3>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Processing your request...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-gray-700 mb-6">{message}</p>
              <button
                onClick={() => navigate('/signin')}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-gray-700 mb-6">{message}</p>
              <button
                onClick={() => navigate('/signin')}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Password Reset Form */}
          {status === 'resetPassword' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <p className="text-gray-600 text-center mb-4">
                Enter a new password for <strong>{email}</strong>
              </p>

              {message && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Need help? Contact support.
        </p>
      </div>
    </div>
  );
};

export default AuthActionPage;
