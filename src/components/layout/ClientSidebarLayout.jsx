import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import {
  LayoutDashboard,
  FileText,
  Video,
  LogOut,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  MonitorCheck,
  FolderOpen,
  Sparkles,
  ChevronDown,
  TrafficCone,
  Signpost,
  Camera,
  Car,
} from "lucide-react";
import headerLogo from "../../assets/headerlogo.svg";
import logomark from "../../assets/Logomark.svg";
import SchemeSwitcher from "../client/SchemeSwitcher";
import { isDemoUser } from "../../utils/schemes";
import { DASHBOARD_ROUTES, USER_ROLES } from "../../utils/constants";
import LogoutConfirmModal from "./LogoutConfirmModal";

// Nav groups start collapsed by default; only labels present (and true) here are expanded.
// Persisted so a group a client opens stays open across a full page refresh.
const SIDEBAR_EXPANDED_GROUPS_KEY = "client_sidebar_expanded_groups";

// A real, clickable nav row — used both inside collapsible groups and standalone.
// textClassName lets a standalone item (e.g. Scheme Documents) opt into darker text.
const NavLinkItem = ({ item, collapsed, active, textClassName = "text-gray-700" }) => (
  <Link
    to={item.path}
    title={collapsed ? item.name : undefined}
    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
      active ? "bg-teal-500 text-white" : `${textClassName} hover:bg-gray-100`
    } ${collapsed ? 'justify-center' : ''}`}
  >
    <item.icon className="w-5 h-5 shrink-0" />
    {!collapsed && <span className="font-medium">{item.name}</span>}
  </Link>
);

// A greyed-out, non-clickable "coming soon" row — used both inside collapsible groups and standalone.
const ComingSoonItem = ({ item, collapsed, showIcon = true, showName = false }) => {
  // Icon-less rows have nothing to show in icon-only (collapsed) mode.
  if (collapsed && !showIcon) return null;

  return (
    <div
      title={`${item.name} — Coming soon`}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 cursor-default select-none ${collapsed ? 'justify-center' : showIcon || showName ? 'justify-between' : 'justify-start'}`}
    >
      {showIcon && <item.icon className="w-5 h-5 shrink-0" />}
      {!collapsed && showName && <span className="font-medium flex-1">{item.name}</span>}
      {!collapsed && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
          Soon
        </span>
      )}
    </div>
  );
};

