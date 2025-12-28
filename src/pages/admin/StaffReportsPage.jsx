import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { staffService } from "../../services/staffService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import {
  FileText,
  Camera,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  Filter,
  Search,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { generateReportPDF } from "../../utils/pdfGenerator";

const StaffReportsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [filterScheme, setFilterScheme] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const reportsPerPage = 15;

  useEffect(() => {
    loadAllReports();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, filterType, filterScheme, searchQuery]);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      // Get all reports (passing null to get all, not just specific user)
      const [cctvForms, incidentReports, assetDamageReports, dailyOccurrenceReports] = await Promise.all([
        staffService.getCCTVCheckForms(null),
        staffService.getIncidentReports(null),
        staffService.getAssetDamageReports(null),
        staffService.getDailyOccurrenceReports(null),
      ]);

      // Combine all reports with metadata
      const allReports = [
        ...cctvForms.map((f) => ({
          ...f,
          type: "CCTV Check",
          icon: Camera,
          color: "bg-purple-100 text-purple-600",
        })),
        ...incidentReports.map((f) => ({
          ...f,
          type: "Incident Report",
          icon: FileText,
          color: "bg-teal-100 text-teal-600",
        })),
        ...assetDamageReports.map((f) => ({
          ...f,
          type: "Asset Damage",
          icon: AlertTriangle,
          color: "bg-orange-100 text-orange-600",
        })),
        ...dailyOccurrenceReports.map((f) => ({
          ...f,
          type: "Daily Logs",
          icon: Calendar,
          color: "bg-blue-100 text-blue-600",
        })),
      ].sort((a, b) => b.createdAt - a.createdAt);

      setReports(allReports);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    // Filter by scheme
    if (filterScheme !== "all") {
      filtered = filtered.filter((r) => r.scheme?.includes(filterScheme));
    }

    // Filter by search query (search in reference ID, staff name, scheme, etc.)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.referenceId?.toLowerCase().includes(query) ||
          r.submittedBy?.name?.toLowerCase().includes(query) ||
          r.scheme?.toLowerCase().includes(query) ||
          r.type?.toLowerCase().includes(query)
      );
    }

    setFilteredReports(filtered);
    setCurrentPage(1);
  };

  const getUniqueSchemes = () => {
    const schemes = new Set();
    reports.forEach((r) => {
      if (r.scheme) schemes.add(r.scheme);
    });
    return Array.from(schemes).sort();
  };

  const handleViewReport = (report) => {
    // Navigate to appropriate view page based on report type
    if (report.type === "CCTV Check") {
      navigate(`/dashboard/admin/staff-reports/cctv/${report.id}`);
    } else if (report.type === "Incident Report") {
      navigate(`/dashboard/admin/staff-reports/incident/${report.id}`);
    } else if (report.type === "Asset Damage") {
      navigate(`/dashboard/admin/staff-reports/asset/${report.id}`);
    } else if (report.type === "Daily Logs") {
      navigate(`/dashboard/admin/staff-reports/daily/${report.id}`);
    }
  };

  const handleDownloadPDF = async (report) => {
    try {
      await generateReportPDF(report);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Pagination
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Statistics
  const stats = {
    total: reports.length,
    cctvCheck: reports.filter((r) => r.type === "CCTV Check").length,
    incident: reports.filter((r) => r.type === "Incident Report").length,
    assetDamage: reports.filter((r) => r.type === "Asset Damage").length,
    dailyLogs: reports.filter((r) => r.type === "Daily Logs").length,
  };

  return (
    <AdminSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Staff Reports</h1>
          <p className="text-gray-600">View and manage all submitted forms from staff members</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Reports</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-gray-600" />
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
                <Camera className="w-6 h-6 text-purple-600" />
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
                <FileText className="w-6 h-6 text-teal-600" />
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
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Daily Logs</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.dailyLogs}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, staff name, scheme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Filter by Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full"
            >
              <option value="all">All Types</option>
              <option value="CCTV Check">CCTV Check</option>
              <option value="Incident Report">Incident Report</option>
              <option value="Asset Damage">Asset Damage</option>
              <option value="Daily Logs">Daily Logs</option>
            </select>

            {/* Filter by Scheme */}
            <select
              value={filterScheme}
              onChange={(e) => setFilterScheme(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full"
            >
              <option value="all">All Schemes</option>
              {getUniqueSchemes().map((scheme) => (
                <option key={scheme} value={scheme}>
                  {scheme}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>
              Showing {filteredReports.length} of {reports.length} reports
            </span>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="loading loading-spinner loading-lg text-teal-500"></div>
            </div>
          ) : currentReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No reports found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left">Type</th>
                      <th className="text-left">Reference ID</th>
                      <th className="text-left">Submitted By</th>
                      <th className="text-left">Scheme</th>
                      <th className="text-left">Date</th>
                      <th className="text-left">Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${report.color}`}>
                              <report.icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-sm">{report.type}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-sm font-semibold text-gray-800">
                            {report.referenceId || "N/A"}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{report.submittedBy?.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-gray-600">{report.scheme || "N/A"}</span>
                        </td>
                        <td>
                          <span className="text-sm text-gray-600">{formatDate(report.createdAt)}</span>
                        </td>
                        <td>
                          <span
                            className={`badge badge-sm ${
                              report.status === "submitted" || report.status === "action needed"
                                ? "badge-warning"
                                : "badge-success"
                            }`}
                          >
                            {report.status || "submitted"}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="btn btn-sm btn-ghost text-teal-600 hover:bg-teal-50"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(report)}
                              className="btn btn-sm btn-ghost text-blue-600 hover:bg-blue-50"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn btn-sm btn-outline"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="btn btn-sm btn-outline"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminSidebarLayout>
  );
};

export default StaffReportsPage;
