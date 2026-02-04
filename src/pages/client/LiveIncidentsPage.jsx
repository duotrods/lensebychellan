import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { clientDataService } from '../../services/clientDataService';
import { Eye, Download, Radio, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateReportPDF } from '../../utils/pdfGenerator';
import { SCHEMES } from "../../utils/schemes";

const LiveIncidentsPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;
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

  // Query for all incidents for this scheme
  const { data: incidents = [], isLoading: loading } = useQuery({
    queryKey: ['schemeIncidents', schemeId],
    queryFn: () => clientDataService.getSchemeIncidents(schemeId),
    enabled: !!schemeId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const liveIncidents = incidents.filter(r => r.status === 'live');
  const completedIncidents = incidents.filter(r => r.status === 'completed');

  const formatTime = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string' && dateValue.includes(':')) return dateValue;
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;

    const parseTime = (time) => {
      if (!time) return null;
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (start === null || end === null) return null;

    let diff = end - start;
    if (diff < 0) diff += 24 * 60;

    return `${diff}m`;
  };

  const handleViewIncident = (incident) => {
    navigate(`/dashboard/client/incident/${incident.id}`);
  };

  const handleDownloadPDF = async (incident, e) => {
    e.stopPropagation();
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
      {/* Header with Back Button */}
      <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/dashboard/client')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h4 className=" font-bold text-gray-800">
               <span className="font-semibold text-brand-400">{schemeId} ({getActiveSchemeName()})</span> Live Incidents 
            </h4>
            <p className="text-gray-500">You can monitor here your live incidents and completed incidents </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      ) : (
        <>
          {/* Incident Management Hub */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Incidents Column */}
              <div className="flex flex-col">
                <div className="bg-linear-to-br from-red-500 to-red-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Radio className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-white font-semibold text-2xl">Live Incidents</span>
                  <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {liveIncidents.length} Active
                  </span>
                </div>

                <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                  {liveIncidents.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No live incidents at this time
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                      {liveIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          onClick={() => handleViewIncident(incident)}
                          className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-red-400 font-mono font-semibold">
                                {incident.time || formatTime(incident.timeSpotted)}
                              </span>
                              <span className="text-red-500 font-bold">|</span>
                              <span className="font-medium">
                                {incident.referenceId || `Incident #${incident.id.slice(0, 4)}`}
                              </span>
                              <span className="text-red-500 font-bold">|</span>
                              <span className="font-medium">
                                Marker Post: {incident.markerPost || 'N/A'}
                              </span>
                            </div>
                            <button
                              className="p-1.5 rounded text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                          {incident.incidentType && (
                            <p className="text-slate-400 text-sm mt-1">
                              {incident.incidentType}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Completed Incidents Column */}
              <div className="flex flex-col">
                <div className="bg-linear-to-br from-brand-500 to-brand-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-white font-semibold text-2xl">Completed Incidents</span>
                  <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {completedIncidents.length} Total
                  </span>
                </div>

                <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                  {completedIncidents.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No completed incidents yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 overflow-y-auto">
                      {completedIncidents.map((incident) => {
                        const duration = calculateDuration(incident.timeSpotted, incident.timeCleared);
                        return (
                          <div
                            key={incident.id}
                            className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewIncident(incident)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-black font-mono">
                                  {incident.timeSpotted || formatTime(incident.createdAt)}
                                </span>
                                <span className="text-green-500 font-bold">|</span>
                                <span className="font-mono">
                                  Cleared: {incident.timeCleared || 'N/A'}
                                </span>
                                <span className="text-green-500 font-bold">|</span>
                                <span className="text-black font-medium">
                                  {incident.referenceId || `Incident #${incident.id.slice(0, 4)}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleDownloadPDF(incident, e)}
                                  className="p-1.5 hover:bg-gray-200 rounded text-purple-500 hover:text-purple-600"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 hover:bg-gray-200 rounded text-blue-400 hover:text-blue-500"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              {incident.incidentType && (
                                <p className="text-slate-400 text-sm">
                                  {incident.incidentType}
                                </p>
                              )}
                              {duration && (
                                <span className="text-slate-400 text-sm">
                                  Duration: <span className="text-black font-semibold">{duration}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveIncidentsPage;
