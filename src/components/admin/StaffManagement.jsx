import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { firestoreService } from "../../services/firestoreService";
import { useAuth } from "../../hooks/useAuth";
import { RefreshCw, User, Archive, ArchiveRestore, Mail, Shield, ChevronLeft, ChevronRight, Building2, Handshake, Trash2 } from "lucide-react";

const ROLE_TABS = [
  { key: "staff", label: "Internal Staff", icon: Building2 },
  { key: "thirdpartystaff", label: "Third Party Staff", icon: Handshake },
];

const usersPerPage = 10;

const StaffManagement = () => {
  const { userProfile } = useAuth();
  const [roleTab, setRoleTab] = useState("staff");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, archived
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Cursor for each page, per role tab: cursors[role][i] is the lastDoc needed
  // to fetch page i + 1. cursors[role][0] is always null (start of the list).
  const cursorsRef = useRef({ staff: [null], thirdpartystaff: [null] });

  const usersQuery = useQuery({
    queryKey: ["staffUsers", roleTab, currentPage],
    queryFn: () => {
      const cursor = cursorsRef.current[roleTab][currentPage - 1] ?? null;
      return firestoreService.getAllUsersPaginated(usersPerPage, cursor, roleTab);
    },
  });

  const countsQuery = useQuery({
    queryKey: ["staffUserCounts"],
    queryFn: () => firestoreService.getUsersCountByRole(),
  });

  // Remember the cursor for the next page once this page's data arrives
  useEffect(() => {
    if (usersQuery.data?.lastDoc) {
      cursorsRef.current[roleTab][currentPage] = usersQuery.data.lastDoc;
    }
  }, [usersQuery.data, roleTab, currentPage]);

  useEffect(() => {
    if (usersQuery.isError) {
      console.error("Failed to load users:", usersQuery.error);
      toast.error("Failed to load staff users");
    }
  }, [usersQuery.isError, usersQuery.error]);

  const users = usersQuery.data?.users ?? [];
  const hasMore = usersQuery.data?.hasMore ?? false;
  const loading = usersQuery.isFetching || countsQuery.isFetching;
  const totalCount = countsQuery.data?.[roleTab] ?? 0;

  const handleRoleTabChange = (key) => {
    if (key === roleTab) return;
    setRoleTab(key);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    usersQuery.refetch();
    countsQuery.refetch();
  };

  const handleArchiveUser = async (user) => {
    if (!confirm(`Archive user ${user.displayName}? They will not be able to log in.`)) {
      return;
    }

    try {
      await firestoreService.archiveUser(user.uid, userProfile.uid);
      toast.success(`User ${user.displayName} archived successfully`);
      usersQuery.refetch();
    } catch (error) {
      console.error('Failed to archive user:', error);
      toast.error(error.message || "Failed to archive user");
    }
  };

  const handleUnarchiveUser = async (user) => {
    if (!confirm(`Unarchive user ${user.displayName}? They will be able to log in again.`)) {
      return;
    }

    try {
      await firestoreService.unarchiveUser(user.uid, userProfile.uid);
      toast.success(`User ${user.displayName} unarchived successfully`);
      usersQuery.refetch();
    } catch (error) {
      console.error('Failed to unarchive user:', error);
      toast.error(error.message || "Failed to unarchive user");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;

    try {
      setActionLoading(true);
      await firestoreService.deleteUser(deleteModal.user.uid, userProfile.uid);
      toast.success(`${deleteModal.user.displayName} has been deleted from the system`);
      setDeleteModal({ isOpen: false, user: null });
      usersQuery.refetch();
      countsQuery.refetch();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter users based on status (client-side filtering on current page)
  const filteredUsers = users.filter(user => {
    if (filterStatus === "active") return !user.isArchived;
    if (filterStatus === "archived") return user.isArchived;
    return true; // all
  });

  const stats = {
    total: totalCount, // Server-side total count
    active: users.filter(u => !u.isArchived).length,
    archived: users.filter(u => u.isArchived).length,
  };

  // Pagination handlers
  const totalPages = Math.ceil(totalCount / usersPerPage);

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">
            Staff Management
          </h3>
          <p className="text-gray-600 mt-1">
            Manage staff user accounts and access
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 mb-6">
        {ROLE_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleRoleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              roleTab === key
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label} ({countsQuery.data?.[key] ?? "…"})
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">
            Total {roleTab === "staff" ? "Internal" : "Third Party"} Staff
          </p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Active (Current Page)</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Archived (Current Page)</p>
          <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === "all"
                  ? "bg-teal-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === "active"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilterStatus("archived")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === "archived"
                  ? "bg-gray-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Archived ({stats.archived})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                      <p className="text-gray-500">Loading staff users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <User className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">
                        {filterStatus === "archived"
                          ? `No archived ${roleTab === "staff" ? "internal" : "third-party"} staff users`
                          : filterStatus === "active"
                          ? `No active ${roleTab === "staff" ? "internal" : "third-party"} staff users`
                          : `No ${roleTab === "staff" ? "internal" : "third-party"} staff users found`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className={`hover:bg-gray-50 ${user.isArchived ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.displayName}
                          </p>
                          {user.isArchived && (
                            <p className="text-xs text-gray-500">
                              Archived {user.archivedAt ? new Date(user.archivedAt.seconds * 1000).toLocaleDateString() : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700 capitalize">
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isArchived ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          <Archive className="w-3 h-3" />
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.isArchived ? (
                          <button
                            onClick={() => handleUnarchiveUser(user)}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors disabled:opacity-50"
                            title="Unarchive user"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveUser(user)}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors disabled:opacity-50"
                            title="Archive user"
                          >
                            <Archive className="w-4 h-4" />
                            Archive
                          </button>
                        )}
                        {user.uid !== userProfile.uid && (
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, user })}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors disabled:opacity-50"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Showing page {currentPage} of {totalPages} ({totalCount} total {roleTab === "staff" ? "internal" : "third-party"} staff)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="btn btn-sm btn-outline"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!hasMore || currentPage === totalPages}
                className="btn btn-sm btn-outline"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete User Modal */}
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

export default StaffManagement;