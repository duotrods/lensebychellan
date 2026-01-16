import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, FileText, AlertTriangle } from 'lucide-react';
import { staffService } from '../../services/staffService';
import AdminSidebarLayout from '../../components/layout/AdminSidebarLayout';
import { generateReportPDF } from '../../utils/pdfGenerator';
import chellanlogo from "../../assets/chellanpng.png";

const AssetDamageDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const reports = await staffService.getAssetDamageReports(null);
      const foundReport = reports.find(r => r.id === id);

      if (foundReport) {
        setReport(foundReport);
      } else {
        toast.error('Report not found');
        navigate('/dashboard/admin/staff-reports');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load report');
      navigate('/dashboard/admin/staff-reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateReportPDF(report, 'asset-damage');
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'badge-error';
      case 'medium':
        return 'badge-warning';
      case 'low':
        return 'badge-success';
      default:
        return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <AdminSidebarLayout>
        <div className="flex justify-center items-center h-96">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      </AdminSidebarLayout>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <AdminSidebarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/admin/staff-reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Asset Damage Report Details</h3>
              <p className="text-sm text-gray-500 mt-1">Reference: {report.referenceId || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="btn bg-blue-500 text-white hover:bg-blue-600 border-none"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-md p-8">
          {/* Logo */}
          <div className="flex justify-center items-center mb-8">
            <img src={chellanlogo} alt="Company Logo" className="h-25 w-auto" />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b">
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Scheme</label>
              <p className="text-lg font-medium text-gray-800 mt-1">{report.scheme || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Section</label>
              <p className="text-lg font-medium text-gray-800 mt-1">{report.section || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Date</label>
              <p className="text-lg font-medium text-gray-800 mt-1">{report.date || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Time</label>
              <p className="text-lg font-medium text-gray-800 mt-1">{report.time || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Reported By</label>
              <p className="text-lg font-medium text-gray-800 mt-1">
                {report.firstName} {report.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Severity</label>
              <div className="mt-1">
                <span className={`badge badge-lg ${getSeverityColor(report.severity)}`}>
                  {report.severity || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Location Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Location</label>
                <p className="text-base text-gray-800 mt-1">{report.location || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Marker Post</label>
                <p className="text-base text-gray-800 mt-1">{report.markerPost || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Track</label>
                <p className="text-base text-gray-800 mt-1">{report.track || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Damage Details */}
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Damage Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Asset Type</label>
                <p className="text-base text-gray-800 mt-1">{report.assetType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Damage Type</label>
                <p className="text-base text-gray-800 mt-1">{report.damageType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Weather Conditions</label>
                <p className="text-base text-gray-800 mt-1">{report.weatherConditions || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Estimated Cost</label>
                <p className="text-base text-gray-800 mt-1">
                  {report.estimatedCost ? `£${report.estimatedCost}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Reporting Information */}
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Reporting Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Reported By</label>
                <p className="text-base text-gray-800 mt-1">{report.reportedBy || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Camera Number</label>
                <p className="text-base text-gray-800 mt-1">{report.cameraNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Notifications Sent */}
          {report.notificationSent && report.notificationSent.length > 0 && (
            <div className="mb-8 pb-8 border-b">
              <h4 className="text-lg font-bold text-gray-800 mb-4">Notifications Sent</h4>
              <div className="flex flex-wrap gap-2">
                {report.notificationSent.map((notification, index) => (
                  <span key={index} className="badge badge-lg bg-blue-100 text-blue-700">
                    {notification}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Description</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {report.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Action Taken */}
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Action Taken</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {report.actionTaken || 'No action details provided'}
              </p>
            </div>
          </div>

          {/* Files */}
          {report.files && report.files.length > 0 && (
            <div className="mb-8 pb-8 border-b">
              <h4 className="text-lg font-bold text-gray-800 mb-4">Attached Files</h4>
              <div className="space-y-2">
                {report.files.map((file, index) => (
                  <a
                    key={index}
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-800">{file.fileName}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Submission Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Submission Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Submitted by:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {report.submittedBy?.name || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Submitted on:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {formatDate(report.createdAt)}
                </span>
              </div>
              {report.updatedAt && (
                <div>
                  <span className="text-gray-500">Last updated:</span>
                  <span className="ml-2 font-medium text-gray-800">
                    {formatDate(report.updatedAt)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 badge ${
                  report.status === 'submitted' ? 'badge-warning' : 'badge-success'
                }`}>
                  {report.status || 'submitted'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminSidebarLayout>
  );
};

export default AssetDamageDetailPage;
