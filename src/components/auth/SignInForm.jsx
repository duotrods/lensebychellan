import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";
import { firestoreService } from "../../services/firestoreService";
import { getAuthErrorMessage } from "../../utils/errorHandling";
import { DASHBOARD_ROUTES } from "../../utils/constants";

const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await authService.signInWithEmail(email, password);
      const profile = await firestoreService.getUserDocument(user.uid);
      // Fire-and-forget — don't block navigation for logging
      firestoreService.logUserLogin(user.uid, profile?.displayName, user.email, profile?.role).catch(console.error);
      toast.success("Welcome back!");
      const dashboardRoute = DASHBOARD_ROUTES[profile?.role] || "/dashboard";
      navigate(dashboardRoute);
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-lg w-full border bg-white border-gray-300 rounded-lg hover:bg-gray-100 pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
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
