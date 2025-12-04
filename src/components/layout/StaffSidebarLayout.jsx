import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import {
  LayoutDashboard,
  FileText,
  Video,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  HelpCircle,
  Search,
  FolderOpen
} from 'lucide-react';
import headerLogo from '../../assets/headerlogo.svg';

const StaffSidebarLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formsOpen, setFormsOpen] = useState(false);

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard/staff',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Forms',
      path: '/dashboard/staff/forms',
      icon: FileText,
      hasSubmenu: true,
      submenu: [
        // { name: 'All Forms', path: '/dashboard/staff/forms' },
        { name: 'CCTV Check Sheet', path: '/dashboard/staff/forms/cctv-check' },
        { name: 'Incident Report', path: '/dashboard/staff/forms/incident-report' },
        { name: 'Daily Logs', path: '/dashboard/staff/forms/daily-logs' },
        { name: 'Asset Damage', path: '/dashboard/staff/forms/asset-damage' }
      ]
    },
    {
      name: 'Reports',
      path: '/dashboard/staff/reports',
      icon: FolderOpen
    },
    {
      name: 'CCTV Uploads',
      path: '/dashboard/staff/cctv-uploads',
      icon: Video
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/dashboard/staff" className="flex items-center">
            <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.hasSubmenu ? (
                <>
                  <button
                    onClick={() => setFormsOpen(!formsOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-teal-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        formsOpen ? 'rotate-180' : ''
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
                              ? 'bg-teal-50 text-teal-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
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
                    isActive(item.path) && item.exact
                      ? 'bg-teal-500 text-white'
                      : isActive(item.path)
                      ? 'bg-teal-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t px-4 py-4 space-y-2">
          <Link
            to="/dashboard/staff/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>

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
        {/* Top Header */}
        <header className="bg-white border-b px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4 ml-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <HelpCircle className="w-6 h-6 text-gray-600" />
              </button>

              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-4 border-l">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {userProfile?.displayName}
                  </p>
                  <p className="text-xs text-gray-500">Staff Member</p>
                </div>
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {userProfile?.displayName?.charAt(0) || 'S'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StaffSidebarLayout;
