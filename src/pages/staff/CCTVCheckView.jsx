import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getStaffBasePath } from "../../utils/constants";
import { staffService } from "../../services/staffService";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { generateReportPDF } from "../../utils/pdfGenerator";

const CCTVCheckView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, role } = useAuth();
  const basePath = getStaffBasePath(role);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      setLoading(true);
      // Pass null to get all forms, not just current user's
      const forms = await staffService.getCCTVCheckForms(null);
      const foundForm = forms.find((f) => f.id === id);

      if (foundForm) {
        setForm(foundForm);
      } else {
        toast.error("Form not found");
        navigate(basePath);
      }
    } catch (error) {
      console.error("Failed to load form:", error);
      toast.error("Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`${basePath}/forms/cctv-check?edit=${id}`);
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete this CCTV Check Form? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await staffService.deleteCCTVCheckForm(
        id,
        userProfile.uid,
        userProfile.displayName,
      );
      toast.success("CCTV Check Form deleted successfully");
      navigate(basePath);
    } catch (error) {
      console.error("Failed to delete form:", error);
      toast.error("Failed to delete form");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await generateReportPDF(form, "cctv-check", null);
      toast.success("Downloaded CCTV check report as PDF");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderCameraSection = (
    title,
    cameras,
    comments,
    blackspotCameras,
    tssInformed,
  ) => {
    // Debug: Log what we're receiving
    console.log(`${title}:`, {
      cameras,
      comments,
      blackspotCameras,
      tssInformed,
    });

    // Show section if there are cameras OR if there are comments (non-empty)
    const hasComments = comments && comments.trim() !== "";
    if ((!cameras || cameras.length === 0) && !hasComments) return null;

    const isNone = cameras && cameras.includes("NONE");
    const isAllWorking =
      cameras && cameras.length === 1 && cameras[0] === "All Working Correctly";
    const hasIssues = cameras && cameras.length > 0 && !isNone && !isAllWorking;

    return (
      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
          {title}
        </h4>
        <h6 className="text-sm font-bold text-gray-700 mb-2">Cctv Cameras:</h6>
        <div className="mb-3">
          {isNone ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">NONE</span>
            </div>
          ) : isAllWorking ? (
            <div className="flex items-center gap-2 mt-4 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="font-semibold">All Working Correctly</span>
            </div>
          ) : hasIssues ? (
            <div>
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">Issues Reported:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cameras.map((camera, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {camera}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No cameras selected</p>
          )}
        </div>
        <div className="flex flex-wrap gap-6 mt-2">
          {/* Blackspot Cameras */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">
              Blackspot Cameras:
            </span>
            {(blackspotCameras === true || (Array.isArray(blackspotCameras) && blackspotCameras.length > 0 && blackspotCameras[0] !== "All Working Correctly")) ? (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-semibold">
                Yes
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm font-semibold">
                No
              </span>
            )}
          </div>
          {/* TSS Informed */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">
              TSS Informed:
            </span>
            {tssInformed ? (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
                Yes
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold">
                No
              </span>
            )}
          </div>
        </div>

        {comments && comments.trim() !== "" && (
          <div className="mt-3">
            <label className="text-sm font-semibold text-gray-600">
              Comments:
            </label>
            <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1 whitespace-pre-wrap">
              {comments}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <StaffSidebarLayout basePath={basePath}>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      </StaffSidebarLayout>
    );
  }

  if (!form) {
    return (
      <StaffSidebarLayout basePath={basePath}>
        <div className="text-center py-12">
          <p className="text-gray-500">Form not found</p>
        </div>
      </StaffSidebarLayout>
    );
  }

  return (
    <StaffSidebarLayout basePath={basePath}>
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
                CCTV Check Form Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Reference: {form.referenceId || form.id.slice(0, 12)}
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

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Submitted By
                </label>
                <p className="text-gray-800">
                  {form.submittedBy?.name ||
                    `${form.firstName || ""} ${form.lastName || ""}`.trim() ||
                    "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Date
                </label>
                <p className="text-gray-800">{form.date || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Time
                </label>
                <p className="text-gray-800">{form.time || "N/A"}</p>
              </div>
              {form.lastEditedBy && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Last Edited By
                  </label>
                  <p className="text-blue-600">
                    {form.lastEditedBy?.name || "Unknown"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Camera Sections */}
          <div className="space-y-6">
            {renderCameraSection(
              "A417",
              form.a417Cameras,
              form.a417Comments,
              form.a417Blackspot,
              form.a417TssInformed,
            )}
            {renderCameraSection(
              "A11/A47 Kier/Core",
              form.kierCore,
              form.kierCoreComments,
              form.kierCoreBlackspot,
              form.kierCoreTssInformed,
            )}
            {renderCameraSection(
              "M3 Jct 9",
              form.m3Jct9,
              form.m3Jct9Comments,
              form.m3Jct9Blackspot,
              form.m3TssInformed,
            )}
            {renderCameraSection(
              "A452 HS2",
              form.A452,
              form.A452Comments,
              form.A452Blackspot,
              form.A452TssInformed,
            )}
            {renderCameraSection(
              "Gallows Corner - Costain",
              form.Costain,
              form.CostainComments,
              form.CostainBlackspot,
              form.CostainTssInformed,
            )}
            {renderCameraSection(
              "Simister Island - Costain",
              form.csi,
              form.csiComments,
              form.csiBlackspot,
              form.csiTssInformed,
            )}
          </div>

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <label className="font-semibold">Created:</label>{" "}
                {formatDateTime(form.createdAt)}
              </div>
              {form.updatedAt && (
                <div>
                  <label className="font-semibold">Last Updated:</label>{" "}
                  {formatDateTime(form.updatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVCheckView;
