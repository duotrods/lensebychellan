import { useState, useEffect } from "react";
import LogoutConfirmModal from "./LogoutConfirmModal";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import {
  LayoutDashboard,
  FileText,
  Video,
  LogOut,
  ChevronDown,
  CameraOff,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import headerLogo from "../../assets/headerlogo.svg";
import CCTVCheckReminder from "../staff/CCTVCheckReminder";
import { useCCTVReminder } from "../../hooks/useCCTVReminder";
import { isDemoUser } from "../../utils/schemes";
import { StaffCCTVFaultsProvider, useStaffCCTVFaultsContext } from "../../context/StaffCCTVFaultsContext";

const StaffSidebarLayoutInner = ({ children }) => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formsOpen, setFormsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  const { showReminder, dismissReminder } = useCCTVReminder();
  const { faults: liveFaults } = useStaffCCTVFaultsContext();

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
        { name: "CCTV Check Sheet", path: "/dashboard/staff/forms/cctv-check" },
        { name: "Incident Report", path: "/dashboard/staff/forms/incident-report" },
        { name: "Daily Occurrence", path: "/dashboard/staff/forms/daily-occurence" },
        { name: "Asset Damage", path: "/dashboard/staff/forms/asset-damage" },
        { name: "CCTV Faults", path: "/dashboard/staff/forms/cctv-faults" },
      ],
    },
    {
      name: "CCTV Faults",
      path: "/dashboard/staff/cctv-faults",
      icon: CameraOff,
      liveCount: liveFaults.length,
    },
    {
      name: "CCTV Uploads",
      path: "/dashboard/staff/cctv-uploads",
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
      {/* CCTV Check Reminder Modal */}
      {showReminder && <CCTVCheckReminder onDismiss={dismissReminder} />}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white shadow-lg flex flex-col transition-all duration-300 shrink-0 fixed inset-y-0 left-0 z-50 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:z-auto`}>
        {/* Logo + toggle */}
        <div className="p-4 border-b flex items-center justify-between">
          {!collapsed && (
            <Link to="/dashboard/staff" className="flex items-center">
              <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard/staff" className="flex items-center justify-center w-full">
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

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.hasSubmenu ? (
                <>
                  {collapsed ? (
                    /* When collapsed, Forms shows as a plain icon link to first submenu item */
                    <Link
                      to={item.submenu[0].path}
                      title="Forms"
                      className={`flex items-center justify-center px-3 py-3 rounded-lg transition-colors ${
                        isActive(item.path, item.exact)
                          ? "bg-teal-500 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => setFormsOpen(!formsOpen)}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
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
                          className={`w-4 h-4 transition-transform ${formsOpen ? "rotate-180" : ""}`}
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
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive(item.path, item.exact)
                      ? "bg-teal-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="font-medium flex-1">{item.name}</span>}
                  {/* Live count badge */}
                  {item.liveCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full shrink-0">
                      {item.liveCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t px-2 py-4">
          {!collapsed && (
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
          )}
          {collapsed && (
            <div className="flex justify-center mb-2 py-1">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                {userProfile?.displayName?.charAt(0) || "S"}
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
        {/* Mobile top bar */}
        <div className="md:hidden bg-white border-b px-5 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded-lg hover:bg-gray-100">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <img src={headerLogo} alt="Lens by Chellan" className="h-7" />
        </div>
        <main className="flex-1 overflow-y-auto bg-gray-50 px-5 py-5 md:px-10 md:py-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

const StaffSidebarLayout = ({ children }) => (
  <StaffCCTVFaultsProvider>
    <StaffSidebarLayoutInner>{children}</StaffSidebarLayoutInner>
  </StaffCCTVFaultsProvider>
);

export default StaffSidebarLayout;
