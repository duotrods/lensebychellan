import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import { getAuthErrorMessage } from '../../utils/errorHandling';
import { DASHBOARD_ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.signInWithEmail(email, password);
      toast.success('Welcome back!');

      // Wait a moment for auth state to update
      setTimeout(() => {
        const dashboardRoute = DASHBOARD_ROUTES[role] || '/dashboard';
        navigate(dashboardRoute);
      }, 500);
    } catch (error) {
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const { user, isNewUser } = await authService.signInWithGoogle();

      if (isNewUser) {
        // Redirect to role selection page (would need to be implemented)
        toast.error('Google sign-up not yet implemented. Please use email/password.');
        await authService.signOut();
      } else {
        toast.success('Welcome back!');
        setTimeout(() => {
          const dashboardRoute = DASHBOARD_ROUTES[role] || '/dashboard';
          navigate(dashboardRoute);
        }, 500);
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
      <h2 className="mb-6 text-center">Sign In</h2>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Email</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Password</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn bg-brand-500 hover:bg-brand-600 text-white w-full"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="divider">OR</div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="btn btn-outline w-full"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm">
        Don't have an account?{' '}
        <Link to="/signup" className="text-brand-500 hover:text-brand-600 font-semibold">
          Sign Up
        </Link>
      </p>
    </div>
  );
};

export default SignInForm;
