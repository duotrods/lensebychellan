import { useState } from "react";
import { toast } from "react-hot-toast";
import { staffService } from "../../services/staffService";
import { excludeDemoScheme } from "../../utils/reportMapping";
import { DATE_RANGE_PRESETS, resolveDateRange } from "../../utils/reportExport";
import {
  filterUploadsByScheme,
  collectVideoFiles,
  totalBytes,
  formatBytes,
} from "../../utils/videoExport";

// Admin-only: downloads CCTV upload videos in a date range as one ZIP, streamed
// from R2 straight to disk (never buffered in memory). Two steps — a size check
// first, then the download, because the save picker must open on the click itself.
const ExportVideosModal = ({ onClose, schemes, defaultScheme = "all" }) => {
  const [preset, setPreset] = useState("thisMonth");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [scheme, setScheme] = useState(defaultScheme);
  const [videos, setVideos] = useState(null); // { files, bytes } once checked
  const [busy, setBusy] = useState(null); // "checking" | { done, total } | null
  const canStreamToDisk = typeof window !== "undefined" && "showSaveFilePicker" in window;
  const downloading = busy && busy !== "checking";

  const range = resolveDateRange(preset, custom);

  // Any filter change invalidates the checked list.
  const change = (setter) => (value) => {
    setter(value);
    setVideos(null);
  };

  const handleCheck = async () => {
    setBusy("checking");
    try {
      const uploads = await staffService.getCCTVUploadsForExport({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      const files = collectVideoFiles(
        excludeDemoScheme(filterUploadsByScheme(uploads, scheme !== "all" ? scheme : null)),
      );
      setVideos({ files, bytes: totalBytes(files) });
    } catch (error) {
      console.error("Video check failed:", error);
      toast.error("Couldn't check videos. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: `cctv-videos_${range.label.replace(/[^\w-]+/g, "_")}.zip`,
        types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
      });
    } catch {
      return; // cancelled
    }
    const { files } = videos;
    const failed = [];
    let done = 0;
    setBusy({ done, total: files.length });
    try {
      const { makeZip } = await import("client-zip");
      async function* entries() {
        for (const f of files) {
          try {
            const res = await fetch(f.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            yield { name: f.path, input: res, lastModified: new Date() };
          } catch (e) {
            console.error("Video skipped:", f.path, e);
            failed.push(f.path);
          }
          setBusy({ done: ++done, total: files.length });
        }
        if (failed.length) {
          yield { name: "FAILED_FILES.txt", input: failed.join("\n"), lastModified: new Date() };
        }
      }
      const writable = await handle.createWritable();
      await makeZip(entries()).pipeTo(writable);
      if (failed.length) {
        toast.error(`ZIP saved, but ${failed.length} video(s) failed (listed in FAILED_FILES.txt).`);
      } else {
        toast.success("Videos downloaded");
        onClose();
      }
    } catch (error) {
      console.error("Video ZIP failed:", error);
      toast.error("Video download failed. Check bucket CORS and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-1">Export CCTV Videos</h3>
        <p className="text-sm text-gray-600 mb-5">
          One ZIP with the uploaded videos, in folders by scheme and camera. Demo scheme and
          deleted uploads are excluded.
        </p>

        {!canStreamToDisk && (
          <p className="text-sm text-amber-700 mb-4">
            Video export needs Chrome or Edge on a computer.
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Date range</label>
        <select
          value={preset}
          onChange={(e) => change(setPreset)(e.target.value)}
          className="select bg-white border-gray-300 rounded-lg w-full mb-3"
          disabled={!!busy}
        >
          {DATE_RANGE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {["from", "to"].map((k) => (
              <label key={k} className="text-sm text-gray-700">
                {k === "from" ? "From" : "To"}
                <input
                  type="date"
                  value={custom[k]}
                  onChange={(e) => change(setCustom)({ ...custom, [k]: e.target.value })}
                  className="input bg-white border-gray-300 rounded-lg w-full mt-1"
                  disabled={!!busy}
                />
              </label>
            ))}
          </div>
        )}
        {range && preset !== "all" && (
          <p className="text-xs text-gray-500 mb-3">{range.label}</p>
        )}
        {preset === "custom" && !range && (custom.from || custom.to) && (
          <p className="text-xs text-red-600 mb-3">Pick a start date on or before the end date.</p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Scheme</label>
        <select
          value={scheme}
          onChange={(e) => change(setScheme)(e.target.value)}
          className="select bg-white border-gray-300 rounded-lg w-full mb-4"
          disabled={!!busy}
        >
          <option value="all">All Schemes</option>
          {schemes.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>

        {videos && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-5 text-sm text-gray-700">
            {videos.files.length === 0 ? (
              "No videos match these filters."
            ) : (
              <>
                <span className="font-semibold">{videos.files.length.toLocaleString()}</span> video
                {videos.files.length !== 1 ? "s" : ""}, {formatBytes(videos.bytes)}. Make sure you
                have enough free disk space.
              </>
            )}
          </div>
        )}
        {downloading && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 mb-5 text-sm text-teal-800">
            Downloading {busy.done} of {busy.total}… keep this tab open.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline" disabled={downloading}>
            Cancel
          </button>
          {videos && videos.files.length > 0 ? (
            <button
              onClick={handleDownload}
              className="btn bg-teal-500 hover:bg-teal-600 text-white border-none"
              disabled={!!busy || !canStreamToDisk}
            >
              {downloading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Download .zip"
              )}
            </button>
          ) : (
            <button
              onClick={handleCheck}
              className="btn bg-teal-500 hover:bg-teal-600 text-white border-none"
              disabled={!!busy || !range || !canStreamToDisk}
            >
              {busy === "checking" ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Check videos"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportVideosModal;
