import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { clientDataService } from '../../services/clientDataService';
import ClientSidebarLayout from '../../components/layout/ClientSidebarLayout';
import {
  FileText, AlertTriangle, Package, Calendar,
  Search, Filter, Download, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateReportPDF } from '../../utils/pdfGenerator';
import { SCHEMES } from '../../utils/schemes';

// Module-level variable — survives component unmount/remount, no serialization needed
let _reportsRestore = null;

const ReportsPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [cursors, setCursors] = useState({});
  const [typeCursor, setTypeCursor] = useState(null);
  const pageCacheRef = useRef({});
  const wasRestoredRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const [reportTypeCounts, setReportTypeCounts] = useState({ incident: 0, assetDamage: 0, dailyOccurrence: 0, cctvCheck: 0, cctvFaults: 0, total: 0 });
  const reportsPerPage = 10;

  useEffect(() => {
    const activeScheme = userProfile?.activeSchemeId || userProfile?.schemeId;
    if (activeScheme) {
      if (_reportsRestore) {
        setCurrentPage(_reportsRestore.page);
        setFilterType(_reportsRestore.filter);
        setReports(_reportsRestore.reports);
        setHasMore(_reportsRestore.hasMore);
        setLoading(false);
        wasRestoredRef.current = true;
      } else {
        loadReports(true);
      }
      loadTotalCount();
    }
  }, [userProfile?.activeSchemeId, userProfile?.schemeId, userProfile?.schemeName]);

  const clearRestoreState = () => { _reportsRestore = null; };

  const loadReports = async (resetPage = false, overrideFilterType = null, cursorOverride = null, targetPage = null, silent = false) => {
    // Check page cache first
    if (targetPage && pageCacheRef.current[targetPage]) {
      const cached = pageCacheRef.current[targetPage];
      setReports(cached.data);
      setCursors(cached.cursors);
      setTypeCursor(cached.typeCursor);
      setHasMore(cached.hasMore);
      setCurrentPage(targetPage);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const activeScheme = userProfile.activeSchemeId || userProfile.schemeId;
      const activeFilter = overrideFilterType !== null ? overrideFilterType : filterType;

      let newCursors = {};
      let newTypeCursor = null;
      let newHasMore = true;
      let newReports;

      if (activeFilter === 'all') {
        const effectiveCursors = cursorOverride ? cursorOverride.cursors : (resetPage ? {} : cursors);
        const result = await clientDataService.getAllReportsPaginated(
          activeScheme,
          reportsPerPage,
          effectiveCursors
        );
        newReports = result.reports;
        newCursors = result.cursors;
        newHasMore = result.hasMore;
        setCursors(newCursors);
        setHasMore(newHasMore);
      } else {
        const effectiveTypeCursor = cursorOverride ? cursorOverride.typeCursor : (resetPage ? null : typeCursor);
        const result = await clientDataService.getReportsByTypePaginated(
          activeScheme,
          activeFilter,
          reportsPerPage,
          effectiveTypeCursor
        );
        newReports = result.reports;
        newTypeCursor = result.lastDoc;
        newHasMore = result.hasMore;
        setTypeCursor(newTypeCursor);
        setHasMore(newHasMore);
      }

      setReports(newReports);

      // Cache this page's data
      const pageNum = targetPage || (resetPage ? 1 : currentPage);
      pageCacheRef.current[pageNum] = {
        data: newReports,
        cursors: newCursors,
        typeCursor: newTypeCursor,
        hasMore: newHasMore,
      };

      if (resetPage) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      if (error.message?.includes('index') || error.cause?.message?.includes('index')) {
        toast.error('Firebase indexes are still building. Please wait 5-10 minutes and refresh.');
      } else {
        toast.error('Failed to load reports. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTotalCount = async () => {
    try {
      const activeScheme = userProfile.activeSchemeId || userProfile.schemeId;
      const counts = await clientDataService.getAllReportsCountByType(activeScheme);
      setReportTypeCounts(counts);
    } catch (error) {
      console.warn('Could not load total count:', error);
    }
  };

  // Filter and search reports (client-side search + daily-occurrence scheme check only)
  // Type filtering is handled server-side when filterType !== 'all'
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.location?.toLowerCase().includes(searchTerm.toLowerCase());

    // When 'all' view: also apply type filter client-side
    const matchesType = filterType === 'all' || report.reportType === filterType;

    // For daily occurrence reports, check if any occurrence matches the client's scheme
    if (report.reportType === 'daily-occurrence' && report.occurrences) {
      let activeSchemeName = userProfile?.activeSchemeName || userProfile?.schemeName;
      if (!userProfile?.activeSchemeName && userProfile?.activeSchemeId) {
        const activeSchemeObj = SCHEMES.find(s => s.id === userProfile.activeSchemeId);
        if (activeSchemeObj) activeSchemeName = activeSchemeObj.fullName;
      }
      const hasMatchingOccurrence = report.occurrences.some(occurrence =>
        occurrence.scheme === activeSchemeName || occurrence.scheme === 'All Schemes'
      );
      return matchesSearch && matchesType && hasMatchingOccurrence;
    }

    return matchesSearch && matchesType;
  });

  // Use type-specific count for pagination when a filter is active
  const getActiveCount = () => {
    if (filterType === 'incident') return reportTypeCounts.incident;
    if (filterType === 'asset-damage') return reportTypeCounts.assetDamage;
    if (filterType === 'daily-occurrence') return reportTypeCounts.dailyOccurrence;
    if (filterType === 'cctv-check') return reportTypeCounts.cctvCheck;
    if (filterType === 'cctv-faults') return reportTypeCounts.cctvFaults;
    return reportTypeCounts.total;
  };
  const activeCount = getActiveCount();

  const currentReports = filteredReports;
  const totalPages = Math.ceil(activeCount / reportsPerPage);

  // Pagination handlers
  const handleNextPage = () => {
    if (hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadReports(false, null, null, nextPage);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      loadReports(false, null, null, prevPage);
    }
  };

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'incident':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'asset-damage':
        return <Package className="w-5 h-5 text-red-500" />;
      case 'daily-occurrence':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'cctv-check':
        return <Eye className="w-5 h-5 text-green-500" />;
      case 'cctv-faults':
        return <Eye className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getReportTypeBadge = (type) => {
    const badges = {
      incident: 'badge-warning',
      'asset-damage': 'badge-error',
      'daily-occurrence': 'badge-info',
      'cctv-check': 'badge-success',
      'cctv-faults': 'badge-secondary'
    };
    return badges[type] || 'badge-ghost';
  };

  const getStatusBadge = (status) => {
    const badges = {
      Resolved: 'bg-green-100 text-green-700',
      Pending: 'bg-yellow-100 text-yellow-700',
      'In Progress': 'bg-blue-100 text-blue-700',
      Open: 'bg-orange-100 text-orange-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const handleViewReport = (report) => {
    _reportsRestore = { page: currentPage, filter: filterType, reports, hasMore };
    // Navigate to appropriate view page based on report type
    const reportTypeRoutes = {
      'incident': `/dashboard/client/reports/incident/${report.id}`,
      'asset-damage': `/dashboard/client/reports/asset-damage/${report.id}`,
      'daily-occurrence': `/dashboard/client/reports/daily-occurrence/${report.id}`,
      'cctv-check': `/dashboard/client/reports/cctv-check/${report.id}`,
      'cctv-faults': `/dashboard/client/reports/cctv-faults/${report.id}`
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
      const activeSchemeId = userProfile?.activeSchemeId || userProfile?.schemeId;
      await generateReportPDF(report, report.reportType, activeSchemeId);
      toast.success(`Downloaded ${report.referenceId || 'report'} as PDF`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download report');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to parse DD/MM/YYYY date format
  const parseBritishDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
  };

  // Get display date for a report - use form date for incidents, asset damage, cctv checks
  const getReportDisplayDate = (report) => {
    // For incident, asset-damage, and cctv-check reports, use the form's date field
    if ((report.reportType === 'incident' || report.reportType === 'asset-damage' || report.reportType === 'cctv-check' || report.reportType === 'cctv-faults') && report.date) {
      // Date is in DD/MM/YYYY format, convert to display format
      const date = parseBritishDate(report.date);
      if (date) {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return report.date;
    }
    // For daily occurrence and other reports, use timestamp (createdAt)
    return formatDate(report.timestamp);
  };

  // Get display time for a report
  const getReportDisplayTime = (report) => {
    // For incident reports - always use timeSpotted
    if (report.reportType === 'incident' && report.timeSpotted) {
      return report.timeSpotted;
    }
    // For asset-damage and cctv-check reports, use the form's time field
    if ((report.reportType === 'asset-damage' || report.reportType === 'cctv-check' || report.reportType === 'cctv-faults') && report.time) {
      return report.time;
    }
    // For daily occurrence and other reports, use timestamp (createdAt)
    return formatTime(report.timestamp);
  };

  const reportStats = {
    total: reportTypeCounts.total,
    incident: reportTypeCounts.incident,
    assetDamage: reportTypeCounts.assetDamage,
    dailyOccurrence: reportTypeCounts.dailyOccurrence,
    cctvCheck: reportTypeCounts.cctvCheck,
    cctvFaults: reportTypeCounts.cctvFaults,
  };

  // Get the active scheme name for display
  const getActiveSchemeName = () => {
    // If activeSchemeName is set, use it
    if (userProfile?.activeSchemeName) {
      return userProfile.activeSchemeName;
    }

    // If we have an activeSchemeId but no activeSchemeName, look it up
    if (userProfile?.activeSchemeId) {
      const activeSchemeObj = SCHEMES.find(s => s.id === userProfile.activeSchemeId);
      if (activeSchemeObj) {
        return activeSchemeObj.fullName;
      }
    }

    // Fall back to the default scheme name
    return userProfile?.schemeName;
  };

  return (
    <ClientSidebarLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600 mt-2">
            View and manage all reports for {getActiveSchemeName()}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total Reports</p>
            <p className="text-2xl font-bold text-brand-500">{reportStats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Incidents</p>
            <p className="text-2xl font-bold text-brand-500">{reportStats.incident}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Asset Damage</p>
            <p className="text-2xl font-bold text-brand-500">{reportStats.assetDamage}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Daily Logs</p>
            <p className="text-2xl font-bold text-brand-500">{reportStats.dailyOccurrence}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">CCTV Checks</p>
            <p className="text-2xl font-bold text-brand-500">{reportStats.cctvCheck}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">CCTV Faults</p>
            <p className="text-2xl font-bold text-brand-500">{reportStats.cctvFaults}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by reference ID, type, or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  if (wasRestoredRef.current) {
                    wasRestoredRef.current = false;
                    clearRestoreState();
                    loadReports(true, null, null, null, true);
                  }
                }}
                className="input input-bordered w-full pl-4 bg-white border-gray-300"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => {
                  const newType = e.target.value;
                  clearRestoreState();
                  setFilterType(newType);
                  setTypeCursor(null);
                  setCursors({});
                  pageCacheRef.current = {};
                  loadReports(true, newType);
                }}
                className="select  select-bordered bg-white border-gray-300"
              >
                <option value="all">All Types</option>
                <option value="incident">Incident Reports</option>
                <option value="asset-damage">Asset Damage</option>
                <option value="daily-occurrence">Daily Occurrence</option>
                <option value="cctv-check">CCTV Checks</option>
                <option value="cctv-faults">CCTV Faults</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
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
                      <th className="text-left text-white">Title/Description</th>
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
                            <span className={`badge ${getReportTypeBadge(report.reportType)} badge-sm`}>
                              {report.reportType.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-sm font-semibold">
                          <div>{report.referenceId}</div>
                          {report.reportType === 'incident' && report.incursion === 'YES' && (
                            <span className="badge badge-error badge-xs mt-1">Incursion</span>
                          )}
                        </td>
                        <td className="max-w-xs truncate">{report.type || report.title || 'N/A'}</td>
                        <td className="max-w-xs truncate">{report.location || 'N/A'}</td>
                        <td>
                          <div className="text-sm">
                            <p className="font-medium">{getReportDisplayDate(report)}</p>
                            <p className="text-gray-500">{getReportDisplayTime(report)}</p>
                          </div>
                        </td>
                        <td className="text-sm">
                          {report.submittedBy?.name || (typeof report.submittedBy === 'string' ? report.submittedBy : 'Staff')}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing page {currentPage} of {totalPages} ({activeCount} total {filterType === 'all' ? 'reports' : filterType.replace(/-/g, ' ') + 's'})
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
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasMore || currentPage === totalPages}
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
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="btn btn-sm btn-ghost"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Reference ID</p>
                  <p className="font-mono font-semibold">{selectedReport.referenceId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <span className={`badge ${getReportTypeBadge(selectedReport.reportType)}`}>
                    {selectedReport.reportType.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatDate(selectedReport.timestamp || selectedReport.date)} {formatTime(selectedReport.timestamp || selectedReport.time)}</p>
                </div>
                {/* <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedReport.status)}`}>
                    {selectedReport.status || 'Pending'}
                  </span>
                </div> */}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Title/Type</p>
                  <p className="font-medium">{selectedReport.type || selectedReport.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{selectedReport.location || 'N/A'}</p>
                </div>
                {selectedReport.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-700">{selectedReport.description}</p>
                  </div>
                )}
                {selectedReport.submittedBy && (
                  <div>
                    <p className="text-sm text-gray-500">Submitted By</p>
                    <p className="font-medium">
                      {selectedReport.submittedBy?.name || (typeof selectedReport.submittedBy === 'string' ? selectedReport.submittedBy : 'Staff')}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleDownloadReport(selectedReport)}
                  className="btn btn-brand flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="btn btn-outline flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ClientSidebarLayout>
  );
};

export default ReportsPage;
