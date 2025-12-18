import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Key, Users } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const usersPerPage = 50;
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { users: paginatedUsers, total, lastDoc: lastVisible, hasMore: more } =
        await firestoreService.getUsersPaginated(usersPerPage, currentPage > 1 ? lastDoc : null);

      setUsers(paginatedUsers);
      setTotalUsers(total);
      setLastDoc(lastVisible);
      setHasMore(more);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setLastDoc(null); // Reset for previous page
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

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

        {/* Pagination Controls */}
        {!loading && users.length > 0 && (
          <div className="p-6 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing page {currentPage} of {totalPages} ({totalUsers} total users)
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !hasMore
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
