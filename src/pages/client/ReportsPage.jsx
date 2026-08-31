import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import { useLiveClientReports } from "../../hooks/useLiveClientReports";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import {
  FileText,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { generateReportPDF } from "../../utils/pdfGenerator";
import { getActiveSchemeName } from "../../utils/schemes";
import ReportStatsCards from "../../components/client/reports/ReportStatsCards";
import ReportDetailModal from "../../components/client/reports/ReportDetailModal";
import {
  getReportTypeIcon,
  getReportTypeBadge,
  getReportDisplayDate,
  getReportDisplayTime,
} from "../../utils/reportDisplay";

// Module-level variable — survives component unmount/remount, no serialization needed.
// Only browse-pagination state needs restoring: TanStack Query's own cache
// already keeps the actual report data/counts alive across unmount.
let _reportsRestore = null;

const ReportsPage = () => {
  const navigate = useNavigate();
  const { userProfile, role } = useAuth();
  const basePath = role === "thirdpartyclient" ? "/dashboard/thirdparty/client" : "/dashboard/client";
  const activeScheme = userProfile?.activeSchemeId || userProfile?.schemeId;
  const reportsPerPage = 10;

  const [filterType, setFilterType] = useState("all");
  const [subFilter, setSubFilter] = useState(null); // 'free-recovery' | 'incursion' | null
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [appliedDateFilter, setAppliedDateFilter] = useState(null); // null = no filter

  const searchDebounceRef = useRef(null);
  const searchRateLimitRef = useRef([]);
  // Cursor state per filter combo, one entry per page: cursorsRef.current[key][i]
  // is what's needed to fetch page i + 1. Only consulted on a cache miss.
  const cursorsRef = useRef({});
  const searchCursorsRef = useRef({});

  const isSearchMode = debouncedSearchTerm.trim() !== "";
  const dateKey = appliedDateFilter
    ? `${appliedDateFilter.startDate.getTime()}-${appliedDateFilter.endDate.getTime()}`
    : "none";
  const filterKey = `${filterType}|${subFilter}|${dateKey}`;

  useEffect(() => {
    if (_reportsRestore) {
      setCurrentPage(_reportsRestore.page);
      setFilterType(_reportsRestore.filterType);
      setSubFilter(_reportsRestore.subFilter);
      cursorsRef.current = _reportsRestore.cursors || {};
      if (_reportsRestore.appliedDateFilter) {
        setAppliedDateFilter(_reportsRestore.appliedDateFilter);
        setDateFilter({
          startDate: _reportsRestore.appliedDateFilter.startDate.toISOString().split("T")[0],
          endDate: _reportsRestore.appliedDateFilter.endDate.toISOString().split("T")[0],
        });
      }
    }
  }, []);

  const clearRestoreState = () => {
    _reportsRestore = null;
  };

  // Abuse/cost guard — independent of caching, so it stays a manual gate in
  // front of whatever triggers a search query (typing, Next, Prev).
  const checkSearchRateLimit = () => {
    const now = Date.now();
    searchRateLimitRef.current = searchRateLimitRef.current.filter((t) => now - t < 30000);
    if (searchRateLimitRef.current.length >= 10) {
      toast.error("Too many searches. Please wait a moment.");
      return false;
    }
    searchRateLimitRef.current.push(now);
    return true;
  };

  const searchKey = `${debouncedSearchTerm}|${filterType}`;

  const searchQueryResult = useQuery({
    queryKey: ["clientReportsSearch", activeScheme, debouncedSearchTerm, filterType, searchPage],
    queryFn: async () => {
      searchCursorsRef.current[searchKey] ??= [{}];
      const lastDocs = searchCursorsRef.current[searchKey][searchPage - 1] ?? {};
      return clientDataService.searchReportsPaginated(
        activeScheme,
        debouncedSearchTerm.trim(),
        10,
        lastDocs,
        filterType === "all" ? null : filterType,
      );
    },
    enabled: isSearchMode && !!activeScheme,
  });

  useEffect(() => {
    if (searchQueryResult.data) {
      searchCursorsRef.current[searchKey] ??= [{}];
      searchCursorsRef.current[searchKey][searchPage] = searchQueryResult.data.lastDocs;
    }
  }, [searchQueryResult.data, searchKey, searchPage]);

  useEffect(() => {
    if (searchQueryResult.isError) {
      console.error("Search failed:", searchQueryResult.error);
      toast.error("Search failed. Please try again.");
    }
  }, [searchQueryResult.isError, searchQueryResult.error]);

  const searchResults = searchQueryResult.data?.results ?? [];
  const searchHasMore = searchQueryResult.data?.hasMore ?? false;
  const searchLoading = searchQueryResult.isFetching;

  const handleSearchNextPage = () => {
    if (!searchHasMore || !checkSearchRateLimit()) return;
    setSearchPage((p) => p + 1);
  };

  const handleSearchPrevPage = () => {
    if (searchPage > 1) setSearchPage((p) => p - 1);
  };

  const handleCardClick = (type, sub = null) => {
    clearRestoreState();
    setSubFilter(sub);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSearchPage(1);
    setFilterType(type);
    setCurrentPage(1);
    // Scroll table into view
    setTimeout(() => {
      document
        .querySelector(".bg-white.rounded-lg.shadow.overflow-hidden")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const reportsQuery = useQuery({
    queryKey: ["clientReports", activeScheme, filterType, subFilter, dateKey, currentPage],
    queryFn: async () => {
      cursorsRef.current[filterKey] ??= [{ cursors: {}, typeCursor: null }];
      const prev = cursorsRef.current[filterKey][currentPage - 1] ?? { cursors: {}, typeCursor: null };

      let newReports, newCursors = {}, newTypeCursor = null, newHasMore = true;
      if (filterType === "all") {
        const result = await clientDataService.getAllReportsPaginated(
          activeScheme,
          reportsPerPage,
          prev.cursors,
          appliedDateFilter,
        );
        newReports = result.reports;
        newCursors = result.cursors;
        newHasMore = result.hasMore;
      } else {
        const extraWhere =
          subFilter === "incursion"
            ? { field: "incursion", op: "==", value: "YES" }
            : subFilter === "gain-advantage"
              ? { field: "incursionToGainAdvantage", op: "==", value: "YES" }
              : subFilter === "free-recovery"
                ? { field: "incidentType", op: "in", value: ["Free Recovery", "Drive Off"] }
                : subFilter === "asset-damage"
                  ? { field: "propertyDamage", op: "==", value: true }
                  : subFilter === "pure"
                    ? { field: "isPureIncident", op: "==", value: true }
                    : null;
        const result = await clientDataService.getReportsByTypePaginated(
          activeScheme,
          filterType,
          reportsPerPage,
          prev.typeCursor,
          extraWhere,
          appliedDateFilter,
        );
        newReports = result.reports;
        newTypeCursor = result.lastDoc;
        newHasMore = result.hasMore;
      }

      return { reports: newReports, cursors: newCursors, typeCursor: newTypeCursor, hasMore: newHasMore };
    },
    enabled: !!activeScheme,
  });

  useEffect(() => {
    if (reportsQuery.data) {
      cursorsRef.current[filterKey] ??= [{ cursors: {}, typeCursor: null }];
      cursorsRef.current[filterKey][currentPage] = {
        cursors: reportsQuery.data.cursors,
        typeCursor: reportsQuery.data.typeCursor,
      };
    }
  }, [reportsQuery.data, filterKey, currentPage]);

  useEffect(() => {
    if (reportsQuery.isError) {
      console.error("Failed to load reports:", reportsQuery.error);
      const err = reportsQuery.error;
      if (err?.message?.includes("index") || err?.cause?.message?.includes("index")) {
        toast.error("Firebase indexes are still building. Please wait 5-10 minutes and refresh.");
      } else {
        toast.error("Failed to load reports. Check console for details.");
      }
    }
  }, [reportsQuery.isError, reportsQuery.error]);

  // Live overlay for page 1 only — a bounded (limit 10 per collection) listener
  // shows brand-new reports the instant they're submitted. Only applies with
  // no date range or sub-filter active, since the live query can't apply
  // those and would otherwise show rows that don't belong on that page.
  const isLiveWindow = !isSearchMode && currentPage === 1 && !appliedDateFilter && !subFilter;
  const liveReports = useLiveClientReports({
    filterType,
    schemeId: activeScheme,
    enabled: isLiveWindow,
  });

  const reports =
    isLiveWindow && liveReports.length > 0
      ? liveReports.slice(0, reportsPerPage)
      : reportsQuery.data?.reports ?? [];
  const loading = reportsQuery.isLoading;
  const hasMore = reportsQuery.data?.hasMore ?? false;

  const reportTypeCountsQuery = useQuery({
    queryKey: ["clientReportsCounts", activeScheme, dateKey],
    queryFn: () => clientDataService.getAllReportsCountByType(activeScheme, appliedDateFilter),
    enabled: !!activeScheme,
  });

  useEffect(() => {
    if (reportTypeCountsQuery.isError) {
      console.warn("Could not load total count:", reportTypeCountsQuery.error);
    }
  }, [reportTypeCountsQuery.isError, reportTypeCountsQuery.error]);

  const reportTypeCounts = reportTypeCountsQuery.data ?? {
    incident: 0,
    pureIncident: 0,
    assetDamage: 0,
    dailyOccurrence: 0,
    cctvCheck: 0,
    cctvFaults: 0,
    freeRecovery: 0,
    driveOff: 0,
    incursions: 0,
    incursionToGainAdvantage: 0,
    vehiclesDispatched: 0,
    incidentAssetDamage: 0,
    total: 0,
  };

  // Filter and search reports (client-side search + daily-occurrence scheme check only)
  // Type filtering is handled server-side when filterType !== 'all'
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());

    // When 'all' view: also apply type filter client-side
    const matchesType =
      filterType === "all" || report.reportType === filterType;

    // Sub-filter for free recovery, incursions, asset damage (client-side safety net)
    if (subFilter === "free-recovery" && report.reportType === "incident") {
      return (
        matchesSearch &&
        (report.incidentType === "Free Recovery" ||
          report.incidentType === "Drive Off")
      );
    }
    if (subFilter === "incursion" && report.reportType === "incident") {
      return matchesSearch && report.incursion === "YES";
    }
    if (subFilter === "gain-advantage" && report.reportType === "incident") {
      return matchesSearch && report.incursionToGainAdvantage === "YES";
    }
    if (subFilter === "asset-damage" && report.reportType === "incident") {
      return matchesSearch && report.propertyDamage === true;
    }
    if (subFilter === "pure" && report.reportType === "incident") {
      return matchesSearch; // server filters by isPureIncident==true — no client work needed
    }
    if (subFilter) return false; // hide non-incident rows when a sub-filter is active

    // For daily occurrence reports, check if any occurrence matches the client's scheme
    if (report.reportType === "daily-occurrence" && report.occurrences) {
      const activeSchemeName = getActiveSchemeName(userProfile);
      const hasMatchingOccurrence = report.occurrences.some(
        (occurrence) =>
          occurrence.scheme === activeSchemeName ||
          occurrence.scheme === "All Schemes",
      );
      return matchesSearch && matchesType && hasMatchingOccurrence;
    }

    return matchesSearch && matchesType;
  });

  // Use type-specific count for pagination when a filter is active
  const getActiveCount = () => {
    if (filterType === "incident" && subFilter === "incursion")
      return reportTypeCounts.incursions;
    if (filterType === "incident" && subFilter === "gain-advantage")
      return reportTypeCounts.incursionToGainAdvantage;
    if (filterType === "incident" && subFilter === "free-recovery")
      return (
        (reportTypeCounts.freeRecovery || 0) + (reportTypeCounts.driveOff || 0)
      );
    if (filterType === "incident" && subFilter === "asset-damage")
      return reportTypeCounts.incidentAssetDamage;
    if (filterType === "incident" && subFilter === "pure")
      return reportTypeCounts.pureIncident;
    if (filterType === "incident") return reportTypeCounts.incident;
    if (filterType === "asset-damage") return reportTypeCounts.assetDamage;
    if (filterType === "daily-occurrence")
      return reportTypeCounts.dailyOccurrence;
    if (filterType === "cctv-check") return reportTypeCounts.cctvCheck;
    if (filterType === "cctv-faults") return reportTypeCounts.cctvFaults;
    return reportTypeCounts.total;
  };
  const activeCount = getActiveCount();

  const currentReports = isSearchMode ? searchResults : filteredReports;
  const totalPages = Math.ceil(activeCount / reportsPerPage);

  // If restored page exceeds actual total pages, reset to page 1
  useEffect(() => {
    if (!loading && totalPages > 0 && currentPage > totalPages) {
      _reportsRestore = null;
      setCurrentPage(1);
    }
  }, [totalPages, loading, currentPage]);

  // Pagination handlers
  const handleNextPage = () => {
    const atLastPage = totalPages > 0 && currentPage >= totalPages;
    if (hasMore && !atLastPage) setCurrentPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleViewReport = (report) => {
    _reportsRestore = {
      page: currentPage,
      filterType,
      subFilter,
      cursors: cursorsRef.current,
      appliedDateFilter,
    };
    // Navigate to appropriate view page based on report type
    const reportTypeRoutes = {
      incident: `${basePath}/reports/incident/${report.id}`,
      "asset-damage": `${basePath}/reports/asset-damage/${report.id}`,
      "daily-occurrence": `${basePath}/reports/daily-occurrence/${report.id}`,
      "cctv-check": `${basePath}/reports/cctv-check/${report.id}`,
      "cctv-faults": `${basePath}/reports/cctv-faults/${report.id}`,
    };

    const route = reportTypeRoutes[report.reportType];
    if (route) {
      navigate(route);
    } else {
      setSelectedReport(report); // Fallback to modal
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      // For CCTV check reports, pass the active scheme ID to filter the PDF content
      const activeSchemeId =
        userProfile?.activeSchemeId || userProfile?.schemeId;
      await generateReportPDF(report, report.reportType, activeSchemeId);
      toast.success(`Downloaded ${report.referenceId || "report"} as PDF`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download report");
    }
  };

  const reportStats = {
    total: reportTypeCounts.total,
    incident: reportTypeCounts.incident,
    pureIncident: reportTypeCounts.pureIncident,
    dailyOccurrence: reportTypeCounts.dailyOccurrence,
    cctvCheck: reportTypeCounts.cctvCheck,
    cctvFaults: reportTypeCounts.cctvFaults,
    freeRecovery:
      (reportTypeCounts.freeRecovery || 0) + (reportTypeCounts.driveOff || 0),
    incursions: reportTypeCounts.incursions,
    incursionToGainAdvantage: reportTypeCounts.incursionToGainAdvantage,
    vehiclesDispatched: reportTypeCounts.vehiclesDispatched,
    incidentAssetDamage: reportTypeCounts.incidentAssetDamage,
  };


  const handleApplyDateFilter = () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      toast.error("Please select both a start and end date.");
      return;
    }
    const start = new Date(dateFilter.startDate);
    // Set end date to end of day so the full day is included
    const end = new Date(dateFilter.endDate);
    end.setHours(23, 59, 59, 999);
    setAppliedDateFilter({ startDate: start, endDate: end });
    clearRestoreState();
    setCurrentPage(1);
  };

  const handleClearDateFilter = () => {
    setDateFilter({ startDate: "", endDate: "" });
    setAppliedDateFilter(null);
    clearRestoreState();
    setCurrentPage(1);
  };

  return (
    <ClientSidebarLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600 mt-2">
            View and manage all reports for <span className="font-semibold text-brand-400">{getActiveSchemeName(userProfile)}</span>
          </p>
        </div>

        <ReportStatsCards reportStats={reportStats} onCardClick={handleCardClick} />

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search */}
            <div className="w-full md:w-72 relative shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by reference ID or staff name..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  setCurrentPage(1);
                  if (searchDebounceRef.current)
                    clearTimeout(searchDebounceRef.current);
                  if (value.trim() === "") {
                    // Search cleared — go back to normal pagination
                    setDebouncedSearchTerm("");
                    setSearchPage(1);
                    clearRestoreState();
                  } else if (value.trim().length >= 3) {
                    // Only search after 3 chars — skips "I", "IN" etc.
                    searchDebounceRef.current = setTimeout(() => {
                      if (!checkSearchRateLimit()) return;
                      setDebouncedSearchTerm(value);
                      setSearchPage(1);
                    }, 400);
                  }
                }}
                className="input input-bordered w-full pl-4 bg-white border-gray-300"
              />
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="input input-bordered bg-white border-gray-300 text-sm h-10 flex-1 min-w-0"
              />
              <span className="text-gray-400 text-sm shrink-0">to</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="input input-bordered bg-white border-gray-300 text-sm h-10 flex-1 min-w-0"
              />
              <button
                onClick={handleApplyDateFilter}
                className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white border-none shrink-0"
              >
                Apply
              </button>
              {appliedDateFilter && (
                <button
                  onClick={handleClearDateFilter}
                  className="btn btn-sm btn-ghost text-gray-500 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => {
                  const newType = e.target.value;
                  clearRestoreState();
                  setSubFilter(null);
                  setFilterType(newType);
                  setCurrentPage(1);
                  setSearchPage(1);
                }}
                className="select  select-bordered bg-white border-gray-300"
              >
                <option value="all">All Types</option>
                <option value="incident">Incident Reports</option>
                {/* <option value="daily-occurrence">Daily Occurrence</option> */}
                <option value="cctv-check">CCTV Checks</option>
                <option value="cctv-faults">CCTV Faults</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading || searchLoading ? (
            <div className="p-12 text-center">
              <span className="loading loading-spinner loading-lg text-brand-500"></span>
            </div>
          ) : currentReports.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-brand-500">
                    <tr>
                      <th className="text-left text-white">Type</th>
                      <th className="text-left text-white">Reference ID</th>
                      <th className="text-left text-white">
                        Title/Description
                      </th>
                      <th className="text-left text-white">Location</th>
                      <th className="text-left text-white">Date & Time</th>
                      <th className="text-left text-white">Submitted By</th>
                      {/* <th className="text-left text-white">Status</th> */}
                      <th className="text-center text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReports.map((report, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td>
                          <div className="flex items-center gap-2">
                            {getReportTypeIcon(report.reportType)}
                            <span
                              className={`badge ${getReportTypeBadge(report.reportType)} badge-sm`}
                            >
                              {report.reportType
                                .replace("-", " ")
                                .toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-sm font-semibold">
                          <div>{report.referenceId}</div>
                          {report.reportType === "incident" &&
                            report.incursion === "YES" && (
                              <span className="badge badge-error badge-xs mt-1">
                                Incursion
                              </span>
                            )}
                          {report.reportType === "incident" &&
                            report.incursionToGainAdvantage === "YES" && (
                              <span className="badge badge-warning badge-xs mt-1">
                                Gain Benifit
                              </span>
                            )}
                          {report.reportType === "incident" && report.standDown && (
                            <span className="badge badge-neutral badge-xs mt-1">
                              Stood Down
                            </span>
                          )}
                        </td>
                        <td className="max-w-xs truncate">
                          {report.type || report.title || "N/A"}
                        </td>
                        <td className="max-w-xs truncate">
                          {report.location || "N/A"}
                        </td>
                        <td>
                          <div className="text-sm">
                            <p className="font-medium">
                              {getReportDisplayDate(report)}
                            </p>
                            <p className="text-gray-500">
                              {getReportDisplayTime(report)}
                            </p>
                          </div>
                        </td>
                        <td className="text-sm">
                          {report.submittedBy?.name ||
                            (typeof report.submittedBy === "string"
                              ? report.submittedBy
                              : "Staff")}
                        </td>
                        {/* <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(report.status)}`}>
                            {report.status || 'Pending'}
                          </span>
                        </td> */}
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                              title="View Report"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadReport(report)}
                              className="btn btn-sm btn-ghost text-green-600 hover:text-green-800"
                              title="Download Report"
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

              {/* Search pagination */}
              {isSearchMode && (searchPage > 1 || searchHasMore) && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {searchPage} &mdash; {searchResults.length} result
                    {searchResults.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSearchPrevPage}
                      disabled={searchPage === 1}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">Page {searchPage}</span>
                    <button
                      onClick={handleSearchNextPage}
                      disabled={!searchHasMore}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination — hidden while searching */}
              {!isSearchMode && (currentPage > 1 || hasMore) && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {currentPage}
                    {totalPages > 1 ? ` of ${totalPages}` : ""}
                    {activeCount > 0
                      ? ` (${activeCount} total ${filterType === "all" ? "reports" : filterType.replace(/-/g, " ") + "s"})`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">
                      Page {currentPage}
                      {totalPages > 1 ? ` of ${totalPages}` : ""}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={
                        !hasMore ||
                        (totalPages > 0 && currentPage >= totalPages)
                      }
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No reports found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Modal (fallback when no dedicated view route exists) */}
      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onDownload={handleDownloadReport}
      />
    </ClientSidebarLayout>
  );
};

export default ReportsPage;
