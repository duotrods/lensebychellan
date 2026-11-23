import { useMemo } from "react";
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
import FaultTooltip from "../client/FaultTooltip";

const COLOR_TEAL = "#17af93";
const COLOR_LIVE = "#ef4444";
const MAX_ROWS = 15;
const ROW_H = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fault timeline for one scheme: a bar per fault, grouped by camera, across `history`'s window
 * (output of buildCameraFaultHistory). Clicking a bar calls `onSelectCamera(camera)`, which the
 * parent uses to open that camera's notes. `bare` drops the card chrome so it can sit inside
 * another card.
 */
const CameraFaultTimelineChart = ({ history, loading = false, onSelectCamera, bare = false }) => {
  const allRows = useMemo(() => {
    const minSpan = (history.windowEndMs - history.windowStartMs) * 0.012; // keep short faults visible
    return history.cameras.flatMap((c) =>
      c.faults.map((f) => {
        const start = Math.max(f.startMs, history.windowStartMs);
        return {
          ...f,
          camera: c.camera,
          label: `${c.camera} · ${f.referenceId}`,
          range: [start, Math.max(f.endMs ?? history.windowEndMs, start + minSpan)],
        };
      }),
    );
  }, [history]);
  const rows = allRows.slice(0, MAX_ROWS);

  const spanDays = (history.windowEndMs - history.windowStartMs) / DAY_MS;
  const fmtTick = (ms) =>
    new Date(ms).toLocaleDateString("en-GB", spanDays > 300 ? { month: "short", year: "numeric" } : { day: "2-digit", month: "short" });

  const body = loading ? (
    <div className="flex justify-center items-center h-[300px]">
      <div className="loading loading-spinner loading-lg text-teal-500"></div>
    </div>
  ) : rows.length === 0 ? (
    <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
      No camera faults in this period
    </div>
  ) : (
    <>
      <ResponsiveContainer width="100%" height={Math.max(300, rows.length * ROW_H + 60)}>
        <BarChart accessibilityLayer={false} data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLOR_TEAL} horizontal={false} />
          <XAxis
            type="number"
            domain={[history.windowStartMs, history.windowEndMs]}
            tickCount={5}
            tickFormatter={fmtTick}
            tick={{ fontSize: 12 }}
          />
          <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12 }} interval={0} />
          <Tooltip
            cursor={{ fill: "rgba(23,175,147,0.08)" }}
            content={<FaultTooltip windowEndMs={history.windowEndMs} />}
          />
          <Bar
            dataKey="range"
            radius={[4, 4, 4, 4]}
            barSize={14}
            isAnimationActive={false}
            onClick={(d) => onSelectCamera?.(d.camera ?? d?.payload?.camera)}
            style={{ cursor: "pointer" }}
          >
            {rows.map((r) => (
              <Cell key={`${r.camera}-${r.id}`} fill={r.status === "live" ? COLOR_LIVE : COLOR_TEAL} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLOR_LIVE }} /> Live fault
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLOR_TEAL }} /> Resolved
        </span>
        {allRows.length > rows.length && (
          <span>Showing {rows.length} of {allRows.length} faults (live and most-faulted cameras first).</span>
        )}
      </div>
    </>
  );

  if (bare) {
    return (
      <div className="[&_*]:outline-none">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Fault timeline</p>
        <p className="text-xs text-gray-400 mb-3">Click a fault to see that camera&apos;s notes.</p>
        {body}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-md p-6 [&_*]:outline-none">
      <h5 className="text-lg font-semibold text-gray-800 mb-1">CCTV Fault Timeline</h5>
      <p className="text-xs text-gray-400 mb-4">Click a fault to see that camera&apos;s notes.</p>
      {body}
    </div>
  );
};

export default CameraFaultTimelineChart;
