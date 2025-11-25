import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ROLE_LABELS } from '../../utils/constants';
import headerLogo from '../../assets/headerlogo.svg';

const DashboardLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={headerLogo} alt="LensByChellan" className="h-8 w-auto" />
            </Link>
            <div>
              <h5 className="font-bold text-brand-500">LensByChellan Portal</h5>
              <p className="text-sm text-gray-600">
                {ROLE_LABELS[userProfile?.role]} Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{userProfile?.displayName}</p>
              <p className="text-xs text-gray-600">{userProfile?.email}</p>
            </div>
            <button onClick={handleSignOut} className="btn btn-sm btn-outline">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
