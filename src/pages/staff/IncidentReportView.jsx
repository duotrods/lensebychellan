import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';
import { generateReportPDF } from '../../utils/pdfGenerator';

const IncidentReportView = () => {
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
      const reports = await staffService.getIncidentReports(null);
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
    navigate(`/dashboard/staff/forms/incident-report?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this Incident Report? This action cannot be undone.`)) {
      return;
    }

    try {
      await staffService.deleteIncidentReport(id, userProfile.uid, userProfile.displayName);
      toast.success('Incident Report deleted successfully');
      navigate('/dashboard/staff');
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateReportPDF(report, 'incident');
      toast.success('Downloaded report as PDF');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
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
                Incident Report Details
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

          {/* Incident Details */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Incident Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Weather Conditions</label>
                <p className="text-gray-800">{report.weatherConditions || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Traffic Conditions</label>
                <p className="text-gray-800">{report.trafficConditions || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">NH Log</label>
                <p className="text-gray-800">{report.nhLog || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Collar Number</label>
                <p className="text-gray-800">{report.collarNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Incursion</label>
                <p className="text-gray-800">{report.incursion || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Reported By</label>
                <p className="text-gray-800">{report.reportedBy || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Camera Number</label>
                <p className="text-gray-800">{report.cameraNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Marker Post</label>
                <p className="text-gray-800">{report.markerPost || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Track</label>
                <p className="text-gray-800">{report.track || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Incident Type</label>
                <p className="text-gray-800">{report.incidentType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Fault</label>
                <p className="text-gray-800">{report.fault || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Affected Lanes */}
          {report.affectedLanes && report.affectedLanes.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Affected Lanes
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.affectedLanes.map((lane, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {lane}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Services */}
          {report.emergencyServices && report.emergencyServices.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Emergency Services
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.emergencyServices.map((service, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Requested */}
          {report.recoveryRequested && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Recovery Requested
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Light</label>
                  <p className="text-gray-800">{report.recoveryRequested.light || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Heavy</label>
                  <p className="text-gray-800">{report.recoveryRequested.heavy || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">IPV</label>
                  <p className="text-gray-800">{report.recoveryRequested.ipv || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">HETOS</label>
                  <p className="text-gray-800">{report.recoveryRequested.hetos || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Time Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Time Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Time Spotted to On Site</label>
                <p className="text-gray-800">{report.timeSpottedToOn || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Time Onsite to Cleared</label>
                <p className="text-gray-800">{report.timeOnsiteToCleared || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Closed Log Collar Number</label>
                <p className="text-gray-800">{report.closedLogCollar || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vehicles Involved */}
          {report.vehicles && report.vehicles.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Vehicles Involved
              </h4>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">Type</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">Make</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">Model</th>
                      <th className="text-left text-sm font-semibold text-gray-600 px-4 py-2">VIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.vehicles.map((vehicle, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">{vehicle.type || 'N/A'}</td>
                        <td className="px-4 py-2">{vehicle.make || 'N/A'}</td>
                        <td className="px-4 py-2">{vehicle.model || 'N/A'}</td>
                        <td className="px-4 py-2">{vehicle.vin || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Description of Incident
            </h4>
            <p className="text-gray-800 whitespace-pre-wrap">{report.description || 'N/A'}</p>
          </div>

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

export default IncidentReportView;
