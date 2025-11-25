import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import EmailVerification from './EmailVerification';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userProfile, loading, isEmailVerified, role } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated
  if (!currentUser) {
    return <Navigate to="/signin" replace />;
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

  return children;
};

export default ProtectedRoute;
