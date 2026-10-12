import { useSearchParams } from "react-router-dom";
import { faBuilding, faTowerBroadcast } from "@fortawesome/free-solid-svg-icons";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import AdminTabBar from "../../components/admin/AdminTabBar";
import StaffReportsPage from "./StaffReportsPage";
import ThirdPartyReportsPage from "./ThirdPartyReportsPage";

const TABS = [
  { key: "internal", label: "Staff Reports", icon: faTowerBroadcast, Panel: StaffReportsPage },
  { key: "thirdparty", label: "Third Party Reports", icon: faBuilding, Panel: ThirdPartyReportsPage },
];

// The tab lives in the URL (?tab=thirdparty) so report detail pages can send
// the admin back to the tab they came from.
const AdminReportsPage = () => {
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

export default AdminReportsPage;
