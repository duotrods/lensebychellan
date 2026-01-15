import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import NoticeBoard from '../staff/NoticeBoard';
import { FileText, Camera, Calendar, AlertTriangle, Eye, Edit, Download } from 'lucide-react';
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
        return { icon: FileText, color: 'from-teal-500 to-teal-600' };
      case 'CCTV Check Sheet':
        return { icon: Camera, color: 'from-blue-500 to-blue-600' };
      case 'Daily Occurrence':
        return { icon: Calendar, color: 'from-purple-500 to-purple-600' };
      case 'Asset Damage':
        return { icon: AlertTriangle, color: 'from-orange-500 to-orange-600' };
      default:
        return { icon: FileText, color: 'from-gray-500 to-gray-600' };
    }
  };

  // Pagination
  const indexOfLastForm = currentPage * formsPerPage;
  const indexOfFirstForm = indexOfLastForm - formsPerPage;
  const currentForms = latestForms.slice(indexOfFirstForm, indexOfLastForm);
  const totalPages = Math.ceil(latestForms.length / formsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

            {/* All Forms Table - Full Width */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800">All Forms Submitted</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {currentForms.length} of {latestForms.length} forms
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-gray-50">
                    <tr className='border-b-2'>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Type of Form</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Reference No.</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Created By</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Date Filled</th>
                      <th className="text-center text-sm font-semibold text-gray-600 px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentForms.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-gray-500">
                          No forms submitted yet
                        </td>
                      </tr>
                    ) : (
                      currentForms.map((form) => {
                        const { icon: FormIcon, color } = getFormTypeIcon(form.type);
                        return (
                          <tr key={form.id} className="hover:bg-gray-50 border-b">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                                  <FormIcon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-800">{form.type}</span>
                              </div>
                            </td>
                            <td className="text-sm text-gray-800 font-mono font-semibold px-6 py-4">
                              {form.referenceId || form.id.slice(0, 12)}
                            </td>
                            <td className="text-sm px-6 py-4">
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
                            <td className="text-sm text-gray-600 px-6 py-4">{formatDate(form.date)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleViewForm(form)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditForm(form)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadForm(form)}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t flex justify-center gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => paginate(index + 1)}
                      className={`px-3 py-1 text-sm rounded ${
                        index + 1 === currentPage ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
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
