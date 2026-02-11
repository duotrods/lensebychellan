import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import NoticeBoard from '../staff/NoticeBoard';
import { FileText, Camera, Calendar, AlertTriangle, Eye, Edit, Download, Search, Filter, ChevronLeft, ChevronRight, Radio, CheckCircle, Forward, FilePlus, FilePlus2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateReportPDF } from '../../utils/pdfGenerator';
import { isDemoUser, DEMO_SCHEME_ID } from '../../utils/schemes';

const NewStaffDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  // Check if notice board has been shown in this session
  const [showNoticeBoard, setShowNoticeBoard] = useState(() => {
    const hasSeenNotice = sessionStorage.getItem('hasSeenNoticeBoard');
    return !hasSeenNotice; // Show only if not seen yet
  });
  const [stats, setStats] = useState(null);
  const [latestForms, setLatestForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [cursors, setCursors] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const formsPerPage = 10;

  useEffect(() => {
    loadDashboardData(true);
    loadTotalCount();
    loadStatCounts();
  }, [userProfile]);

  const loadDashboardData = async (resetPage = false) => {
    if (!userProfile) return;

    try {
      setLoading(true);

      const isDemo = isDemoUser(userProfile);

      // Use server-side pagination - only fetch 10 forms
      const result = await staffService.getAllFormsPaginated(
        formsPerPage,
        resetPage ? {} : cursors
      );

      console.log('Loaded forms:', result.forms.length);

      // Filter forms based on demo status
      let filteredForms = result.forms;
      if (isDemo) {
        // Demo user: only show forms that are EXCLUSIVELY demo (only DMO1, no real schemes)
        filteredForms = result.forms.filter(form => {
          // Check schemeIds array first (used by Daily Occurrence and newer forms)
          if (form.schemeIds && Array.isArray(form.schemeIds) && form.schemeIds.length > 0) {
            // Must contain ONLY DMO1 (no real schemes mixed in)
            return form.schemeIds.every(id => id === DEMO_SCHEME_ID);
          }
          // For forms with single schemeId field
          if (form.schemeId) {
            return form.schemeId === DEMO_SCHEME_ID;
          }
          // Extract from scheme field as last resort
          const schemeId = form.scheme?.split(' ')[0];
          return schemeId === DEMO_SCHEME_ID;
        });
      } else {
        // Regular staff: exclude forms that are EXCLUSIVELY demo
        filteredForms = result.forms.filter(form => {
          // Check schemeIds array first (used by Daily Occurrence and newer forms)
          if (form.schemeIds && Array.isArray(form.schemeIds) && form.schemeIds.length > 0) {
            // Show if it has ANY real scheme (not exclusively demo)
            return !form.schemeIds.every(id => id === DEMO_SCHEME_ID);
          }
          // For forms with single schemeId field
          if (form.schemeId) {
            return form.schemeId !== DEMO_SCHEME_ID;
          }
          // Extract from scheme field as last resort
          const schemeId = form.scheme?.split(' ')[0];
          return schemeId !== DEMO_SCHEME_ID;
        });
      }

      setLatestForms(filteredForms);
      setCursors(result.cursors);
      setHasMore(result.hasMore);

      if (resetPage) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const loadTotalCount = async () => {
    try {
      const count = await staffService.getAllFormsCount();
      setTotalCount(count);
    } catch (error) {
      console.warn('Could not load total count:', error);
    }
  };

  const loadStatCounts = async () => {
    try {
      const counts = await staffService.getAllFormsCountByType();
      setStats(counts);
    } catch (error) {
      console.warn('Could not load stat counts:', error);
    }
  };

  const statCards = [
    {
      title: 'Incident Report Form',
      count: stats?.incidentReportTotal || 0,
      subtitle: 'Total Submissions',
      icon: FileText,
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'CCTV Check Sheet',
      count: stats?.cctvCheckTotal || 0,
      subtitle: 'Total Submissions',
      icon: Camera,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Daily Logs',
      count: stats?.dailyLogsTotal || 0,
      subtitle: 'Total Submissions',
      icon: Calendar,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Asset Damage Logs',
      count: stats?.assetDamageTotal || 0,
      subtitle: 'Total Submissions',
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // If it's already a string (form.date), return as-is or format it
    if (typeof dateString === 'string') {
      return dateString;
    }
    // If it's a timestamp, convert it
    const date = dateString.toDate();
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFormTypeIcon = (type) => {
    switch (type) {
      case 'Incident Report':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'CCTV Check Sheet':
        return <Eye className="w-5 h-5 text-green-500" />;
      case 'Daily Occurrence':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'Asset Damage':
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFormTypeBadge = (type) => {
    const badges = {
      'Incident Report': 'badge-warning',
      'Asset Damage': 'badge-error',
      'Daily Occurrence': 'badge-info',
      'CCTV Check Sheet': 'badge-success'
    };
    return badges[type] || 'badge-ghost';
  };

  // Get scheme(s) from form - handles different form structures
  const getFormScheme = (form) => {
    // For Daily Occurrence - has occurrences array with scheme in each
    if (form.type === 'Daily Occurrence' && form.occurrences) {
      const schemes = [...new Set(form.occurrences.map(o => o.scheme).filter(Boolean))];
      if (schemes.length === 0) return 'N/A';
      if (schemes.length === 1) return schemes[0];
      return schemes.join(', ');
    }
    // For CCTV Check Sheet - covers all schemes
    if (form.type === 'CCTV Check Sheet') {
      return 'All Schemes';
    }
    // For Incident Report and Asset Damage - single scheme field
    return form.scheme || 'N/A';
  };

  // Get the appropriate date from form
  const getFormDate = (form) => {
    // For Daily Occurrence (array-based) - use createdAt
    if (form.type === 'Daily Occurrence') {
      if (form.createdAt) {
        return formatDate(form.createdAt);
      }
      return 'N/A';
    }
    // For other forms - use form.date if available, otherwise createdAt
    if (form.date) {
      return form.date;
    }
    // Fallback to createdAt
    if (form.createdAt) {
      return formatDate(form.createdAt);
    }
    return 'N/A';
  };

  // Get the appropriate time from form
  const getFormTime = (form) => {
    // For Incident Reports - always use timeSpotted
    if (form.type === 'Incident Report' && form.timeSpotted) {
      return form.timeSpotted;
    }
    // For Daily Occurrence (array-based) - use createdAt time
    if (form.type === 'Daily Occurrence') {
      if (form.createdAt) {
        const date = form.createdAt.toDate ? form.createdAt.toDate() : new Date(form.createdAt);
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
      return 'N/A';
    }
    // For other forms - use form.time if available, otherwise createdAt time
    if (form.time) {
      return form.time;
    }
    // Fallback to createdAt time
    if (form.createdAt) {
      const date = form.createdAt.toDate ? form.createdAt.toDate() : new Date(form.createdAt);
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return 'N/A';
  };

  // Filter and search forms (client-side filtering on current page only)
  const filteredForms = latestForms.filter(form => {
    const submitterName = form.submittedBy?.name || `${form.firstName || ''} ${form.lastName || ''}`.trim() || '';
    const schemeValue = getFormScheme(form).toLowerCase();
    const matchesSearch =
      form.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submitterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schemeValue.includes(searchTerm.toLowerCase());

    const formTypeMap = {
      'CCTV Check Sheet': 'cctv-check',
      'Incident Report': 'incident',
      'Asset Damage': 'asset-damage',
      'Daily Occurrence': 'daily-occurrence'
    };
    const matchesType = filterType === 'all' || formTypeMap[form.type] === filterType;

    return matchesSearch && matchesType;
  });

  // Server-side pagination
  const currentForms = filteredForms;
  const totalPages = Math.ceil(totalCount / formsPerPage);

  // Pagination handlers
  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
      loadDashboardData(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      loadDashboardData(true); // Reset to refetch from start
    }
  };

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleViewForm = (form) => {
    if (form.type === "CCTV Check Sheet") {
      navigate(`/dashboard/staff/reports/cctv-check/${form.id}`);
    } else if (form.type === "Incident Report") {
      navigate(`/dashboard/staff/reports/incident/${form.id}`);
    } else if (form.type === "Asset Damage") {
      navigate(`/dashboard/staff/reports/asset-damage/${form.id}`);
    } else if (form.type === "Daily Occurrence") {
      navigate(`/dashboard/staff/reports/daily-logs/${form.id}`);
    }
  };

  const handleEditForm = (form) => {
    // Navigate to edit page based on type
    if (form.type === "CCTV Check Sheet") {
      navigate(`/dashboard/staff/forms/cctv-check?edit=${form.id}`);
    } else if (form.type === "Incident Report") {
      navigate(`/dashboard/staff/forms/incident-report?edit=${form.id}`);
    } else if (form.type === "Asset Damage") {
      navigate(`/dashboard/staff/forms/asset-damage?edit=${form.id}`);
    } else if (form.type === "Daily Occurrence") {
      navigate(`/dashboard/staff/forms/daily-occurence?edit=${form.id}`);
    }
  };

  const handleDownloadForm = async (form) => {
    try {
      let reportType;
      if (form.type === "CCTV Check Sheet") {
        reportType = 'cctv-check';
      } else if (form.type === "Incident Report") {
        reportType = 'incident';
      } else if (form.type === "Asset Damage") {
        reportType = 'asset-damage';
      } else if (form.type === "Daily Occurrence") {
        reportType = 'daily-occurrence';
      }

      await generateReportPDF(form, reportType);
      toast.success(`Downloaded ${form.type} as PDF`);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleCloseNoticeBoard = () => {
    // Mark notice board as seen in this session
    sessionStorage.setItem('hasSeenNoticeBoard', 'true');
    setShowNoticeBoard(false);
  };

  return (
    <>
      <NoticeBoard
        isOpen={showNoticeBoard}
        onClose={handleCloseNoticeBoard}
      />

      <div>
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, <span className="text-teal-500">{userProfile?.displayName}!</span>
          </h2>
        </div>

        {/* Statistics Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-teal-500"></span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${card.color} flex items-center justify-center shrink-0`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <h6 className="text-sm font-medium text-gray-600 leading-tight">{card.title}</h6>
                  </div>

                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-800">{card.count}</span>
                    <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by reference ID, type, staff name, or scheme..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input input-bordered w-full pl-10 bg-white border-gray-300"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="select select-bordered bg-white border-gray-300"
                  >
                    <option value="all">All Types</option>
                    <option value="incident">Incident Reports</option>
                    <option value="asset-damage">Asset Damage</option>
                    <option value="daily-occurrence">Daily Occurrence</option>
                    <option value="cctv-check">CCTV Checks</option>
                  </select>
                </div>
              </div>
            </div>

            {/* All Forms Table - Full Width */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-teal-500">
                    <tr>
                      <th className="text-left text-white">Type</th>
                      <th className="text-left text-white">Reference ID</th>
                      <th className="text-left text-white">Created By</th>
                      <th className="text-left text-white">Scheme</th>
                      <th className="text-left text-white">Date & Time</th>
                      <th className="text-center text-white"> Status </th>
                      <th className="text-center text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentForms.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">No forms found</p>
                          <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter criteria</p>
                        </td>
                      </tr>
                    ) : (
                      currentForms.map((form) => (
                        <tr key={form.id} className="hover:bg-gray-50">
                          <td>
                            <div className="flex items-center gap-2">
                              {getFormTypeIcon(form.type)}
                              <span className={`badge ${getFormTypeBadge(form.type)} badge-sm`}>
                                {form.type.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="font-mono text-sm font-semibold">
                            <div>{form.referenceId || form.id.slice(0, 12)}</div>
                            {form.type === 'Incident Report' && form.incursion === 'YES' && (
                              <span className="badge badge-error badge-xs mt-1">Incursion</span>
                            )}
                          </td>
                          <td className="text-sm">
                            <div>
                              <div className="text-gray-800">
                                {form.submittedBy?.name || `${form.firstName || ''} ${form.lastName || ''}`.trim() || 'N/A'}
                              </div>
                              {form.lastEditedBy && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Edited by: {form.lastEditedBy?.name || 'Unknown'}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-sm text-gray-600 max-w-xs truncate">
                            {getFormScheme(form)}
                          </td>
                          <td className="text-sm">
                            <div className="text-gray-800 font-medium">{getFormDate(form)}</div>
                            <div className="text-gray-400">{getFormTime(form)}</div>
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-2 font-semibold">
                              {form.type === 'Incident Report' && form.status === 'live' && (
                              <div className="badge badge-error badge-soft">
                                <Radio className="w-4 h-4 text-red-500" />
                                Live
                              </div>
                            )}
                            {form.type === 'Incident Report' && form.status === 'completed' &&(
                              <div className="badge badge-success badge-soft">
                                <CheckCircle className="w-4 h-4 text-brand-400" />
                                Completed
                              </div>
                            )}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-2">
                              {form.type === 'Incident Report' && form.status === 'live' ? (
                              <button
                                onClick={() => handleEditForm(form)}
                                className="btn btn-sm btn-ghost text-red-500 hover:text-red-800"
                                title="Edit"
                              >
                                <FilePlus2 className="w-4 h-4" />
                              </button>
                              ):(
                              <button
                                onClick={() => handleEditForm(form)}
                                className="btn btn-sm btn-ghost text-green-600 hover:text-green-800"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              )}
                              <button
                                onClick={() => handleViewForm(form)}
                                className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDownloadForm(form)}
                                className="btn btn-sm btn-ghost text-purple-600 hover:text-purple-800"
                                title="Download PDF"
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
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing page {currentPage} of {totalPages} ({totalCount} total forms)
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
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NewStaffDashboard;
