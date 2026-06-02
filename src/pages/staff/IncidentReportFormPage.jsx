import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Upload, X, ChevronRight } from "lucide-react";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { useAuth } from "../../hooks/useAuth";
import { getStaffBasePath } from "../../utils/constants";
import { staffService } from "../../services/staffService";
import { sendIncidentAlertNotification } from "../../services/emailService";

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import StepIndicator from "../../components/staff/incident/StepIndicator";
import { compressImage } from "../../utils/imageCompression";
import { getSchemesForUser } from "../../utils/schemes";
import {
  formatDateToBritish,
  calculateTimeDifferences,
} from "../../utils/incidentForm";

import chellanlogo from "../../assets/chellanpng.png";

const IncidentReportFormPage = () => {
  const navigate = useNavigate();
  const { userProfile, role } = useAuth();
  const basePath = getStaffBasePath(role);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState([]);

  // Step management: 1 = initial report, 2 = complete report
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditingLiveIncident, setIsEditingLiveIncident] = useState(false);
  const [liveIncidentId, setLiveIncidentId] = useState(null);
  const [existingReferenceId, setExistingReferenceId] = useState(null);

  const [formData, setFormData] = useState({
    scheme: "",
    section: "",
    date: formatDateToBritish(new Date()),
    firstName: userProfile?.displayName || "",
    time: new Date().toTimeString().slice(0, 5),
    weatherConditions: "",
    nhLog: "",
    collarNumber: "",
    incursion: "NO",
    reportedBy: "",
    cameraNumber: "",
    trafficConditions: "",
    markerPost: "",
    track: "",
    incidentType: "",
    affectedLanes: [],
    emergencyServices: [],
    recoveryRequested: { light: 0, heavy: 0, ipv: 0, hetos: 0 },
    timeSpotted: "",
    timeOnSite: "",
    timeCleared: "",
    closedLogCollar: "",
    fault: "",
    propertyDamage: false,
    assetType: "",
    damageType: "",
    vehicles: [{ type: "", make: "", model: "", vin: "" }],
    description: "",
  });

  useEffect(() => {
    if (editId) {
      loadFormData();
    }
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const reports = await staffService.getIncidentReports(null);
      const report = reports.find((r) => r.id === editId);

      if (report) {
        setExistingReferenceId(report.referenceId || null);
        setFormData({
          scheme: report.scheme || "",
          section: report.section || "",
          date: report.date || "",
          firstName: report.firstName || "",
          time: report.time || report.lastName || "",
          weatherConditions: report.weatherConditions || "",
          nhLog: report.nhLog || "",
          collarNumber: report.collarNumber || "",
          incursion: report.incursion || "NO",
          reportedBy: report.reportedBy || "",
          cameraNumber: report.cameraNumber || "",
          trafficConditions: report.trafficConditions || "",
          markerPost: report.markerPost || "",
          track: report.track || "",
          incidentType: report.incidentType || "",
          affectedLanes: report.affectedLanes || [],
          emergencyServices: report.emergencyServices || [],
          recoveryRequested: report.recoveryRequested || {
            light: 0,
            heavy: 0,
            ipv: 0,
            hetos: 0,
          },
          timeSpotted: report.timeSpotted || "",
          timeOnSite: report.timeOnSite || "",
          timeCleared: report.timeCleared || "",
          closedLogCollar: report.closedLogCollar || "",
          fault: report.fault || "",
          propertyDamage: report.propertyDamage || false,
          assetType: report.assetType || "",
          damageType: report.damageType || "",
          vehicles: report.vehicles || [
            { type: "", make: "", model: "", vin: "" },
          ],
          description: report.description || "",
          files: report.files || [],
        });

        // If editing a live incident, go directly to Step 2
        if (report.status === "live") {
          setCurrentStep(2);
          setIsEditingLiveIncident(true);
        }
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleRecoveryChange = (type, count) => {
    setFormData((prev) => ({
      ...prev,
      recoveryRequested: {
        ...prev.recoveryRequested,
        [type]: parseInt(count) || 0,
      },
    }));
  };

  const handleVehicleChange = (index, field, value) => {
    const updated = [...formData.vehicles];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, vehicles: updated }));
  };

  const addVehicle = () => {
    setFormData((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, { type: "", make: "", model: "", vin: "" }],
    }));
  };

  const removeVehicle = (index) => {
    setFormData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index),
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    const allowedTypes = ["image/", "video/", "application/pdf"];
    const validFiles = droppedFiles.filter((file) =>
      allowedTypes.some((type) => file.type.startsWith(type)),
    );

    if (validFiles.length !== droppedFiles.length) {
      toast.error(
        "Some files were rejected. Only images, videos, and PDFs are allowed.",
      );
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      files: (prev.files || []).filter((_, i) => i !== index),
    }));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [];

    setUploadingFiles(true);
    const uploadPromises = files.map(async (file) => {
      const compressedFile = await compressImage(file);
      const key = `incident-reports/${userProfile.uid}/${Date.now()}_${file.name}`;
      const arrayBuffer = await compressedFile.arrayBuffer();

      await r2Client.send(
        new PutObjectCommand({
          Bucket: import.meta.env.VITE_R2_BUCKET,
          Key: key,
          Body: new Uint8Array(arrayBuffer),
          ContentType: file.type,
        }),
      );

      const downloadUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`;

      return {
        fileName: file.name,
        fileUrl: key,
        downloadUrl,
        fileSize: compressedFile.size,
        fileType: file.type,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    setUploadingFiles(false);
    return uploadedFiles;
  };

  // Step 1: Submit as Live Incident
  const handleStep1Submit = async (e) => {
    e.preventDefault();

    if (
      !formData.scheme ||
      !formData.markerPost ||
      !formData.date ||
      !formData.firstName ||
      !formData.timeSpotted
    ) {
      toast.error("Please fill in all required fields for Step 1");
      return;
    }

    setLoading(true);

    try {
      const uploadedFiles = await uploadFiles();

      const step1Data = {
        scheme: formData.scheme,
        section: formData.section,
        markerPost: formData.markerPost.trim(),
        date: formData.date,
        firstName: formData.firstName.trim(),
        timeSpotted: formData.timeSpotted,
        files: uploadedFiles,
        // Initialize empty fields for Step 2
        time: formData.time,
        weatherConditions: "",
        nhLog: "",
        collarNumber: "",
        incursion: "NO",
        reportedBy: "",
        cameraNumber: "",
        trafficConditions: "",
        track: "",
        incidentType: "",
        affectedLanes: [],
        emergencyServices: [],
        recoveryRequested: { light: 0, heavy: 0, ipv: 0, hetos: 0 },
        timeOnSite: "",
        timeCleared: "",
        closedLogCollar: "",
        fault: "",
        propertyDamage: false,
        assetType: "",
        damageType: "",
        vehicles: [{ type: "", make: "", model: "", vin: "" }],
        description: "",
      };

      // Submit as live incident
      const { id: newIncidentId, referenceId: newRefId } =
        await staffService.submitIncidentReport(
          step1Data,
          userProfile.uid,
          userProfile.displayName,
          "live", // Status = live
        );

      toast.success("Live Incident created! Please complete the full report.");

      // Store the new incident ID and continue to Step 2
      setLiveIncidentId(newIncidentId);
      setExistingReferenceId(newRefId);
      setIsEditingLiveIncident(true);
      setCurrentStep(2);
    } catch (error) {
      console.error("Error submitting Step 1:", error);
      toast.error("Failed to create live incident. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save progress on Step 2 without completing — keeps status as "live"
  // Operator can return to the form later and find all fields already filled
  const handleSave = async () => {
    const incidentId = editId || liveIncidentId;
    if (!incidentId) return;

    setLoading(true);
    try {
      const uploadedFiles = await uploadFiles();
      const updateData = { ...formData };

      if (uploadedFiles.length > 0) {
        updateData.files = [...(formData.files || []), ...uploadedFiles];
      } else if (formData.files) {
        updateData.files = formData.files;
      }

      // Explicitly keep status as live — do NOT complete it
      updateData.status = "live";

      await staffService.updateIncidentReport(
        incidentId,
        updateData,
        userProfile.uid,
        userProfile.displayName,
      );

      toast.success("Progress saved! Incident is still live.");
      navigate(basePath);
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Failed to save progress. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete the report (or regular submit for non-live workflow)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.scheme || !formData.date || !formData.firstName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const uploadedFiles = await uploadFiles();
      const trimmedData = {
        ...formData,
        firstName: formData.firstName.trim(),
        markerPost: formData.markerPost.trim(),
        nhLog: formData.nhLog.trim(),
        collarNumber: formData.collarNumber.trim(),
        cameraNumber: formData.cameraNumber.trim(),
        description: formData.description.trim(),
      };
      const dataWithTimings = calculateTimeDifferences(trimmedData);

      // Use editId from URL or liveIncidentId from state
      const incidentId = editId || liveIncidentId;

      if (incidentId) {
        // Update existing form
        const updateData = { ...dataWithTimings };

        if (uploadedFiles.length > 0) {
          updateData.files = [...(formData.files || []), ...uploadedFiles];
        } else if (formData.files) {
          updateData.files = formData.files;
        }

        // If completing a live incident, set status to completed
        if (isEditingLiveIncident) {
          updateData.status = "completed";
        }

        await staffService.updateIncidentReport(
          incidentId,
          updateData,
          userProfile.uid,
          userProfile.displayName,
          isEditingLiveIncident,
        );

        if (isEditingLiveIncident) {
          await sendIncidentAlertNotification(
            {
              ...updateData,
              id: incidentId,
              referenceId: existingReferenceId,
              submittedBy: userProfile.displayName,
            },
            false,
          );
          toast.success("Incident Report completed successfully!");
        } else {
          toast.success("Incident Report updated successfully!");
        }
        navigate(basePath);
      } else {
        // Submit new form (regular flow - not using 2-step)
        const { id: newIncidentId, referenceId: newReferenceId } =
          await staffService.submitIncidentReport(
            {
              ...dataWithTimings,
              files: uploadedFiles,
            },
            userProfile.uid,
            userProfile.displayName,
            "submitted",
          );
        // Send alert if incursion or asset damage
        await sendIncidentAlertNotification(
          {
            ...dataWithTimings,
            id: newIncidentId,
            referenceId: newReferenceId,
            submittedBy: userProfile.displayName,
          },
          false,
        );

        toast.success("Incident Report submitted successfully!");

        // Reset form
        setFormData({
          scheme: "",
          section: "",
          date: formatDateToBritish(new Date()),
          firstName: userProfile?.displayName || "",
          time: new Date().toTimeString().slice(0, 5),
          weatherConditions: "",
          nhLog: "",
          collarNumber: "",
          incursion: "NO",
          reportedBy: "",
          cameraNumber: "",
          trafficConditions: "",
          markerPost: "",
          track: "",
          incidentType: "",
          affectedLanes: [],
          emergencyServices: [],
          recoveryRequested: { light: 0, heavy: 0, ipv: 0, hetos: 0 },
          timeSpotted: "",
          timeOnSite: "",
          timeCleared: "",
          closedLogCollar: "",
          fault: "",
          propertyDamage: false,
          assetType: "",
          damageType: "",
          vehicles: [{ type: "", make: "", model: "", vin: "" }],
          description: "",
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

  // Step Indicator Component
  // Render Step 1 Form
  const renderStep1 = () => (
    <form
      onSubmit={handleStep1Submit}
      className="bg-white rounded-xl shadow-md p-8 space-y-6"
    >
      <div className="flex justify-center items-center space-x-2 mb-8">
        <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
      </div>

      <StepIndicator currentStep={currentStep} />

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 font-medium">Step 1: Create Live Incident</p>
        <p className="text-red-600 text-sm mt-1">
          Fill in the essential details to log a live incident. You can complete
          the full report later.
        </p>
      </div>

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
            {getSchemesForUser(userProfile).map((scheme) => (
              <option key={scheme.id} value={scheme.fullName}>
                {scheme.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">Section</span>
          </label>
          <input
            type="text"
            name="section"
            value={formData.section}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            placeholder="Enter section (e.g., M3, A33, A417)"
          />
        </div>
      </div>

      {/* Marker Post */}
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
          maxLength={50}
          required
        />
      </div>

      {/* Date, Name, Time Spotted */}
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
              Name <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            maxLength={100}
            required
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Time Spotted <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="time"
            name="timeSpotted"
            value={formData.timeSpotted}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            required
          />
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="label">
          <span className="label-text font-semibold">Upload Image</span>
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept="image/*,video/*"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-teal-600 font-semibold mb-1">Browse Files</p>
            <p className="text-gray-500 text-sm">Drag and drop files here</p>
          </label>

          {formData.files?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Saved files</p>
              {formData.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-blue-50 p-2 rounded"
                >
                  <span className="text-sm text-gray-700 truncate">{file.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeExistingFile(index)}
                    className="text-red-500 hover:text-red-700 shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.files?.length > 0 && <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">New files</p>}
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
      <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || uploadingFiles}
            className="px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-semibold flex items-center gap-2"
          >
            {loading ? (
              "Creating..."
            ) : uploadingFiles ? (
              "Uploading..."
            ) : (
              <>
                Create Live Incident
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );

  // Render Step 2 Form (Full Form)
  const renderStep2 = () => (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-md p-8 space-y-6"
    >
      <div className="flex justify-center items-center space-x-2 mb-8">
        <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
      </div>

      {isEditingLiveIncident && <StepIndicator currentStep={currentStep} />}

      {isEditingLiveIncident && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700 font-medium">
            Step 2: Complete the Report
          </p>
          <p className="text-green-600 text-sm mt-1">
            Fill in the remaining details to complete this incident report.
          </p>
        </div>
      )}

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
            {getSchemesForUser(userProfile).map((scheme) => (
              <option key={scheme.id} value={scheme.fullName}>
                {scheme.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">Section</span>
          </label>
          <input
            type="text"
            name="section"
            value={formData.section}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            placeholder="Enter section (e.g., M3, A33, A417)"
          />
        </div>
      </div>

      {/* Date and Name */}
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
              First Name <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            maxLength={100}
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

      {/* Weather and NH Log */}
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
            <option value="Icy">Icy</option>
            <option value="Sunny">Sunny</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                NH Log <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              name="nhLog"
              placeholder="National Highways Log"
              value={formData.nhLog}
              onChange={handleChange}
              className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              maxLength={50}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Collar Number <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              name="collarNumber"
              placeholder="Collar Number"
              value={formData.collarNumber}
              onChange={handleChange}
              className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              maxLength={50}
            />
          </div>
        </div>
      </div>

      {/* Incursion + Asset Damage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Incursion? <span className="text-red-500">*</span>
            </span>
          </label>
          <div className="flex gap-6">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="radio"
                name="incursion"
                value="YES"
                checked={formData.incursion === "YES"}
                onChange={handleChange}
                className="radio radio-accent"
              />
              <span>YES</span>
            </label>
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="radio"
                name="incursion"
                value="NO"
                checked={formData.incursion === "NO"}
                onChange={handleChange}
                className="radio radio-accent"
              />
              <span>NO</span>
            </label>
          </div>
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">Asset Damage?</span>
          </label>
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm border-gray-400"
              checked={formData.propertyDamage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  propertyDamage: e.target.checked,
                  assetType: e.target.checked ? prev.assetType : "",
                  damageType: e.target.checked ? prev.damageType : "",
                }))
              }
            />
            <span>Yes</span>
          </label>
        </div>
      </div>

      {/* Asset Damage dropdowns */}
      {formData.propertyDamage && (
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
      )}

      {/* Camera, Traffic, etc */}
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
          >
            <option value="">Please Select</option>
            <option value="CCTV">CCTV</option>
            <option value="TSCO">TSCO</option>
            <option value="ROC">ROC</option>
            <option value="Recovery">Recovery</option>
            <option value="Traffic Management">Traffic Management</option>
            <option value="Police">Police</option>
            <option value="HETO">HETO</option>
            <option value="Site Worker">Site Worker</option>
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Camera Number <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            name="cameraNumber"
            placeholder="e.g., 23"
            value={formData.cameraNumber}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            maxLength={50}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Traffic Conditions <span className="text-red-500">*</span>
            </span>
          </label>
          <select
            name="trafficConditions"
            value={formData.trafficConditions}
            onChange={handleChange}
            className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          >
            <option value="">Please Select</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Heavy">Heavy</option>
          </select>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            maxLength={50}
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Incident Type <span className="text-red-500">*</span>
            </span>
          </label>
          <select
            name="incidentType"
            value={formData.incidentType}
            onChange={handleChange}
            className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          >
            <option value="">Please Select</option>
            <option value="Free Recovery">Free Recovery</option>
            <option value="Police Incident">Police Incident</option>
            <option value="RTC">RTC</option>
            <option value="Call Log">Call Log</option>
            <option value="Drive Off">Drive Off</option>
            <option value="Pedestrian">Pedestrian</option>
            <option value="Medical Incident">Medical Incident</option>
            <option value="Incursion">Incursion</option>
            <option value="Footage Request">Footage Request</option>
            <option value="Vehicle Fire">Vehicle Fire</option>
            <option value="Fire">Fire</option>
            <option value="Asset Damage">Asset Damage</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Affected Lanes */}
      <div>
        <label className="label">
          <span className="label-text font-semibold mb-4">
            Affected Lanes <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {[
            "HS",
            "Lane 1",
            "Lane 2",
            "Lane 3",
            "Lane 4",
            "Works",
            "Verge",
            "Central Res",
            "Slip Road",
          ].map((lane) => (
            <label
              key={lane}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.affectedLanes.includes(lane)}
                onChange={() => handleCheckbox("affectedLanes", lane)}
                className="checkbox checkbox-sm checkbox-neutral"
              />
              <span className="text-sm">{lane}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Emergency Services */}
      <div>
        <label className="label">
          <span className="label-text font-semibold mb-2">
            Emergency Services <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="flex gap-6">
          {["N/A", "Police", "Ambulance", "Fire", "HETO'S"].map((service) => (
            <label
              key={service}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.emergencyServices.includes(service)}
                onChange={() => handleCheckbox("emergencyServices", service)}
                className="checkbox checkbox-sm checkbox-neutral"
              />
              <span className="text-sm">{service}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Recovery Requested Matrix */}
      <div>
        <label className="label">
          <span className="label-text font-semibold">
            Recovery Requested <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="overflow-x-auto">
          <table className="table table-bordered w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center text-gray-700">LIGHT</th>
                <th className="text-center text-gray-700">HEAVY</th>
                <th className="text-center text-gray-700">IPV</th>
                <th className="text-center text-gray-700">HETOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {["light", "heavy", "ipv", "hetos"].map((type) => (
                  <td key={type}>
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((num) => (
                        <label key={num} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`recovery_${type}`}
                            checked={formData.recoveryRequested[type] === num}
                            onChange={() => handleRecoveryChange(type, num)}
                            className="radio radio-sm radio-neutral"
                          />
                          <span className="ml-1 text-sm">{num}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Time Spotted <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="time"
            name="timeSpotted"
            value={formData.timeSpotted}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Time On Site <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="time"
            name="timeOnSite"
            value={formData.timeOnSite}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Time Cleared <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="time"
            name="timeCleared"
            value={formData.timeCleared}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          />
        </div>
      </div>

      {/* Closed Log and Fault */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Closed Log Collar Number <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            name="closedLogCollar"
            placeholder="e.g., 23"
            value={formData.closedLogCollar}
            onChange={handleChange}
            className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-semibold mb-2">
              Fault <span className="text-red-500">*</span>
            </span>
          </label>
          <select
            name="fault"
            value={formData.fault}
            onChange={handleChange}
            className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          >
            <option value="">Please Select</option>
            <option value="Puncture">Puncture</option>
            <option value="Fuel">Fuel</option>
            <option value="Mechanical">Mechanical</option>
            <option value="RTC">RTC</option>
            <option value="Electrical">Electrical</option>
            <option value="Abandoned">Abandoned</option>
            <option value="Drive Off">Drive Off</option>
            <option value="Medical">Medical</option>
            <option value="Over Heated">Over Heated</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Vehicles Involved */}
      <div>
        <label className="label">
          <span className="label-text font-semibold">
            Vehicles Involved <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="table table-bordered w-full mt-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-gray-700">Type</th>
                  <th className="text-gray-700">Make</th>
                  <th className="text-gray-700">Model</th>
                  <th className="text-gray-700">VRN</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {formData.vehicles.map((vehicle, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={vehicle.type}
                        onChange={(e) =>
                          handleVehicleChange(index, "type", e.target.value)
                        }
                        className="select select-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      >
                        <option value="">Please select</option>
                        <option value="Car">Car</option>
                        <option value="Car+ Trailer">Car+ Trailer</option>
                        <option value="Van">Van</option>
                        <option value="HGV">HGV</option>
                        <option value="Motorbike">Motorbike</option>
                        <option value="Coach/Bus">Coach/Bus</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={vehicle.make}
                        onChange={(e) =>
                          handleVehicleChange(index, "make", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={vehicle.model}
                        onChange={(e) =>
                          handleVehicleChange(index, "model", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={vehicle.vin}
                        onChange={(e) =>
                          handleVehicleChange(index, "vin", e.target.value)
                        }
                        className="input input-sm bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                      />
                    </td>
                    <td>
                      {formData.vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicle(index)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addVehicle}
            className="btn btn-sm btn-outline"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">
          <span className="label-text font-semibold mb-2">
            Description of Incident <span className="text-red-500">*</span>
          </span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
          maxLength={2000}
          required
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="label">
          <span className="label-text font-semibold">File Upload</span>
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-step2"
            accept="image/*,video/*,.pdf"
          />
          <label htmlFor="file-upload-step2" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-teal-600 font-semibold mb-1">Browse Files</p>
            <p className="text-gray-500 text-sm">Drag and drop files here</p>
          </label>

          {formData.files?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Saved files</p>
              {formData.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-blue-50 p-2 rounded"
                >
                  <span className="text-sm text-gray-700 truncate">{file.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeExistingFile(index)}
                    className="text-red-500 hover:text-red-700 shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.files?.length > 0 && <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">New files</p>}
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
      <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
        <button
          type="button"
          onClick={() => {
            if (!editId && !isEditingLiveIncident) {
              setCurrentStep(1);
            } else {
              navigate(-1);
            }
          }}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {!editId && !isEditingLiveIncident ? "Back to Step 1" : "Cancel"}
        </button>
        <div className="flex gap-3">
          {/* Save & Return — only shown on live incidents so operator can return later */}
          {(isEditingLiveIncident || editId) && (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || uploadingFiles}
              className="px-6 py-3 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading ? "Saving..." : "Save & Return"}
            </button>
          )}
          <button
            type="submit"
            disabled={loading || uploadingFiles}
            className={`px-8 py-3 text-white rounded-lg disabled:opacity-50 transition-colors font-semibold ${
              isEditingLiveIncident
                ? "bg-green-500 hover:bg-green-600"
                : "bg-teal-500 hover:bg-teal-600"
            }`}
          >
            {loading
              ? editId
                ? "Updating..."
                : "Submitting..."
              : uploadingFiles
                ? "Uploading Files..."
                : isEditingLiveIncident
                  ? "Complete Incident Report"
                  : editId
                    ? "Update"
                    : "Submit"}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <StaffSidebarLayout basePath={basePath}>
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
            {editId
              ? isEditingLiveIncident
                ? "Complete Live Incident"
                : "Edit Incident Report"
              : "Incident Report Log"}
          </h3>
        </div>

        {/* Render appropriate step */}
        {loading && !formData.scheme ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-teal-500"></span>
          </div>
        ) : currentStep === 1 && !editId ? (
          renderStep1()
        ) : (
          renderStep2()
        )}
      </div>
    </StaffSidebarLayout>
  );
};

export default IncidentReportFormPage;
