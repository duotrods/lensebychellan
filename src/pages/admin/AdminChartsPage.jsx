import { useSearchParams } from "react-router-dom";
import { faBuilding, faTowerBroadcast } from "@fortawesome/free-solid-svg-icons";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import AdminTabBar from "../../components/admin/AdminTabBar";
import ClientChartsPage from "./ClientChartsPage";
import ThirdPartyChartsPage from "./ThirdPartyChartsPage";

const TABS = [
  { key: "internal", label: "Client Charts", icon: faTowerBroadcast, Panel: ClientChartsPage },
  { key: "thirdparty", label: "Third Party Charts", icon: faBuilding, Panel: ThirdPartyChartsPage },
];

const AdminChartsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = TABS.find((t) => t.key === searchParams.get("tab")) || TABS[0];
  const { Panel } = active;

  return (
    <AdminSidebarLayout>
      <AdminTabBar
        tabs={TABS}
        activeKey={active.key}
        onChange={(key) => setSearchParams(key === "internal" ? {} : { tab: key })}
      />
      <Panel key={active.key} />
    </AdminSidebarLayout>
  );
};

export default AdminChartsPage;
