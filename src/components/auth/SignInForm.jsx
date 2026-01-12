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
