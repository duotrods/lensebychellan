import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { storage } from "../../config/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import {
  Upload,
  Video,
  X,
  Check,
  AlertCircle,
  Calendar,
  Clock,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";

const CCTVUploadsPage = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    scheme: "",
    cameraNumber: "",
    date: "",
    time: "",
    description: "",
    incidentRelated: false,
    incidentId: "",
  });

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    loadUploads();
  }, [userProfile]);

  const loadUploads = async () => {
    if (!userProfile) return;

    try {
      setLoadingUploads(true);
      const cctvUploads = await staffService.getCCTVUploads(userProfile.uid);
      setUploads(cctvUploads);
    } catch (error) {
      console.error("Failed to load CCTV uploads:", error);
      toast.error("Failed to load uploads");
    } finally {
      setLoadingUploads(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isVideo = file.type.startsWith("video/");
      const isUnder500MB = file.size <= 500 * 1024 * 1024; // 500MB limit

      if (!isVideo) {
        toast.error(`${file.name} is not a video file`);
        return false;
      }

      if (!isUnder500MB) {
        toast.error(`${file.name} exceeds 500MB limit`);
        return false;
      }

      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one video file");
      return;
    }

    if (
      !uploadForm.scheme ||
      !uploadForm.cameraNumber ||
      !uploadForm.date ||
      !uploadForm.time
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploadingFiles(true);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileName = `cctv-uploads/${userProfile.uid}/${Date.now()}_${
          file.name
        }`;
        const storageRef = ref(storage, fileName);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress((prev) => ({
                ...prev,
                [index]: Math.round(progress),
              }));
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileName: file.name,
                fileUrl: fileName,
                downloadUrl: downloadURL,
                fileSize: file.size,
                fileType: file.type,
              });
            }
          );
        });
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Save to Firestore
      await staffService.submitCCTVUpload(
        {
          ...uploadForm,
          files: uploadedFiles,
        },
        userProfile.uid,
        userProfile.displayName
      );

      toast.success("CCTV footage uploaded successfully!");

      // Reset form
      setUploadForm({
        scheme: "",
        cameraNumber: "",
        date: "",
        time: "",
        description: "",
        incidentRelated: false,
        incidentId: "",
      });
      setSelectedFiles([]);
      setUploadProgress({});

      // Reload uploads
      loadUploads();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteUpload = async (uploadId) => {
    if (!confirm("Are you sure you want to delete this upload?")) return;

    try {
      await staffService.deleteCCTVUpload(uploadId);
      toast.success("Upload deleted successfully");
      loadUploads();
    } catch (error) {
      console.error("Failed to delete upload:", error);
      toast.error("Failed to delete upload");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <StaffSidebarLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">
            CCTV Uploads
          </h3>
          <p className="text-gray-600">Upload and manage CCTV footage</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-6">
                Upload New Footage
              </h4>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold mb-2">
                      Scheme <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.scheme}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, scheme: e.target.value })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                    placeholder="e.g., A417, M3 Jct 9"
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font- mb-2">
                      Camera Number <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.cameraNumber}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        cameraNumber: e.target.value,
                      })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full"
                    placeholder="e.g., CCTV 12"
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold mb-2">
                      Date <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    value={uploadForm.date}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, date: e.target.value })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full"
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
                    value={uploadForm.time}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, time: e.target.value })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="label mb-2">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                  className="textarea bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full"
                  rows={3}
                  placeholder="Brief description of the footage..."
                />
              </div>

              {/* Incident Related */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={uploadForm.incidentRelated}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        incidentRelated: e.target.checked,
                      })
                    }
                    className="checkbox checkbox-sm checkbox-accent"
                  />
                  <span className="label-text font-semibold">
                    Related to an incident report
                  </span>
                </label>

                {uploadForm.incidentRelated && (
                  <input
                    type="text"
                    value={uploadForm.incidentId}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        incidentId: e.target.value,
                      })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100  w-full mt-2"
                    placeholder="Enter Incident Report ID"
                  />
                )}
              </div>

              <div className="divider"></div>

              {/* File Upload Area */}
              <div className="mb-6">
                <label className="label">
                  <span className="label-text font-semibold">
                    Video Files <span className="text-red-500">*</span>
                  </span>
                </label>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="video-upload"
                    disabled={uploadingFiles}
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">
                      <span className="text-teal-600 font-semibold">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Video files only (Max 500MB per file)
                    </p>
                  </label>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Video className="w-5 h-5 text-teal-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        {uploadingFiles ? (
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-teal-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${uploadProgress[index] || 0}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-12">
                              {uploadProgress[index] || 0}%
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => removeFile(index)}
                            className="btn btn-sm btn-ghost text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUploadForm({
                      scheme: "",
                      cameraNumber: "",
                      date: "",
                      time: "",
                      description: "",
                      incidentRelated: false,
                      incidentId: "",
                    });
                    setSelectedFiles([]);
                  }}
                  className="btn btn-outline"
                  disabled={uploadingFiles}
                >
                  Clear
                </button>
                <button
                  onClick={uploadFiles}
                  disabled={uploadingFiles || selectedFiles.length === 0}
                  className="btn bg-teal-500 text-white hover:bg-teal-600 border-none disabled:opacity-50"
                >
                  {uploadingFiles ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Files
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Upload Tips */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h5 className="font-bold text-gray-800">Upload Guidelines</h5>
            </div>

            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Maximum file size: 500MB per video</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Supported formats: MP4, AVI, MOV, MKV</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Include camera number and exact time</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Link to incident report if applicable</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Add description for easy identification</span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Large files may take several minutes to
                upload. Please don't close this page until upload is complete.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Recent Uploads</h2>
          </div>

          {loadingUploads ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-teal-500"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Scheme
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Camera
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Date/Time
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Files
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Uploaded By
                    </th>
                    <th className="text-center text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-12 text-gray-500"
                      >
                        No uploads yet
                      </td>
                    </tr>
                  ) : (
                    uploads.slice(0, 10).map((upload) => (
                      <tr key={upload.id} className="hover:bg-gray-50">
                        <td className="text-sm font-medium text-gray-800">
                          {upload.scheme}
                        </td>
                        <td className="text-sm text-gray-600">
                          {upload.cameraNumber}
                        </td>
                        <td className="text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span>{upload.date}</span>
                            <span className="text-xs text-gray-500">
                              {upload.time}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm text-gray-600">
                          {upload.files?.length || 0} file(s)
                        </td>
                        <td className="text-sm text-gray-600">
                          {upload.submittedBy}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                window.open(
                                  upload.files[0]?.downloadUrl,
                                  "_blank"
                                )
                              }
                              className="btn btn-sm bg-teal-500 text-white hover:bg-teal-600 border-none"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUpload(upload.id)}
                              className="btn btn-sm btn-outline text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVUploadsPage;
