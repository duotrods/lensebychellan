import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPen,
  faBoxArchive,
  faTrash,
  faXmark,
  faRotateLeft,
  faDatabase,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import { useAuth } from "../../hooks/useAuth";
import { schemeService } from "../../services/schemeService";
import { getStaticSchemeDocs, isStaticSchemeId } from "../../utils/schemes";

// Dedicated report emails: ticking one reveals who receives it. An empty list keeps the
// default address set in code.
const REPORT_OPTIONS = [
  {
    flag: "avera",
    recipients: "averaRecipients",
    label: "Avera incident reports",
    description: "Emails the full incident report as a PDF whenever an incident is reported by Avera.",
    hint: "Leave empty to use the default Avera address.",
  },
  {
    flag: "wideload",
    recipients: "wideloadRecipients",
    label: "Wideload incident reports",
    description: "Emails the full incident report as a PDF for every Wideload incident.",
    hint: "Leave empty to use the default Wideload address.",
  },
  {
    flag: "lenseAssist",
    recipients: "lenseAssistRecipients",
    label: "Lense Assist incident reports",
    description: "Emails the full incident report as a PDF whenever an incident is reported by Lense Assist. On by default.",
    hint: "Leave empty to use the default Lense Assist address.",
  },
  {
    flag: "uptime",
    recipients: "uptimeRecipients",
    label: "Daily CCTV uptime report",
    description: "Every morning at 08:00, emails a PDF with each camera's uptime, outages and live faults for the last 24 hours. Needs cameras and recipients.",
    hint: "Leave empty to use the default address (A66 only).",
  },
];

const EMPTY_FORM = {
  type: "internal",
  id: "",
  fullName: "",
  shortName: "",
  contractor: "",
  company: "",
  cameras: [""],
  legacyIds: [""],
  legacyNames: [""],
  incidentRecipients: [""],
  cctvFaultRecipients: [""],
  uptimeRecipients: [""],
  averaRecipients: [""],
  wideloadRecipients: [""],
  lenseAssistRecipients: [""],
  avera: false,
  wideload: false,
};

const cleanList = (list) => list.map((v) => v.trim()).filter(Boolean);

// Always at least one (empty) input so there is something to type into.
const toInputs = (list) => (list && list.length > 0 ? list : [""]);

