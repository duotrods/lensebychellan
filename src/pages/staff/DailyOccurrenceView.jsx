import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Edit, Trash2, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';
import { generateReportPDF } from '../../utils/pdfGenerator';

const DailyOccurrenceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      // Pass null to get all reports, not just current user's
      const reports = await staffService.getDailyOccurrenceReports(null);
      const foundReport = reports.find(r => r.id === id);

      if (foundReport) {
        setReport(foundReport);
      } else {
        toast.error('Report not found');
        navigate('/dashboard/staff');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/dashboard/staff/forms/daily-occurence?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this Daily Occurrence Report? This action cannot be undone.`)) {
      return;
    }

    try {
      await staffService.deleteDailyOccurrenceReport(id, userProfile.uid, userProfile.displayName);
      toast.success('Daily Occurrence Report deleted successfully');
      navigate('/dashboard/staff');
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateReportPDF(report, 'daily-occurrence');
      toast.success('Downloaded daily occurrence report as PDF');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <StaffSidebarLayout>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      </StaffSidebarLayout>
    );
  }

  if (!report) {
    return (
      <StaffSidebarLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Report not found</p>
        </div>
      </StaffSidebarLayout>
    );
  }

  return (
    <StaffSidebarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                Daily Occurrence Sheet Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Reference: {report.referenceId || report.id.slice(0, 12)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Scheme</label>
                <p className="text-gray-800">{report.scheme || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Section</label>
                <p className="text-gray-800">{report.section || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Date</label>
                <p className="text-gray-800">{report.date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Submitted By</label>
                <p className="text-gray-800">
                  {report.submittedBy?.name || `${report.firstName || ''} ${report.lastName || ''}`.trim() || 'N/A'}
                </p>
              </div>
              {report.lastEditedBy && (
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-600">Last Edited By</label>
                  <p className="text-blue-600">{report.lastEditedBy.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shift Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Shift Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Shift Start Time</label>
                <p className="text-gray-800">{report.shiftStartTime || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Shift End Time</label>
                <p className="text-gray-800">{report.shiftEndTime || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Weather Conditions</label>
                <p className="text-gray-800">{report.weatherConditions || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Traffic Flow</label>
                <p className="text-gray-800">{report.trafficFlow || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Occurrences */}
          {report.occurrences && report.occurrences.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Occurrences During Shift
              </h4>
              <div className="space-y-4">
                {report.occurrences.map((occurrence, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border-l-4 border-teal-500"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">{occurrence.time || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-semibold">{occurrence.location || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Type</label>
                        <p className="text-sm text-gray-800">{occurrence.type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Description</label>
                        <p className="text-sm text-gray-800">{occurrence.description || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-gray-600">Action Taken</label>
                        <p className="text-sm text-gray-800">{occurrence.actionTaken || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Camera Status */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Camera Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <p className="text-gray-800">{report.cameraStatus || 'N/A'}</p>
              </div>
              {report.cameraIssues && (
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-600">Issues</label>
                  <p className="text-gray-800 bg-white p-3 rounded-lg">{report.cameraIssues}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Patrol */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Vehicle Patrol
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Completed</label>
                <p className="text-gray-800">{report.vehiclePatrolCompleted || 'N/A'}</p>
              </div>
              {report.vehiclePatrolNotes && (
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-600">Notes</label>
                  <p className="text-gray-800 bg-white p-3 rounded-lg whitespace-pre-wrap">
                    {report.vehiclePatrolNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Incidents Logged */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Incidents Logged
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Number of Incidents</label>
                <p className="text-gray-800">{report.incidentsLogged || '0'}</p>
              </div>
              {report.incidentReferences && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Incident References</label>
                  <p className="text-gray-800 font-mono">{report.incidentReferences}</p>
                </div>
              )}
            </div>
          </div>

          {/* Handover Notes */}
          {report.handoverNotes && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Handover Notes for Next Shift
              </h4>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {report.handoverNotes}
              </p>
            </div>
          )}

          {/* Additional Notes */}
          {report.additionalNotes && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Additional Notes
              </h4>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {report.additionalNotes}
              </p>
            </div>
          )}

          {/* Files */}
          {report.files && report.files.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Attachments
              </h4>
              <div className="space-y-2">
                {report.files.map((file, index) => (
                  <a
                    key={index}
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-800">{file.fileName}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <label className="font-semibold">Created:</label> {formatDateTime(report.createdAt)}
              </div>
              {report.updatedAt && (
                <div>
                  <label className="font-semibold">Last Updated:</label> {formatDateTime(report.updatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StaffSidebarLayout>
  );
};

export default DailyOccurrenceView;
