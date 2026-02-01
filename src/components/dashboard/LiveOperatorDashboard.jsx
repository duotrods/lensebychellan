    import { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useAuth } from '../../hooks/useAuth';
    import { staffService } from '../../services/staffService';
    import { AlertCircle, Eye, Download, Radio, CheckCircle } from 'lucide-react';
    import { toast } from 'react-hot-toast';
    import { generateReportPDF } from '../../utils/pdfGenerator';

    const LiveOperatorDashboard = () => {
      const navigate = useNavigate();
      const { userProfile } = useAuth();
      const [incidents, setIncidents] = useState([]);
      const [loading, setLoading] = useState(true);

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
        navigate(`/dashboard/liveoperator/incident/${incident.id}`);
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
          {/* Welcome Header */}
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
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
                    </div>

                    <div className="bg-white-500 shadow-xs rounded-b-lg flex-1 overflow-hidden">
                      {liveIncidents.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          No live incidents at this time
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                          {liveIncidents.map((incident) => (
                            <div
                              key={incident.id}
                              onClick={() => handleViewIncident(incident)}
                              className="px-4 py-4 "
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* {incident.files && incident.files.length > 0 && incident.files[0].downloadUrl && (
                                    <img
                                        loading='lazy'
                                        src={incident.files[0].downloadUrl}
                                        alt="Incident"
                                        className="w-24 h-24 object-cover rounded-lg"
                                      />)} */}
                                  <span className="text-red-400 font-mono font-semibold">
                                    {incident.time || formatTime(incident.timeSpotted)}
                                  </span>
                                  <span className="text-red-500 font-bold">|</span>
                                  <span className="font-medium">
                                    {incident.referenceId || `Incident #${incident.id.slice(0, 4)}`}
                                  </span>
                                  <span className="text-red-500 font-bold">|</span>
                                  <span className="font-medium">
                                    {incident.scheme}
                                  </span>
                                  <span className="text-red-500 font-bold">|</span>
                                  <span className="font-medium">
                                    Marker Post: {incident.markerPost}
                                  </span>
                                </div>
                                <button
                                  className="p-1.5rounded text-blue-400 hover:text-blue-300"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            {incident.incidentType && (
                              <p className="text-slate-400 text-sm mt-1">
                                {incident.incidentType} - {incident.scheme || 'N/A'}
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
                    </div>

                    <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden">
                      {completedIncidents.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          No completed incidents yet
                        </div>
                      ) : (
                        <div className="divide-y  max-h-96 overflow-y-auto">
                          {completedIncidents.map((incident) => {
                            const duration = calculateDuration(incident.timeSpotted, incident.timeCleared);
                            return (
                              <div
                               
                                className="px-4 py-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className=" text-black font-mono">
                                      {incident.timeSpotted || formatTime(incident.createdAt)}
                                    </span>
                                    <span className="text-green-500 font-bold">|</span>
                                    <span className="font-mono">
                                      Time: Cleared {incident.timeCleared || 'N/A'}
                                    </span>
                                    <span className="text-green-500 font-bold">|</span>
                                    <span className="text-black font-medium">
                                      {incident.referenceId || `Incident #${incident.id.slice(0, 4)}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => handleDownloadPDF(incident, e)}
                                      className="p-1.5 hover:bg-slate-600 rounded text-purple-400 hover:text-purple-300"
                                      title="Download PDF"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                       key={incident.id}
                                       onClick={() => handleViewIncident(incident)}
                                      className="p-1.5 hover:bg-slate-600 rounded text-blue-400 hover:text-blue-500"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  {incident.incidentType && (
                                    <p className="text-slate-400 text-sm">
                                      {incident.incidentType} - {incident.scheme || 'N/A'}
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

    export default LiveOperatorDashboard;
