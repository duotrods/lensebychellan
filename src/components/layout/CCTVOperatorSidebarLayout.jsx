import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import { CameraOff, LogOut } from "lucide-react";
import headerLogo from "../../assets/headerlogo.svg";
import LogoutConfirmModal from "./LogoutConfirmModal";
import SchemeSwitcher from "../client/SchemeSwitcher";

const CCTVOperatorSidebarLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = async () => {
    await authService.signOut();
    navigate("/");
  };

  const activeSchemeId = userProfile?.activeSchemeId || userProfile?.schemeId;
  const activeSchemeName =
    userProfile?.schemeNames?.[activeSchemeId] ||
    userProfile?.schemeName ||
    "Loading...";

  return (
    <div className="flex h-screen bg-gray-50">
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={handleSignOut}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <img src={headerLogo} alt="Lens by Chellan" className="h-8" />
        </div>

        {/* Role badge */}
        <div className="px-6 py-4 bg-pink-50 border-b">
          <div className="flex items-center gap-2 mb-1">
            <CameraOff className="w-4 h-4 text-pink-500" />
            <p className="text-xs text-pink-600 uppercase tracking-wide font-semibold">
              CCTV Fault Operator
            </p>
          </div>
          <p className="text-lg font-bold text-gray-800">
            {activeSchemeId || "N/A"}
          </p>
          <p className="text-sm text-gray-500">{activeSchemeName}</p>
        </div>

        {/* Spacer — no nav links for this role */}
        <div className="flex-1" />

        {/* Scheme Switcher - only shown when multiple schemes assigned */}
        {userProfile?.schemeIds?.length > 1 && (
          <div className="px-4 py-3 border-t">
            <SchemeSwitcher />
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="border-t px-4 py-4">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
              {userProfile?.displayName?.charAt(0) || "O"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {userProfile?.displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">CCTV Fault Operator</p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
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

export default CCTVOperatorSidebarLayout;
