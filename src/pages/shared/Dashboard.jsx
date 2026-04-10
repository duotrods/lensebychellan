import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import LiveOperatorSidebarLayout from "../../components/layout/LiveOperatorSidebarLayout";
import CCTVOperatorSidebarLayout from "../../components/layout/CCTVOperatorSidebarLayout";
import ThirdPartyAdminSidebarLayout from "../../components/layout/ThirdPartyAdminSidebarLayout";
import AdminDashboard from "../../components/dashboard/AdminDashboard";
import NewStaffDashboard from "../../components/dashboard/NewStaffDashboard";
import NewClientDashboard from "../../components/dashboard/NewClientDashboard";
import LiveOperatorDashboard from "../../components/dashboard/LiveOperatorDashboard";
import LiveCameraFaultsPage from "../../components/dashboard/CCTVFaultOperatorDashboard";
import ThirdPartyAdminDashboard from "../../components/thirdparty/ThirdPartyAdminDashboard";
import { USER_ROLES } from "../../utils/constants";

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
          <AdminSidebarLayout>
            <AdminDashboard />
          </AdminSidebarLayout>
        );
      case USER_ROLES.STAFF:
        return (
          <StaffSidebarLayout>
            <NewStaffDashboard />
          </StaffSidebarLayout>
        );
      case USER_ROLES.CLIENT:
        return (
          <ClientSidebarLayout>
            <NewClientDashboard />
          </ClientSidebarLayout>
        );
      case USER_ROLES.LIVEOPERATOR:
        return (
          <LiveOperatorSidebarLayout>
            <LiveOperatorDashboard />
          </LiveOperatorSidebarLayout>
        );
      case USER_ROLES.CCTVOPERATOR:
        return (
          <CCTVOperatorSidebarLayout>
            <LiveCameraFaultsPage
              hideDashboardLink
              faultBasePath="/dashboard/cctvoperator/cctv-fault"
            />
          </CCTVOperatorSidebarLayout>
        );
      case USER_ROLES.THIRDPARTYADMIN:
        return (
          <ThirdPartyAdminSidebarLayout>
            <ThirdPartyAdminDashboard />
          </ThirdPartyAdminSidebarLayout>
        );
      case USER_ROLES.THIRDPARTYOPERATOR:
        return (
          <StaffSidebarLayout basePath="/dashboard/thirdparty/operator">
            <NewStaffDashboard />
          </StaffSidebarLayout>
        );
      case USER_ROLES.THIRDPARTYCLIENT:
        return (
          <ClientSidebarLayout basePath="/dashboard/thirdparty/client">
            <NewClientDashboard />
          </ClientSidebarLayout>
        );
      case USER_ROLES.THIRDPARTYLIVEOPERATOR:
        return (
          <LiveOperatorSidebarLayout basePath="/dashboard/thirdparty/liveoperator">
            <LiveOperatorDashboard />
          </LiveOperatorSidebarLayout>
        );
      case USER_ROLES.THIRDPARTYCCTVOPERATOR:
        return (
          <CCTVOperatorSidebarLayout basePath="/dashboard/thirdparty/cctvoperator">
            <LiveCameraFaultsPage
              hideDashboardLink
              faultBasePath="/dashboard/thirdparty/cctvoperator/cctv-fault"
            />
          </CCTVOperatorSidebarLayout>
        );
      default:
        return <Navigate to="/signin" replace />;
    }
  };

  return renderDashboard();
};

export default Dashboard;
