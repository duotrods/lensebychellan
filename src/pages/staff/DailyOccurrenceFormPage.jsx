import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { storage } from "../../config/firebase";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";

const DailyOccurrenceFormPage = () => {
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
    shiftStartTime: "",
    shiftEndTime: "",
    firstName: "",
    lastName: "",
    weatherConditions: "",
    trafficFlow: "Normal",
    occurrences: [
      {
        time: "",
        location: "",
        type: "",
        description: "",
        actionTaken: "",
      },
    ],
    cameraStatus: "All Working",
    cameraIssues: "",
    vehiclePatrolCompleted: "YES",
    vehiclePatrolNotes: "",
    incidentsLogged: "0",
    incidentReferences: "",
    handoverNotes: "",
    additionalNotes: "",
  });

  useEffect(() => {
    if (editId) {
      loadFormData();
    }
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      // Pass null to get all reports, not just current user's
      const reports = await staffService.getDailyOccurrenceReports(null);
      const report = reports.find(r => r.id === editId);

      if (report) {
        setFormData({
          scheme: report.scheme || "",
          section: report.section || "",
          date: report.date || "",
          shiftStartTime: report.shiftStartTime || "",
          shiftEndTime: report.shiftEndTime || "",
          firstName: report.firstName || "",
          lastName: report.lastName || "",
          weatherConditions: report.weatherConditions || "",
          trafficFlow: report.trafficFlow || "Normal",
          occurrences: report.occurrences || [
            {
              time: "",
              location: "",
              type: "",
              description: "",
              actionTaken: "",
            },
          ],
          cameraStatus: report.cameraStatus || "All Working",
          cameraIssues: report.cameraIssues || "",
          vehiclePatrolCompleted: report.vehiclePatrolCompleted || "YES",
          vehiclePatrolNotes: report.vehiclePatrolNotes || "",
          incidentsLogged: report.incidentsLogged || "0",
          incidentReferences: report.incidentReferences || "",
          handoverNotes: report.handoverNotes || "",
          additionalNotes: report.additionalNotes || "",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOccurrenceChange = (index, field, value) => {
    const updated = [...formData.occurrences];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, occurrences: updated }));
  };

  const addOccurrence = () => {
    setFormData((prev) => ({
      ...prev,
      occurrences: [
        ...prev.occurrences,
        {
          time: "",
          location: "",
          type: "",
          description: "",
          actionTaken: "",
        },
      ],
    }));
  };

  const removeOccurrence = (index) => {
    if (formData.occurrences.length > 1) {
      setFormData((prev) => ({
        ...prev,
        occurrences: prev.occurrences.filter((_, i) => i !== index),
      }));
    }
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
      const fileName = `daily-occurrence/${userProfile.uid}/${Date.now()}_${
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

        await staffService.updateDailyOccurrenceReport(
          editId,
          updateData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("Daily Occurrence Report updated successfully!");
      } else {
        // Submit new form
        await staffService.submitDailyOccurrenceReport(
          {
            ...formData,
            files: uploadedFiles,
          },
          userProfile.uid,
          userProfile.displayName
        );
        toast.success("Daily Occurrence Report submitted successfully!");
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
            {editId ? 'Edit Daily Occurrence Sheet' : 'Daily Occurrence Sheet'}
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

          {/* Date and Shift Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  Shift Start Time <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="time"
                name="shiftStartTime"
                value={formData.shiftStartTime}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Shift End Time <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="time"
                name="shiftEndTime"
                value={formData.shiftEndTime}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Weather and Traffic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Traffic Flow <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex gap-6 items-center h-12">
                {["Light", "Normal", "Heavy"].map((flow) => (
                  <label
                    key={flow}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="trafficFlow"
                      value={flow}
                      checked={formData.trafficFlow === flow}
                      onChange={handleChange}
                      className="radio radio-accent"
                    />
                    <span>{flow}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Occurrences Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="label">
                <span className="label-text font-semibold text-lg">
                  Daily Occurrences <span className="text-red-500">*</span>
                </span>
              </label>
              <button
                type="button"
                onClick={addOccurrence}
                className="btn btn-sm btn-outline gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Occurrence
              </button>
            </div>

            <div className="space-y-6">
              {formData.occurrences.map((occurrence, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50 relative"
                >
                  {formData.occurrences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOccurrence(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <h4 className="font-semibold text-gray-700 mb-4">
                    Occurrence #{index + 1}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Time <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="time"
                        value={occurrence.time}
                        onChange={(e) =>
                          handleOccurrenceChange(index, "time", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Location <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={occurrence.location}
                        onChange={(e) =>
                          handleOccurrenceChange(
                            index,
                            "location",
                            e.target.value
                          )
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        placeholder="e.g., J9, MP 2.5"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-semibold mb-2">
                          Type <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <select
                        value={occurrence.type}
                        onChange={(e) =>
                          handleOccurrenceChange(index, "type", e.target.value)
                        }
                        className="select select-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                        required
                      >
                        <option value="">Please Select</option>
                        <option value="Vehicle Breakdown">
                          Vehicle Breakdown
                        </option>
                        <option value="Debris on Road">Debris on Road</option>
                        <option value="Wildlife">Wildlife</option>
                        <option value="Traffic Management">
                          Traffic Management
                        </option>
                        <option value="Road Works">Road Works</option>
                        <option value="Suspicious Activity">
                          Suspicious Activity
                        </option>
                        <option value="Camera Fault">Camera Fault</option>
                        <option value="Weather Event">Weather Event</option>
                        <option value="Patrol Check">Patrol Check</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="label">
                      <span className="label-text font-semibold mb-2">
                        Description <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <textarea
                      value={occurrence.description}
                      onChange={(e) =>
                        handleOccurrenceChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="textarea textarea-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      placeholder="Describe what was observed..."
                      required
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-semibold mb-2">
                        Action Taken
                      </span>
                    </label>
                    <textarea
                      value={occurrence.actionTaken}
                      onChange={(e) =>
                        handleOccurrenceChange(
                          index,
                          "actionTaken",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="textarea textarea-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      placeholder="Describe any actions taken..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Camera Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Camera Status <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex gap-6 items-center h-12">
                {["All Working", "Some Issues", "Major Issues"].map(
                  (status) => (
                    <label
                      key={status}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="cameraStatus"
                        value={status}
                        checked={formData.cameraStatus === status}
                        onChange={handleChange}
                        className="radio radio-accent"
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Camera Issues (if any)
                </span>
              </label>
              <input
                type="text"
                name="cameraIssues"
                value={formData.cameraIssues}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="List camera numbers with issues"
              />
            </div>
          </div>

          {/* Vehicle Patrol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Vehicle Patrol Completed? <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex gap-6 items-center h-12">
                {["YES", "NO", "N/A"].map((option) => (
                  <label
                    key={option}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="vehiclePatrolCompleted"
                      value={option}
                      checked={formData.vehiclePatrolCompleted === option}
                      onChange={handleChange}
                      className="radio radio-accent"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Vehicle Patrol Notes
                </span>
              </label>
              <input
                type="text"
                name="vehiclePatrolNotes"
                value={formData.vehiclePatrolNotes}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="Any observations during patrol"
              />
            </div>
          </div>

          {/* Incidents Logged */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Number of Incidents Logged <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="number"
                name="incidentsLogged"
                value={formData.incidentsLogged}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                min="0"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Incident Reference Numbers
                </span>
              </label>
              <input
                type="text"
                name="incidentReferences"
                value={formData.incidentReferences}
                onChange={handleChange}
                className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                placeholder="e.g., IN01, IN02, IN03"
              />
            </div>
          </div>

          {/* Handover Notes */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Handover Notes <span className="text-red-500">*</span>
              </span>
            </label>
            <textarea
              name="handoverNotes"
              value={formData.handoverNotes}
              onChange={handleChange}
              rows={3}
              className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              placeholder="Important information for the next shift..."
              required
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Additional Notes
              </span>
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={3}
              className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              placeholder="Any other observations or notes..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">
                Attachments (Optional)
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
                  Upload supporting documents or images
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

export default DailyOccurrenceFormPage;
