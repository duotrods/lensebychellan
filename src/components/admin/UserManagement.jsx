import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { firestoreService } from "../../services/firestoreService";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_LABELS } from "../../utils/constants";
import { ROLE_BADGE, ROLE_ICON } from "../../utils/roleBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faBoxArchive, faBoxOpen } from "@fortawesome/free-solid-svg-icons";
import { faTrashCan as faTrashCanRegular } from "@fortawesome/free-regular-svg-icons";
import {
  MdFilterAlt,
  MdInventory2,
  MdPerson,
  MdArchive,
  MdCheckCircle,
  MdSchedule,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

const ROLE_FILTERS = [
  { key: "all", label: "All roles" },
  ...Object.keys(ROLE_LABELS).map((key) => ({ key, label: ROLE_LABELS[key] })),
];

const STATUS_FILTERS = [
  { key: "all", label: "All statuses" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

const usersPerPage = 10;

const UserManagement = () => {
  const { userProfile } = useAuth();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Cursor for each page, per role filter: cursors[role][i] is the lastDoc
  // needed to fetch page i + 1. cursors[role][0] is always null (start of list).
  const cursorsRef = useRef({ all: [null] });

  const usersQuery = useQuery({
    queryKey: ["adminUsers", roleFilter, currentPage],
    queryFn: () => {
      cursorsRef.current[roleFilter] ??= [null];
      const cursor = cursorsRef.current[roleFilter][currentPage - 1] ?? null;
      return firestoreService.getAllUsersPaginated(
        usersPerPage,
        cursor,
        roleFilter === "all" ? null : roleFilter,
      );
    },
  });

  const countsQuery = useQuery({
    queryKey: ["userCounts"],
    queryFn: () => firestoreService.getUsersCountByRole(),
  });

  useEffect(() => {
    if (usersQuery.data?.lastDoc) {
      cursorsRef.current[roleFilter] ??= [null];
      cursorsRef.current[roleFilter][currentPage] = usersQuery.data.lastDoc;
    }
  }, [usersQuery.data, roleFilter, currentPage]);

  useEffect(() => {
    if (usersQuery.isError) {
      console.error("Failed to load users:", usersQuery.error);
      toast.error("Failed to load users");
    }
  }, [usersQuery.isError, usersQuery.error]);

  const users = usersQuery.data?.users ?? [];
  const hasMore = usersQuery.data?.hasMore ?? false;
  const loading = usersQuery.isFetching || countsQuery.isFetching;
  const totalCount = roleFilter === "all" ? countsQuery.data?.total ?? 0 : countsQuery.data?.[roleFilter] ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / usersPerPage));

  // Status is filtered client-side on the current page, same as Staff Management.
  const filteredUsers = users.filter((user) => {
    if (statusFilter === "active") return !user.isArchived;
    if (statusFilter === "archived") return user.isArchived;
    return true;
  });

  const handleRoleFilterChange = (key) => {
    setRoleFilter(key);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (key) => {
    setStatusFilter(key);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (hasMore) setCurrentPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleArchiveUser = async (user) => {
    if (!confirm(`Archive ${user.displayName}? They will not be able to log in.`)) return;

    try {
      setActionLoading(true);
      await firestoreService.archiveUser(user.uid, userProfile.uid);
      toast.success(`${user.displayName} has been archived`);
      usersQuery.refetch();
    } catch (error) {
      console.error("Failed to archive user:", error);
      toast.error(error.message || "Failed to archive user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchiveUser = async (user) => {
    if (!confirm(`Unarchive ${user.displayName}? They will be able to log in again.`)) return;

    try {
      setActionLoading(true);
      await firestoreService.unarchiveUser(user.uid, userProfile.uid);
      toast.success(`${user.displayName} has been unarchived`);
      usersQuery.refetch();
    } catch (error) {
      console.error("Failed to unarchive user:", error);
      toast.error(error.message || "Failed to unarchive user");
    } finally {
      setActionLoading(false);
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
      console.error("Failed to delete user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatus = (user) =>
    user.isArchived ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
        <MdArchive className="w-3 h-3" />
        <span className="hidden sm:inline">Archived</span>
      </span>
    ) : user.emailVerified ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-600 rounded-full text-xs font-medium">
        <MdCheckCircle className="w-3 h-3" />
        <span className="hidden sm:inline">Verified</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
        <MdSchedule className="w-3 h-3" />
        <span className="hidden sm:inline">Pending</span>
      </span>
    );

  const renderRoleBadge = (role) => {
    const Icon = ROLE_ICON[role] || MdPerson;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[role] || "bg-gray-100 text-gray-700"}`}>
        <Icon className="w-3.5 h-3.5" />
        {ROLE_LABELS[role] || role}
      </span>
    );
  };

  const renderUserActions = (user) => {
    if (user.role === "admin" || user.uid === userProfile?.uid) {
      return <span className="text-xs text-gray-400">-</span>;
    }
    return (
      <div className="flex items-center justify-center gap-2">
        {user.isArchived ? (
          <button
            onClick={() => handleUnarchiveUser(user)}
            disabled={actionLoading}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            title="Unarchive user"
          >
            <FontAwesomeIcon icon={faBoxOpen} className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => handleArchiveUser(user)}
            disabled={actionLoading}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Archive user"
          >
            <FontAwesomeIcon icon={faBoxArchive} className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setDeleteModal({ isOpen: true, user })}
          className="p-1 rounded-lg text-red-600 hover:bg-red-50"
          title="Delete user"
        >
          <FontAwesomeIcon icon={faTrashCanRegular} className="w-2 h-2" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow overflow-hidden">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-gray-800">User Management</h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto sm:min-w-44">
            <MdFilterAlt className="w-5 h-5 text-brand-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              className="select text-gray-600 pl-10 bg-white border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            >
              {ROLE_FILTERS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-44">
            <MdInventory2 className="w-5 h-5 text-brand-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="select text-gray-600 pl-10 bg-white border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            >
              {STATUS_FILTERS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && filteredUsers.length === 0 ? (
        <div className="p-14 text-center">
          <span className="loading loading-spinner text-brand-500"></span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found for this filter</p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-500">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className={`hover:bg-gray-50 ${user.isArchived ? "bg-gray-50" : ""}`}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{user.displayName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{renderRoleBadge(user.role)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.company || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{renderStatus(user)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{renderUserActions(user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: one card per user instead of a side-scrolling table */}
          <div className="sm:hidden space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.uid}
                className={`border border-gray-200 rounded-xl p-4 shadow-sm ${user.isArchived ? "bg-gray-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-gray-800">{user.displayName}</h4>
                  {renderStatus(user)}
                </div>
                <p className="text-sm text-gray-600 font-semibold break-all">{user.email}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-700">
                    <span className="text-gray-400">Company:</span> {user.company || "-"}
                  </p>
                  {renderRoleBadge(user.role)}
                </div>
                <div className="mt-3 flex justify-end">{renderUserActions(user)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({totalCount} total users)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
              className="btn btn-sm btn-outline"
            >
              <MdChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={!hasMore || currentPage === totalPages || loading}
              className="btn btn-sm btn-outline"
            >
              <MdChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
                    <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
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

export default UserManagement;
