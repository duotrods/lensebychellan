import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import {
  LayoutDashboard,
  FileText,
  Video,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import headerLogo from "../../assets/headerlogo.svg";
import SchemeSwitcher from "../client/SchemeSwitcher";
import { isDemoUser } from "../../utils/schemes";
import LogoutConfirmModal from "./LogoutConfirmModal";

const ClientSidebarLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
      path: "/dashboard/client",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Reports",
      path: "/dashboard/client/reports",
      icon: FileText,
    },
    {
      name: "CCTV Recordings",
      path: "/dashboard/client/cctv-recordings",
      icon: Video,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={handleSignOut}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white shadow-lg flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo + toggle */}
        <div className="p-4 border-b flex items-center justify-between">
          {!collapsed && (
            <Link to="/dashboard/client" className="flex items-center">
              <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard/client" className="flex items-center justify-center w-full">
              <img src={headerLogo} alt="L" className="h-6 w-6 object-contain" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0 ${collapsed ? 'mx-auto' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Demo Mode Badge */}
        {!collapsed && isDemoUser(userProfile) && (
          <div className="mx-4 mt-4 px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg">
            <p className="text-xs font-bold text-amber-800 text-center uppercase tracking-wide">
              Demo Mode
            </p>
          </div>
        )}

        {/* Scheme Info */}
        {!collapsed && (
          <div className="px-6 py-4 bg-teal-50 border-b">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {userProfile?.schemeIds?.length > 1 ? "Active Scheme" : "Your Scheme"}
            </p>
            <p className="text-lg font-bold text-teal-700">
              {userProfile?.activeSchemeId || userProfile?.schemeId || "N/A"}
            </p>
            <p className="text-sm text-gray-600">
              {userProfile?.schemeNames?.[userProfile?.activeSchemeId] ||
               userProfile?.schemeName ||
               "Loading..."}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive(item.path, item.exact)
                  ? "bg-teal-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Scheme Switcher - only when expanded */}
        {!collapsed && (
          <div className="px-4 py-2">
            <SchemeSwitcher />
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="border-t px-2 py-4">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-3 mb-2">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                {userProfile?.displayName?.charAt(0) || "C"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {userProfile?.displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.company}
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center mb-2 py-1">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                {userProfile?.displayName?.charAt(0) || "C"}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogoutModal(true)}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientSidebarLayout;
