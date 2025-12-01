import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/layout/DashboardLayout';
import StaffSidebarLayout from '../components/layout/StaffSidebarLayout';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import NewStaffDashboard from '../components/dashboard/NewStaffDashboard';
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
        return (
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        );
      case USER_ROLES.STAFF:
        return (
          <StaffSidebarLayout>
            <NewStaffDashboard />
          </StaffSidebarLayout>
        );
      case USER_ROLES.CLIENT:
        return (
          <DashboardLayout>
            <ClientDashboard />
          </DashboardLayout>
        );
      default:
        return <Navigate to="/signin" replace />;
    }
  };

  return renderDashboard();
};

export default Dashboard;
