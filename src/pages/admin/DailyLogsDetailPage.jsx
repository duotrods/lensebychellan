import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Calendar, Clock, MapPin, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import AdminSidebarLayout from '../../components/layout/AdminSidebarLayout';
import { generateReportPDF } from '../../utils/pdfGenerator';
import chellanlogo from "../../assets/chellanpng.png";

const DailyLogsDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  // Return to the page we came from; default to Staff Reports.
  const backPath = location.state?.from || '/dashboard/admin/staff-reports';
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const foundReport = await staffService.getDailyOccurrenceReportById(id);

      if (foundReport) {
        setReport(foundReport);
      } else {
        toast.error('Report not found');
        navigate(backPath);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load report');
      navigate(backPath);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await generateReportPDF(report, 'daily-occurrence');
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleRemoveOccurrence = async (index) => {
    const occurrence = report.occurrences[index];
    const confirmMessage = report.occurrences.length === 1
      ? 'This is the last occurrence. Removing it will delete the entire report. Are you sure?'
      : `Are you sure you want to remove Occurrence #${index + 1} (${occurrence.date} ${occurrence.time})? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await staffService.removeOccurrenceFromReport(
        id,
        index,
        userProfile.uid,
        userProfile.displayName
      );

      if (result.deleted) {
        toast.success('Report deleted (last occurrence removed)');
        navigate(backPath);
      } else {
        toast.success(`Occurrence #${index + 1} removed successfully`);
        loadReport();
      }
    } catch (error) {
      console.error('Failed to remove occurrence:', error);
      toast.error('Failed to remove occurrence');
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
              onClick={() => navigate(backPath)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Daily Occurrence Report Details</h3>
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

          {/* Occurrences */}
          <div className="space-y-8">
            {report.occurrences && report.occurrences.length > 0 ? (
              report.occurrences.map((occurrence, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-bold text-gray-800">
                        Occurrence #{index + 1}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleRemoveOccurrence(index)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove this occurrence"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">Date</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.date || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">Time</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.time || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">Location</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">Scheme</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.scheme || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">URN</label>
                      <p className="text-base text-gray-800 mt-1 font-mono">{occurrence.urn || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">Recovery Required</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.recoveryRequired || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">RCC</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.rcc || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase">Name/Initials</label>
                      <p className="text-base text-gray-800 mt-1">{occurrence.nameInitials || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-500 uppercase mb-2 block">Description</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {occurrence.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase mb-2 block">Action Taken</label>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {occurrence.actionTaken || 'No action details provided'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No occurrences recorded</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-8 pt-8 border-t">
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-blue-800 uppercase mb-4">Report Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Total Occurrences:</span>
                  <span className="ml-2 font-bold text-blue-900">
                    {report.occurrences?.length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Schemes Involved:</span>
                  <span className="ml-2 font-bold text-blue-900">
                    {report.occurrences
                      ? [...new Set(report.occurrences.map(o => o.scheme).filter(Boolean))].length
                      : 0}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Recoveries Required:</span>
                  <span className="ml-2 font-bold text-blue-900">
                    {report.occurrences
                      ? report.occurrences.filter(o => o.recoveryRequired && o.recoveryRequired !== 'N/A').length
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Information */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
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

export default DailyLogsDetailPage;
