import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { authService } from "../../services/authService";
import { getAuthErrorMessage } from "../../utils/errorHandling";
import { DASHBOARD_ROUTES } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";

const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.signInWithEmail(email, password);
      toast.success("Welcome back!");

      // Wait a moment for auth state to update
      setTimeout(() => {
        const dashboardRoute = DASHBOARD_ROUTES[role] || "/dashboard";
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
      // eslint-disable-next-line no-unused-vars
      const { user, isNewUser } = await authService.signInWithGoogle();

      if (isNewUser) {
        // Redirect to role selection page (would need to be implemented)
        toast.error(
          "Google sign-up not yet implemented. Please use email/password."
        );
        await authService.signOut();
      } else {
        toast.success("Welcome back!");
        setTimeout(() => {
          const dashboardRoute = DASHBOARD_ROUTES[role] || "/dashboard";
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
    <div className="w-full max-w-lg p-10 bg-white rounded-xl shadow-lg">
      <h3>Sign In</h3>
      <p className="mb-6 font-medium label label-text">Hello! Let's continue your work with LENSE.</p>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">Email</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input input-lg w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100 mb-2"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">Password</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input input-lg w-full border bg-white border-gray-300 rounded-lg hover:bg-gray-100 "
            required
          />
        </div>

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-xs text-brand-500 hover:text-brand-600"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 border font-semibold border-gray-300 rounded-lg bg-brand-500 hover:bg-brand-600 text-white w-full"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="divider">Or</div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-3 py-3 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-medium text-text">Continue with Google</span>
      </button>

      <p className="mt-6 text-center text-sm">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="text-brand-500 hover:text-brand-600 font-semibold"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
};

export default SignInForm;
