import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup,
  faPlus,
  faPen,
  faBoxArchive,
  faRotateLeft,
  faDatabase,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import { useAuth } from "../../hooks/useAuth";
import { schemeService } from "../../services/schemeService";
import { getStaticSchemeDocs } from "../../utils/schemes";

const EMPTY_FORM = {
  type: "internal",
  id: "",
  fullName: "",
  shortName: "",
  contractor: "",
  company: "",
  cameras: "",
  legacyIds: "",
  legacyNames: "",
};

const toLines = (text) =>
  String(text || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

const fromScheme = (s) => ({
  type: s.type || "internal",
  id: s.id,
  fullName: s.fullName,
  shortName: s.shortName || "",
  contractor: s.contractor || "",
  company: s.company || "",
  cameras: (s.cameras || []).join("\n"),
  legacyIds: (s.legacyIds || []).join("\n"),
  legacyNames: (s.legacyNames || []).join("\n"),
});

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
  </label>
);

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500";

const SchemeForm = ({ initial, isEdit, saving, onSubmit, onCancel }) => {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const isThirdParty = form.type === "thirdparty";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...form,
            cameras: toLines(form.cameras),
            legacyIds: toLines(form.legacyIds),
            legacyNames: toLines(form.legacyNames),
          });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <h3 className="text-lg font-bold text-gray-800">
          {isEdit ? `Edit ${initial.id}` : "Add scheme"}
        </h3>

        {!isEdit && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              The ID, full name and type can&apos;t be changed after saving. Reports store them,
              so check the spelling now.
            </span>
          </div>
        )}

        <Field label="Type">
          <select value={form.type} onChange={set("type")} disabled={isEdit} className={inputClass}>
            <option value="internal">Internal</option>
            <option value="thirdparty">Third party</option>
          </select>
        </Field>
        <Field label="Scheme ID" hint="Letters, numbers, - or _ (e.g. A66-WJ). Used in access codes and reports.">
          <input value={form.id} onChange={set("id")} disabled={isEdit} required className={inputClass} />
        </Field>
        <Field label="Full name" hint='Shown on reports, e.g. "A66 - WJ Scheme 1".'>
          <input value={form.fullName} onChange={set("fullName")} disabled={isEdit} required className={inputClass} />
        </Field>
        <Field label="Short name">
          <input value={form.shortName} onChange={set("shortName")} className={inputClass} />
        </Field>
        {isThirdParty ? (
          <Field label="Company" hint="Third-party users see every scheme of their company.">
            <input value={form.company} onChange={set("company")} disabled={isEdit} required className={inputClass} />
          </Field>
        ) : (
          <Field label="Contractor">
            <input value={form.contractor} onChange={set("contractor")} className={inputClass} />
          </Field>
        )}
        <Field label="Cameras" hint="One per line.">
          <textarea rows={5} value={form.cameras} onChange={set("cameras")} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Old scheme IDs" hint="One per line. Only if older reports use a previous ID (e.g. Costain for Gallows).">
          <textarea rows={2} value={form.legacyIds} onChange={set("legacyIds")} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Old full names" hint="One per line. Previous names stored on older reports.">
          <textarea rows={2} value={form.legacyNames} onChange={set("legacyNames")} className={`${inputClass} font-mono`} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

