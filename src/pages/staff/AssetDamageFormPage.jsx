import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { sendAssetDamageNotification } from "../../services/emailService";
import { storage } from "../../config/firebase";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { compressImage } from "../../utils/imageCompression";
import { SCHEMES, isDemoUser } from "../../utils/schemes";

import chellanlogo from "../../assets/chellanpng.png"

const AssetDamageFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState([]);

  // Helper function to format date as DD/MM/YYYY
  const formatDateToBritish = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState({
    scheme: "",
    section: "",
    date: formatDateToBritish(new Date()), // Auto-fill current date in DD/MM/YYYY
    time: new Date().toTimeString().slice(0, 5), // Auto-fill current time
    firstName: userProfile?.displayName || "", // Auto-fill full name from user profile
    location: "",
    markerPost: "",
    track: "",
    assetType: "",
    damageType: "",
    incidentnum: "",
    nhLog: "",
    reportedBy: "",
    cameraNumber: "",
    description: "",
    actionTaken: "",
    notificationSent: [],
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
      // Pass null to get all reports, not just current user's
      const reports = await staffService.getAssetDamageReports(null);
      const report = reports.find(r => r.id === editId);

      if (report) {
        setFormData({
          scheme: report.scheme || "",
          section: report.section || "",
          date: report.date || "",
          time: report.time || "",
          // Combine firstName and lastName for backward compatibility
          firstName: report.firstName
            ? (report.lastName ? `${report.firstName} ${report.lastName}` : report.firstName)
            : "",
          location: report.location || "",
          markerPost: report.markerPost || "",
          track: report.track || "",
          assetType: report.assetType || "",
          damageType: report.damageType || "",
          incidentnum: report.incidentnum || "",
          nhLog: report.nhLog || "",
          reportedBy: report.reportedBy || "",
          cameraNumber: report.cameraNumber || "",
          description: report.description || "",
          actionTaken: report.actionTaken || "",
          notificationSent: report.notificationSent || [],
        });
      } else {
        toast.error('Form not found');
        navigate('/dashboard/staff');
      }
    } catch (error) {
      console.error('Failed to load form:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckbox = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [];

    setUploadingFiles(true);
    const uploadPromises = files.map(async (file) => {
      // Compress image before uploading (skips non-images automatically)
      const compressedFile = await compressImage(file);

      const fileName = `asset-damage/${userProfile.uid}/${Date.now()}_${
        file.name
      }`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);

      return {
        fileName: file.name,
        fileUrl: fileName,
        downloadUrl: downloadURL,
        fileSize: compressedFile.size,
        fileType: file.type,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    setUploadingFiles(false);
    return uploadedFiles;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.scheme || !formData.date || !formData.firstName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Upload files first
      const uploadedFiles = await uploadFiles();

      if (editId) {
        // Update existing form
        const updateData = { ...formData };

        // Only update files if new files were uploaded
        if (uploadedFiles.length > 0) {
          updateData.files = uploadedFiles;
        } else if (formData.files) {
          updateData.files = formData.files;
        }

        await staffService.updateAssetDamageReport(
          editId,
          updateData,
          userProfile.uid,
          userProfile.displayName
        );

        // Send email notifications for update
        if (formData.notificationSent && formData.notificationSent.length > 0) {
          const emailResult = await sendAssetDamageNotification(
            {
              ...formData,
              id: editId,
              submittedBy: userProfile.displayName
            },
            formData.notificationSent,
            true // isUpdate
          );
          if (emailResult.emailsSent > 0) {
            toast.success(`Report updated! ${emailResult.emailsSent} notification(s) sent.`);
          } else {
            toast.success("Asset Damage Report updated successfully!");
          }
        } else {
          toast.success("Asset Damage Report updated successfully!");
        }
        navigate("/dashboard/staff");
      } else {
        // Submit new form
        const result = await staffService.submitAssetDamageReport(
          {
            ...formData,
            files: uploadedFiles,
          },
          userProfile.uid,
          userProfile.displayName
        );

        // Send email notifications for new submission
        if (formData.notificationSent && formData.notificationSent.length > 0) {
          const emailResult = await sendAssetDamageNotification(
            {
              ...formData,
              id: result?.id,
              referenceId: result?.referenceId,
              submittedBy: userProfile.displayName
            },
            formData.notificationSent,
            false // isUpdate
          );
          if (emailResult.emailsSent > 0) {
            toast.success(`Report submitted! ${emailResult.emailsSent} notification(s) sent.`);
          } else {
            toast.success("Asset Damage Report submitted successfully!");
          }
        } else {
          toast.success("Asset Damage Report submitted successfully!");
        }

        // Reset form with fresh auto-filled values
        setFormData({
          scheme: "",
          section: "",
          date: formatDateToBritish(new Date()),
          time: new Date().toTimeString().slice(0, 5),
          firstName: userProfile?.displayName || "",
          location: "",
          markerPost: "",
          track: "",
          assetType: "",
          damageType: "",
          incidentnum: "",
          nhLog: "",
          reportedBy: "",
          cameraNumber: "",
          description: "",
          actionTaken: "",
          notificationSent: [],
        });
        setFiles([]);
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
            {editId ? 'Edit Asset Damage Report' : 'Asset Damage Report'}
          </h3>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-8 space-y-6"
        >
          {/* Scheme and Section */}
          <div className="flex justify-center items-center space-x-2 mb-8">
            <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-300 pt-8">
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
                {SCHEMES
                  .filter(scheme => isDemoUser(userProfile) ? scheme.isDemo : !scheme.isDemo)
                  .map(scheme => (
                    <option key={scheme.id} value={scheme.fullName}>
                      {scheme.fullName}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Section
                </span>
              </label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="e.g., M3, A33, A34, etc."
              />
            </div>
          </div>

          {/* Date, Time and Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Full Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="e.g., John Smith"
                required
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Location <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="location"
                placeholder="e.g., Junction 9, Layby 5"
                value={formData.location}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Marker Post <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="markerPost"
                placeholder="e.g., 2.3"
                value={formData.markerPost}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Track <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="track"
                value={formData.track}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="J">J</option>
                <option value="K">K</option>
                <option value="L">L</option>
                <option value="M">M</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Asset and Damage Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Asset Type <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="assetType"
                value={formData.assetType}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="Barrier/Fence">Barrier/Fence</option>
                <option value="Sign/Signage">Sign/Signage</option>
                <option value="Road Surface">Road Surface</option>
                <option value="Lighting">Lighting</option>
                <option value="Drainage">Drainage</option>
                <option value="Traffic Signal">Traffic Signal</option>
                <option value="CCTV Camera">CCTV Camera</option>
                <option value="Emergency Phone">Emergency Phone</option>
                <option value="Vegetation">Vegetation</option>
                <option value="Bridge/Structure">Bridge/Structure</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Damage Type <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="damageType"
                value={formData.damageType}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="Impact/Collision">Impact/Collision</option>
                <option value="Vandalism">Vandalism</option>
                <option value="Weather Damage">Weather Damage</option>
                <option value="Wear and Tear">Wear and Tear</option>
                <option value="Theft">Theft</option>
                <option value="Fire Damage">Fire Damage</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          
          {/* Incident Report # and NH Log */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Incident Report Number <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="incidentnum"
                value={formData.incidentnum}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="eg., IN01, INO2 ..."
                required
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  NH Log <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="nhLog"
                value={formData.nhLog}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>
          </div>

          {/* Reported By and Camera */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Reported By <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="reportedBy"
                value={formData.reportedBy}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="CCTV">CCTV</option>
                <option value="TSCO">TSCO</option>
                <option value="ROC">ROC</option>
                <option value="Site Worker">Site Worker</option>
                <option value="Public">Public</option>
                <option value="Police">Police</option>
                <option value="HETO">HETO</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Camera Number
                </span>
              </label>
              <input
                type="text"
                name="cameraNumber"
                placeholder="e.g., 23"
                value={formData.cameraNumber}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Description of Damage <span className="text-red-500">*</span>
              </span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              placeholder="Provide detailed description of the damage, including extent and any safety concerns..."
              required
            />
          </div>

          {/* Action Taken */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Immediate Action Taken
              </span>
            </label>
            <textarea
              name="actionTaken"
              value={formData.actionTaken}
              onChange={handleChange}
              rows={3}
              className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              placeholder="Describe any immediate actions taken to secure the area or mitigate risks..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">
                Photo/Video Evidence <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept="image/*,video/*,.pdf"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-teal-600 font-semibold mb-1">
                  Browse Files
                </p>
                <p className="text-gray-500 text-sm">
                  Upload photos or videos of the damage
                </p>
              </label>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notifications Sent */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Notify the Following
              </span>
            </label>
            <div className="flex flex-wrap gap-6">
              {[
                "Maintenance Team",
                "TM Manager",
                "Safety Officer",
                "N/A",
              ].map((recipient) => (
                <label
                  key={recipient}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.notificationSent.includes(recipient)}
                    onChange={() =>
                      handleCheckbox("notificationSent", recipient)
                    }
                    className="checkbox checkbox-sm checkbox-neutral"
                  />
                  <span className="text-sm">{recipient}</span>
                </label>
              ))}
            </div>
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
              disabled={loading || uploadingFiles}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading
                ? (editId ? "Updating..." : "Submitting...")
                : uploadingFiles
                ? "Uploading Files..."
                : (editId ? "Update" : "Submit")}
            </button>
          </div>
        </form>
      </div>
    </StaffSidebarLayout>
  );
};

export default AssetDamageFormPage;
