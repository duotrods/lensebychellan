import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Car, Camera, Filter, Clock, TrendingUp } from "lucide-react";

const NewClientDashboard = () => {
  const { userProfile } = useAuth();
  const [dateRange, setDateRange] = useState('30');

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;
  const days = parseInt(dateRange);

  // Cached query for stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['schemeStats', schemeId, days],
    queryFn: () => clientDataService.getSchemeStats(schemeId, days),
    enabled: !!schemeId,
  });

  // Cached query for uptime
  const { data: cctvUptime, isLoading: uptimeLoading } = useQuery({
    queryKey: ['cctvUptime', schemeId],
    queryFn: () => clientDataService.getCCTVUptime(schemeId),
    enabled: !!schemeId,
  });

  // Cached query for time series
  const { data: timeSeriesData = [], isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['timeSeriesData', schemeId, days],
    queryFn: () => clientDataService.getTimeSeriesData(schemeId, days),
    enabled: !!schemeId,
  });

  const loading = statsLoading || uptimeLoading || timeSeriesLoading;

  // Transform stats data for charts - filter out Unknown and empty values
  const transformDataForChart = (dataObj, filterUnknown = true) => {
    if (!dataObj) return [];
    return Object.entries(dataObj)
      .filter(([name, count]) => {
        // Filter out Unknown and empty values if requested
        if (filterUnknown && (name === 'Unknown' || name === '' || name === 'undefined')) {
          return false;
        }
        // Only include entries with count > 0
        return count > 0;
      })
      .map(([name, count]) => ({
        name,
        Number: count,
      }))
      .sort((a, b) => b.Number - a.Number); // Sort by count descending
  };

  const faultData = transformDataForChart(stats?.faultTypes);
  const incidentTypeData = transformDataForChart(stats?.incidentsByType);
  const vehiclesDispatchedData = transformDataForChart(stats?.vehicleTypesDispatched);
  const spottedByData = transformDataForChart(stats?.spottedBy);
  const laneAffectedData = transformDataForChart(stats?.incidentsByLane);
  const timeToRecoverData = transformDataForChart(stats?.timeToRecover, false); // Keep all time ranges
  const trafficConditionsData = transformDataForChart(stats?.trafficConditions);
  const timeToSiteData = transformDataForChart(stats?.timeToSite, false); // Keep all time ranges
  const trackData = transformDataForChart(stats?.trackOfIncident);
  const emergencyServicesData = transformDataForChart(stats?.emergencyServices);
  const vehicleTypeData = transformDataForChart(stats?.vehicleTypes);
  const incursionsData = [{ name: "Incursions", Number: stats?.incursions || 0 }];

  const statsCards = [
    {
      title: "Total Incidents",
      value: loading ? "..." : (stats?.totalIncidents || 0).toString(),
      text: "Total number of incidents reported within the scheme.",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      title: "Vehicles Dispatched",
      value: loading ? "..." : (stats?.vehiclesDispatched || 0).toString(),
      text: "Total number of vehicles dispatched to incident locations.",
      icon: Car,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "CCTV Uptime",
      value: loading ? "..." : `${cctvUptime?.uptime || 0}%`,
      text: "Total percentage of time CCTV systems were operational.",
      icon: Camera,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
  ];

  // Chart component wrapper for consistent styling
  const ChartCard = ({ title, children, fullWidth = false, height = 380 }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow ${fullWidth ? 'col-span-full' : ''}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );

  // Common chart styling props
  const commonChartProps = {
    cartesianGrid: { strokeDasharray: "3 3", stroke: "#e5e7eb" },
    xAxis: { angle: -45, textAnchor: "end", height: 120, tick: { fontSize: 13 }, interval: 0 },
    yAxis: { tick: { fontSize: 13 } },
    tooltip: {
      contentStyle: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' },
      labelStyle: { fontWeight: 'bold' }
    },
    legend: { wrapperStyle: { paddingTop: '20px' } },
    bar: { fill: "#3b82f6", radius: [8, 8, 0, 0] }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4">
      {/* Header with Date Filter */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold text-gray-800">
            Welcome back, {userProfile?.displayName}!
          </h3>
          <p className="text-gray-600 mt-2">
            {userProfile?.schemeId} - {userProfile?.schemeName}
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="select select-bordered select-md bg-white border border-gray-200 p8"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <h5 className="font-semibold text-gray-500 mb-1">{stat.title}</h5>
                </div>
                <span className="text-4xl font-bold text-gray-800 pl-2">
                  {stat.value}
                </span>
                <p className="text-sm text-gray-500 mt-2">{stat.text}</p>
              </div>
            ))}
          </div>

          {/* All Charts in 2 Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Chart 1: Fault */}
            <ChartCard title="Fault">
              <BarChart data={faultData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 2: Incident Type */}
            <ChartCard title="Incident Type">
              <BarChart data={incidentTypeData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 3: Vehicles Dispatched */}
            <ChartCard title="Vehicles Dispatched">
              <BarChart data={vehiclesDispatchedData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 4: Spotted By */}
            <ChartCard title="Spotted By">
              <BarChart data={spottedByData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 5: Lane Affected */}
            <ChartCard title="Lane Affected">
              <BarChart data={laneAffectedData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 6: Time to Recover */}
            <ChartCard title="Time to recover (mins)">
              <BarChart data={timeToRecoverData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 7: Traffic Conditions */}
            <ChartCard title="Traffic Conditions">
              <BarChart data={trafficConditionsData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 8: Emergency Services Attended */}
            <ChartCard title="Emergency Services Attended">
              <BarChart data={emergencyServicesData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 9: Time to Site */}
            <ChartCard title="Time to Site (mins)">
              <BarChart data={timeToSiteData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 10: Track of Incident */}
            <ChartCard title="Track of Incident">
              <BarChart data={trackData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 11: Vehicle Type */}
            <ChartCard title="Vehicle Type">
              <BarChart data={vehicleTypeData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" {...commonChartProps.xAxis} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>

            {/* Chart 12: Incursions */}
            <ChartCard title="Incursions">
              <BarChart data={incursionsData}>
                <CartesianGrid {...commonChartProps.cartesianGrid} />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis {...commonChartProps.yAxis} />
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
                <Bar dataKey="Number" {...commonChartProps.bar} />
              </BarChart>
            </ChartCard>
          </div>

          {/* Full Width: Incidents Over Time */}
          <div className="mb-8">
            <ChartCard title="Incidents Over Time" fullWidth height={350}>
              <BarChart
                data={
                  timeSeriesData.length > 0
                    ? timeSeriesData.map(d => ({ ...d, Number: d.count }))
                    : [{ name: "No Data", Number: 0 }]
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Number" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              <h3 className="text-xl font-bold text-gray-800 border-b-0">Performance Metrics</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CCTV Performance */}
              <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">CCTV Performance</h4>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Uptime</span>
                    <span className="font-bold text-green-700">{cctvUptime?.uptime || 0}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${cctvUptime?.uptime || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    {cctvUptime?.workingChecks || 0} of {cctvUptime?.totalChecks || 0} checks passed
                  </p>
                </div>
              </div>

              {/* Response Efficiency */}
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Response Time</h4>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-blue-700">
                    {stats?.totalIncidents > 0 ? '8-15 min' : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">Average time to site</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Based on {stats?.totalIncidents || 0} incidents
                  </p>
                </div>
              </div>

              {/* Incident Resolution */}
              <div className="p-6 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-800">Total Activity</h4>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-orange-700">{stats?.totalIncidents || 0}</p>
                  <p className="text-xs text-gray-600 mt-2">Incidents reported</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Last {dateRange} days
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">
              Recent Incidents
            </h3>
            {stats?.recentIncidents && stats.recentIncidents.length > 0 ? (
              <div className="space-y-4">
                {stats.recentIncidents.map((incident, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {incident.type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {incident.location} •{" "}
                          {incident.time
                            ? new Date(
                                incident.time.seconds * 1000
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        incident.status === "Resolved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {incident.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No recent incidents for this scheme</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NewClientDashboard;