const SchemeRow = ({ scheme, busy, onEdit, onToggleActive }) => {
  const inCodeOnly = scheme.inCodeOnly;
  const archived = scheme.active === false;
  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-3 font-mono text-sm text-gray-800">{scheme.id}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {scheme.fullName}
        {scheme.shortName && scheme.shortName !== scheme.fullName && (
          <span className="block text-xs text-gray-400">{scheme.shortName}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{scheme.type === "thirdparty" ? scheme.company : scheme.contractor}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{(scheme.cameras || []).length}</td>
      <td className="px-4 py-3 text-sm">
        {inCodeOnly ? (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">In code only</span>
        ) : archived ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">Archived</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs">Active</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <button
          onClick={() => onEdit(scheme)}
          disabled={inCodeOnly || busy}
          title={inCodeOnly ? "Save schemes from code first" : "Edit"}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30"
        >
          <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleActive(scheme)}
          disabled={inCodeOnly || busy}
          title={archived ? "Restore" : "Archive"}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30"
        >
          <FontAwesomeIcon icon={archived ? faRotateLeft : faBoxArchive} className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

const SchemeTable = ({ title, schemes, busy, onEdit, onToggleActive }) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100">
      <h4 className="font-semibold text-gray-800">
        {title} <span className="text-gray-400 font-normal">({schemes.length})</span>
      </h4>
    </div>
    {schemes.length === 0 ? (
      <p className="px-6 py-6 text-sm text-gray-400">No schemes.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase text-gray-400">
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Contractor / company</th>
              <th className="px-4 py-2 font-medium">Cameras</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {schemes.map((s) => (
              <SchemeRow key={s.id} scheme={s} busy={busy} onEdit={onEdit} onToggleActive={onToggleActive} />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const SchemeManagementPage = () => {
  const { currentUser, refreshSchemes } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null | "new" | scheme
  const [busy, setBusy] = useState(false);

  const schemesQuery = useQuery({
    queryKey: ["schemes"],
    queryFn: () => schemeService.listSchemes(),
  });

  // Schemes saved in Firestore, plus any that exist only in code (not seeded yet)
  const schemes = useMemo(() => {
    const saved = schemesQuery.data || [];
    const savedIds = new Set(saved.map((s) => s.id));
    const codeOnly = getStaticSchemeDocs()
      .filter((s) => !savedIds.has(s.id))
      .map((s) => ({ ...s, inCodeOnly: true }));
    return [...saved, ...codeOnly].sort((a, b) => a.id.localeCompare(b.id));
  }, [schemesQuery.data]);

  const codeOnlyCount = schemes.filter((s) => s.inCodeOnly).length;
  const internal = schemes.filter((s) => s.type !== "thirdparty");
  const thirdParty = schemes.filter((s) => s.type === "thirdparty");

  const afterChange = async () => {
    await queryClient.invalidateQueries({ queryKey: ["schemes"] });
    await refreshSchemes();
  };

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      await afterChange();
      toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(err?.message || "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSeed = () => {
    if (!window.confirm(`Save ${codeOnlyCount} scheme(s) from code into the database? Existing saved schemes are not changed.`)) return;
    run(() => schemeService.seedFromStatic(currentUser?.uid), "Schemes saved.");
  };

  const handleSubmit = async (form) => {
    const isEdit = editing !== "new";
    const ok = await run(
      () =>
        isEdit
          ? schemeService.updateScheme(editing.id, {
              shortName: form.shortName.trim(),
              contractor: form.contractor.trim(),
              cameras: form.cameras,
              legacyIds: form.legacyIds,
              legacyNames: form.legacyNames,
            })
          : schemeService.createScheme(form, currentUser?.uid),
      isEdit ? "Scheme updated." : "Scheme added.",
    );
    if (ok) setEditing(null);
  };

  const handleToggleActive = (scheme) => {
    const archiving = scheme.active !== false;
    if (archiving && !window.confirm(`Archive ${scheme.id}? It disappears from dropdowns but old reports keep working.`)) return;
    run(
      () => (archiving ? schemeService.archiveScheme(scheme.id) : schemeService.restoreScheme(scheme.id)),
      archiving ? "Scheme archived." : "Scheme restored.",
    );
  };

  return (
    <AdminSidebarLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faLayerGroup} className="w-6 h-6 text-teal-500" />
              <h3 className="text-xl font-bold text-gray-800">Manage Schemes</h3>
            </div>
            <button
              onClick={() => setEditing("new")}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" /> Add scheme
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Add or archive schemes without a code change. Existing reports are never modified; they keep
            the scheme ID and name they were saved with.
          </p>
        </div>

        {codeOnlyCount > 0 && !schemesQuery.isLoading && (
          <div className="flex items-start justify-between gap-4 p-4 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-900">
            <span>
              {codeOnlyCount} scheme(s) only exist in code. Save them to the database to edit or archive them.
              The app works either way.
            </span>
            <button
              onClick={handleSeed}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 shrink-0"
            >
              <FontAwesomeIcon icon={faDatabase} className="w-3.5 h-3.5" /> Save from code
            </button>
          </div>
        )}

        {schemesQuery.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Couldn&apos;t load saved schemes ({schemesQuery.error?.message}). Showing schemes from code only.
          </div>
        )}

        {schemesQuery.isLoading ? (
          <p className="text-sm text-gray-400">Loading schemes...</p>
        ) : (
          <>
            <SchemeTable title="Internal schemes" schemes={internal} busy={busy} onEdit={setEditing} onToggleActive={handleToggleActive} />
            <SchemeTable title="Third-party schemes" schemes={thirdParty} busy={busy} onEdit={setEditing} onToggleActive={handleToggleActive} />
          </>
        )}
      </div>

      {editing && (
        <SchemeForm
          initial={editing === "new" ? EMPTY_FORM : fromScheme(editing)}
          isEdit={editing !== "new"}
          saving={busy}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}
    </AdminSidebarLayout>
  );
};

export default SchemeManagementPage;
