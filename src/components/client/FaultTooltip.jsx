const fmtDateTime = (ms) =>
  new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtDuration = (ms) => {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

// Hover card for a fault bar on the camera fault timelines (client sidebar + admin/client charts).
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

export default FaultTooltip;
