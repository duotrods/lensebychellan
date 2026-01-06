import { useState, useEffect } from "react";
import { staffService } from "../../services/staffService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import { SCHEMES } from "../../utils/schemes";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";
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

// Chart Card Component
const ChartCard = ({ title, children, fullWidth = false, height = 300 }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${fullWidth ? 'col-span-full' : ''}`}>
    <h5 className="text-lg font-semibold text-gray-800 mb-4">{title}</h5>
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  </div>
);

const ClientChartsPage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState("");
  const [reports, setReports] = useState([]);
  const [schemes, setSchemes] = useState([]);

  const COLORS = {
    primary: "#17af93",
  };

  // Common chart props
  const commonChartProps = {
    cartesianGrid: { strokeDasharray: "3 3", stroke: "#17af93" },
    xAxis: { tick: { fontSize: 13 } },
    yAxis: { tick: { fontSize: 13 } },
    tooltip: {
      contentStyle: { backgroundColor: '#fff', border: '1px solid #17af93', borderRadius: '8px' },
      labelStyle: { fontWeight: 'bold' }
    },
    legend: { wrapperStyle: { paddingTop: '6px' } },
    bar: { fill: COLORS.primary, radius: [8, 8, 0, 0] }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [cctvForms, incidentReports, assetDamageReports, dailyOccurrenceReports] = await Promise.all([
        staffService.getCCTVCheckForms(null),
        staffService.getIncidentReports(null),
        staffService.getAssetDamageReports(null),
        staffService.getDailyOccurrenceReports(null),
      ]);

      const allReports = [
        ...cctvForms.map((f) => ({ ...f, type: "CCTV Check" })),
        ...incidentReports.map((f) => ({ ...f, type: "Incident Report" })),
        ...assetDamageReports.map((f) => ({ ...f, type: "Asset Damage" })),
        ...dailyOccurrenceReports.map((f) => ({ ...f, type: "Daily Logs" })),
      ];

      setReports(allReports);

      // Extract unique schemes from active SCHEMES constant only
      const activeSchemeNames = SCHEMES.map(s => s.fullName);
      const uniqueSchemes = [...new Set(allReports.map((r) => r.scheme).filter(Boolean))]
        .filter(scheme => activeSchemeNames.includes(scheme))
        .sort();
      setSchemes(uniqueSchemes);

      // Set first scheme as default
      if (uniqueSchemes.length > 0) {
        setSelectedScheme(uniqueSchemes[0]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  // Filter reports by selected scheme
  const getFilteredReports = () => {
    if (!selectedScheme) return reports;
    return reports.filter((r) => r.scheme === selectedScheme);
  };

  // Get incident reports only
  const getIncidentReports = () => {
    return getFilteredReports().filter(r => r.type === "Incident Report");
  };

  // Chart data extraction functions
  const getFaultData = () => {
    const incidents = getIncidentReports();
    const faultCounts = {};
    incidents.forEach(report => {
      if (report.fault) {
        faultCounts[report.fault] = (faultCounts[report.fault] || 0) + 1;
      }
    });
    return Object.entries(faultCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getIncidentTypeData = () => {
    const incidents = getIncidentReports();
    const typeCounts = {};
    incidents.forEach(report => {
      if (report.incidentType) {
        typeCounts[report.incidentType] = (typeCounts[report.incidentType] || 0) + 1;
      }
    });
    return Object.entries(typeCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getVehiclesDispatchedData = () => {
    const incidents = getIncidentReports();
    const dispatchData = { Light: 0, Heavy: 0, IPV: 0, HETOS: 0 };
    incidents.forEach(report => {
      if (report.recoveryRequested) {
        dispatchData.Light += report.recoveryRequested.light || 0;
        dispatchData.Heavy += report.recoveryRequested.heavy || 0;
        dispatchData.IPV += report.recoveryRequested.ipv || 0;
        dispatchData.HETOS += report.recoveryRequested.hetos || 0;
      }
    });
    return Object.entries(dispatchData).map(([name, Number]) => ({ name, Number }));
  };

  const getSpottedByData = () => {
    const incidents = getIncidentReports();
    const spottedCounts = {};
    incidents.forEach(report => {
      if (report.reportedBy) {
        spottedCounts[report.reportedBy] = (spottedCounts[report.reportedBy] || 0) + 1;
      }
    });
    return Object.entries(spottedCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getLaneAffectedData = () => {
    const incidents = getIncidentReports();
    const laneCounts = {};
    incidents.forEach(report => {
      if (report.affectedLanes && Array.isArray(report.affectedLanes)) {
        report.affectedLanes.forEach(lane => {
          laneCounts[lane] = (laneCounts[lane] || 0) + 1;
        });
      }
    });
    return Object.entries(laneCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getTimeToRecoverData = () => {
    const incidents = getIncidentReports();
    const timeBuckets = { '0-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    incidents.forEach(report => {
      if (report.timeOnsiteToCleared) {
        const match = report.timeOnsiteToCleared.match(/(\d+)/);
        if (match) {
          const mins = parseInt(match[1]);
          if (mins <= 15) timeBuckets['0-15']++;
          else if (mins <= 30) timeBuckets['16-30']++;
          else if (mins <= 45) timeBuckets['31-45']++;
          else if (mins <= 60) timeBuckets['46-60']++;
          else timeBuckets['60+']++;
        }
      }
    });
    return Object.entries(timeBuckets).map(([name, Number]) => ({ name, Number }));
  };

  const getTrafficConditionsData = () => {
    const incidents = getIncidentReports();
    const trafficCounts = {};
    incidents.forEach(report => {
      if (report.trafficConditions) {
        trafficCounts[report.trafficConditions] = (trafficCounts[report.trafficConditions] || 0) + 1;
      }
    });
    return Object.entries(trafficCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getEmergencyServicesData = () => {
    const incidents = getIncidentReports();
    const serviceCounts = {};
    incidents.forEach(report => {
      if (report.emergencyServices && Array.isArray(report.emergencyServices)) {
        report.emergencyServices.forEach(service => {
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
      }
    });
    return Object.entries(serviceCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getTimeToSiteData = () => {
    const incidents = getIncidentReports();
    const timeBuckets = { '0-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '20+': 0 };
    incidents.forEach(report => {
      if (report.timeSpottedToOn) {
        const match = report.timeSpottedToOn.match(/(\d+)/);
        if (match) {
          const mins = parseInt(match[1]);
          if (mins <= 5) timeBuckets['0-5']++;
          else if (mins <= 10) timeBuckets['6-10']++;
          else if (mins <= 15) timeBuckets['11-15']++;
          else if (mins <= 20) timeBuckets['16-20']++;
          else timeBuckets['20+']++;
        }
      }
    });
    return Object.entries(timeBuckets).map(([name, Number]) => ({ name, Number }));
  };

  const getTrackData = () => {
    const incidents = getIncidentReports();
    const trackCounts = {};
    incidents.forEach(report => {
      if (report.track) {
        trackCounts[report.track] = (trackCounts[report.track] || 0) + 1;
      }
    });
    return Object.entries(trackCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getVehicleTypeData = () => {
    const incidents = getIncidentReports();
    const vehicleCounts = {};
    incidents.forEach(report => {
      if (report.vehicles && Array.isArray(report.vehicles)) {
        report.vehicles.forEach(vehicle => {
          if (vehicle.type) {
            vehicleCounts[vehicle.type] = (vehicleCounts[vehicle.type] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(vehicleCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getIncursionsData = () => {
    const incidents = getIncidentReports();
    const incursionCounts = { YES: 0, NO: 0 };
    incidents.forEach(report => {
      if (report.incursion) {
        incursionCounts[report.incursion] = (incursionCounts[report.incursion] || 0) + 1;
      }
    });
    return Object.entries(incursionCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getTimeSeriesData = () => {
    const incidents = getIncidentReports();
    const monthlyCounts = {};
    incidents.forEach(report => {
      if (report.createdAt) {
        const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      }
    });
    return Object.entries(monthlyCounts).map(([name, count]) => ({ name, count, Number: count }));
  };

  // Statistics
  const filtered = getFilteredReports();
  const stats = {
    total: filtered.length,
    cctvCheck: filtered.filter((r) => r.type === "CCTV Check").length,
    incident: filtered.filter((r) => r.type === "Incident Report").length,
    assetDamage: filtered.filter((r) => r.type === "Asset Damage").length,
    dailyLogs: filtered.filter((r) => r.type === "Daily Logs").length,
  };

  // Extract chart data
  const faultData = getFaultData();
  const incidentTypeData = getIncidentTypeData();
  const vehiclesDispatchedData = getVehiclesDispatchedData();
  const spottedByData = getSpottedByData();
  const laneAffectedData = getLaneAffectedData();
  const timeToRecoverData = getTimeToRecoverData();
  const trafficConditionsData = getTrafficConditionsData();
  const emergencyServicesData = getEmergencyServicesData();
  const timeToSiteData = getTimeToSiteData();
  const trackData = getTrackData();
  const vehicleTypeData = getVehicleTypeData();
  const incursionsData = getIncursionsData();
  const timeSeriesData = getTimeSeriesData();

  return (
    <AdminSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">Client Charts & Analytics</h3>
          <p className="text-gray-600">Visual analytics of all reports and submissions per scheme</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full max-w-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              {schemes.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {scheme}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="loading loading-spinner loading-lg text-teal-500"></div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Reports</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">CCTV Checks</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.cctvCheck}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Incidents</p>
                    <p className="text-3xl font-bold text-teal-600 mt-1">{stats.incident}</p>
                  </div>
                  <div className="bg-teal-100 p-3 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Asset Damage</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.assetDamage}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Chart 1: Fault */}
              <ChartCard title="Fault">
                <BarChart data={faultData.length > 0 ? faultData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={incidentTypeData.length > 0 ? incidentTypeData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={vehiclesDispatchedData.length > 0 ? vehiclesDispatchedData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={spottedByData.length > 0 ? spottedByData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={laneAffectedData.length > 0 ? laneAffectedData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={timeToRecoverData.length > 0 ? timeToRecoverData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={trafficConditionsData.length > 0 ? trafficConditionsData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={emergencyServicesData.length > 0 ? emergencyServicesData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={timeToSiteData.length > 0 ? timeToSiteData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={trackData.length > 0 ? trackData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={vehicleTypeData.length > 0 ? vehicleTypeData : [{ name: "No Data", Number: 0 }]}>
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
                <BarChart data={incursionsData.length > 0 ? incursionsData : [{ name: "No Data", Number: 0 }]}>
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
                  <Bar dataKey="Number" fill="#17af93" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </AdminSidebarLayout>
  );
};

export default ClientChartsPage;
