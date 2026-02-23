import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import {
  LayoutDashboard,
  FileText,
  Video,
  LogOut,
  ChevronDown,
} from "lucide-react";
import headerLogo from "../../assets/headerlogo.svg";
import CCTVCheckReminder from "../staff/CCTVCheckReminder";
import { useCCTVReminder } from "../../hooks/useCCTVReminder";
import { isDemoUser } from "../../utils/schemes";

const StaffSidebarLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formsOpen, setFormsOpen] = useState(false);
  const { showReminder, dismissReminder } = useCCTVReminder();

const handleSignOut = async () => {
    await authService.signOut();
    navigate("/");
  };

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard/staff",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Forms",
      path: "/dashboard/staff/forms",
      icon: FileText,
      hasSubmenu: true,
      submenu: [
        // { name: 'All Forms', path: '/dashboard/staff/forms' },
        { name: "CCTV Check Sheet", path: "/dashboard/staff/forms/cctv-check" },
        {
          name: "Incident Report",
          path: "/dashboard/staff/forms/incident-report",
        },
        {
          name: "Daily Occurrence",
          path: "/dashboard/staff/forms/daily-occurence",
        },
        { name: "Asset Damage", path: "/dashboard/staff/forms/asset-damage" },
        { name: "CCTV Faults", path: "/dashboard/staff/forms/cctv-faults" },
      ],
    },
    {
      name: "CCTV Uploads",
      path: "/dashboard/staff/cctv-uploads",
      icon: Video,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* CCTV Check Reminder Modal */}
      {showReminder && <CCTVCheckReminder onDismiss={dismissReminder} />}

      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/dashboard/staff" className="flex items-center">
            <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
          </Link>
        </div>

        {/* Demo Mode Badge */}
        {isDemoUser(userProfile) && (
          <div className="mx-4 mt-4 px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg">
            <p className="text-xs font-bold text-amber-800 text-center uppercase tracking-wide">
              Demo Mode
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.hasSubmenu ? (
                <>
                  <button
                    onClick={() => setFormsOpen(!formsOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path, item.exact)
                        ? "bg-teal-500 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        formsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {formsOpen && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                            location.pathname === subItem.path
                              ? "bg-teal-50 text-teal-600 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path, item.exact)
                      ? "bg-teal-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t px-4 py-4">
          {/* User Profile */}
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
              {userProfile?.displayName?.charAt(0) || "S"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {userProfile?.displayName}
              </p>
              <p className="text-xs text-gray-500">Staff Member</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StaffSidebarLayout;
