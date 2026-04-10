import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firestoreService';
import { USER_ROLES, ROLE_LABELS } from '../../utils/constants';
import { Users, RefreshCw, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TP_ROLES = [
  USER_ROLES.THIRDPARTYOPERATOR,
  USER_ROLES.THIRDPARTYCLIENT,
  USER_ROLES.THIRDPARTYLIVEOPERATOR,
  USER_ROLES.THIRDPARTYCCTVOPERATOR,
];

const ThirdPartyAdminDashboard = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

  const loadUsers = async () => {
    if (!schemeId) return;
    setLoading(true);
    try {
      const results = await firestoreService.getUsersBySchemeAndRoles(schemeId, TP_ROLES);
      setUsers(results);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [schemeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async (user) => {
    if (!window.confirm(`Archive ${user.displayName}? They will not be able to log in.`)) return;
    try {
      await firestoreService.archiveUser(user.uid, userProfile.uid);
      toast.success(`${user.displayName} archived`);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to archive user');
    }
  };

  const handleUnarchive = async (user) => {
    if (!window.confirm(`Unarchive ${user.displayName}?`)) return;
    try {
      await firestoreService.unarchiveUser(user.uid, userProfile.uid);
      toast.success(`${user.displayName} unarchived`);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to unarchive user');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome, <span className="text-teal-500">{userProfile?.displayName?.split(' ')[0]}</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Managing users for <span className="font-medium">{userProfile?.schemeNames?.[userProfile?.activeSchemeId] || userProfile?.schemeName || schemeId}</span>
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-gray-800">Your Users</h3>
          <span className="ml-auto text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No users yet. Generate access codes to invite your team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{user.displayName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ROLE_LABELS[user.role] || user.role}</td>
                    <td className="px-6 py-4">
                      {user.isArchived ? (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Archived</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isArchived ? (
                        <button
                          onClick={() => handleUnarchive(user)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                        >
                          <ArchiveRestore className="w-3 h-3" /> Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(user)}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                        >
                          <Archive className="w-3 h-3" /> Archive
                        </button>
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

export default ThirdPartyAdminDashboard;
