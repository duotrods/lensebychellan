import { useAuth } from "../../hooks/useAuth";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import CCTVUptimeDashboard from "../../components/dashboard/CCTVUptimeDashboard";

const CCTVUptimePage = () => {
  const { userProfile } = useAuth();
  const activeScheme = userProfile?.activeSchemeId || userProfile?.schemeId;

  return (
    <ClientSidebarLayout>
      <CCTVUptimeDashboard schemeId={activeScheme} />
    </ClientSidebarLayout>
  );
};

export default CCTVUptimePage;
