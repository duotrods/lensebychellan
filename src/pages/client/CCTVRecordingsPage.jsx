import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { clientDataService } from '../../services/clientDataService';
import ClientSidebarLayout from '../../components/layout/ClientSidebarLayout';
import {
  Camera, Search, Filter, Download, Play, Calendar,
  MapPin, Video, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateCCTVRecordingPDF } from '../../utils/pdfGenerator';

const CCTVRecordingsPage = () => {
  const { userProfile } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const recordingsPerPage = 12;

  useEffect(() => {
    if (userProfile?.schemeId) {
      loadRecordings();
    }
  }, [userProfile?.schemeId]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const cctvData = await clientDataService.getCCTVRecordings(userProfile.schemeId);
      setRecordings(cctvData);
    } catch (error) {
      console.error('Failed to load CCTV recordings:', error);
      if (error.message?.includes('index') || error.cause?.message?.includes('index')) {
        toast.error('Firebase indexes are still building. Please wait 5-10 minutes and refresh.');
      } else {
        toast.error('Failed to load CCTV recordings');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get unique cameras
  const uniqueCameras = [...new Set(recordings.map(r => r.cameraNumber))].sort();

  // Filter recordings
  const filteredRecordings = recordings.filter(recording => {
    const matchesSearch = recording.cameraNumber?.toString().includes(searchTerm) ||
                         recording.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recording.scheme?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCamera = cameraFilter === 'all' || recording.cameraNumber?.toString() === cameraFilter;

    let matchesDate = true;
    if (dateFilter !== 'all' && recording.dateTime) {
      const recordingDate = recording.dateTime.seconds
        ? new Date(recording.dateTime.seconds * 1000)
        : new Date(recording.dateTime);
      const now = new Date();
      const daysDiff = Math.floor((now - recordingDate) / (1000 * 60 * 60 * 24));

      switch(dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
      }
    }

    return matchesSearch && matchesCamera && matchesDate;
  });

  // Pagination
  const indexOfLastRecording = currentPage * recordingsPerPage;
  const indexOfFirstRecording = indexOfLastRecording - recordingsPerPage;
  const currentRecordings = filteredRecordings.slice(indexOfFirstRecording, indexOfLastRecording);
  const totalPages = Math.ceil(filteredRecordings.length / recordingsPerPage);

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

  const handleViewRecording = (recording) => {
    setSelectedRecording(recording);
  };

  const handleDownloadRecording = (recording) => {
    try {
      generateCCTVRecordingPDF(recording);
      toast.success(`Downloaded CCTV recording details for Camera ${recording.cameraNumber}`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download recording details');
    }
  };

  const recordingStats = {
    total: recordings.length,
    today: recordings.filter(r => {
      const date = r.dateTime?.seconds ? new Date(r.dateTime.seconds * 1000) : new Date(r.dateTime);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length,
    cameras: uniqueCameras.length,
    incidents: recordings.filter(r => r.incidentRelated).length
  };

  return (
    <ClientSidebarLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">CCTV Recordings</h1>
          <p className="text-gray-600 mt-2">
            Access and manage CCTV footage for {userProfile?.schemeName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Recordings</p>
                <p className="text-2xl font-bold text-gray-800">{recordingStats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Today's Uploads</p>
                <p className="text-2xl font-bold text-gray-800">{recordingStats.today}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Cameras</p>
                <p className="text-2xl font-bold text-gray-800">{recordingStats.cameras}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Incident Related</p>
                <p className="text-2xl font-bold text-gray-800">{recordingStats.incidents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by camera number or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="select select-bordered"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            {/* Camera Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={cameraFilter}
                onChange={(e) => setCameraFilter(e.target.value)}
                className="select select-bordered"
              >
                <option value="all">All Cameras</option>
                {uniqueCameras.map(camera => (
                  <option key={camera} value={camera}>Camera {camera}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Recordings Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="p-12 text-center">
              <span className="loading loading-spinner loading-lg text-brand-500"></span>
            </div>
          ) : currentRecordings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentRecordings.map((recording, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Thumbnail */}
                    <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                      <Camera className="w-16 h-16 text-gray-600" />
                      <div className="absolute top-2 right-2">
                        {recording.incidentRelated && (
                          <span className="badge badge-error badge-sm">Incident</span>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {recording.fileCount || 1} file(s)
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg text-gray-800">
                          Camera {recording.cameraNumber}
                        </h3>
                        <span className="badge badge-brand badge-sm">
                          {recording.scheme || userProfile?.schemeId}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(recording.dateTime)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{formatTime(recording.dateTime)}</span>
                        </div>

                        {recording.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {recording.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span>Uploaded by {recording.uploadedBy || 'Staff'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewRecording(recording)}
                          className="btn btn-sm btn-brand flex-1"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadRecording(recording)}
                          className="btn btn-sm btn-outline flex-1"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600">
                    Showing {indexOfFirstRecording + 1} to {Math.min(indexOfLastRecording, filteredRecordings.length)} of {filteredRecordings.length} recordings
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
            </>
          ) : (
            <div className="p-12 text-center">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No recordings found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Recording Detail Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  Camera {selectedRecording.cameraNumber} - Recording Details
                </h2>
                <button
                  onClick={() => setSelectedRecording(null)}
                  className="btn btn-sm btn-ghost"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Video Placeholder */}
              <div className="bg-gray-900 aspect-video rounded-lg flex items-center justify-center mb-6">
                <div className="text-center text-white">
                  <Play className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Video Player</p>
                  <p className="text-sm text-gray-400 mt-2">Click to play recording</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Camera Number</p>
                  <p className="font-semibold text-lg">Camera {selectedRecording.cameraNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Scheme</p>
                  <p className="font-semibold text-lg">{selectedRecording.scheme || userProfile?.schemeName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                  <p className="font-semibold">
                    {formatDate(selectedRecording.dateTime)} at {formatTime(selectedRecording.dateTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Uploaded By</p>
                  <p className="font-semibold">{selectedRecording.uploadedBy || 'Staff Member'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">File Count</p>
                  <p className="font-semibold">{selectedRecording.fileCount || 1} file(s)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Incident Related</p>
                  <p className="font-semibold">
                    {selectedRecording.incidentRelated ? (
                      <span className="badge badge-error">Yes</span>
                    ) : (
                      <span className="badge badge-ghost">No</span>
                    )}
                  </p>
                </div>
              </div>

              {selectedRecording.description && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRecording.description}</p>
                </div>
              )}

              {/* Files List */}
              {selectedRecording.files && selectedRecording.files.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Files ({selectedRecording.files.length})</p>
                  <div className="space-y-2">
                    {selectedRecording.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Video className="w-5 h-5 text-gray-500" />
                          <span className="text-sm font-medium">{file.name || `Video ${idx + 1}`}</span>
                        </div>
                        <button
                          onClick={() => toast.success('Downloading file...')}
                          className="btn btn-sm btn-ghost"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadRecording(selectedRecording)}
                  className="btn btn-brand flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All Files
                </button>
                <button
                  onClick={() => setSelectedRecording(null)}
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

export default CCTVRecordingsPage;
