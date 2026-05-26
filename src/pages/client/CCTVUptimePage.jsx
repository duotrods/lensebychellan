import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import { Camera, Clock, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";

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

const KPICard = ({ icon: Icon, label, value, sub, iconColor }) => (
  <div className="bg-white rounded-xl shadow p-5 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${iconColor} shrink-0`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  </div>
);

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
      <div className="p-6 space-y-6">
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
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {cooldown > 0 && <span className="text-xs tabular-nums">{cooldown}s</span>}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Failed to load uptime data: {error}
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={TrendingUp}
            label="Avg Uptime"
            value={loading ? "—" : `${totals.avgUptimePct ?? "100.0"}%`}
            sub={`Last ${dateRange} days`}
            iconColor={
              loading || parseFloat(totals.avgUptimePct) >= 99
                ? "bg-green-500"
                : parseFloat(totals.avgUptimePct) >= 95
                ? "bg-amber-400"
                : "bg-red-500"
            }
          />
          <KPICard
            icon={Clock}
            label="Avg Downtime"
            value={loading ? "—" : `${(100 - parseFloat(totals.avgUptimePct ?? 100)).toFixed(1)}%`}
            sub={`${totals.totalOutages ?? 0} fault${totals.totalOutages !== 1 ? "s" : ""}`}
            iconColor="bg-blue-500"
          />
          <KPICard
            icon={AlertTriangle}
            label="Total Outages"
            value={loading ? "—" : (totals.totalOutages ?? 0)}
            sub={totals.liveFaults > 0 ? `${totals.liveFaults} currently live` : "None active"}
            iconColor={totals.liveFaults > 0 ? "bg-red-500" : "bg-gray-400"}
          />
          <KPICard
            icon={Camera}
            label="Avg MTTR"
            value={loading ? "—" : totals.avgMttrMins != null ? fmtDowntime(totals.avgMttrMins) : "N/A"}
            sub="Mean time to resolve"
            iconColor="bg-purple-500"
          />
        </div>

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
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading uptime data…</span>
            </div>
          )}

          {!loading && cameras.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Camera className="w-10 h-10 mb-3 opacity-40" />
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
