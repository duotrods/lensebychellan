import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faTriangleExclamation,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const fmtDowntime = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const uptimeColor = (pct) => {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-red-500";
};

const uptimeTextColor = (pct) => {
  if (pct >= 90) return "text-green-600";
  if (pct >= 80) return "text-amber-600";
  return "text-red-600";
};

// Shared card shell — matches NewClientDashboard's StatCard shell so every
// stat/metric card in the client app shares one visual language: a flat
// white surface with a soft shadow that lifts slightly on hover.
const CARD_SHELL =
  "bg-white rounded-[10px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0px_2px_10px_0px_rgba(0,0,0,0.14)]";

// One stat block within CameraOverviewCard's grid — icon tile + title, then
// a big value and caption. Same visual language as StatCard, minus its own
// outer shell, since it's one of four columns sharing that card.
const StatBlock = ({ icon, label, value, sub, tint, iconColor }) => (
  <div>
    <div className="flex items-center gap-3 mb-2">
      <div
        className={`grid place-items-center size-8 rounded-sm shrink-0 ${tint}`}
      >
        <FontAwesomeIcon icon={icon} className={`w-5 h-5 ${iconColor}`} />
      </div>
      <h5
        className="font-poppins font-medium! text-base text-[#191d23] leading-none truncate min-w-0"
        title={label}
      >
        {label}
      </h5>
    </div>
    <p className="font-inter font-medium text-[32px] leading-[1.2] text-black/70">
      {value}
    </p>
    {sub && (
      <p className="mt-3.5 text-xs leading-normal text-[#637381]">{sub}</p>
    )}
  </div>
);

// Meter gradients run worst → best, so the colour the fill *ends* on reads as
// the health of the number. Uptime climbs red → green; downtime is reversed,
// since a small downtime bar is the good case. Matches NewClientDashboard's
// Camera Overview panel exactly.
const UPTIME_GRADIENT =
  "linear-gradient(to right, #ff8080 0%, #ffcf96 49%, #95e45d 100%)";
const DOWNTIME_GRADIENT =
  "linear-gradient(to right, #95e45d 0%, #ffcf96 51%, #ff8080 100%)";

// Segmented meter: the gradient always spans the full track and a grey block
// masks the unfilled tail, so a 40% bar shows only the red/amber part of the
// ramp rather than a squashed copy of the whole thing.
const CameraMeter = ({ label, value, pct, gradient, caption, empty }) => {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div>
      <p className="font-poppins font-light text-base uppercase text-[#191d23]">
        {label}
      </p>
      <p className="mt-2.5 font-inter font-medium text-[32px] leading-[1.2] text-black/70">
        {value}
      </p>
      <div className="mt-4 max-w-[248px]">
        <div className="relative h-[14px]">
          {!empty && (
            <span
              className="absolute top-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[8px] border-t-[#191d23]"
              style={{ left: `${clamped}%` }}
            />
          )}
        </div>
        {/* Track is grey by default; the gradient only paints over it when
            there's real data, so "no data" can't read as a full green bar. */}
        <div
          className="relative h-2.5 overflow-hidden bg-[#d9d9d9]"
          style={empty ? undefined : { backgroundImage: gradient }}
        >
          {!empty && (
            <div
              className="absolute inset-y-0 right-0 bg-[#d9d9d9]"
              style={{ width: `${100 - clamped}%` }}
            />
          )}
          <div className="absolute inset-y-0 left-1/4 w-px bg-white" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white" />
          <div className="absolute inset-y-0 left-3/4 w-px bg-white" />
        </div>
      </div>
      <p className="mt-3.5 text-xs leading-normal text-[#637381]">{caption}</p>
    </div>
  );
};

