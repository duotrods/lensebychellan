import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { authService } from "../../services/authService";
import { getAuthErrorMessage } from "../../utils/errorHandling";
import { USER_ROLES, ROLE_LABELS } from "../../utils/constants";

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: USER_ROLES.CLIENT,
    company: "",
    phone: "",
    otpCode: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password should be at least 6 characters");
      return;
    }

    // Validate OTP code for clients
    if (formData.role === USER_ROLES.CLIENT && !formData.otpCode.trim()) {
      toast.error("Scheme Access Code is required for client registration");
      return;
    }

    setLoading(true);

    try {
      // eslint-disable-next-line no-unused-vars
      const { password, confirmPassword, otpCode, ...userData } = formData;

      // Use different auth method based on role
      if (formData.role === USER_ROLES.CLIENT) {
        await authService.signUpClientWithOTP(
          formData.email,
          formData.password,
          userData,
          formData.otpCode
        );
      } else {
        await authService.signUpWithEmail(
          formData.email,
          formData.password,
          userData
        );
      }

      toast.success("Account created! Please verify your email.");
      navigate("/signin");
    } catch (error) {
      toast.error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-10 bg-white rounded-xl shadow-lg">
      <h3>Create Account</h3>
      <p className="mb-6 font-medium label label-text">
        Let's create your account for LENSE.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">Full Name</span>
          </label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="input  w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">Email</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input  w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">Password</span>
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
            minLength={6}
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Confirm Password
            </span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="input  w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">I am a:</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="select w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
            required
          >
            <option value={USER_ROLES.CLIENT}>
              {ROLE_LABELS[USER_ROLES.CLIENT]}
            </option>
            <option value={USER_ROLES.STAFF}>
              {ROLE_LABELS[USER_ROLES.STAFF]}
            </option>
          </select>
        </div>

        {formData.role === USER_ROLES.CLIENT && (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Scheme Access Code
                </span>
              </label>
              <input
                type="text"
                name="otpCode"
                value={formData.otpCode}
                onChange={handleChange}
                placeholder="e.g., A417-2024-ABC123"
                className="input w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                required
              />
              <label className="label">
                <span className="label-text-alt text-gray-500">
                  Enter the access code provided by your administrator
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Company Name
                </span>
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="input  w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                required
              />
            </div>
          </>
        )}

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Phone Number (Optional)
            </span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="input  w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 border border-gray-300 rounded-lg font-semibold bg-brand-500 hover:bg-brand-600 text-white w-full"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link
          to="/signin"
          className="text-brand-500 hover:text-brand-600 font-semibold"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
};

export default SignUpForm;
