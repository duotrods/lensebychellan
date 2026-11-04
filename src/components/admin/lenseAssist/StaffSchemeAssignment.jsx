import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faPlus, faTrashCan, faUsers, faIdBadge, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { SCHEMES, THIRD_PARTY_SCHEMES } from "../../../utils/schemes";
import { firestoreService } from "../../../services/firestoreService";
import { useAuth } from "../../../hooks/useAuth";

const ROLE_TABS = [
  // The demo scheme is left out: assigning it would turn a real staff member into a demo user.
  { key: "staff", label: "Staff", Icon: faIdBadge, active: "bg-teal-500 text-white", schemes: SCHEMES.filter((s) => !s.isDemo) },
  { key: "thirdpartystaff", label: "Third Party Staff", Icon: faUsers, active: "bg-violet-500 text-white", schemes: THIRD_PARTY_SCHEMES },
];

const StaffSchemeAssignment = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("staff");
  const [modalUser, setModalUser] = useState(null);
  const [schemeId, setSchemeId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["staffSchemeUsers"],
    queryFn: async () => {
      const results = await Promise.all(
        ROLE_TABS.map((t) => firestoreService.getAllUsersPaginated(200, null, t.key))
      );
      return results
        .flatMap((r) => r.users)
        .filter((u) => !u.isArchived)
        .map((u) => ({
          ...u,
          schemeIds: u.schemeIds?.length ? u.schemeIds : u.schemeId ? [u.schemeId] : [],
        }))
        .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
    },
  });

  useEffect(() => {
    if (usersQuery.isError) {
      console.error("Failed to load staff:", usersQuery.error);
      toast.error("Failed to load staff");
    }
  }, [usersQuery.isError, usersQuery.error]);

  const users = usersQuery.data ?? [];
  const roleTab = ROLE_TABS.find((t) => t.key === roleFilter);
  const rows = users.filter((u) => u.role === roleFilter);
  const schemeLabel = (id) =>
    [...SCHEMES, ...THIRD_PARTY_SCHEMES].find((s) => s.id === id)?.shortName ?? id;

  const closeModal = () => { setModalUser(null); setSchemeId(""); };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staffSchemeUsers"] });

  const handleAssign = async (e) => {
    e.preventDefault();
    const scheme = roleTab.schemes.find((s) => s.id === schemeId);
    if (!scheme) return;
    setActionLoading(true);
    try {
      await firestoreService.assignSchemeToUser(modalUser.uid, scheme.id, scheme.fullName, userProfile.uid);
      toast.success(`Scheme ${scheme.id} assigned to ${modalUser.displayName}`);
      closeModal();
      await refresh();
    } catch (error) {
      console.error("Failed to assign scheme:", error);
      toast.error(
        error.code === "firestore/already-exists" ? "Scheme already assigned to this user" : error.message || "Failed to assign scheme"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (user, sid) => {
    if (!confirm(`Remove scheme ${sid} from ${user.displayName}?`)) return;
    setActionLoading(true);
    try {
      await firestoreService.removeSchemeFromUser(user.uid, sid, userProfile.uid);
      toast.success(`Scheme ${sid} removed from ${user.displayName}`);
      await refresh();
    } catch (error) {
      console.error("Failed to remove scheme:", error);
      toast.error(error.message || "Failed to remove scheme");
    } finally {
      setActionLoading(false);
    }
  };

  const modalLive = modalUser && users.find((u) => u.uid === modalUser.uid);

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {ROLE_TABS.map(({ key, label, Icon, active }) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === key ? active : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FontAwesomeIcon icon={Icon} className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Schemes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usersQuery.isLoading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center">
                    <FontAwesomeIcon icon={faRotateRight} className="w-8 h-8 text-gray-400 animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500">No users found</td>
                </tr>
              ) : rows.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{user.displayName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.schemeIds.length === 0 ? (
                        <span className="text-gray-400 text-sm">No schemes</span>
                      ) : (
                        user.schemeIds.map((sid) => (
                          <div key={sid} className="flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded text-sm">
                            <FontAwesomeIcon icon={faBuilding} className="w-3 h-3" />
                            <span>{schemeLabel(sid)}</span>
                            <button onClick={() => handleRemove(user, sid)} disabled={actionLoading} className="ml-1 hover:text-red-600 transition-colors" title="Remove scheme">
                              <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setModalUser(user)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded text-sm transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalLive && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Assign Scheme to {modalLive.displayName}</h3>
            <form onSubmit={handleAssign}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Scheme</label>
              <select
                value={schemeId}
                onChange={(e) => setSchemeId(e.target.value)}
                className="select select-bordered w-full bg-white border-gray-300 mb-4"
                required
              >
                <option value="">Choose a scheme...</option>
                {roleTab.schemes.map((s) => {
                  const taken = modalLive.schemeIds.includes(s.id);
                  return (
                    <option key={s.id} value={s.id} disabled={taken}>
                      {s.fullName}{taken ? " (Already assigned)" : ""}
                    </option>
                  );
                })}
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} disabled={actionLoading} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors flex items-center gap-2">
                  <FontAwesomeIcon icon={actionLoading ? faRotateRight : faPlus} className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
                  {actionLoading ? "Assigning..." : "Assign Scheme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSchemeAssignment;
