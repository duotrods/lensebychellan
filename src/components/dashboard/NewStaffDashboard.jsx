import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import NoticeBoard from '../staff/NoticeBoard';
import { FileText, Camera, Calendar, AlertTriangle } from 'lucide-react';

const NewStaffDashboard = () => {
  const { userProfile } = useAuth();
  const [showNoticeBoard, setShowNoticeBoard] = useState(true);
  const [stats, setStats] = useState(null);
  const [latestForms, setLatestForms] = useState([]);
  const [loading, setLoading] = useState(true);

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

      // Load latest forms
      const [cctvForms, incidentReports] = await Promise.all([
        staffService.getCCTVCheckForms(userProfile.uid),
        staffService.getIncidentReports(userProfile.uid)
      ]);

      // Combine and sort by date
      const allForms = [
        ...cctvForms.slice(0, 5).map(f => ({ ...f, type: 'CCTV Check Sheet' })),
        ...incidentReports.slice(0, 5).map(f => ({ ...f, type: 'Incident Report' }))
      ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 7);

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Latest Forms Table */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800">Latest Form Filled Out</h3>
                </div>

                <div className="px-6 overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-gray-50 ">
                      <tr className='border-b-2'>
                        <th className="text-left text-sm font-semibold text-gray-600">Reference No.</th>
                        <th className="text-left text-sm font-semibold text-gray-600">Date Filled</th>
                        <th className="text-left text-sm font-semibold text-gray-600">Type of Form</th>
                        <th className="text-center text-sm font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestForms.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-500">
                            No forms submitted yet
                          </td>
                        </tr>
                      ) : (
                        latestForms.map((form) => (
                          <tr key={form.id} className="hover:bg-gray-50">
                            <td className="text-sm text-gray-800">{form.id.slice(0, 12)}</td>
                            <td className="text-sm text-gray-600">{formatDate(form.createdAt)}</td>
                            <td className="text-sm text-gray-800">{form.type}</td>
                            <td className="text-center">
                              <button className="px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600">
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 flex justify-center gap-2">
                  <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Previous</button>
                  {[1, 2, 3, 4, 5].map((page) => (
                    <button
                      key={page}
                      className={`px-3 py-1 text-sm rounded ${
                        page === 1 ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Next</button>
                </div>
              </div>

              {/* Important Notice Sidebar */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <h3 className="font-bold text-gray-800">Important Notice</h3>
                </div>

                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5"></div>
                      <p className="text-gray-600">
                        Track key performance indicators (KPIs) for live and past schemes
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NewStaffDashboard;
