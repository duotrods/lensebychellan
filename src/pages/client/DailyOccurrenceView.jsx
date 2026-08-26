import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Clock, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { clientDataService } from '../../services/clientDataService';
import ClientSidebarLayout from '../../components/layout/ClientSidebarLayout';
import { generateReportPDF } from '../../utils/pdfGenerator';
import { getActiveSchemeName } from '../../utils/schemes';

const DailyOccurrenceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, role } = useAuth();
  const basePath = role === "thirdpartyclient" ? "/dashboard/thirdparty/client" : "/dashboard/client";
  const activeScheme = userProfile?.activeSchemeId || userProfile?.schemeId;

  // Shared with ReportsPage — same underlying "all reports for this scheme"
  // fetch, so viewing a report after browsing the list costs 0 extra reads.
  const allReportsQuery = useQuery({
    queryKey: ["clientAllReports", activeScheme],
    queryFn: () => clientDataService.getAllReports(activeScheme),
    enabled: !!activeScheme,
  });

  const foundReport = allReportsQuery.data?.find(
    (r) => r.id === id && r.reportType === 'daily-occurrence',
  );

  const report = foundReport
    ? {
        ...foundReport,
        // Filter occurrences to only show those matching the client's active scheme
        occurrences:
          foundReport.occurrences?.filter((occurrence) => {
            const activeSchemeName = getActiveSchemeName(userProfile);
            return occurrence.scheme === activeSchemeName || occurrence.scheme === 'All Schemes';
          }) || [],
      }
    : null;

  const loading = allReportsQuery.isLoading;

  useEffect(() => {
    if (allReportsQuery.isSuccess && !foundReport) {
      toast.error('Report not found');
      navigate(`${basePath}/reports`);
    }
  }, [allReportsQuery.isSuccess, foundReport, navigate, basePath]);

  useEffect(() => {
    if (allReportsQuery.isError) {
      console.error('Failed to load report:', allReportsQuery.error);
      toast.error('Failed to load report');
    }
  }, [allReportsQuery.isError, allReportsQuery.error]);

  const handleDownloadPDF = async () => {
    try {
      await generateReportPDF(report, 'daily-occurrence');
      toast.success('Downloaded daily occurrence report as PDF');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
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
      <ClientSidebarLayout>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-brand-500"></span>
        </div>
      </ClientSidebarLayout>
    );
  }

  if (!report) {
    return (
      <ClientSidebarLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Report not found</p>
        </div>
      </ClientSidebarLayout>
    );
  }

  return (
    <ClientSidebarLayout>
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
                Daily Occurrence Sheet
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
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Report Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Report Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Submitted By</label>
                <p className="text-gray-800">
                  {report.submittedBy?.name || 'N/A'}
                </p>
              </div>
              {/* <div>
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {report.status || 'Submitted'}
                </span>
              </div> */}
              {report.lastEditedBy && (
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-600">Last Edited By</label>
                  <p className="text-blue-600">{report.lastEditedBy?.name || 'Unknown'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Occurrences */}
          {report.occurrences && report.occurrences.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Daily Occurrences ({report.occurrences.length})
              </h4>
              <div className="space-y-4">
                {report.occurrences.map((occurrence, index) => (
                  <div
                    key={index}
                    className="p-6 bg-gray-50 rounded-lg border-l-4 border-brand-500 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-md font-semibold text-gray-800">
                        Occurrence #{index + 1}
                      </h5>
                      {occurrence.urn && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full">
                          <span className="text-sm"><span className="font-bold">URN:</span> {occurrence.urn}</span>
                        </div>
                      )}
                    </div>

                    {/* Date, Time, Location */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Date</label>
                          <p className="text-sm font-medium">{occurrence.date || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-4 h-4 text-brand-600" />
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Time</label>
                          <p className="text-sm font-medium">{occurrence.time || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-brand-600" />
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Location</label>
                          <p className="text-sm font-medium">{occurrence.location || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {occurrence.scheme && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600">Scheme</label>
                          <p className="text-sm text-gray-800">{occurrence.scheme}</p>
                        </div>
                      )}
                      {occurrence.recoveryRequired && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600">Recovery Required</label>
                          <p className="text-sm text-gray-800">{occurrence.recoveryRequired}</p>
                        </div>
                      )}
                      {occurrence.rcc && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600">RCC</label>
                          <p className="text-sm text-gray-800">{occurrence.rcc}</p>
                        </div>
                      )}
                      {occurrence.nameInitials && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600">Name/Initials</label>
                          <p className="text-sm text-gray-800">{occurrence.nameInitials}</p>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {occurrence.description && (
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-gray-600">Description</label>
                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg mt-1 whitespace-pre-wrap">
                          {occurrence.description}
                        </p>
                      </div>
                    )}

                    {/* Action Taken */}
                    {occurrence.actionTaken && (
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Action Taken</label>
                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg mt-1 whitespace-pre-wrap">
                          {occurrence.actionTaken}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Occurrences */}
          {(!report.occurrences || report.occurrences.length === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No occurrences recorded</p>
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
    </ClientSidebarLayout>
  );
};

export default DailyOccurrenceView;
