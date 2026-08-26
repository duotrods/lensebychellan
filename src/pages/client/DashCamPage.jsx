import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import { staffService } from "../../services/staffService";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import FootageUploadDrawer from "../../components/client/FootageUploadDrawer";
import {
  Download,
  Video,
  Search,
  Clock,
  Car,
  Play,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatFileSize, formatDocumentDate } from "../../utils/documents";
import { getActiveSchemeName } from "../../utils/schemes";

const videosPerPage = 12;

const DashCamPage = () => {
  const { userProfile } = useAuth();
  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const videosQuery = useQuery({
    queryKey: ["clientDashCamVideos", schemeId],
    queryFn: () => clientDataService.getDashCamVideos(schemeId),
    enabled: !!schemeId,
  });

  useEffect(() => {
    if (videosQuery.isError) {
      console.error("Failed to load dash cam videos:", videosQuery.error);
    }
  }, [videosQuery.isError, videosQuery.error]);

  const videos = videosQuery.data ?? [];
  const loading = !!schemeId && videosQuery.isLoading;

  const handleDelete = async (video) => {
    if (!confirm("Delete this upload?")) return;
    try {
      await staffService.deleteDashCamUpload(video.id);
      toast.success("Upload deleted");
      setSelectedVideo(null);
      videosQuery.refetch();
    } catch (error) {
      console.error("Failed to delete dash cam upload:", error);
      toast.error("Failed to delete upload");
    }
  };

  const filtered = videos.filter((video) => {
    const haystack = `${video.staffName || ""} ${video.date || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  // Pagination
  const indexOfLastVideo = currentPage * videosPerPage;
  const indexOfFirstVideo = indexOfLastVideo - videosPerPage;
  const currentVideos = filtered.slice(indexOfFirstVideo, indexOfLastVideo);
  const totalPages = Math.ceil(filtered.length / videosPerPage);

  return (
    <ClientSidebarLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dash Cam</h1>
            <p className="text-gray-600 mt-2">
              Dash cam footage for{" "}
              <span className="font-semibold text-brand-400">
                {getActiveSchemeName(userProfile)}
              </span>
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload footage
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by staff or date..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="input input-bordered w-full pl-10 bg-white border-gray-300"
            />
          </div>
        </div>

        {/* Video Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="p-12 text-center">
              <span className="loading loading-spinner loading-lg text-brand-500"></span>
            </div>
          ) : currentVideos.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentVideos.map((video) => {
                  const isHovered = hoveredId === video.id;
                  return (
                    <div
                      key={video.id}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Thumbnail with hover video preview */}
                      <div
                        className="relative bg-gray-900 aspect-video cursor-pointer"
                        onMouseEnter={() =>
                          video.downloadUrl && setHoveredId(video.id)
                        }
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelectedVideo(video)}
                      >
                        {isHovered && video.downloadUrl ? (
                          <video
                            src={video.downloadUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                            controlsList="nodownload"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Video className="w-12 h-12 text-gray-500" />
                            <span className="text-xs text-gray-400">
                              Hover to preview
                            </span>
                          </div>
                        )}

                        {/* File type indicator — bottom left */}
                        <div className="absolute bottom-2 left-2">
                          <span className="flex items-center gap-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            <Video className="w-3 h-3" />
                            1
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className="font-bold text-lg text-gray-800 truncate"
                            title={video.fileName}
                          >
                            {video.fileName}
                          </h3>
                          {video.uploadedByRole === "client" && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 shrink-0">
                              Client upload
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              {video.date || formatDocumentDate(video.uploadedAt)}
                            </span>
                            {video.time && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span>{video.time}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            <span>Submitted by {video.staffName || "Staff"}</span>
                          </div>

                          <p className="text-sm text-gray-400">
                            {formatFileSize(video.fileSize)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedVideo(video)}
                            className="btn btn-sm btn-brand flex-1"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            View
                          </button>
                          <a
                            href={video.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600">
                    Showing {indexOfFirstVideo + 1} to{" "}
                    {Math.min(indexOfLastVideo, filtered.length)} of{" "}
                    {filtered.length} videos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No dash cam footage found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800 truncate">
                  {selectedVideo.fileName}
                </h2>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="btn btn-sm btn-ghost shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-gray-900 aspect-video rounded-lg overflow-hidden mb-4">
                <video
                  key={selectedVideo.id}
                  controls
                  preload="none"
                  className="w-full h-full"
                  src={selectedVideo.downloadUrl}
                  controlsList="nodownload"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Staff</p>
                  <p className="font-semibold">{selectedVideo.staffName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Recorded</p>
                  <p className="font-semibold">
                    {selectedVideo.date || formatDocumentDate(selectedVideo.uploadedAt)}
                    {selectedVideo.time ? ` · ${selectedVideo.time}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Size</p>
                  <p className="font-semibold">
                    {formatFileSize(selectedVideo.fileSize)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={selectedVideo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-brand flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="btn btn-outline flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FootageUploadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        type="dashCam"
        onUploaded={() => videosQuery.refetch()}
      />
    </ClientSidebarLayout>
  );
};

export default DashCamPage;
