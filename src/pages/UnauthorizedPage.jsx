import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { DASHBOARD_ROUTES } from "../utils/constants";

// Shown when an authenticated user lands on a page their role can't access.
// ProtectedRoute redirects here on a role mismatch — instead of silently
// bouncing to sign-in, we explain and offer a route back to their dashboard.
const UnauthorizedPage = () => {
  const { role } = useAuth();
  const dashboardPath = DASHBOARD_ROUTES[role] || "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          You don&apos;t have access to this page
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Your account role isn&apos;t permitted to view this page. If you think
          this is a mistake, please contact your administrator.
        </p>
        <Link
          to={dashboardPath}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
