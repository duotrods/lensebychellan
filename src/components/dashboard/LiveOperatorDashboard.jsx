import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import { AlertTriangle, Eye, Download, Search, ChevronLeft, ChevronRight, Radio, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateReportPDF } from '../../utils/pdfGenerator';

const LiveOperatorDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadIncidents();
  }, [userProfile]);

  const loadIncidents = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const reports = await staffService.getIncidentReports(null);
      setIncidents(reports);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const liveIncidents = incidents.filter(r => r.status !== 'completed');
  const completedIncidents = incidents.filter(r => r.status === 'completed');

  const displayedIncidents = activeTab === 'live' ? liveIncidents : completedIncidents;

  // Filter by search
  const filteredIncidents = displayedIncidents.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const submitterName = r.submittedBy?.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || '';
    return (
      r.referenceId?.toLowerCase().includes(term) ||
      r.incidentType?.toLowerCase().includes(term) ||
      r.scheme?.toLowerCase().includes(term) ||
      submitterName.toLowerCase().includes(term)
    );
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredIncidents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') return dateValue;
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const handleViewIncident = (incident) => {
    navigate(`/dashboard/liveoperator/incident/${incident.id}`);
  };

  const handleDownloadPDF = async (incident) => {
    try {
      await generateReportPDF(incident, 'incident');
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Live Operations <span className="text-teal-500">Dashboard</span>
        </h2>
        <p className="text-gray-500">Monitor incident reports in real-time</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <h6 className="text-sm font-medium text-gray-600 leading-tight">Live Incidents</h6>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-800">{liveIncidents.length}</span>
                <p className="text-sm text-gray-500 mt-1">Active / Unresolved</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h6 className="text-sm font-medium text-gray-600 leading-tight">Completed Incidents</h6>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-800">{completedIncidents.length}</span>
                <p className="text-sm text-gray-500 mt-1">Resolved</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'live'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
              }`}
            >
              Live Incidents ({liveIncidents.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
              }`}
            >
              Completed ({completedIncidents.length})
            </button>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by reference ID, incident type, scheme, or staff name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-10 bg-white border-gray-300"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-teal-500">
                  <tr>
                    <th className="text-left text-white">Reference ID</th>
                    <th className="text-left text-white">Incident Type</th>
                    <th className="text-left text-white">Scheme</th>
                    <th className="text-left text-white">Reported By</th>
                    <th className="text-left text-white">Date & Time</th>
                    <th className="text-left text-white">Status</th>
                    <th className="text-center text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          No {activeTab === 'live' ? 'live' : 'completed'} incidents found
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          {searchTerm ? 'Try adjusting your search criteria' : `No ${activeTab} incidents at this time`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50">
                        <td className="font-mono text-sm font-semibold">
                          <div>{incident.referenceId || incident.id.slice(0, 12)}</div>
                          {incident.incursion === 'YES' && (
                            <span className="badge badge-error badge-xs mt-1">Incursion</span>
                          )}
                        </td>
                        <td className="text-sm text-gray-800">
                          {incident.incidentType || 'N/A'}
                        </td>
                        <td className="text-sm text-gray-600">
                          {incident.scheme || 'N/A'}
                        </td>
                        <td className="text-sm">
                          <div className="text-gray-800">
                            {incident.submittedBy?.name || `${incident.firstName || ''} ${incident.lastName || ''}`.trim() || 'N/A'}
                          </div>
                        </td>
                        <td className="text-sm">
                          <div className="text-gray-800 font-medium">
                            {incident.date || formatDate(incident.createdAt)}
                          </div>
                          <div className="text-gray-400">
                            {incident.time || formatTime(incident.createdAt)}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-sm ${
                            incident.status === 'completed' ? 'badge-success' : 'badge-warning'
                          }`}>
                            {incident.status || 'submitted'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewIncident(incident)}
                              className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(incident)}
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredIncidents.length)} of {filteredIncidents.length} incidents
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
  );
};

export default LiveOperatorDashboard;
