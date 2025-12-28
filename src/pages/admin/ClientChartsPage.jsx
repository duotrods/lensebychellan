import { useState, useEffect } from "react";
import { staffService } from "../../services/staffService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ClientChartsPage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState("all");
  const [reports, setReports] = useState([]);
  const [schemes, setSchemes] = useState([]);

  const COLORS = {
    cctvCheck: "#9333ea",
    incident: "#14b8a6",
    assetDamage: "#f97316",
    dailyLogs: "#3b82f6",
  };

  const PIE_COLORS = ["#9333ea", "#14b8a6", "#f97316", "#3b82f6"];

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

      // Extract unique schemes
      const uniqueSchemes = [...new Set(allReports.map((r) => r.scheme).filter(Boolean))].sort();
      setSchemes(uniqueSchemes);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  // Filter reports by selected scheme
  const getFilteredReports = () => {
    if (selectedScheme === "all") return reports;
    return reports.filter((r) => r.scheme === selectedScheme);
  };

  // Get reports by type data for pie chart
  const getReportsByTypeData = () => {
    const filtered = getFilteredReports();
    return [
      { name: "CCTV Check", value: filtered.filter((r) => r.type === "CCTV Check").length },
      { name: "Incident Report", value: filtered.filter((r) => r.type === "Incident Report").length },
      { name: "Asset Damage", value: filtered.filter((r) => r.type === "Asset Damage").length },
      { name: "Daily Logs", value: filtered.filter((r) => r.type === "Daily Logs").length },
    ];
  };

  // Get monthly trend data for line chart
  const getMonthlyTrendData = () => {
    const filtered = getFilteredReports();
    const monthlyData = {};

    filtered.forEach((report) => {
      if (report.createdAt) {
        const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            "CCTV Check": 0,
            "Incident Report": 0,
            "Asset Damage": 0,
            "Daily Logs": 0,
          };
        }

        monthlyData[monthKey][report.type]++;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  };

  // Get reports by scheme data for bar chart
  const getReportsBySchemeData = () => {
    const schemeData = {};

    schemes.forEach((scheme) => {
      const schemeReports = reports.filter((r) => r.scheme === scheme);
      schemeData[scheme] = {
        name: scheme.length > 20 ? scheme.substring(0, 20) + "..." : scheme,
        fullName: scheme,
        "CCTV Check": schemeReports.filter((r) => r.type === "CCTV Check").length,
        "Incident Report": schemeReports.filter((r) => r.type === "Incident Report").length,
        "Asset Damage": schemeReports.filter((r) => r.type === "Asset Damage").length,
        "Daily Logs": schemeReports.filter((r) => r.type === "Daily Logs").length,
      };
    });

    return Object.values(schemeData);
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

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <AdminSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Client Charts & Analytics</h1>
          <p className="text-gray-600">Visual analytics of all reports and submissions per scheme</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full max-w-md"
            >
              <option value="all">All Schemes</option>
              {schemes.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {scheme}
                </option>
              ))}
            </select>
            {selectedScheme !== "all" && (
              <button
                onClick={() => setSelectedScheme("all")}
                className="btn btn-sm btn-outline"
              >
                Clear Filter
              </button>
            )}
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

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Reports Distribution - Pie Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Reports Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getReportsByTypeData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getReportsByTypeData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Trend - Line Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trend (Last 6 Months)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getMonthlyTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={formatMonthLabel}
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "8px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="CCTV Check" stroke={COLORS.cctvCheck} strokeWidth={2} />
                    <Line type="monotone" dataKey="Incident Report" stroke={COLORS.incident} strokeWidth={2} />
                    <Line type="monotone" dataKey="Asset Damage" stroke={COLORS.assetDamage} strokeWidth={2} />
                    <Line type="monotone" dataKey="Daily Logs" stroke={COLORS.dailyLogs} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Reports by Scheme - Bar Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Reports by Scheme</h3>
                <button
                  onClick={() => toast.success("Export feature coming soon")}
                  className="btn btn-sm btn-outline gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getReportsBySchemeData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderRadius: "8px" }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend />
                  <Bar dataKey="CCTV Check" stackId="a" fill={COLORS.cctvCheck} />
                  <Bar dataKey="Incident Report" stackId="a" fill={COLORS.incident} />
                  <Bar dataKey="Asset Damage" stackId="a" fill={COLORS.assetDamage} />
                  <Bar dataKey="Daily Logs" stackId="a" fill={COLORS.dailyLogs} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold">Most Active</h4>
                </div>
                <p className="text-2xl font-bold">
                  {getReportsByTypeData().sort((a, b) => b.value - a.value)[0]?.name || "N/A"}
                </p>
                <p className="text-purple-100 text-sm mt-1">
                  {getReportsByTypeData().sort((a, b) => b.value - a.value)[0]?.value || 0} submissions
                </p>
              </div>

              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-md p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold">Total Schemes</h4>
                </div>
                <p className="text-2xl font-bold">{schemes.length}</p>
                <p className="text-teal-100 text-sm mt-1">Active schemes being monitored</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold">This Month</h4>
                </div>
                <p className="text-2xl font-bold">
                  {getMonthlyTrendData().slice(-1)[0]
                    ? Object.values(getMonthlyTrendData().slice(-1)[0]).reduce(
                        (sum, val) => (typeof val === "number" ? sum + val : sum),
                        0
                      )
                    : 0}
                </p>
                <p className="text-orange-100 text-sm mt-1">Total submissions this month</p>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminSidebarLayout>
  );
};

export default ClientChartsPage;
