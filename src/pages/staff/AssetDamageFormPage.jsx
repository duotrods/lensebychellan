import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { storage } from "../../config/firebase";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";

const AssetDamageFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState([]);

  const [formData, setFormData] = useState({
    scheme: "",
    section: "",
    date: "",
    time: "",
    firstName: "",
    lastName: "",
    location: "",
    markerPost: "",
    track: "",
    assetType: "",
    damageType: "",
    severity: "Low",
    weatherConditions: "",
    reportedBy: "",
    cameraNumber: "",
    estimatedCost: "",
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
          firstName: report.firstName || "",
          lastName: report.lastName || "",
          location: report.location || "",
          markerPost: report.markerPost || "",
          track: report.track || "",
          assetType: report.assetType || "",
          damageType: report.damageType || "",
          severity: report.severity || "Low",
          weatherConditions: report.weatherConditions || "",
          reportedBy: report.reportedBy || "",
          cameraNumber: report.cameraNumber || "",
          estimatedCost: report.estimatedCost || "",
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
      const fileName = `asset-damage/${userProfile.uid}/${Date.now()}_${
        file.name
      }`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      return {
        fileName: file.name,
        fileUrl: fileName,
        downloadUrl: downloadURL,
        fileSize: file.size,
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
        toast.success("Asset Damage Report updated successfully!");
      } else {
        // Submit new form
        await staffService.submitAssetDamageReport(
          {
            ...formData,
            files: uploadedFiles,
          },
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("Asset Damage Report submitted successfully!");
      }

      navigate("/dashboard/staff");
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
                <option value="A417 Missing Link - Kier">
                  A417 Missing Link - Kier
                </option>
                <option value="Gallows Corner - Costain">
                  Gallows Corner - Costain
                </option>
                <option value="A1 Birtley to Coalhouse - Costain">
                  A1 Birtley to Coalhouse - Costain
                </option>
                <option value="M3 Jct 9 - Balfour Beatty">
                  M3 Jct 9 - Balfour Beatty
                </option>
                <option value="HS2- Traffix">HS2- Traffix</option>
                <option value="A47 Thickthorn - Core">
                  A47 Thickthorn - Core
                </option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Section <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="M3">M3</option>
                <option value="A33">A33</option>
                <option value="A34">A34</option>
                <option value="A1">A1</option>
                <option value="A417">A417</option>
                <option value="A11">A11</option>
                <option value="A47">A47</option>
              </select>
            </div>
          </div>

          {/* Date, Time and Name */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Date <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
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
                  First Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Last Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
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

          {/* Severity and Weather */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Severity <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex gap-6">
                {["Low", "Medium", "High", "Critical"].map((level) => (
                  <label
                    key={level}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={level}
                      checked={formData.severity === level}
                      onChange={handleChange}
                      className="radio radio-accent"
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Weather Conditions <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                name="weatherConditions"
                value={formData.weatherConditions}
                onChange={handleChange}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="Dry">Dry</option>
                <option value="Wet">Wet</option>
                <option value="Raining">Raining</option>
                <option value="Fog">Fog</option>
                <option value="Snow">Snow</option>
                <option value="Sunny">Sunny</option>
              </select>
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

          {/* Estimated Cost */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Estimated Repair Cost (£)
              </span>
            </label>
            <input
              type="number"
              name="estimatedCost"
              placeholder="e.g., 500"
              value={formData.estimatedCost}
              onChange={handleChange}
              className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              min="0"
              step="0.01"
            />
          </div>

          {/* Notifications Sent */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Notifications Sent To
              </span>
            </label>
            <div className="flex flex-wrap gap-6">
              {[
                "Maintenance Team",
                "Project Manager",
                "Safety Officer",
                "Client",
                "Police",
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

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
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