// Wide panel with all four uptime metrics in one card: the two camera meters
// first, then Total Outages and Avg MTTR as two more columns beside them,
// each divided by a vertical rule (and a top rule where they wrap to a new
// row at the sm breakpoint). Driven by this page's own selected date range
// instead of the dashboard's fixed 30 days.
const CameraOverviewCard = ({
  uptimePct,
  hasData,
  loading,
  rangeDays,
  totalOutages,
  liveFaults,
  avgMttrMins,
}) => {
  const parsed = parseFloat(uptimePct);
  const uptime = Number.isFinite(parsed) ? parsed : 0;
  const downtime = 100 - uptime;
  const empty = !loading && !hasData;
  const show = (value) => (loading ? "..." : empty ? "—" : value);
  return (
    <div className={`${CARD_SHELL} p-8`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <CameraMeter
          label="Average Camera Uptime"
          value={show(`${uptime.toFixed(1)}%`)}
          pct={loading || empty ? 0 : uptime}
          gradient={UPTIME_GRADIENT}
          empty={loading || empty}
          caption={
            empty
              ? "No camera uptime recorded for this scheme yet."
              : `Average camera uptime across the scheme (last ${rangeDays} days).`
          }
        />
        <div className="sm:border-l sm:border-[#ededed] sm:pl-8">
          <CameraMeter
            label="Average Camera Downtime"
            value={show(`${downtime.toFixed(1)}%`)}
            pct={loading || empty ? 0 : downtime}
            gradient={DOWNTIME_GRADIENT}
            empty={loading || empty}
            caption={
              empty
                ? "No camera downtime recorded for this scheme yet."
                : `Average camera downtime across the scheme (last ${rangeDays} days).`
            }
          />
        </div>
        <div className="sm:border-t sm:border-[#ededed] sm:pt-8 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8">
          <StatBlock
            icon={faTriangleExclamation}
            label="Total Outages"
            value={loading ? "—" : totalOutages}
            sub={liveFaults > 0 ? `${liveFaults} currently live` : "None active"}
            tint={liveFaults > 0 ? "bg-red-500/10" : "bg-gray-400/10"}
            iconColor={liveFaults > 0 ? "text-red-500" : "text-gray-400"}
          />
        </div>
        <div className="sm:border-t sm:border-l sm:border-[#ededed] sm:pt-8 sm:pl-8 lg:border-t-0 lg:pt-0 lg:pl-8">
          <StatBlock
            icon={faCamera}
            label="Avg MTTR"
            value={loading ? "—" : avgMttrMins != null ? fmtDowntime(avgMttrMins) : "N/A"}
            sub="Mean time to resolve"
            tint="bg-purple-500/10"
            iconColor="text-purple-500"
          />
        </div>
      </div>
    </div>
  );
};

const CCTVUptimePage = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState(30);
  const [cooldown, setCooldown] = useState(0);
  const forceRef = useRef(false);

  const activeScheme = userProfile?.activeSchemeId || userProfile?.schemeId;

  const { data, isFetching, error: queryError, refetch } = useQuery({
    queryKey: ["cctvUptime", activeScheme, dateRange],
    queryFn: () => {
      const force = forceRef.current;
      forceRef.current = false;
      return clientDataService.getCCTVUptimeData(activeScheme, dateRange, force);
    },
    staleTime: 14 * 60 * 1000,
    enabled: !!activeScheme,
  });

  const loading = isFetching;
  const error = queryError?.message ?? null;

  // Count down the refresh cooldown each second
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleRefresh = () => {
    if (cooldown > 0 || isFetching) return;
    setCooldown(60);
    forceRef.current = true;
    queryClient.invalidateQueries({ queryKey: ["cctvUptime", activeScheme] });
    refetch();
  };

  const { cameras: rawCameras = [], totals = {} } = data || {};
  const cameras = [...rawCameras].sort((a, b) => b.uptimePct - a.uptimePct);

  return (
    <ClientSidebarLayout>
      <div className="max-w-[1600px] mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CCTV Uptime Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Camera uptime and fault summary</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === value
                    ? "bg-teal-500 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              disabled={loading || cooldown > 0}
              title={cooldown > 0 ? `Refresh available in ${cooldown}s` : "Refresh"}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faRotateRight} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {cooldown > 0 && <span className="text-xs tabular-nums">{cooldown}s</span>}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Failed to load uptime data: {error}
          </div>
        )}

        {/* Camera Overview — uptime, downtime, total outages, and avg MTTR
            all in one card. */}
        <CameraOverviewCard
          uptimePct={totals.avgUptimePct}
          hasData={cameras.length > 0}
          loading={loading}
          rangeDays={dateRange}
          totalOutages={totals.totalOutages ?? 0}
          liveFaults={totals.liveFaults ?? 0}
          avgMttrMins={totals.avgMttrMins}
        />

        {/* Camera Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Per-Camera Breakdown</h2>
            {!loading && cameras.length > 0 && (
              <span className="text-xs text-gray-500">{cameras.length} camera{cameras.length !== 1 ? "s" : ""} — best uptime first</span>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <FontAwesomeIcon icon={faRotateRight} className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading uptime data…</span>
            </div>
          )}

          {!loading && cameras.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FontAwesomeIcon icon={faCamera} className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No fault data in this period</p>
              <p className="text-xs mt-1">All cameras appear to be running at 100% uptime</p>
            </div>
          )}

          {!loading && cameras.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left px-6 py-3 font-medium">Camera</th>
                    <th className="text-left px-4 py-3 font-medium">Uptime %</th>
                    <th className="text-left px-4 py-3 font-medium">Downtime</th>
                    <th className="text-left px-4 py-3 font-medium">Outages</th>
                    <th className="text-left px-4 py-3 font-medium">MTTR</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cameras.map((cam) => (
                    <tr key={cam.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-800">{cam.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${uptimeColor(cam.uptimePct)}`}
                              style={{ width: `${cam.uptimePct}%` }}
                            />
                          </div>
                          <span className={`font-semibold text-xs ${uptimeTextColor(cam.uptimePct)}`}>
                            {cam.uptimePct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{fmtDowntime(cam.downMins)}</td>
                      <td className="px-4 py-3 text-gray-700">{cam.outages}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {cam.mttrMins != null ? fmtDowntime(cam.mttrMins) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {cam.liveFault ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            FAULT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Online
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientSidebarLayout>
  );
};

export default CCTVUptimePage;
