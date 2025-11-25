import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/layout/DashboardLayout';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import StaffDashboard from '../components/dashboard/StaffDashboard';
import ClientDashboard from '../components/dashboard/ClientDashboard';
import { USER_ROLES } from '../utils/constants';

const Dashboard = () => {
  const { role } = useAuth();

  // Redirect to role-specific route
  if (!role) {
    return <Navigate to="/signin" replace />;
  }

  const renderDashboard = () => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return <AdminDashboard />;
      case USER_ROLES.STAFF:
        return <StaffDashboard />;
      case USER_ROLES.CLIENT:
        return <ClientDashboard />;
      default:
        return <Navigate to="/signin" replace />;
    }
  };

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>;
};

export default Dashboard;
