import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { uploadFileToR2 } from "../../utils/r2Upload";
import { isVideoFile } from "../../utils/fileType";
import { getActiveSchemeName } from "../../utils/schemes";
import { formatFileSize } from "../../utils/documents";
import { Upload, Video, X } from "lucide-react";
import { toast } from "react-hot-toast";

const CONFIG = {
  bodyCam: {
    label: "Body Cam",
    keyPrefix: "bodycam-uploads",
    submit: (uploadData, userId, userName) =>
      staffService.submitBodyCamUpload(uploadData, userId, userName),
  },
  dashCam: {
    label: "Dash Cam",
    keyPrefix: "dashcam-uploads",
    submit: (uploadData, userId, userName) =>
      staffService.submitDashCamUpload(uploadData, userId, userName),
  },
};

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const FootageUploadDrawer = ({ open, onClose, type, onUploaded }) => {
  const { userProfile } = useAuth();
  const config = CONFIG[type];

  const scheme = getActiveSchemeName(userProfile);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setDate("");
    setTime("");
    setDescription("");
    setSelectedFile(null);
  };

  const selectFile = (file) => {
    if (!isVideoFile({ fileType: file.type, fileName: file.name })) {
      toast.error(`${file.name} is not a video file`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds 500MB limit`);
      return;
    }
    setSelectedFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (submitting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!scheme) {
      toast.error("No scheme assigned to your account");
      return;
    }
    if (!date || !time) {
      toast.error("Please fill in date and time");
      return;
    }
    if (!selectedFile) {
      toast.error("Choose a video file to upload");
      return;
    }

    setSubmitting(true);
    try {
      const { key, downloadUrl } = await uploadFileToR2(
        selectedFile,
        config.keyPrefix,
        userProfile.uid,
      );

      await config.submit(
        {
          staffName: userProfile.displayName,
          scheme,
          date,
          time,
          description,
          fileName: selectedFile.name,
          fileUrl: key,
          downloadUrl,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          uploadedByRole: "client",
        },
        userProfile.uid,
        userProfile.displayName,
      );

      toast.success(`${config.label} footage uploaded`);
      resetForm();
      onUploaded?.();
      onClose();
    } catch (error) {
      console.error(`Failed to upload ${type} footage:`, error);
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h4 className="text-lg font-semibold text-gray-800">
            Upload {config.label} footage
          </h4>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Scheme
            </label>
            <p className="h-11 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {scheme || "No scheme assigned"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes about this footage"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
            />
          </div>

          {selectedFile ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Video className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-gray-400 hover:text-red-500 shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-1.5 border border-dashed rounded-lg px-6 py-9 cursor-pointer transition-colors ${
                isDragging
                  ? "border-teal-400 bg-teal-50/60"
                  : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
              }`}
            >
              <Upload className="w-5 h-5 text-gray-400 mb-1" />
              <p className="text-sm font-medium text-gray-700">
                Drop a video, or click to browse
              </p>
              <p className="text-xs text-gray-400">Video files only — up to 500MB</p>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="h-10 px-4 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 h-10 px-5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Uploading…" : "Upload footage"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FootageUploadDrawer;
