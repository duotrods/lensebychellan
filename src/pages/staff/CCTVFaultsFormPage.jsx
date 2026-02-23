import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { SCHEMES, isDemoUser } from "../../utils/schemes";

import chellanlogo from "../../assets/chellanpng.png";

const CCTVFaultsFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);

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
    comments: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          comments: report.comments || "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.scheme || !formData.camera || !formData.fullName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await staffService.updateCCTVFaultsReport(
          editId,
          formData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("CCTV Fault report updated successfully!");
        navigate("/dashboard/staff");
      } else {
        await staffService.submitCCTVFaultsReport(
          formData,
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
          comments: "",
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
        {/* Header */}
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-8 space-y-6"
        >
          {/* Logo */}
          <div className="flex justify-center items-center space-x-2 mb-8">
            <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
          </div>

          {/* Row 1: Full Name, Date, Time */}
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

          {/* Row 2: Scheme and Camera */}
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
              <input
                type="text"
                name="camera"
                value={formData.camera}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="e.g., CCTV 12"
                required
              />
            </div>
          </div>

          {/* Row 3: Comments */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">Comments</span>
            </label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows={5}
              className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              placeholder="Describe the fault in detail..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-300">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
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
