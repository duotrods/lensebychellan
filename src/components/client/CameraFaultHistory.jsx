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
import { faVideo, faXmark, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { clientDataService } from "../../services/clientDataService";
import { buildCameraFaultHistory } from "../../utils/cameraFaultHistory";

const RANGES = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BARS = 20;
const NOTES_COLLAPSED = 3;
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
const CameraDetailSidebar = ({ entry, windowStartMs, windowEndMs, basePath, onClose }) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
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
  const notes = showAll ? entry.notes : entry.notes.slice(0, NOTES_COLLAPSED);

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
          <button
            onClick={onClose}
            className="drilldown-close-btn flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-white" />
          </button>
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
              <ul className="space-y-3">
                {notes.map((n, i) => (
                  <li key={`${n.faultId}-${n.atMs}-${i}`} className="text-sm border-l-2 border-teal-300 pl-3">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                      <span className="font-mono">{fmtDateTime(n.atMs)}</span>
                      {n.authorName && <span className="font-medium text-gray-700">{n.authorName}</span>}
                      {roleLabel(n.authorRole) && <span>({roleLabel(n.authorRole)})</span>}
                      <button
                        type="button"
                        onClick={() => navigate(`${basePath}/reports/cctv-faults/${n.faultId}`)}
                        className="text-teal-600 hover:underline"
                      >
                        {n.referenceId}
                      </button>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
            {entry.notes.length > NOTES_COLLAPSED && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 text-sm text-teal-600 hover:underline"
              >
                {showAll ? "Show fewer notes" : `Show all ${entry.notes.length} notes`}
              </button>
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
  const [selected, setSelected] = useState(null);
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
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default CameraFaultHistory;
