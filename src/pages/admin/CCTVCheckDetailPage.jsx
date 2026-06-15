import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Camera, Check, X } from 'lucide-react';
import { staffService } from '../../services/staffService';
import AdminSidebarLayout from '../../components/layout/AdminSidebarLayout';
import { generateReportPDF } from '../../utils/pdfGenerator';
import chellanlogo from "../../assets/chellanpng.png";

const CCTVCheckDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  // Return to the page we came from; default to Staff Reports.
  const backPath = location.state?.from || '/dashboard/admin/staff-reports';
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const foundReport = await staffService.getCCTVCheckFormById(id);

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
      await generateReportPDF(report, 'cctv-check');
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

  const renderCameraSection = (title, cameras, comments) => {
    // Check for various "all working" values that might be stored
    const allWorkingValues = ['ALL WORKING CORRECT', 'allWorking', 'All Working Correctly', 'All Working'];
    const hasAllWorking = cameras?.some(c => allWorkingValues.includes(c));
    const nonWorkingCameras = cameras?.filter(c => !allWorkingValues.includes(c)) || [];

    return (
      <div className="mb-8 pb-8 border-b">
        <h4 className="text-lg font-bold text-gray-800 mb-4">{title}</h4>

        {hasAllWorking ? (
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg mb-4">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">All cameras working correctly</span>
          </div>
        ) : nonWorkingCameras.length > 0 ? (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Cameras Not Working:</p>
            <div className="flex flex-wrap gap-2">
              {nonWorkingCameras.map((camera, index) => (
                <span key={index} className="badge badge-lg bg-red-100 text-red-700 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {camera}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mb-4">No camera status specified</p>
        )}

        {comments && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Comments:</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">{comments}</p>
            </div>
          </div>
        )}
      </div>
    );
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
              <h3 className="text-2xl font-bold text-gray-800">CCTV Check Form Details</h3>
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
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">First Name</label>
                <p className="text-lg font-medium text-gray-800 mt-1">{report.firstName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Last Name</label>
                <p className="text-lg font-medium text-gray-800 mt-1">{report.lastName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Date</label>
                <p className="text-lg font-medium text-gray-800 mt-1">{report.date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase">Time</label>
                <p className="text-lg font-medium text-gray-800 mt-1">{report.time || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Schemes Associated */}
          {report.schemeIds && report.schemeIds.length > 0 && (
            <div className="mb-8 pb-8 border-b">
              <h4 className="text-lg font-bold text-gray-800 mb-4">Associated Schemes</h4>
              <div className="flex flex-wrap gap-2">
                {report.schemeIds.map((schemeId, index) => (
                  <span key={index} className="badge badge-lg bg-purple-100 text-purple-700">
                    {schemeId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* A417 Section */}
          {renderCameraSection(
            'A417 - Missing Link Cameras',
            report.a417Cameras,
            report.a417Comments
          )}

          {/* A11/A47 Kier/Core Section */}
          {renderCameraSection(
            'A11/A47 Kier/Core Cameras',
            report.kierCore,
            report.kierCoreComments
          )}

          {/* M3 Jct 9 Section */}
          {renderCameraSection(
            'M3 Jct 9 - Balfour Beatty Cameras',
            report.m3Jct9,
            report.m3Jct9Comments
          )}

          {/* A452 HS2 Section */}
          {renderCameraSection(
            'A452 HS2 Cameras',
            report.A452,
            report.A452Comments
          )}

          {/* Costain - GC Section */}
          {renderCameraSection(
            'Costain - GC Cameras',
            report.Costain,
            report.CostainComments
          )}

          {/* Overall Summary */}
          <div className="mb-8 pb-8 border-b">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const allWorkingValues = ['ALL WORKING CORRECT', 'allWorking', 'All Working Correctly', 'All Working'];
                const a417AllWorking = report.a417Cameras?.some(c => allWorkingValues.includes(c));
                const kierCoreAllWorking = report.kierCore?.some(c => allWorkingValues.includes(c));
                const m3Jct9AllWorking = report.m3Jct9?.some(c => allWorkingValues.includes(c));
                const a452AllWorking = report.A452?.some(c => allWorkingValues.includes(c));
                const costainAllWorking = report.Costain?.some(c => allWorkingValues.includes(c));
                const a417Issues = report.a417Cameras?.filter(c => !allWorkingValues.includes(c)).length || 0;
                const kierCoreIssues = report.kierCore?.filter(c => !allWorkingValues.includes(c)).length || 0;
                const m3Jct9Issues = report.m3Jct9?.filter(c => !allWorkingValues.includes(c)).length || 0;
                const a452Issues = report.A452?.filter(c => !allWorkingValues.includes(c)).length || 0;
                const costainIssues = report.Costain?.filter(c => !allWorkingValues.includes(c)).length || 0;

                return (
                  <>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-semibold uppercase mb-2">A417 Status</p>
                      {a417AllWorking ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="font-medium">All Working</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <X className="w-5 h-5" />
                          <span className="font-medium">{a417Issues} Issues</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-semibold uppercase mb-2">A11/A47 Status</p>
                      {kierCoreAllWorking ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="font-medium">All Working</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <X className="w-5 h-5" />
                          <span className="font-medium">{kierCoreIssues} Issues</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-teal-50 rounded-lg p-4">
                      <p className="text-sm text-teal-600 font-semibold uppercase mb-2">M3 Jct 9 Status</p>
                      {m3Jct9AllWorking ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="font-medium">All Working</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <X className="w-5 h-5" />
                          <span className="font-medium">{m3Jct9Issues} Issues</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

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

export default CCTVCheckDetailPage;
