import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { staffService } from "../../services/staffService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import {
  getThirdPartyCompanies,
  getSchemeIdsForCompany,
  getAllThirdPartySchemeIds,
} from "../../utils/schemes";
import { decorateForm, excludeDemoScheme } from "../../utils/reportMapping";
import { useLiveReports } from "../../hooks/useLiveReports";
import {
  FileText,
  Camera,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { generateReportPDF } from "../../utils/pdfGenerator";

// Module-level variable — survives component unmount/remount, no serialization needed.
// Only browse-pagination state needs restoring: React Query's own cache already
// keeps the actual report data/counts alive across unmount.
let _thirdPartyReportsRestore = null;

const ThirdPartyReportsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchRateLimitRef = useRef([]); // timestamps of recent searches
  // Cursor state per filter combo, one entry per page: cursorsRef.current[key][i]
  // is what's needed to fetch page i + 1. Only consulted on a cache miss.
  const cursorsRef = useRef({});
  const searchCursorsRef = useRef({});
  const reportsPerPage = 10;

  // Third-party companies for the filter dropdown
  const availableCompanies = getThirdPartyCompanies();

  // Resolve a company selection to the scheme-ID array used to scope queries.
  // "all" → every third-party scheme; a company → just that company's schemes.
  const getCompanyScope = (company) =>
    company && company !== "all"
      ? getSchemeIdsForCompany(company)
      : getAllThirdPartySchemeIds();

  // Maps admin display filter values → staffService type keys
  const adminTypeToServiceType = {
    'CCTV Check':      'cctv-check',
    'Incident Report': 'incident',
    'Asset Damage':    'asset-damage',
    'Daily Logs':      'daily-occurrence',
  };

  useEffect(() => {
    if (_thirdPartyReportsRestore) {
      setCurrentPage(_thirdPartyReportsRestore.page);
      setFilterType(_thirdPartyReportsRestore.filterType);
      setFilterCompany(_thirdPartyReportsRestore.filterCompany);
      cursorsRef.current = _thirdPartyReportsRestore.cursors || {};
    }
  }, []);

  const clearRestoreState = () => { _thirdPartyReportsRestore = null; };

  const typeToCollectionKey = {
    'Incident Report': ['incident'],
    'Asset Damage':    ['assetDamage'],
    'Daily Logs':      ['dailyOccurrence'],
    'CCTV Check':      ['cctv'],
    'CCTV Faults':     ['cctvFaults'],
  };

  const mapSearchResults = (results) => results.map(decorateForm);

  // Abuse/cost guard — independent of caching, so it stays a manual gate in
  // front of whatever triggers a search query (typing, Next, Prev).
  const checkSearchRateLimit = () => {
    const now = Date.now();
    searchRateLimitRef.current = searchRateLimitRef.current.filter(t => now - t < 30000);
    if (searchRateLimitRef.current.length >= 10) {
      toast.error('Too many searches. Please wait a moment.');
      return false;
    }
    searchRateLimitRef.current.push(now);
    return true;
  };

  const isSearchMode = debouncedSearchQuery.trim() !== '';
  const searchKey = `${debouncedSearchQuery}|${filterType}|${filterCompany}`;

  const searchQueryResult = useQuery({
    queryKey: ["thirdPartyReportsSearch", debouncedSearchQuery, filterType, filterCompany, searchPage],
    queryFn: async () => {
      searchCursorsRef.current[searchKey] ??= [{}];
      const lastDocs = searchCursorsRef.current[searchKey][searchPage - 1] ?? {};
      const collections = filterType !== 'all' ? typeToCollectionKey[filterType] : null;
      // Scope search to the company's schemes — searchFormsPaginated filters
      // results down to the supplied scheme set.
      const { results, lastDocs: newLastDocs, hasMore } =
        await staffService.searchFormsPaginated(debouncedSearchQuery.trim(), 10, lastDocs, collections, getCompanyScope(filterCompany));
      return { results: mapSearchResults(results), lastDocs: newLastDocs, hasMore };
    },
    enabled: isSearchMode,
  });

  useEffect(() => {
    if (searchQueryResult.data) {
      searchCursorsRef.current[searchKey] ??= [{}];
      searchCursorsRef.current[searchKey][searchPage] = searchQueryResult.data.lastDocs;
    }
  }, [searchQueryResult.data, searchKey, searchPage]);

  useEffect(() => {
    if (searchQueryResult.isError) {
      console.error('Search failed:', searchQueryResult.error);
      toast.error('Search failed. Please try again.');
    }
  }, [searchQueryResult.isError, searchQueryResult.error]);

  const searchResults = searchQueryResult.data?.results ?? [];
  const searchHasMore = searchQueryResult.data?.hasMore ?? false;
  const searchLoading = searchQueryResult.isFetching;

  const handleSearchNextPage = () => {
    if (!searchHasMore || !checkSearchRateLimit()) return;
    setSearchPage(p => p + 1);
  };

  const handleSearchPrevPage = () => {
    if (searchPage > 1) setSearchPage(p => p - 1);
  };

  const filterKey = `${filterType}|${filterCompany}`;

  const reportsQuery = useQuery({
    queryKey: ["thirdPartyReports", filterType, filterCompany, currentPage],
    queryFn: async () => {
      cursorsRef.current[filterKey] ??= [{ cursors: {}, typeCursor: null }];
      const prev = cursorsRef.current[filterKey][currentPage - 1] ?? { cursors: {}, typeCursor: null };
      const scope = getCompanyScope(filterCompany);

      let rawForms, newCursors = {}, newTypeCursor = null, newHasMore = true;
      if (filterType === 'all') {
        const result = await staffService.getAllFormsPaginated(reportsPerPage, prev.cursors, scope);
        rawForms = result.forms;
        newCursors = result.cursors;
        newHasMore = result.hasMore;
      } else {
        const serviceType = adminTypeToServiceType[filterType] || filterType;
        const result = await staffService.getFormsByTypePaginated(serviceType, reportsPerPage, prev.typeCursor, scope);
        rawForms = result.forms;
        newTypeCursor = result.lastDoc;
        newHasMore = result.hasMore;
      }

      // TP scope already excludes demo forms; excludeDemoScheme kept defensively.
      const filteredReports = excludeDemoScheme(rawForms.map(decorateForm));

      return { reports: filteredReports, cursors: newCursors, typeCursor: newTypeCursor, hasMore: newHasMore };
    },
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
      toast.error("Failed to load reports");
    }
  }, [reportsQuery.isError, reportsQuery.error]);

  // Live overlay for page 1 only — a bounded (limit 10 per collection) listener
  // shows brand-new reports the instant they're submitted, without paginating
  // via live listeners (which pagination beyond page 1 still doesn't use).
  const isLiveWindow = !isSearchMode && currentPage === 1;
  const liveReports = useLiveReports({
    filterType,
    schemeScope: getCompanyScope(filterCompany),
    enabled: isLiveWindow,
  });

  const reports =
    isLiveWindow && liveReports.length > 0
      ? liveReports.slice(0, reportsPerPage)
      : reportsQuery.data?.reports ?? [];
  const filteredReports = reports;
  const hasMore = reportsQuery.data?.hasMore ?? false;
  const loading = reportsQuery.isFetching;

  // Counts are company-scoped, so they're keyed (and refetched) by company.
  const totalCountQuery = useQuery({
    queryKey: ["allFormsCount", "thirdparty-company", filterCompany],
    queryFn: () => staffService.getAllFormsCount(getCompanyScope(filterCompany)),
  });
  const totalCount = totalCountQuery.data ?? 0;

  const formCountsQuery = useQuery({
    queryKey: ["allFormsCountByType", "thirdparty-company", filterCompany],
    queryFn: () => staffService.getAllFormsCountByType(getCompanyScope(filterCompany)),
  });
  const formCounts = formCountsQuery.data ?? {
    cctvCheckTotal: 0,
    incidentReportTotal: 0,
    assetDamageTotal: 0,
    dailyLogsTotal: 0,
  };

  const typeCountQuery = useQuery({
    queryKey: ["formCountForType", filterType, filterCompany],
    queryFn: () => staffService.getFormCountForType(adminTypeToServiceType[filterType] || filterType, getCompanyScope(filterCompany)),
    enabled: filterType !== 'all',
  });
  const typeCount = filterType !== 'all' ? (typeCountQuery.data ?? 0) : 0;

  const handleFilterChange = (newType) => {
    clearRestoreState();
    setFilterType(newType);
    setCurrentPage(1);
    setSearchPage(1);
  };

  const handleCompanyChange = (newCompany) => {
    clearRestoreState();
    setFilterCompany(newCompany);
    setCurrentPage(1);
    setSearchPage(1);
  };

  const handleViewReport = (report) => {
    _thirdPartyReportsRestore = {
      page: currentPage,
      filterType,
      filterCompany,
      cursors: cursorsRef.current,
    };
    // Reuse the admin staff-report detail routes; pass `from` so the detail
    // page's back button returns here instead of the Staff Reports page.
    const opts = { state: { from: '/dashboard/admin/thirdparty-reports' } };
    if (report.type === "CCTV Check") {
      navigate(`/dashboard/admin/staff-reports/cctv/${report.id}`, opts);
    } else if (report.type === "Incident Report") {
      navigate(`/dashboard/admin/staff-reports/incident/${report.id}`, opts);
    } else if (report.type === "Asset Damage") {
      navigate(`/dashboard/admin/staff-reports/asset/${report.id}`, opts);
    } else if (report.type === "Daily Logs") {
      navigate(`/dashboard/admin/staff-reports/daily/${report.id}`, opts);
    }
  };

  const handleDownloadPDF = async (report) => {
    try {
      // Map display type to PDF generator type
      const typeMap = {
        "CCTV Check": "cctv-check",
        "CCTV Faults": "cctv-faults",
        "Incident Report": "incident",
        "Asset Damage": "asset-damage",
        "Daily Logs": "daily-occurrence",
      };
      const reportType = typeMap[report.type] || "incident";
      await generateReportPDF(report, reportType);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Use Firestore search results when searching, otherwise use paginated page data
  const currentReports = isSearchMode ? searchResults : filteredReports;
  const activeCount = filterType === 'all' ? totalCount : typeCount;
  const totalPages = Math.ceil(activeCount / reportsPerPage);

  // If restored page exceeds actual total pages, reset to page 1
  useEffect(() => {
    if (!loading && totalPages > 0 && currentPage > totalPages) {
      _thirdPartyReportsRestore = null;
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

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getFormTypeIcon = (type) => {
    switch (type) {
      case "Incident Report":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "CCTV Check":
        return <Eye className="w-5 h-5 text-green-500" />;
      case "Daily Logs":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "Asset Damage":
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFormTypeBadge = (type) => {
    const badges = {
      "Incident Report": "badge-warning",
      "Asset Damage": "badge-error",
      "Daily Logs": "badge-info",
      "CCTV Check": "badge-success",
    };
    return badges[type] || "badge-ghost";
  };

  // Get scheme(s) from form - handles different form structures
  const getFormScheme = (report) => {
    // For Daily Logs - has occurrences array with scheme in each
    if (report.type === "Daily Logs" && report.occurrences) {
      const schemes = [...new Set(report.occurrences.map((o) => o.scheme).filter(Boolean))];
      if (schemes.length === 0) return "N/A";
      if (schemes.length === 1) return schemes[0];
      return schemes.join(", ");
    }
    // For CCTV Check - covers all schemes
    if (report.type === "CCTV Check") {
      return "All Schemes";
    }
    // For Incident Report and Asset Damage - single scheme field
    return report.scheme || "N/A";
  };

  // Get the appropriate date from form
  const getFormDate = (report) => {
    // For Daily Logs (array-based) - use createdAt
    if (report.type === "Daily Logs") {
      if (report.createdAt) {
        return formatDate(report.createdAt);
      }
      return "N/A";
    }
    // For other forms - use form.date if available, otherwise createdAt
    if (report.date) {
      return report.date;
    }
    // Fallback to createdAt
    if (report.createdAt) {
      return formatDate(report.createdAt);
    }
    return "N/A";
  };

  // Get the appropriate time from form
  const getFormTime = (report) => {
    // For Incident Reports - always use timeSpotted
    if (report.type === "Incident Report" && report.timeSpotted) {
      return report.timeSpotted;
    }
    // For Daily Logs (array-based) - use createdAt time
    if (report.type === "Daily Logs") {
      if (report.createdAt) {
        const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      }
      return "N/A";
    }
    // For other forms - use form.time if available, otherwise createdAt time
    if (report.time) {
      return report.time;
    }
    // Fallback to createdAt time
    if (report.createdAt) {
      const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    return "N/A";
  };

  // Handle delete report
  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;

    setDeleting(true);
    try {
      // Map report type to collection name
      const collectionMap = {
        "CCTV Check": "cctvCheckForms",
        "Incident Report": "incidentReports",
        "Asset Damage": "assetDamageReports",
        "Daily Logs": "dailyOccurrenceReports",
      };
      const collectionName = collectionMap[reportToDelete.type];

      if (collectionName) {
        await staffService.deleteReport(collectionName, reportToDelete.id);
        toast.success("Report deleted successfully");
        // Splice out of whichever cached list is currently displayed.
        if (isSearchMode) {
          queryClient.setQueryData(
            ["thirdPartyReportsSearch", debouncedSearchQuery, filterType, filterCompany, searchPage],
            (old) => old ? { ...old, results: old.results.filter((r) => r.id !== reportToDelete.id) } : old,
          );
        } else {
          queryClient.setQueryData(
            ["thirdPartyReports", filterType, filterCompany, currentPage],
            (old) => old ? { ...old, reports: old.reports.filter((r) => r.id !== reportToDelete.id) } : old,
          );
        }
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Failed to delete report");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setReportToDelete(null);
    }
  };

  // Statistics - all counts from aggregation queries (no per-page counting)
  const stats = {
    total: totalCount,
    cctvCheck: formCounts.cctvCheckTotal,
    incident: formCounts.incidentReportTotal,
    assetDamage: formCounts.assetDamageTotal,
    dailyLogs: formCounts.dailyLogsTotal,
  };

  return (
    <AdminSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Third Party Reports</h1>
          <p className="text-gray-600">View and manage all submitted forms from third party staff</p>
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
                placeholder="Search by reference ID or staff name..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  if (!value.trim()) {
                    setDebouncedSearchQuery("");
                    setSearchPage(1);
                    setCurrentPage(1);
                    return;
                  }
                  searchDebounceRef.current = setTimeout(() => {
                    if (!checkSearchRateLimit()) return;
                    setDebouncedSearchQuery(value);
                    setSearchPage(1);
                  }, 150);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Filter by Type */}
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full"
            >
              <option value="all">All Types</option>
              <option value="CCTV Check">CCTV Check</option>
              <option value="Incident Report">Incident Report</option>
              <option value="Asset Damage">Asset Damage</option>
              <option value="Daily Logs">Daily Logs</option>
            </select>

            {/* Filter by Company */}
            <select
              value={filterCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full"
            >
              <option value="all">All Companies</option>
              {availableCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>
              {isSearchMode
                ? `Page ${searchPage} — ${searchResults.length} search result${searchResults.length !== 1 ? 's' : ''}`
                : `Showing ${filteredReports.length} of ${activeCount} reports`}
            </span>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading || searchLoading ? (
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
                  <thead className="bg-teal-500">
                    <tr>
                      <th className="text-left text-white">Type</th>
                      <th className="text-left text-white">Reference ID</th>
                      <th className="text-left text-white">Submitted By</th>
                      <th className="text-left text-white">Scheme</th>
                      <th className="text-left text-white">Date & Time</th>
                      <th className="text-center text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td>
                          <div className="flex items-center gap-2">
                            {getFormTypeIcon(report.type)}
                            <span className={`badge ${getFormTypeBadge(report.type)} badge-sm`}>
                              {(report.type || '').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-sm font-semibold">
                          <div>{report.referenceId || report.id.slice(0, 12)}</div>
                          {report.type === "Incident Report" && report.incursion === "YES" && (
                            <span className="badge badge-error badge-xs mt-1">Incursion</span>
                          )}
                          {report.type === "Incident Report" &&
                            report.incursionToGainAdvantage === "YES" && (
                              <span className="badge badge-warning badge-xs mt-1">
                                Gain Advantage
                              </span>
                            )}
                          {report.type === "Incident Report" && report.standDown && (
                            <span className="badge badge-neutral badge-xs mt-1">
                              Stood Down
                            </span>
                          )}
                        </td>
                        <td className="text-sm">
                          <div>
                            <div className="text-gray-800">
                              {report.submittedBy?.name || `${report.firstName || ""} ${report.lastName || ""}`.trim() || "N/A"}
                            </div>
                            {report.lastEditedBy && (
                              <div className="text-xs text-blue-600 mt-1">
                                Edited by: {report.lastEditedBy?.name || "Unknown"}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-sm text-gray-600 max-w-xs truncate">
                          {getFormScheme(report)}
                        </td>
                        <td className="text-sm">
                          <div className="text-gray-800 font-medium">{getFormDate(report)}</div>
                          <div className="text-gray-400">{getFormTime(report)}</div>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(report)}
                              className="btn btn-sm btn-ghost text-purple-600 hover:text-purple-800"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(report)}
                              className="btn btn-sm btn-ghost text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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
                    Page {searchPage} — {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
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

              {/* Pagination */}
              {!isSearchMode && (currentPage > 1 || hasMore) && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {currentPage}{totalPages > 1 ? ` of ${totalPages}` : ''}{activeCount > 0 ? ` (${activeCount} total reports)` : ''}
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
                      Page {currentPage}{totalPages > 1 ? ` of ${totalPages}` : ''}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasMore || (totalPages > 0 && currentPage >= totalPages)}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Report</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {reportToDelete?.type}?
              <br />
              <span className="font-semibold text-gray-800">
                Reference: {reportToDelete?.referenceId || reportToDelete?.id?.slice(0, 12)}
              </span>
              <br />
              <span className="text-red-600 text-sm mt-2 block">
                This action cannot be undone.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setReportToDelete(null);
                }}
                className="btn btn-outline"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn bg-red-600 hover:bg-red-700 text-white border-none"
                disabled={deleting}
              >
                {deleting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
};

export default ThirdPartyReportsPage;
