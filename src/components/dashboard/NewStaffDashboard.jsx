import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import NoticeBoard from '../staff/NoticeBoard';
import { FileText, Camera, Calendar, AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const NewStaffDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [showNoticeBoard, setShowNoticeBoard] = useState(true);
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
      // Load statistics
      const dashboardStats = await staffService.getDashboardStats(userProfile.uid);
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
      count: stats?.incidentReportThisWeek || 0,
      subtitle: 'total forms submitted this week',
      icon: FileText,
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'CCTV Check Sheet',
      count: stats?.cctvCheckThisWeek || 0,
      subtitle: 'total forms submitted this week',
      icon: Camera,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Daily Logs',
      count: stats?.dailyLogsThisWeek || 0,
      subtitle: 'total forms submitted this week',
      icon: Calendar,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Asset Damage Logs',
      count: stats?.assetDamageThisWeek || 0,
      subtitle: 'total forms submitted this week',
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
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

  const handleDeleteForm = async (form) => {
    if (!window.confirm(`Are you sure you want to delete ${form.type} ${form.referenceId}? This action cannot be undone.`)) {
      return;
    }

    try {
      if (form.type === "CCTV Check Sheet") {
        await staffService.deleteCCTVCheckForm(form.id, userProfile.uid, userProfile.displayName);
      } else if (form.type === "Incident Report") {
        await staffService.deleteIncidentReport(form.id, userProfile.uid, userProfile.displayName);
      } else if (form.type === "Asset Damage") {
        await staffService.deleteAssetDamageReport(form.id, userProfile.uid, userProfile.displayName);
      } else if (form.type === "Daily Occurrence") {
        await staffService.deleteDailyOccurrenceReport(form.id, userProfile.uid, userProfile.displayName);
      }

      toast.success(`${form.type} ${form.referenceId} deleted successfully`);
      loadDashboardData(); // Reload data
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Failed to delete form. Please try again.');
    }
  };

  return (
    <>
      <NoticeBoard
        isOpen={showNoticeBoard}
        onClose={() => setShowNoticeBoard(false)}
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
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${card.color} flex items-center justify-center`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                    <h6 className="text-sm font-medium text-gray-600 mb-2">{card.title}</h6>
                  </div>
                  
                  <span className="text-4xl font-bold text-gray-700 mb-1">{card.count}</span>
                  <p className=" text-gray-500">{card.subtitle}</p>
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
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Reference No.</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Created By</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Date Filled</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-6 py-3">Type of Form</th>
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
                      currentForms.map((form) => (
                        <tr key={form.id} className="hover:bg-gray-50 border-b">
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
                                  Edited by: {form.lastEditedBy.name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-sm text-gray-600 px-6 py-4">{formatDate(form.createdAt)}</td>
                          <td className="text-sm text-gray-800 px-6 py-4">{form.type}</td>
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
                                onClick={() => handleDeleteForm(form)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
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
