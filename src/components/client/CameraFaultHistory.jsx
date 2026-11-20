import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVideo, faXmark, faSpinner, faDownload } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import { getActiveSchemeName } from "../../utils/schemes";
import { buildCameraFaultHistory } from "../../utils/cameraFaultHistory";

const RANGES = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BARS = 20;
const COLOR_TEAL = "#17af93"; // same teal as the dashboard charts
const COLOR_TEAL_DARK = "#0f7f6c";
const COLOR_LIVE = "#ef4444";
const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#fff", border: "1px solid #17af93", borderRadius: "8px" },
  labelStyle: { fontWeight: "bold" },
};

const fmtDay = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const fmtDateTime = (ms) =>
  new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtDuration = (ms) => {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

const fmtDayLong = (ms) =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const fmtFullDate = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const isOperatorRole = (role) => role === "cctvfaultoperator" || role === "thirdpartycctvoperator";
const initials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "N";

const roleLabel = (role) =>
  role === "cctvfaultoperator" || role === "thirdpartycctvoperator" ? "CCTV Operator" : role ? "Staff" : "";

const FaultTooltip = ({ active, payload, windowEndMs }) => {
  if (!active || !payload?.length) return null;
  const f = payload[0].payload;
  return (
    <div className="bg-white border border-teal-500 rounded-lg px-3 py-2 text-sm shadow">
      <p className="font-bold">{f.referenceId}</p>
      <p className="text-gray-600">Reported: {fmtDateTime(f.startMs)}</p>
      <p className="text-gray-600">
        {f.endMs === null ? "Still live" : `Resolved: ${fmtDateTime(f.endMs)}`}
      </p>
      <p className="text-gray-600">Duration: {fmtDuration((f.endMs ?? windowEndMs) - f.startMs)}</p>
      {f.comments ? <p className="text-gray-500 mt-1 max-w-xs">{f.comments}</p> : null}
    </div>
  );
};

// Slide-in panel (same look as the dashboard drill-down) opened when a camera bar is clicked:
// that camera's faults on a timeline + the notes from every one of its faults merged.
const CameraDetailSidebar = ({ entry, windowStartMs, windowEndMs, basePath, subtitle, rangeText, onClose }) => {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { exportCameraHistoryPDF } = await import("../../utils/cameraHistoryPdf"); // keep jsPDF lazy
      exportCameraHistoryPDF({
        entry,
        windowStartMs,
        windowEndMs,
        subtitle,
        rangeText,
        fileName: `camera-history_${entry.camera.replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      toast.success("Camera history exported");
    } catch (error) {
      console.error("Failed to export camera history:", error);
      toast.error("Failed to export camera history");
    } finally {
      setIsExporting(false);
    }
  };
  const minSpan = (windowEndMs - windowStartMs) * 0.012; // keep very short faults visible

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = entry.faults.map((f) => {
    const start = Math.max(f.startMs, windowStartMs);
    const end = f.endMs ?? windowEndMs;
    return { ...f, label: f.referenceId, range: [start, Math.max(end, start + minSpan)] };
  });

  // Message thread: oldest first, grouped under a date separator per day.
  const thread = useMemo(() => {
    const groups = [];
    for (const n of [...entry.notes].reverse()) {
      const day = fmtDayLong(n.atMs);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(n);
      else groups.push({ day, items: [n] });
    }
    return groups;
  }, [entry.notes]);

  return createPortal(
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeInBackdrop { from { opacity: 0; } to { opacity: 1; } }
        .drilldown-close-btn { background: rgba(255,255,255,0.15); transition: background 0.15s; }
        .drilldown-close-btn:hover { background: rgba(255,255,255,0.28); }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)", animation: "fadeInBackdrop 0.25s ease" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white max-w-full"
        style={{
          width: "520px",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.18), -1px 0 0 rgba(0,0,0,0.06)",
          animation: "slideInRight 0.3s cubic-bezier(0.25,1,0.5,1)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #17af93 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <FontAwesomeIcon icon={faVideo} className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white leading-tight">{entry.camera}</h4>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                {entry.faultCount} fault{entry.faultCount !== 1 ? "s" : ""}
                {entry.hasLive ? " · live fault open" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExport}
              disabled={isExporting}
              title="Export this camera's history as PDF"
              className="drilldown-close-btn flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
            >
              <FontAwesomeIcon icon={isExporting ? faSpinner : faDownload} className={`w-3.5 h-3.5 ${isExporting ? "animate-spin" : ""}`} />
              Export
            </button>
            <button
              onClick={onClose}
              className="drilldown-close-btn flex items-center justify-center w-8 h-8 rounded-lg"
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Fault timeline</p>
            <div style={{ height: Math.min(rows.length, 8) * 34 + 60 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR_TEAL} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[windowStartMs, windowEndMs]}
                    tickCount={5}
                    tickFormatter={fmtDay}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(23,175,147,0.08)" }}
                    content={<FaultTooltip windowEndMs={windowEndMs} />}
                  />
                  <Bar dataKey="range" radius={[4, 4, 4, 4]} barSize={14} isAnimationActive={false}>
                    {rows.map((r) => (
                      <Cell key={r.id} fill={r.status === "live" ? COLOR_LIVE : COLOR_TEAL} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Notes history{entry.notes.length ? ` (${entry.notes.length})` : ""}
            </p>
            {entry.notes.length === 0 ? (
              <p className="text-sm text-gray-400">No notes on this camera&apos;s faults.</p>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-5">
                {thread.map((group) => (
                  <div key={group.day}>
                    <div className="flex justify-center mb-3">
                      <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-0.5">
                        {group.day}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((n, i) => {
                        const isOperator = isOperatorRole(n.authorRole);
                        return (
                          <div
                            key={`${n.faultId}-${n.atMs}-${i}`}
                            className={`flex items-end gap-2 ${isOperator ? "flex-row-reverse" : ""}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isOperator ? "bg-teal-500 text-white" : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {initials(n.authorName)}
                            </div>
                            <div
                              className={`max-w-[80%] px-3 py-2 border ${
                                isOperator
                                  ? "bg-teal-50 border-teal-100 rounded-2xl rounded-br-sm"
                                  : "bg-blue-50 border-blue-100 rounded-2xl rounded-bl-sm"
                              }`}
                            >
                              <div className="flex items-baseline gap-2 text-xs">
                                <span className="font-semibold text-gray-800">{n.authorName || "Note"}</span>
                                {roleLabel(n.authorRole) && <span className="text-gray-400">{roleLabel(n.authorRole)}</span>}
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">{n.text}</p>
                              <div className="flex items-center justify-between gap-4 mt-1 text-[11px] text-gray-400">
                                <button
                                  type="button"
                                  onClick={() => navigate(`${basePath}/reports/cctv-faults/${n.faultId}`)}
                                  className="font-mono text-teal-600 hover:underline"
                                >
                                  {n.referenceId}
                                </button>
                                <span>{fmtTime(n.atMs)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>,
    document.body,
  );
};

/**
 * Faults per camera as a bar chart (same look as the dashboard charts). Clicking a camera
 * opens its timeline and the notes from all of its fault forms merged into one history.
 */
const CameraFaultHistory = ({ schemeId, basePath = "/dashboard/client" }) => {
  const [range, setRange] = useState("30");
  const { userProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { days, label: rangeLabel } = RANGES.find((r) => r.value === range) ?? RANGES[1];

  const query = useQuery({
    queryKey: ["cameraFaultHistory", schemeId, range],
    queryFn: () =>
      clientDataService.getCCTVFaultsForHistory(schemeId, days === null ? null : Date.now() - days * DAY_MS),
    enabled: !!schemeId,
    staleTime: 60 * 1000, // operators add notes live; keep it reasonably fresh
    placeholderData: keepPreviousData, // no spinner flash when switching range
  });

  useEffect(() => {
    if (query.isError) {
      console.error("Failed to load camera fault history:", query.error);
      toast.error("Could not load camera fault history.");
    }
  }, [query.isError, query.error]);

  const history = useMemo(
    () => buildCameraFaultHistory({ faults: query.data ?? [], now: query.dataUpdatedAt || Date.now(), days }),
    [query.data, query.dataUpdatedAt, days],
  );

  // A camera picked earlier may have no faults in a newly chosen range.
  const selectedEntry = history.cameras.find((c) => c.camera === selected) ?? null;
  const toggle = (camera) => setSelected((cur) => (cur === camera ? null : camera));

  const chartData = history.cameras.slice(0, MAX_BARS).map((c) => ({
    name: c.camera,
    camera: c.camera,
    Faults: c.faultCount,
    hasLive: c.hasLive,
  }));
  const hiddenCount = history.cameras.length - chartData.length;

  // Same PDF look as the dashboard "Export Charts" (teal header + bar chart), one chart per page.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { exportChartsToPDF } = await import("../../utils/pdfChartExport"); // keep jsPDF lazy
      const totalFaults = history.cameras.reduce((sum, c) => sum + c.faultCount, 0);
      const fmtFull = fmtFullDate;
      await exportChartsToPDF({
        reportTitle: "Camera Fault History",
        subtitle: `${schemeId} - ${getActiveSchemeName(userProfile)}`,
        dateRangeText: `${rangeLabel}: ${fmtFull(history.windowStartMs)} - ${fmtFull(history.windowEndMs)}`,
        statsText: `${history.cameras.length} camera${history.cameras.length !== 1 ? "s" : ""} - ${totalFaults} fault${totalFaults !== 1 ? "s" : ""}`,
        charts: [{ data: chartData.map((d) => ({ name: d.camera, Number: d.Faults })), title: "Faults per camera" }],
        layout: "single",
        fileName: `camera-fault-history_${schemeId}_${range}_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      toast.success("Chart exported");
    } catch (error) {
      console.error("Failed to export camera fault history:", error);
      toast.error("Failed to export chart");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
      <div className="flex flex-col">
        {/* Header bar — same as the Live / Completed tables above */}
        <div className="bg-linear-to-br from-brand-500 to-brand-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faVideo} className="w-6 h-6 text-brand-500" />
          </div>
          <span className="text-white font-semibold text-2xl">Camera Fault History</span>
          <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
            {query.isLoading ? "..." : `${history.cameras.length} Camera${history.cameras.length !== 1 ? "s" : ""}`}
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || chartData.length === 0}
            title="Export chart as PDF"
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
          >
            <FontAwesomeIcon icon={isExporting ? faSpinner : faDownload} className={`w-4 h-4 ${isExporting ? "animate-spin" : ""}`} />
            Export
          </button>
        </div>

        <div className="bg-white shadow-xs rounded-b-lg overflow-hidden border border-t-0 border-gray-100">
          <div className="flex flex-col gap-3 px-4 py-4 border-b border-gray-100 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Faults per camera ({rangeLabel.toLowerCase()}). Click a camera to open its timeline and notes.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Time range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="select select-bordered select-sm bg-white border-gray-300"
              >
                {RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Camera"
                value={selectedEntry ? selectedEntry.camera : "all"}
                onChange={(e) => setSelected(e.target.value === "all" ? null : e.target.value)}
                disabled={history.cameras.length === 0}
                className="select select-bordered select-sm bg-white border-gray-300"
              >
                <option value="all">All cameras</option>
                {history.cameras.map((c) => (
                  <option key={c.camera} value={c.camera}>
                    {c.camera}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4">
            {query.isLoading ? (
              <div className="p-6 flex justify-center">
                <FontAwesomeIcon icon={faSpinner} className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : query.isError && !query.data ? (
              <div className="p-6 text-center text-slate-400">Camera fault history is unavailable right now</div>
            ) : chartData.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                {days === null ? "No camera faults recorded for this scheme" : `No camera faults in the ${rangeLabel.toLowerCase()}`}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_TEAL} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(23,175,147,0.08)" }} />
                    <Bar
                      dataKey="Faults"
                      radius={[8, 8, 0, 0]}
                      cursor="pointer"
                      onClick={(d) => toggle(d?.camera ?? d?.payload?.camera)}
                    >
                      {chartData.map((d) => {
                        const isSelected = d.camera === selected;
                        const base = d.hasLive ? COLOR_LIVE : COLOR_TEAL;
                        return (
                          <Cell
                            key={d.camera}
                            fill={isSelected && !d.hasLive ? COLOR_TEAL_DARK : base}
                            fillOpacity={selected && !isSelected ? 0.35 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLOR_LIVE }} /> Has a live fault
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLOR_TEAL }} /> All resolved
                  </span>
                  {hiddenCount > 0 && (
                    <span>
                      Showing the {MAX_BARS} cameras with the most faults ({hiddenCount} more in the Camera filter).
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedEntry && (
        <CameraDetailSidebar
          key={selectedEntry.camera}
          entry={selectedEntry}
          windowStartMs={history.windowStartMs}
          windowEndMs={history.windowEndMs}
          basePath={basePath}
          subtitle={`${schemeId} - ${getActiveSchemeName(userProfile)}`}
          rangeText={`${rangeLabel}: ${fmtFullDate(history.windowStartMs)} - ${fmtFullDate(history.windowEndMs)}`}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default CameraFaultHistory;
