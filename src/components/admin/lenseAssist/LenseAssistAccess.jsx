import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faMagnifyingGlass,
  faLock,
  faCheck,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { MOCK_LENSE_ASSIST_USERS } from "./mockData";

const TABS = [
  { key: "staff", label: "Staff", roles: ["staff", "thirdpartystaff"] },
  { key: "client", label: "Clients", roles: ["client", "thirdpartyclient"] },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "on", label: "Has access" },
  { key: "off", label: "No access" },
];

const initialAccess = () =>
  Object.fromEntries(MOCK_LENSE_ASSIST_USERS.map((u) => [u.uid, u.lenseAssist]));

const LenseAssistAccess = () => {
  const [tab, setTab] = useState("staff");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(initialAccess);
  const [draft, setDraft] = useState(initialAccess);
  const [selected, setSelected] = useState(() => new Set());

  const tabUsers = useMemo(() => {
    const roles = TABS.find((t) => t.key === tab).roles;
    return MOCK_LENSE_ASSIST_USERS.filter((u) => roles.includes(u.role));
  }, [tab]);

  const visibleUsers = tabUsers.filter((u) => {
    if (filter === "on" && !draft[u.uid]) return false;
    if (filter === "off" && draft[u.uid]) return false;
    const q = search.trim().toLowerCase();
    return !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const eligible = tabUsers.filter((u) => !u.ineligible);
  const withAccess = eligible.filter((u) => draft[u.uid]).length;
  const changedCount = Object.keys(draft).filter((id) => draft[id] !== saved[id]).length;
  const selectableVisible = visibleUsers.filter((u) => !u.ineligible);
  const allSelected =
    selectableVisible.length > 0 && selectableVisible.every((u) => selected.has(u.uid));

  const toggleUser = (uid) => setDraft((d) => ({ ...d, [uid]: !d[uid] }));

  const toggleSelected = (uid) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectableVisible.map((u) => u.uid)));

  const bulkSet = (value) => {
    setDraft((d) => {
      const next = { ...d };
      selected.forEach((uid) => { next[uid] = value; });
      return next;
    });
    setSelected(new Set());
  };

  const handleTabChange = (key) => {
    setTab(key);
    setFilter("all");
    setSearch("");
    setSelected(new Set());
  };

  const handleSave = () => {
    setSaved(draft);
    toast.success("UI preview only — changes were not saved to the database");
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Lense Assist Access</h2>
        <p className="text-gray-600 mt-1">Choose which staff and clients see Lense Assist in their sidebar</p>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <FontAwesomeIcon icon={faWandMagicSparkles} className="mt-0.5 h-4 w-4" />
        <span>UI preview with sample data. Changes here do not affect real users or their sidebars yet.</span>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              tab === t.key
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Eligible users</p>
          <p className="text-2xl font-bold text-gray-800">{eligible.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">With Lense Assist</p>
          <p className="text-2xl font-bold text-teal-600">{withAccess}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Without Lense Assist</p>
          <p className="text-2xl font-bold text-gray-500">{eligible.length - withAccess}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="input input-bordered bg-white border-gray-300 pl-9 w-64"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-teal-500 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">{selected.size} selected</span>
            <button onClick={() => bulkSet(true)} className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm transition-colors">
              Grant
            </button>
            <button onClick={() => bulkSet(false)} className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
              Revoke
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 w-10">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schemes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lense Assist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                visibleUsers.map((u) => {
                  const changed = draft[u.uid] !== saved[u.uid];
                  return (
                    <tr key={u.uid} className={`hover:bg-gray-50 ${changed ? "bg-amber-50/50" : ""}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          disabled={!!u.ineligible}
                          checked={selected.has(u.uid)}
                          onChange={() => toggleSelected(u.uid)}
                          aria-label={`Select ${u.displayName}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{u.displayName}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {u.schemeIds.map((sid) => (
                            <span key={sid} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">{sid}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.ineligible ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                            <FontAwesomeIcon icon={faLock} className="h-3 w-3" />
                            Not eligible · {u.ineligible}
                          </span>
                        ) : (
                          <label className="inline-flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="toggle toggle-success"
                              checked={!!draft[u.uid]}
                              onChange={() => toggleUser(u.uid)}
                            />
                            <span className={`text-sm ${draft[u.uid] ? "text-teal-700 font-medium" : "text-gray-500"}`}>
                              {draft[u.uid] ? "On" : "Off"}
                            </span>
                          </label>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">What the user sees</p>
        <div className="inline-flex items-center gap-3 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="h-4 w-4 text-teal-600" />
          Lense Assist
          <span className="text-xs text-gray-400">opens in a new tab</span>
        </div>
      </div>

      {changedCount > 0 && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-lg bg-gray-800 px-5 py-3 text-white shadow-lg">
          <span className="text-sm">{changedCount} unsaved change{changedCount !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <button onClick={() => setDraft(saved)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition-colors">
              <FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" />
              Reset
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 rounded-lg text-sm transition-colors">
              <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LenseAssistAccess;
