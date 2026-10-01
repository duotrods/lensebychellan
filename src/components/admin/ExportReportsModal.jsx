import { useState } from "react";
import { toast } from "react-hot-toast";
import { staffService } from "../../services/staffService";
import { excludeDemoScheme } from "../../utils/reportMapping";
import {
  EXPORT_TYPES,
  DATE_RANGE_PRESETS,
  resolveDateRange,
  buildExportWorkbook,
  exportFileName,
} from "../../utils/reportExport";

// Admin-only: exports every selected report type in a date range to a single
// .xlsx (one sheet per type). Two steps — a cheap count preview first, so the
// admin sees how many documents (= Firestore reads) the download will cost.
const ExportReportsModal = ({ onClose, schemes, defaultScheme = "all" }) => {
  const [preset, setPreset] = useState("thisMonth");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [scheme, setScheme] = useState(defaultScheme);
  const [types, setTypes] = useState(() => EXPORT_TYPES.map((t) => t.key));
  const [counts, setCounts] = useState(null); // { [typeKey]: number } once previewed
  const [busy, setBusy] = useState(null); // "counting" | "exporting" | null

  const range = resolveDateRange(preset, custom);
  const selected = EXPORT_TYPES.filter((t) => types.includes(t.key));
  const total = counts ? selected.reduce((sum, t) => sum + (counts[t.key] ?? 0), 0) : 0;
  const queryOptions = () => ({
    schemeId: scheme !== "all" ? scheme : null,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  // Any filter change invalidates the previewed counts.
  const change = (setter) => (value) => {
    setter(value);
    setCounts(null);
  };

  const toggleType = (key) =>
    change(setTypes)(types.includes(key) ? types.filter((k) => k !== key) : [...types, key]);

  const handlePreview = async () => {
    setBusy("counting");
    try {
      const options = queryOptions();
      const values = await Promise.all(
        selected.map((t) => staffService.countFormsForExport(t.collection, options)),
      );
      setCounts(Object.fromEntries(selected.map((t, i) => [t.key, values[i]])));
    } catch (error) {
      console.error("Export count failed:", error);
      toast.error("Couldn't check export size. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("exporting");
    try {
      const options = queryOptions();
      const [results, { default: writeExcelFile }] = await Promise.all([
        Promise.all(selected.map((t) => staffService.getFormsForExport(t.collection, options))),
        import("write-excel-file/browser"),
      ]);
      const reportsByType = Object.fromEntries(
        selected.map((t, i) => [t.key, excludeDemoScheme(results[i])]),
      );
      const schemeLabel =
        scheme === "all" ? "All schemes" : schemes.find((s) => s.id === scheme)?.fullName || scheme;
      const sheets = buildExportWorkbook(reportsByType, {
        rangeLabel: range.label,
        schemeLabel,
        schemeId: options.schemeId,
      });
      await writeExcelFile(sheets).toFile(exportFileName(range.label));
      toast.success("Export downloaded");
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-1">Export to Excel</h3>
        <p className="text-sm text-gray-600 mb-5">
          One file with a sheet per report type. Demo scheme reports are excluded.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Date range</label>
        <select
          value={preset}
          onChange={(e) => change(setPreset)(e.target.value)}
          className="select bg-white border-gray-300 rounded-lg w-full mb-3"
          disabled={!!busy}
        >
          {DATE_RANGE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {["from", "to"].map((k) => (
              <label key={k} className="text-sm text-gray-700">
                {k === "from" ? "From" : "To"}
                <input
                  type="date"
                  value={custom[k]}
                  onChange={(e) => change(setCustom)({ ...custom, [k]: e.target.value })}
                  className="input bg-white border-gray-300 rounded-lg w-full mt-1"
                  disabled={!!busy}
                />
              </label>
            ))}
          </div>
        )}
        {range && preset !== "all" && (
          <p className="text-xs text-gray-500 mb-3">{range.label}</p>
        )}
        {preset === "custom" && !range && (custom.from || custom.to) && (
          <p className="text-xs text-red-600 mb-3">Pick a start date on or before the end date.</p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Scheme</label>
        <select
          value={scheme}
          onChange={(e) => change(setScheme)(e.target.value)}
          className="select bg-white border-gray-300 rounded-lg w-full mb-4"
          disabled={!!busy}
        >
          <option value="all">All Schemes</option>
          {schemes.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>

        <p className="text-sm font-medium text-gray-700 mb-2">Report types</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {EXPORT_TYPES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={types.includes(t.key)}
                onChange={() => toggleType(t.key)}
                disabled={!!busy}
              />
              <span>{t.label}</span>
              {counts && types.includes(t.key) && (
                <span className="text-gray-400">({(counts[t.key] ?? 0).toLocaleString()})</span>
              )}
            </label>
          ))}
        </div>

        {counts && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-5 text-sm text-gray-700">
            {total === 0 ? (
              "No reports match these filters."
            ) : (
              <>
                <span className="font-semibold">{total.toLocaleString()}</span> report
                {total !== 1 ? "s" : ""} — about {total.toLocaleString()} Firestore reads.
                {preset === "all" && total > 20000 && (
                  <span className="block mt-1 text-amber-700">
                    This is a large export and may take a minute. A narrower date range is cheaper.
                  </span>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline" disabled={busy === "exporting"}>
            Cancel
          </button>
          {counts ? (
            <button
              onClick={handleDownload}
              className="btn bg-teal-500 hover:bg-teal-600 text-white border-none"
              disabled={!!busy || total === 0}
            >
              {busy === "exporting" ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Download .xlsx"
              )}
            </button>
          ) : (
            <button
              onClick={handlePreview}
              className="btn bg-teal-500 hover:bg-teal-600 text-white border-none"
              disabled={!!busy || !range || selected.length === 0}
            >
              {busy === "counting" ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Check size"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportReportsModal;
