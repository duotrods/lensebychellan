import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import { Download, Video, Search, Clock, Camera } from "lucide-react";
import { formatFileSize, formatDocumentDate } from "../../utils/documents";

const BodyCamPage = () => {
  const { userProfile } = useAuth();
  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!schemeId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const results = await clientDataService.getBodyCamVideos(schemeId);
        if (!cancelled) setVideos(results);
      } catch (error) {
        console.error("Failed to load body cam videos:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [schemeId]);

  const filtered = videos.filter((video) => {
    const haystack = `${video.staffName || ""} ${video.date || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <ClientSidebarLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          
            <h1 className="text-2xl font-bold text-gray-800">Body Cam</h1>
          
          <p className="text-gray-500">
            Body cam footage uploaded by staff for your scheme.
          </p>
        </div>

        {/* Search */}
        <div className="flex justify-end mb-5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 w-64"
            />
          </div>
        </div>

        {/* Video List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No body cam footage available.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Footage</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                    Staff
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                    Recorded
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                    Size
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Video className="w-8 h-8 shrink-0 text-teal-600" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-800 leading-snug block truncate">
                            {video.fileName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">
                        {video.staffName || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {video.date || formatDocumentDate(video.uploadedAt)}
                        {video.time ? ` · ${video.time}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-400">
                        {formatFileSize(video.fileSize)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a
                        href={video.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ClientSidebarLayout>
  );
};

export default BodyCamPage;
