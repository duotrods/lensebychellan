import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Key } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="text-gray-600">Welcome back, {userProfile?.displayName}!</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin/otp-management')}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
        >
          <Key className="w-4 h-4" />
          Manage Client Access Codes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h6 className="text-gray-600 mb-2">Total Users</h6>
          <p className="text-3xl font-bold text-brand-500">{users.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h6 className="text-gray-600 mb-2">Staff Members</h6>
          <p className="text-3xl font-bold text-brand-500">
            {users.filter(u => u.role === 'staff').length}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h6 className="text-gray-600 mb-2">Clients</h6>
          <p className="text-3xl font-bold text-brand-500">
            {users.filter(u => u.role === 'client').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <h5>User Management</h5>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <span className="loading loading-spinner text-brand-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.uid}>
                    <td>{user.displayName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-error' :
                        user.role === 'staff' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.company || '-'}</td>
                    <td>
                      {user.emailVerified ? (
                        <span className="text-success">Verified</span>
                      ) : (
                        <span className="text-warning">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
