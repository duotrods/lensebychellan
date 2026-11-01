import { useState } from "react";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faPlus, faTrashCan, faUsers, faIdBadge } from "@fortawesome/free-solid-svg-icons";
import { SCHEMES, THIRD_PARTY_SCHEMES } from "../../../utils/schemes";
import { MOCK_STAFF_SCHEME_USERS } from "./mockData";

const ROLE_TABS = [
  { key: "staff", label: "Staff", Icon: faIdBadge, active: "bg-teal-500 text-white", schemes: SCHEMES },
  { key: "thirdpartystaff", label: "Third Party Staff", Icon: faUsers, active: "bg-violet-500 text-white", schemes: THIRD_PARTY_SCHEMES },
];

// UI preview: local state and mock rows only, nothing is written to Firestore.
const StaffSchemeAssignment = () => {
  const [users, setUsers] = useState(MOCK_STAFF_SCHEME_USERS);
  const [roleFilter, setRoleFilter] = useState("staff");
  const [modalUser, setModalUser] = useState(null);
  const [schemeId, setSchemeId] = useState("");

  const roleTab = ROLE_TABS.find((t) => t.key === roleFilter);
  const rows = users.filter((u) => u.role === roleFilter);
  const schemeLabel = (id) =>
    [...SCHEMES, ...THIRD_PARTY_SCHEMES].find((s) => s.id === id)?.shortName ?? id;

  const closeModal = () => { setModalUser(null); setSchemeId(""); };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!schemeId) return;
    setUsers((list) =>
      list.map((u) => (u.uid === modalUser.uid ? { ...u, schemeIds: [...u.schemeIds, schemeId] } : u))
    );
    toast.success(`Scheme ${schemeId} assigned to ${modalUser.displayName} (UI preview)`);
    closeModal();
  };

  const handleRemove = (user, sid) =>
    setUsers((list) =>
      list.map((u) => (u.uid === user.uid ? { ...u, schemeIds: u.schemeIds.filter((s) => s !== sid) } : u))
    );

  const modalLive = modalUser && users.find((u) => u.uid === modalUser.uid);

  return (
    <div>
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        UI preview with sample data. Assignments here are not saved.
      </div>

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
              {rows.map((user) => (
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
                            <button onClick={() => handleRemove(user, sid)} className="ml-1 hover:text-red-600 transition-colors" title="Remove scheme">
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
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors flex items-center gap-2">
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                  Assign Scheme
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
