import { useAuth } from "../hooks/useAuth";
import StaffSidebarLayout from "../components/layout/StaffSidebarLayout";
import ClientSidebarLayout from "../components/layout/ClientSidebarLayout";
import AdminSidebarLayout from "../components/layout/AdminSidebarLayout";
import CCTVOperatorSidebarLayout from "../components/layout/CCTVOperatorSidebarLayout";
import LiveOperatorSidebarLayout from "../components/layout/LiveOperatorSidebarLayout";
import { HelpCircle, Mail, Phone, FileText } from "lucide-react";

const layouts = {
  admin: AdminSidebarLayout,
  staff: StaffSidebarLayout,
  client: ClientSidebarLayout,
  cctvfaultoperator: CCTVOperatorSidebarLayout,
  liveoperator: LiveOperatorSidebarLayout,
  thirdpartystaff: StaffSidebarLayout,
  thirdpartyclient: ClientSidebarLayout,
  thirdpartyliveoperator: LiveOperatorSidebarLayout,
  thirdpartycctvoperator: CCTVOperatorSidebarLayout,
};

const roleBasePaths = {
  admin: "/dashboard/admin",
  staff: "/dashboard/staff",
  client: "/dashboard/client",
  cctvfaultoperator: "/dashboard/cctvoperator",
  liveoperator: "/dashboard/liveoperator",
  thirdpartystaff: "/dashboard/thirdparty/staff",
  thirdpartyclient: "/dashboard/thirdparty/client",
  thirdpartyliveoperator: "/dashboard/thirdparty/liveoperator",
  thirdpartycctvoperator: "/dashboard/thirdparty/cctvoperator",
};

const HelpPage = () => {
  const { userProfile } = useAuth();
  const role = userProfile?.role || "staff";
  const Layout = layouts[role] || StaffSidebarLayout;
  const basePath = roleBasePaths[role] || "/dashboard/staff";

  return (
    <Layout basePath={basePath}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-teal-50 rounded-xl">
            <HelpCircle className="w-8 h-8 text-teal-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-sm text-gray-500 mt-0.5">Get help using the Chellan Lense platform</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Getting Started</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Welcome to Lense by Chellan. Use the sidebar to navigate between pages. Each section is tailored to your role and scheme.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Support</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Mail className="w-5 h-5 text-teal-500 shrink-0" />
                <span>support@chellan.co.uk</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Phone className="w-5 h-5 text-teal-500 shrink-0" />
                <span>+44 (0) 000 000 0000</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Links</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span>User guide — coming soon</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span>FAQs — coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HelpPage;
