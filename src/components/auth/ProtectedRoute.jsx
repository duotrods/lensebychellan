import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import EmailVerification from './EmailVerification';
import SecurityWarningModal from './SecurityWarningModal';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userProfile, loading, isEmailVerified, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated — preserve the original URL so we can redirect back after login
  if (!currentUser) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signin?redirect=${redirectTo}`} replace />;
  }

  // Email not verified
  if (!isEmailVerified) {
    return <EmailVerification />;
  }

  // No user profile (shouldn't happen, but safety check)
  if (!userProfile) {
    return <Navigate to="/signin" replace />;
  }

  // Role-based access control
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <>
      {children}
      <SecurityWarningModal role={role} />
    </>
  );
};

export default ProtectedRoute;
