import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Key, Users } from 'lucide-react';
import UserManagement from '../admin/UserManagement';
import LoginLogs from '../admin/LoginLogs';

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // Same query key UserManagement uses for its counts — shares one cached
  // read across both instead of fetching the same data twice.
  const countsQuery = useQuery({
    queryKey: ['userCounts'],
    queryFn: () => firestoreService.getUsersCountByRole(),
  });
  const roleCounts = countsQuery.data ?? { total: 0, staff: 0, client: 0, thirdpartystaff: 0 };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="text-gray-600">Welcome back, {userProfile?.displayName}!</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard/admin/otp-management')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
          >
            <Key className="w-4 h-4" />
            Manage Access Codes
          </button>
          <button
            onClick={() => navigate('/dashboard/admin/scheme-assignment')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            Assign Schemes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h6 className="text-gray-600 mb-2">Total Users</h6>
          <p className="text-3xl font-bold text-brand-500">{roleCounts.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h6 className="text-gray-600 mb-2">Staff Members</h6>
          <p className="text-3xl font-bold text-brand-500">{roleCounts.staff}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h6 className="text-gray-600 mb-2">Clients</h6>
          <p className="text-3xl font-bold text-brand-500">{roleCounts.client}</p>
        </div>
      </div>

      <UserManagement />

      <div className="mt-8 bg-white rounded-xl shadow overflow-hidden">
        <LoginLogs />
      </div>
    </div>
  );
};

export default AdminDashboard;
