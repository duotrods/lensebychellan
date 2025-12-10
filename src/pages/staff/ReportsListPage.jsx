import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import {
  FileText,
  Camera,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { generateReportPDF } from "../../utils/pdfGenerator";

const ReportsListPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const reportsPerPage = 10;

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, filterType, searchQuery]);

  const loadReports = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const [cctvForms, incidentReports, assetDamageReports, dailyOccurrenceReports] = await Promise.all([
        staffService.getCCTVCheckForms(userProfile.uid),
        staffService.getIncidentReports(userProfile.uid),
        staffService.getAssetDamageReports(userProfile.uid),
        staffService.getDailyOccurrenceReports(userProfile.uid),
      ]);

      // Combine all reports
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

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.referenceId &&
            r.referenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.firstName &&
            r.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.lastName &&
            r.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.scheme &&
            r.scheme.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredReports(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(
    indexOfFirstReport,
    indexOfLastReport
  );
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleViewReport = (report) => {
    // Navigate to view page based on type
    if (report.type === "CCTV Check") {
      navigate(`/dashboard/staff/reports/cctv-check/${report.id}`);
    } else if (report.type === "Incident Report") {
      navigate(`/dashboard/staff/reports/incident/${report.id}`);
    } else if (report.type === "Asset Damage") {
      navigate(`/dashboard/staff/reports/asset-damage/${report.id}`);
    } else if (report.type === "Daily Logs") {
      navigate(`/dashboard/staff/reports/daily-logs/${report.id}`);
    }
  };

  const handleExportReport = (report) => {
    try {
      generateReportPDF(report, report.type);
      toast.success(`Downloaded ${report.referenceId || 'report'} as PDF`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download report');
    }
  };

  return (
    <StaffSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Reports & Forms
          </h1>
          <p className="text-gray-600">View and manage all submitted reports</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, name, or scheme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full pl-5"
              />
            </div>

            {/* Filter by Type */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full pl-5"
              >
                <option value="all">All Report Types</option>
                <option value="CCTV Check">CCTV Check</option>
                <option value="Incident Report">Incident Report</option>
                <option value="Daily Logs">Daily Logs</option>
                <option value="Asset Damage">Asset Damage</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {currentReports.length} of {filteredReports.length} reports
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-teal-500"></span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-sm font-semibold text-gray-600">
                        Type
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-600">
                        Reference ID
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-600">
                        Submitted By
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-600">
                        Date
                      </th>
                      <th className="text-left text-sm font-semibold text-gray-600">
                        Time
                      </th>
                      <th className="text-center text-sm font-semibold text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReports.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-12 text-gray-500"
                        >
                          {searchQuery || filterType !== "all"
                            ? "No reports match your filters"
                            : "No reports submitted yet"}
                        </td>
                      </tr>
                    ) : (
                      currentReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center`}
                              >
                                <report.icon className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-medium text-gray-800">
                                {report.type}
                              </span>
                            </div>
                          </td>
                          <td className="text-sm text-gray-600 font-mono font-semibold">
                            {report.referenceId || report.id.slice(0, 12) + "..."}
                          </td>
                          <td className="text-sm text-gray-800">
                            {report.firstName && report.lastName
                              ? `${report.firstName} ${report.lastName}`
                              : report.submittedBy || "N/A"}
                          </td>
                          <td className="text-sm text-gray-600">
                            {formatDate(report.createdAt)}
                          </td>
                          <td className="text-sm text-gray-600">
                            {formatTime(report.createdAt)}
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewReport(report)}
                                className="btn btn-sm bg-teal-500 text-white hover:bg-teal-600 border-none"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              <button
                                onClick={() => handleExportReport(report)}
                                className="btn btn-sm btn-outline"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t flex justify-center items-center gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          page === currentPage
                            ? "bg-teal-500 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </StaffSidebarLayout>
  );
};

export default ReportsListPage;
