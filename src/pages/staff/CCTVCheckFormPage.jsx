import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { getViewerSchemeScope } from "../../utils/schemes";
import { getStaffBasePath } from "../../utils/constants";

import chellanlogo from "../../assets/chellanpng.png";

const CERTIFICATION_TEXT =
  "I certify that a full CCTV check of all schemes has been completed.";

const CCTVCheckFormPage = () => {
  const navigate = useNavigate();
  const { userProfile, role } = useAuth();
  const basePath = getStaffBasePath(role);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);

  // Helper function to format date as DD/MM/YYYY
  const formatDateToBritish = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState({
    firstName: userProfile?.displayName || "", // Auto-fill full name
    date: formatDateToBritish(new Date()), // Auto-fill current date in DD/MM/YYYY
    time: new Date().toTimeString().slice(0, 5), // Auto-fill current time
    certified: false,
  });

  useEffect(() => {
    if (editId) {
      loadFormData();
    }
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      // Pass null to get all forms, not just current user's
      const forms = await staffService.getCCTVCheckForms(null);
      const form = forms.find((f) => f.id === editId);

      if (form) {
        setFormData({
          firstName: form.firstName
            ? form.lastName
              ? `${form.firstName} ${form.lastName}`
              : form.firstName
            : "",
          date: form.date || "",
          time: form.time || "",
          certified: form.certified || false,
        });
      } else {
        toast.error("Form not found");
        navigate(basePath);
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

    if (!formData.firstName || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.certified) {
      toast.error("You must certify that a full CCTV check has been completed.");
      return;
    }

    setLoading(true);

    try {
      // Tag the certification with the submitter's scheme scope so it shows to
      // the right clients (internal → internal schemes, third-party → company
      // schemes, demo → demo) and never leaks across that boundary.
      const trimmedData = {
        ...formData,
        firstName: formData.firstName.trim(),
        certified: true,
        certificationText: CERTIFICATION_TEXT,
        schemeIds: getViewerSchemeScope(userProfile),
      };

      if (editId) {
        await staffService.updateCCTVCheckForm(
          editId,
          trimmedData,
          userProfile.uid,
          userProfile.displayName,
        );
        toast.success("CCTV Check Form updated successfully!");
        navigate(basePath);
      } else {
        await staffService.submitCCTVCheckForm(
          trimmedData,
          userProfile.uid,
          userProfile.displayName,
        );
        toast.success("CCTV Check Form submitted successfully!");

        // Reset form with fresh auto-filled values
        setFormData({
          firstName: userProfile?.displayName || "",
          date: formatDateToBritish(new Date()),
          time: new Date().toTimeString().slice(0, 5),
          certified: false,
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
    <StaffSidebarLayout basePath={basePath}>
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
            {editId ? "Edit CCTV Check Form" : "CCTV Check Form"}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8">
          <div className="flex justify-center items-center space-x-2 mb-8">
            <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
          </div>

          {/* Name, Date, and Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Full Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="input input-accent w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
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
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                placeholder="DD/MM/YYYY"
                pattern="\d{2}/\d{2}/\d{4}"
                className="input input-accent bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
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
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="input input-accent bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>
          </div>

          <div className="divider before:h-px after:h-px before:bg-gray-500 after:bg-gray-500 text-gray-500"></div>

          {/* Certification */}
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.certified}
                onChange={(e) =>
                  setFormData({ ...formData, certified: e.target.checked })
                }
                className="checkbox checkbox-neutral mt-0.5"
                required
              />
              <span className="text-sm font-semibold text-gray-700">
                {CERTIFICATION_TEXT} <span className="text-red-500">*</span>
              </span>
            </label>
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

export default CCTVCheckFormPage;
