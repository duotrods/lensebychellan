import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { SCHEMES, isDemoUser, extractSchemeId } from "../../utils/schemes";

import chellanlogo from "../../assets/chellanpng.png";

const CCTVFaultsFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reportMeta, setReportMeta] = useState(null);

  const CAMERA_OPTIONS_BY_SCHEME = {
    A417: [
      "CCTV 1","CCTV 2","CCTV 3","CCTV 4","CCTV 5","CCTV 6","CCTV 7",
      "CCTV 8","CCTV 9","CCTV 10","CCTV 11","CCTV 12","CCTV 13","CCTV 14",
      "CCTV 21","CCTV 22","CCTV 23","CCTV 24","CCTV 25","CCTV 26","CCTV 27",
      "CCTV 28","CCTV 29","CCTV 30","CCTV 31","CCTV 32","CCTV 33","CCTV 34","CCTV 35",
    ],
    A47: [
      "1100","1101","1102","1103","1104","1105","1106","1107","1108","1109",
      "1110","1111","1112","1114",
      "4701","4702","4703","4704","4705","4706","4707","4708","4709",
      "4711","4712","4713","4714","4715","4716","4717","4718","4719",
    ],
    M3: [
      "CCTV 1","CCTV 2","CCTV 3","CCTV 4","CCTV 5","CCTV 6","CCTV 7","CCTV 8",
      "CCTV 9","CCTV 10","CCTV 11","CCTV 12","CCTV 13","CCTV 14","CCTV 15",
      "CCTV 16","CCTV 17","CCTV 18","CCTV 19","CCTV 20","CCTV 21","CCTV 22",
      "CCTV 23","CCTV 24","CCTV 25","CCTV 26","CCTV 27","CCTV 28","CCTV 29","CCTV 30",
      "3301","3302","3303","3304","3305","3306",
      "3401","3402","3403","3404","3407","3408","3409","3410",
    ],
    A452: ["CAM 15","CAM 16","CAM 17","CAM 18","CAM 19","CAM 20","CAM 21"],
    DMO1: [
      "DEMO-CAM-1","DEMO-CAM-2","DEMO-CAM-3","DEMO-CAM-4",
      "DEMO-CAM-5","DEMO-CAM-6","DEMO-CAM-7","DEMO-CAM-8",
    ],
  };

  const formatDateToBritish = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState({
    fullName: userProfile?.displayName || "",
    date: formatDateToBritish(new Date()),
    time: new Date().toTimeString().slice(0, 5),
    scheme: "",
    camera: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "scheme") {
      setFormData((prev) => ({ ...prev, scheme: value, camera: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    if (editId) {
      loadFormData();
    }
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const reports = await staffService.getCCTVFaultsReports();
      const report = reports.find((r) => r.id === editId);
      if (report) {
        setFormData({
          fullName: report.fullName || "",
          date: report.date || "",
          time: report.time || "",
          scheme: report.scheme || "",
          camera: report.camera || "",
        });
        setReportMeta({
          status: report.status || "live",
          clientAcknowledged: report.clientAcknowledged || false,
          clientNote: report.clientNote || "",
          clientNotes: report.clientNotes || [],
          completedBy: report.completedBy || null,
        });
      } else {
        toast.error("Form not found");
        navigate("/dashboard/staff");
      }
    } catch (error) {
      console.error("Failed to load form:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!editId) return;
    setCompleting(true);
    try {
      await staffService.completeCCTVFault(editId, userProfile.uid, userProfile.displayName);
      toast.success("Fault marked as completed!");
      setReportMeta((prev) => ({
        ...prev,
        status: "completed",
        completedBy: { name: userProfile.displayName },
      }));
    } catch (error) {
      console.error("Failed to complete fault:", error);
      toast.error("Failed to mark as completed. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.scheme || !formData.camera || !formData.fullName) {
      toast.error("Please fill in all required fields");
      return;
    }

    const trimmedData = {
      ...formData,
      fullName: formData.fullName.trim(),
    };

    setLoading(true);
    try {
      if (editId) {
        await staffService.updateCCTVFaultsReport(
          editId,
          trimmedData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("CCTV Fault report updated successfully!");
        navigate("/dashboard/staff");
      } else {
        await staffService.submitCCTVFaultsReport(
          trimmedData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("CCTV Fault report submitted successfully!");
        setFormData({
          fullName: userProfile?.displayName || "",
          date: formatDateToBritish(new Date()),
          time: new Date().toTimeString().slice(0, 5),
          scheme: "",
          camera: "",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffSidebarLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h3 className="text-2xl font-bold text-gray-800">
            {editId ? "Edit CCTV Fault Report" : "CCTV Fault Report"}
          </h3>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-8 space-y-6"
        >
          <div className="flex justify-center items-center space-x-2 mb-8">
            <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
          </div>

          {editId && reportMeta && (
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">Status:</span>
                {reportMeta.status === "completed" ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                    {reportMeta.completedBy?.name && (
                      <span className="font-normal text-green-600 ml-1">by {reportMeta.completedBy.name}</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                    Live
                  </span>
                )}
              </div>
              {reportMeta.clientAcknowledged && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-600">Client acknowledged</span>
                  </div>
                  {(() => {
                    const notesList = reportMeta.clientNotes?.length
                      ? reportMeta.clientNotes
                      : reportMeta.clientNote
                      ? [{ text: reportMeta.clientNote, addedAt: null }]
                      : [];
                    return notesList.length > 0 ? (
                      <div className="pl-6 space-y-0.5">
                        {notesList.map((note, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-500">— {note.text}</span>
                            {note.addedAt && (
                              <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                                {new Date(note.addedAt).toLocaleDateString('en-GB')} {new Date(note.addedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-300 pt-8">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Full Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="e.g., John Smith"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Date (DD/MM/YYYY) <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="date"
                value={formData.date}
                onChange={handleChange}
                placeholder="DD/MM/YYYY"
                pattern="\d{2}/\d{2}/\d{4}"
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Time <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Scheme <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="scheme"
                value={formData.scheme}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                {SCHEMES.filter((scheme) =>
                  isDemoUser(userProfile) ? scheme.isDemo : !scheme.isDemo
                ).map((scheme) => (
                  <option key={scheme.id} value={scheme.fullName}>
                    {scheme.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Camera <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="camera"
                value={formData.camera}
                onChange={handleChange}
                disabled={!formData.scheme}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">
                  {formData.scheme ? "Please Select" : "Select a scheme first"}
                </option>
                {(CAMERA_OPTIONS_BY_SCHEME[extractSchemeId(formData.scheme)] ?? []).map((cam) => (
                  <option key={cam} value={cam}>{cam}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-4 mt-8 pt-6 border-t border-gray-300">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            {editId && reportMeta?.status === "live" && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {completing ? "Marking Complete..." : "Mark as Complete"}
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading
                ? editId
                  ? "Updating..."
                  : "Submitting..."
                : editId
                ? "Update"
                : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVFaultsFormPage;