const ClientSidebarLayout = ({ children, basePath: basePathProp }) => {
  const { userProfile, role } = useAuth();
  const basePath = basePathProp ?? DASHBOARD_ROUTES[role] ?? "/dashboard/client";
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navGroups = [
    {
      label: "CCTV Dashboard",
      items: [
        {
          name: "Dashboard",
          path: basePath,
          icon: LayoutDashboard,
          exact: true,
        },
        {
          name: "Reports",
          path: `${basePath}/reports`,
          icon: FileText,
        },
        {
          name: "CCTV Recordings",
          path: `${basePath}/cctv-recordings`,
          icon: Video,
        },
        {
          name: "CCTV Uptime",
          path: `${basePath}/cctv-uptime`,
          icon: MonitorCheck,
        },
      ],
    },
    {
      label: "Recovery Dashboard",
      items: [],
      // Coming soon items — hidden for third-party clients.
      comingSoon:
        role === USER_ROLES.THIRDPARTYCLIENT
          ? []
          : [
              { name: "Dashboard", icon: LayoutDashboard },
              // { name: "Reports", icon: FileText },
            ],
    },
    {
      label: "Media Dashboard",
      items:
        role === USER_ROLES.THIRDPARTYCLIENT
          ? []
          : [
              {
                name: "Body Cam",
                path: `${basePath}/body-cam`,
                icon: Camera,
              },
              {
                name: "Dash Cam",
                path: `${basePath}/dash-cam`,
                icon: Car,
              },
            ],
    },
    {
      label: "TM Dashboard",
      items: [],
      comingSoon:
        role === USER_ROLES.THIRDPARTYCLIENT
          ? []
          : [{ name: "Dashboard", icon: TrafficCone }],
    },
    {
      label: "VMS Dashboard",
      items: [],
      comingSoon:
        role === USER_ROLES.THIRDPARTYCLIENT
          ? []
          : [{ name: "Dashboard", icon: Signpost }],
    },
  ];

  // Ungrouped nav entries — rendered after all groups, with no collapsible header/chevron.
  const standaloneItems =
    role === USER_ROLES.THIRDPARTYCLIENT
      ? []
      : [{ name: "Scheme Documents", path: `${basePath}/documents`, icon: FolderOpen, emphasize: true }];

  const standaloneComingSoon =
    role === USER_ROLES.THIRDPARTYCLIENT ? [] : [{ name: "Lense Assist", icon: Sparkles }];

  const [expandedGroups, setExpandedGroups] = useState(() => {
    let persisted = {};
    try {
      persisted = JSON.parse(localStorage.getItem(SIDEBAR_EXPANDED_GROUPS_KEY)) ?? {};
    } catch {
      persisted = {};
    }
    // First time a group is seen (no explicit saved preference), auto-expand it
    // if it contains the page the user is currently on.
    const withActiveDefault = { ...persisted };
    navGroups.forEach((group) => {
      if (withActiveDefault[group.label] === undefined) {
        const hasActiveItem = group.items.some((item) => isActive(item.path, item.exact));
        if (hasActiveItem) withActiveDefault[group.label] = true;
      }
    });
    return withActiveDefault;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_GROUPS_KEY, JSON.stringify(expandedGroups));
    } catch {
      // localStorage unavailable (e.g. private browsing) — state just won't persist.
    }
  }, [expandedGroups]);

  const toggleGroup = (label) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await authService.signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={handleSignOut}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white shadow-lg flex flex-col transition-all duration-300 shrink-0 fixed inset-y-0 left-0 z-50 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:z-auto`}>
        {/* Logo */}
        <div className="p-4 border-b flex items-center justify-center">
          {!collapsed ? (
            <Link to={basePath} className="flex items-center">
              <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
            </Link>
          ) : (
            <Link to={basePath} className="flex items-center justify-center">
              <img src={logomark} alt="L" className="h-8 w-8 object-contain" />
            </Link>
          )}
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
              {userProfile?.schemeNames?.[userProfile?.activeSchemeId] ||
               userProfile?.activeSchemeName ||
               userProfile?.schemeName ||
               "Loading..."}
            </p>
            <p className="text-xs text-gray-400">
              {userProfile?.activeSchemeId || userProfile?.schemeId || ""}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-6 overflow-y-auto">
          {navGroups.map((group) => {
            const comingSoon = group.comingSoon ?? [];
            if (group.items.length === 0 && comingSoon.length === 0) return null;
            // Icon-less coming-soon rows render nothing while collapsed — skip the
            // group wrapper too, or it leaves an empty space-y-6 gap in its place.
            if (collapsed && group.items.length === 0) return null;

            // Group collapse is a sidebar-expanded-only affordance — icon-only mode always shows everything.
            const isGroupCollapsed = !collapsed && !expandedGroups[group.label];

            return (
              <div key={group.label}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>
                )}
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isGroupCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <NavLinkItem
                          key={item.name}
                          item={item}
                          collapsed={collapsed}
                          active={isActive(item.path, item.exact)}
                        />
                      ))}

                      {comingSoon.map((item) => (
                        <ComingSoonItem key={item.name} item={item} collapsed={collapsed} showIcon={false} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Ungrouped entries — always visible, no collapsible header */}
          {(standaloneItems.length > 0 || standaloneComingSoon.length > 0) && (
            <div className="space-y-2">
              {standaloneItems.map((item) => (
                <NavLinkItem
                  key={item.name}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item.path, item.exact)}
                  textClassName={item.emphasize ? "text-gray-900" : undefined}
                />
              ))}
              {standaloneComingSoon.map((item) => (
                <ComingSoonItem key={item.name} item={item} collapsed={collapsed} showName />
              ))}
            </div>
          )}
        </nav>

        {/* Scheme Switcher - only when expanded */}
        {!collapsed && (
          <div className="px-4 py-2">
            <SchemeSwitcher />
          </div>
        )}

        {/* Collapse toggle */}
        <div className="px-2 pb-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>

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
            onClick={() => navigate('/help')}
            title={collapsed ? 'Help' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium">Help</span>}
          </button>
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
        <main id="client-main-scroll" className="flex-1 overflow-y-auto bg-gray-50 px-5 py-5 md:px-10 md:py-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientSidebarLayout;
