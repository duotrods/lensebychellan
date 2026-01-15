import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import {
  LayoutDashboard,
  KeyRound,
  FolderKanban,
  FileText,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react";
import headerLogo from "../../assets/headerlogo.svg";

const AdminSidebarLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      path: "/dashboard/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Access Code",
      path: "/dashboard/admin/otp-management",
      icon: KeyRound,
    },
    {
      name: "Assign Schemes",
      path: "/dashboard/admin/scheme-assignment",
      icon: FolderKanban,
    },
    {
      name: "Staff Management",
      path: "/dashboard/admin/staff-management",
      icon: Users,
    },
    {
      name: "Staff Reports",
      path: "/dashboard/admin/staff-reports",
      icon: FileText,
    },
    {
      name: "Client Charts",
      path: "/dashboard/admin/client-charts",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/dashboard/admin" className="flex items-center">
            <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
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
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t px-4 py-4">
          {/* User Profile */}
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
              {userProfile?.displayName?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {userProfile?.displayName}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
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

export default AdminSidebarLayout;
