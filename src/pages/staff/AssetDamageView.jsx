import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';

const AssetDamageView = () => {
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
      const reports = await staffService.getAssetDamageReports(null);
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
    navigate(`/dashboard/staff/forms/asset-damage?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this Asset Damage Report? This action cannot be undone.`)) {
      return;
    }

    try {
      await staffService.deleteAssetDamageReport(id, userProfile.uid, userProfile.displayName);
      toast.success('Asset Damage Report deleted successfully');
      navigate('/dashboard/staff');
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
                Asset Damage Report Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Reference: {report.referenceId || report.id.slice(0, 12)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
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
          {/* Severity Badge */}
          {report.severity && (
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <span className={`px-4 py-2 rounded-full font-semibold text-lg ${getSeverityColor(report.severity)}`}>
                Severity: {report.severity}
              </span>
            </div>
          )}

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
                <label className="text-sm font-semibold text-gray-600">Time</label>
                <p className="text-gray-800">{report.time || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Submitted By</label>
                <p className="text-gray-800">
                  {report.submittedBy?.name || `${report.firstName || ''} ${report.lastName || ''}`.trim() || 'N/A'}
                </p>
              </div>
              {report.lastEditedBy && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Last Edited By</label>
                  <p className="text-blue-600">{report.lastEditedBy.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Details */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Location Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Location</label>
                <p className="text-gray-800">{report.location || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Marker Post</label>
                <p className="text-gray-800">{report.markerPost || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Track</label>
                <p className="text-gray-800">{report.track || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Damage Details */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Damage Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Asset Type</label>
                <p className="text-gray-800">{report.assetType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Damage Type</label>
                <p className="text-gray-800">{report.damageType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Weather Conditions</label>
                <p className="text-gray-800">{report.weatherConditions || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Reported By</label>
                <p className="text-gray-800">{report.reportedBy || 'N/A'}</p>
              </div>
              {report.cameraNumber && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Camera Number</label>
                  <p className="text-gray-800">{report.cameraNumber}</p>
                </div>
              )}
              {report.estimatedCost && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Estimated Repair Cost</label>
                  <p className="text-gray-800">£{parseFloat(report.estimatedCost).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          {report.notificationSent && report.notificationSent.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Notifications Sent To
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.notificationSent.map((recipient, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {recipient}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Description of Damage
            </h4>
            <p className="text-gray-800 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {report.description || 'N/A'}
            </p>
          </div>

          {/* Action Taken */}
          {report.actionTaken && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Immediate Action Taken
              </h4>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {report.actionTaken}
              </p>
            </div>
          )}

          {/* Files */}
          {report.files && report.files.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Photo/Video Evidence
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

export default AssetDamageView;
