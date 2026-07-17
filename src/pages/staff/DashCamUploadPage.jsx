import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { Upload, Video, X, Trash2, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import { isDemoUser, DEMO_SCHEME_ID, getSchemesForUser, extractSchemeId } from "../../utils/schemes";

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

const DashCamUploadPage = () => {
  const { userProfile } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  const [uploadForm, setUploadForm] = useState({
    staffName: "",
    scheme: "",
    date: "",
    time: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setUploadForm((prev) => ({
        ...prev,
        staffName: prev.staffName || userProfile.displayName || "",
      }));
    }
  }, [userProfile]);

  useEffect(() => {
    loadUploads();
  }, [userProfile]);

  const loadUploads = async () => {
    if (!userProfile) return;

    try {
      setLoadingUploads(true);
      const dashCamUploads = await staffService.getDashCamUploads(null);

      const isDemo = isDemoUser(userProfile);
      const filteredUploads = dashCamUploads.filter((upload) => {
        const uploadSchemeId =
          upload.schemeId || extractSchemeId(upload.scheme);
        return isDemo
          ? uploadSchemeId === DEMO_SCHEME_ID
          : uploadSchemeId !== DEMO_SCHEME_ID;
      });

      setUploads(filteredUploads);
    } catch (error) {
      console.error("Failed to load dash cam uploads:", error);
      toast.error("Failed to load uploads");
    } finally {
      setLoadingUploads(false);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error(`${file.name} is not a video file`);
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 500MB limit`);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileSelect = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadingFile) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploadingFile) return;

    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a video file");
      return;
    }

    if (
      !uploadForm.staffName ||
      !uploadForm.scheme ||
      !uploadForm.date ||
      !uploadForm.time
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploadingFile(true);

    try {
      const key = `dashcam-uploads/${userProfile.uid}/${Date.now()}_${selectedFile.name}`;
      const arrayBuffer = await selectedFile.arrayBuffer();

      await r2Client.send(
        new PutObjectCommand({
          Bucket: import.meta.env.VITE_R2_BUCKET,
          Key: key,
          Body: new Uint8Array(arrayBuffer),
          ContentType: selectedFile.type,
        }),
      );

      setUploadProgress(100);

      const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`;

      await staffService.submitDashCamUpload(
        {
          ...uploadForm,
          fileName: selectedFile.name,
          fileUrl: key,
          downloadUrl: publicUrl,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
        userProfile.uid,
        userProfile.displayName,
      );

      toast.success("Dash cam footage uploaded successfully!");

      setUploadForm({
        staffName: userProfile.displayName || "",
        scheme: "",
        date: "",
        time: "",
      });
      setSelectedFile(null);
      setUploadProgress(0);

      loadUploads();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteUpload = async (uploadId) => {
    if (!confirm("Are you sure you want to delete this upload?")) return;

    try {
      await staffService.deleteDashCamUpload(uploadId);
      toast.success("Upload deleted successfully");
      loadUploads();
    } catch (error) {
      console.error("Failed to delete upload:", error);
      toast.error("Failed to delete upload");
    }
  };

  return (
    <StaffSidebarLayout>
      <div>
        <div className="mb-6">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">
            Dash Cam Upload
          </h3>
          <p className="text-gray-600">Upload and manage dash cam footage</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-xl font-bold text-gray-800 mb-6">
                Upload New Footage
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold mb-2">
                      Staff Name <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.staffName}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, staffName: e.target.value })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                    placeholder="Staff name"
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold mb-2">
                      Scheme <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    value={uploadForm.scheme}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, scheme: e.target.value })
                    }
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
                    value={uploadForm.time}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, time: e.target.value })
                    }
                    className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                    required
                  />
                </div>
              </div>

              <div className="divider"></div>

              <div className="mb-6">
                <label className="label">
                  <span className="label-text font-semibold">
                    Video File <span className="text-red-500">*</span>
                  </span>
                </label>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-300 hover:border-teal-500"
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="dashcam-video-upload"
                    disabled={uploadingFile}
                  />
                  <label htmlFor="dashcam-video-upload" className="cursor-pointer">
                    <Upload
                      className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-teal-500" : "text-gray-400"}`}
                    />
                    <p className="text-gray-600 mb-2">
                      {isDragging ? (
                        <span className="text-teal-600 font-semibold">
                          Drop file here
                        </span>
                      ) : (
                        <>
                          <span className="text-teal-600 font-semibold">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Video files only (Max 500MB)
                    </p>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Video className="w-5 h-5 text-teal-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      {uploadingFile ? (
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">
                            {uploadProgress}%
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUploadForm({
                      staffName: userProfile?.displayName || "",
                      scheme: "",
                      date: "",
                      time: "",
                    });
                    setSelectedFile(null);
                  }}
                  className="btn btn-outline"
                  disabled={uploadingFile}
                >
                  Clear
                </button>
                <button
                  onClick={uploadFile}
                  disabled={uploadingFile || !selectedFile}
                  className="btn bg-teal-500 text-white hover:bg-teal-600 border-none disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

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
                      Staff Name
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Scheme
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-600">
                      Date/Time
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
                        colSpan="4"
                        className="text-center py-12 text-gray-500"
                      >
                        No uploads yet
                      </td>
                    </tr>
                  ) : (
                    uploads.slice(0, 10).map((upload) => (
                      <tr key={upload.id} className="hover:bg-gray-50">
                        <td className="text-sm font-medium text-gray-800">
                          {upload.staffName}
                        </td>
                        <td className="text-sm text-gray-600">
                          {upload.scheme}
                        </td>
                        <td className="text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span>{upload.date}</span>
                            <span className="text-xs text-gray-500">
                              {upload.time}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                window.open(upload.downloadUrl, "_blank")
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

export default DashCamUploadPage;
