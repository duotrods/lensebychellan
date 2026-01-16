import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import NoticeBoard from '../staff/NoticeBoard';
import { FileText, Camera, Calendar, AlertTriangle, Eye, Edit, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateReportPDF } from '../../utils/pdfGenerator';

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
  const formsPerPage = 10;

  useEffect(() => {
    loadDashboardData();
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      // Load statistics - pass null to get all staff combined totals
      const dashboardStats = await staffService.getDashboardStats(null);
      setStats(dashboardStats);

      // Load latest forms - pass null to get all forms from all staff
      const [cctvForms, incidentReports, assetDamageReports, dailyOccurrenceReports] = await Promise.all([
        staffService.getCCTVCheckForms(null),
        staffService.getIncidentReports(null),
        staffService.getAssetDamageReports(null),
        staffService.getDailyOccurrenceReports(null)
      ]);

      // Combine and sort by date - show all forms, not just top 7
      const allForms = [
        ...cctvForms.map(f => ({ ...f, type: 'CCTV Check Sheet' })),
        ...incidentReports.map(f => ({ ...f, type: 'Incident Report' })),
        ...assetDamageReports.map(f => ({ ...f, type: 'Asset Damage' })),
        ...dailyOccurrenceReports.map(f => ({ ...f, type: 'Daily Occurrence' }))
      ].sort((a, b) => b.createdAt - a.createdAt);

      setLatestForms(allForms);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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

  // Filter and search forms
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

  // Pagination
  const indexOfLastForm = currentPage * formsPerPage;
  const indexOfFirstForm = indexOfLastForm - formsPerPage;
  const currentForms = filteredForms.slice(indexOfFirstForm, indexOfLastForm);
  const totalPages = Math.ceil(filteredForms.length / formsPerPage);

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

  const handleDownloadForm = (form) => {
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

      generateReportPDF(form, reportType);
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
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shrink-0`}>
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
                      <th className="text-left text-white">Date</th>
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
                            {form.referenceId || form.id.slice(0, 12)}
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
                          <td className="text-sm text-gray-600">{getFormDate(form)}</td>
                          <td>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewForm(form)}
                                className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditForm(form)}
                                className="btn btn-sm btn-ghost text-green-600 hover:text-green-800"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
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
                    Showing {indexOfFirstForm + 1} to {Math.min(indexOfLastForm, filteredForms.length)} of {filteredForms.length} forms
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
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
