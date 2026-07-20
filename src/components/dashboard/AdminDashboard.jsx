import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../hooks/useAuth';
import { Key, Users, UserCog, Trash2, LayoutDashboard, LogIn } from 'lucide-react';
import StaffManagement from '../admin/StaffManagement';
import LoginLogs from '../admin/LoginLogs';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'logs', label: 'Login Logs', icon: LogIn },
];

// Inner tabs nested under Overview, below the stat cards.
const OVERVIEW_SECTIONS = [
  { key: 'staff', label: 'Staff Management', icon: Users },
  { key: 'other', label: 'Other Users', icon: UserCog },
];

// Roles already covered by the Staff Management tab — excluded from "Other Users".
const STAFF_TAB_ROLES = ['staff', 'thirdpartystaff', 'admin'];

const OverviewTab = ({ userProfile, roleCounts }) => {
  const navigate = useNavigate();
  const [section, setSection] = useState('staff');

  return (
    <>
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

      {/* Sub-tabs: Staff Management / Other Users */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {OVERVIEW_SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                section === key
                  ? 'border-teal-500 text-teal-600 bg-teal-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {section === 'staff' && <StaffManagement />}
      {section === 'other' && <OtherUsersTab userProfile={userProfile} roleCounts={roleCounts} />}
    </>
  );
};

// Every non-admin, non-staff, non-third-party-staff user — the roles Staff
// Management's tabs don't cover. Delete only; archive's "can't log in"
// semantics were written for staff accounts and haven't been reviewed here.
const OtherUsersTab = ({ userProfile, roleCounts }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);
  const usersPerPage = 10;

  const otherTotal = Math.max(
    0,
    (roleCounts.total || 0) - (roleCounts.staff || 0) - (roleCounts.thirdpartystaff || 0),
  );

  const loadUsers = async (cursor = null, page = 1) => {
    try {
      setLoading(true);
      const { users: fetched, lastDoc: lastVisible, hasMore: more } =
        await firestoreService.getUsersPaginated(usersPerPage, cursor);
      const filtered = fetched.filter((u) => !STAFF_TAB_ROLES.includes(u.role));
      setUsers(filtered);
      setLastDoc(lastVisible);
      setHasMore(more);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load other users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleNextPage = () => {
    if (hasMore) loadUsers(lastDoc, currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) loadUsers(null, 1); // cursor pagination only supports forward — reload from start
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;

    try {
      setActionLoading(true);
      await firestoreService.deleteUser(deleteModal.user.uid, userProfile.uid);
      toast.success(`${deleteModal.user.displayName} has been deleted from the system`);
      setDeleteModal({ isOpen: false, user: null });
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Other Users</h3>
          <p className="text-gray-600 mt-1">
            Clients, live operators, CCTV fault operators, and third-party accounts
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <p className="text-sm text-gray-500 mb-1">Total Other Users</p>
        <p className="text-2xl font-bold text-gray-800">{otherTotal}</p>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-14 text-center">
            <span className="loading loading-spinner text-brand-500"></span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-14 text-center text-gray-400">No other users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-brand-500">
                  <th className="text-xs text-white uppercase">Name</th>
                  <th className="text-xs text-white uppercase">Email</th>
                  <th className="text-xs text-white uppercase">Role</th>
                  <th className="text-xs text-white uppercase">Company</th>
                  <th className="text-xs text-white uppercase">Status</th>
                  <th className="text-xs text-white uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.displayName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge badge-info">{user.role}</span>
                    </td>
                    <td>{user.company || '-'}</td>
                    <td>
                      {user.emailVerified ? (
                        <span className="text-success">Verified</span>
                      ) : (
                        <span className="text-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {user.uid !== userProfile?.uid ? (
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, user })}
                            className="btn btn-sm btn-error text-white"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="p-4 mt-6 border-t border-gray-300 flex justify-between items-center">
            <div className="text-sm text-gray-600">Page {currentPage}</div>
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

      {deleteModal.isOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 text-red-600">Delete User</h3>
            <p className="py-4">
              Are you sure you want to delete <strong>{deleteModal.user?.displayName}</strong>?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Warning: This action cannot be undone!</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>User account will be permanently deleted</li>
                <li>All user data will be removed from the system</li>
                <li>User will lose access immediately</li>
              </ul>
            </div>
            <div className="modal-action">
              <button
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                className="btn"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="btn btn-error text-white"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [roleCounts, setRoleCounts] = useState({ total: 0, staff: 0, client: 0, thirdpartystaff: 0 });
  const { userProfile } = useAuth();

  useEffect(() => {
    loadRoleCounts();
  }, []);

  const loadRoleCounts = async () => {
    try {
      const counts = await firestoreService.getUsersCountByRole();
      setRoleCounts(counts);
    } catch (error) {
      console.warn('Could not load role counts:', error);
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === key
                  ? 'border-teal-500 text-teal-600 bg-teal-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab userProfile={userProfile} roleCounts={roleCounts} />
      )}
      {activeTab === 'logs' && <LoginLogs />}
    </div>
  );
};

export default AdminDashboard;