const fromScheme = (s) => ({
  type: s.type || "internal",
  id: s.id,
  fullName: s.fullName,
  shortName: s.shortName || "",
  contractor: s.contractor || "",
  company: s.company || "",
  cameras: toInputs(s.cameras),
  legacyIds: toInputs(s.legacyIds),
  legacyNames: toInputs(s.legacyNames),
  incidentRecipients: toInputs(s.alerts?.incidentRecipients),
  cctvFaultRecipients: toInputs(s.alerts?.cctvFaultRecipients),
  uptimeRecipients: toInputs(s.alerts?.uptimeRecipients),
  averaRecipients: toInputs(s.alerts?.averaRecipients),
  wideloadRecipients: toInputs(s.alerts?.wideloadRecipients),
  lenseAssistRecipients: toInputs(s.alerts?.lenseAssistRecipients),
  avera: !!s.reports?.avera,
  wideload: !!s.reports?.wideload,
  lenseAssist: s.reports?.lenseAssist !== false,
  uptime: !!s.reports?.uptime,
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

// A list of text inputs with a "+" to add another and an "x" to remove one.
const ListInput = ({ values, onChange, placeholder, addLabel }) => {
  const update = (index, value) => onChange(values.map((v, i) => (i === index ? value : v)));
  const remove = (index) => {
    const next = values.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
  };
  return (
    <div className="space-y-2">
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => update(index, e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => remove(index)}
            title="Remove"
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg"
      >
        <FontAwesomeIcon icon={faPlus} className="w-3 h-3" /> {addLabel}
      </button>
    </div>
  );
};

const SchemeForm = ({ initial, isEdit, alertsLoaded, saving, onSubmit, onCancel }) => {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setList = (key) => (values) => setForm((f) => ({ ...f, [key]: values }));
  const isThirdParty = form.type === "thirdparty";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...form,
            cameras: cleanList(form.cameras),
            legacyIds: cleanList(form.legacyIds),
            legacyNames: cleanList(form.legacyNames),
            incidentRecipients: cleanList(form.incidentRecipients),
            cctvFaultRecipients: cleanList(form.cctvFaultRecipients),
            uptimeRecipients: cleanList(form.uptimeRecipients),
            averaRecipients: cleanList(form.averaRecipients),
            wideloadRecipients: cleanList(form.wideloadRecipients),
            lenseAssistRecipients: cleanList(form.lenseAssistRecipients),
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
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Cameras</span>
          <ListInput values={form.cameras} onChange={setList("cameras")} placeholder="e.g. CAM 1" addLabel="Add camera" />
        </div>
        {isEdit && (
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <p className="text-sm font-medium text-gray-700">Advanced: renamed scheme</p>
            <p className="text-xs text-gray-400 -mt-2">
              Leave empty unless this scheme was renamed and older reports still use the previous ID or name.
            </p>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Old scheme IDs</span>
              <ListInput values={form.legacyIds} onChange={setList("legacyIds")} placeholder="e.g. Costain" addLabel="Add old ID" />
              <span className="block text-xs text-gray-400 mt-1">Only if older reports use a previous ID.</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Old full names</span>
              <ListInput values={form.legacyNames} onChange={setList("legacyNames")} placeholder="e.g. Costain - Gallows Corner" addLabel="Add old name" />
              <span className="block text-xs text-gray-400 mt-1">Previous names stored on older reports.</span>
            </div>

          </div>
        )}

        {isEdit && (
          <div className="pt-2 border-t border-gray-100 space-y-4">
            <p className="text-sm font-medium text-gray-700">Alert emails</p>
            {alertsLoaded ? (
              <>
                <p className="text-xs text-gray-400 -mt-2">
                  Who receives alert emails for this scheme. Leave a list empty to keep using the default
                  recipients set in code.
                </p>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Incident alerts</span>
                  <ListInput values={form.incidentRecipients} onChange={setList("incidentRecipients")} placeholder="name@company.com" addLabel="Add email" />
                  <span className="block text-xs text-gray-400 mt-1">
                    Emailed when an incident report involves an incursion to gain an advantage, or asset damage.
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">CCTV fault alerts</span>
                  <ListInput values={form.cctvFaultRecipients} onChange={setList("cctvFaultRecipients")} placeholder="name@company.com" addLabel="Add email" />
                  <span className="block text-xs text-gray-400 mt-1">
                    Emailed straight away when a CCTV fault is reported on a blackspot camera.
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Couldn&apos;t load the saved alert emails, so they can&apos;t be edited right now. Other changes still save.
              </p>
            )}
            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700">Dedicated report emails</span>
              {REPORT_OPTIONS.map(({ flag, recipients, label, description, hint }) => (
                <div key={flag}>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form[flag]} onChange={(e) => setForm((f) => ({ ...f, [flag]: e.target.checked }))} />
                    {label}
                  </label>
                  <span className="block text-xs text-gray-400 mt-0.5 ml-6">{description}</span>
                  {form[flag] && alertsLoaded && (
                    <div className="mt-2 ml-6">
                      <ListInput values={form[recipients]} onChange={setList(recipients)} placeholder="name@company.com" addLabel="Add email" />
                      <span className="block text-xs text-gray-400 mt-1">{hint}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

const SchemeRow = ({ scheme, busy, onEdit, onToggleActive, onDelete }) => {
  const inCodeOnly = scheme.inCodeOnly;
  const archived = scheme.active === false;
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-6 py-4 font-mono text-sm text-gray-800">{scheme.id}</td>
      <td className="px-6 py-4 text-sm text-gray-700">
        {scheme.fullName}
        {scheme.shortName && scheme.shortName !== scheme.fullName && (
          <span className="block text-xs text-gray-400">{scheme.shortName}</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{scheme.type === "thirdparty" ? scheme.company : scheme.contractor}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{(scheme.cameras || []).length}</td>
      <td className="px-6 py-4 text-sm">
        {inCodeOnly ? (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">In code only</span>
        ) : archived ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">Archived</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs">Active</span>
        )}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
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
        {!inCodeOnly && !isStaticSchemeId(scheme.id) && (
          <button
            onClick={() => onDelete(scheme)}
            disabled={busy}
            title="Delete (only if nothing uses it)"
            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
};

const SchemeTable = ({ title, schemes, busy, onEdit, onToggleActive, onDelete }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
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
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contractor / company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cameras</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {schemes.map((s) => (
              <SchemeRow key={s.id} scheme={s} busy={busy} onEdit={onEdit} onToggleActive={onToggleActive} onDelete={onDelete} />
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
    const staticDocs = getStaticSchemeDocs();
    const staticById = new Map(staticDocs.map((d) => [d.id, d]));
    // A saved scheme without report flags still inherits the ones defined in code
    const saved = (schemesQuery.data || []).map((s) => ({
      ...s,
      reports: s.reports ?? staticById.get(s.id)?.reports,
    }));
    const savedIds = new Set(saved.map((s) => s.id));
    const codeOnly = staticDocs
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

  // Alert recipients are admin-only data in their own collection, so load them when the
  // edit form opens. If that read fails the form still opens, minus the email lists.
  const handleEdit = async (scheme) => {
    setBusy(true);
    try {
      const alerts = await schemeService.getAlertConfig(scheme.id);
      setEditing({ ...scheme, alerts, alertsLoaded: true });
    } catch {
      toast.error("Couldn't load the saved alert emails.");
      setEditing({ ...scheme, alerts: null, alertsLoaded: false });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (form) => {
    const isEdit = editing !== "new";
    const ok = await run(
      async () => {
        if (!isEdit) {
          await schemeService.createScheme(form, currentUser?.uid);
          return;
        }
        // Validate recipients first so a bad address doesn't leave a half-saved scheme
        if (editing.alertsLoaded) {
          await schemeService.saveAlertConfig(editing.id, {
            incidentRecipients: form.incidentRecipients,
            cctvFaultRecipients: form.cctvFaultRecipients,
            uptimeRecipients: form.uptimeRecipients,
            averaRecipients: form.averaRecipients,
            wideloadRecipients: form.wideloadRecipients,
            lenseAssistRecipients: form.lenseAssistRecipients,
          });
        }
        await schemeService.updateScheme(editing.id, {
          shortName: form.shortName.trim(),
          contractor: form.contractor.trim(),
          cameras: form.cameras,
          legacyIds: form.legacyIds,
          legacyNames: form.legacyNames,
          reports: { avera: form.avera, wideload: form.wideload, uptime: form.uptime, lenseAssist: form.lenseAssist },
        });
      },
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

  const handleDelete = (scheme) => {
    if (!window.confirm(`Delete ${scheme.id} permanently? This only works if no reports, users or access codes use it, and can't be undone.`)) return;
    run(() => schemeService.deleteScheme(scheme.id), "Scheme deleted.");
  };

  return (
    <AdminSidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Schemes</h2>
            <p className="text-gray-600 mt-1">
              Add or archive schemes without a code change. Existing reports are never modified; they keep
              the scheme ID and name they were saved with.
            </p>
          </div>
          <button
            onClick={() => setEditing("new")}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 self-start sm:self-auto"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" /> Add scheme
          </button>
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
            <SchemeTable title="Internal schemes" schemes={internal} busy={busy} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} />
            <SchemeTable title="Third-party schemes" schemes={thirdParty} busy={busy} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} />
          </>
        )}
      </div>

      {editing && (
        <SchemeForm
          initial={editing === "new" ? EMPTY_FORM : fromScheme(editing)}
          isEdit={editing !== "new"}
          alertsLoaded={editing !== "new" && editing.alertsLoaded}
          saving={busy}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}
    </AdminSidebarLayout>
  );
};

export default SchemeManagementPage;
