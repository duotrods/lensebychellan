// Pure helpers for the admin "download videos (ZIP)" export. No Firebase
// imports so they can be unit-tested in isolation.

import { isVideoFile } from "./fileType";

// Names must be valid on Windows (strictest) and macOS: no reserved characters
// or control chars, no trailing dot/space, no reserved device names, NFC
// unicode (macOS stores NFD), and a length cap so full paths stay under
// Windows' 260-char limit once extracted.
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_PART = 80;
const safe = (s, keepExt = false) => {
  let v = String(s ?? "")
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
    .trim()
    .replace(/[. ]+$/, "");
  const dot = keepExt ? v.lastIndexOf(".") : -1;
  const ext = dot > 0 && v.length - dot <= 10 ? v.slice(dot) : "";
  let stem = ext ? v.slice(0, dot) : v;
  if (RESERVED.test(stem)) stem = `_${stem}`;
  return stem.slice(0, MAX_PART - ext.length) + ext;
};

/**
 * Keep uploads that match the optional scheme (a single id, or an array of ids
 * for a scope — schemeIds array, legacy schemeId) and aren't deleted.
 */
export const filterUploadsByScheme = (uploads, schemeId) => {
  const wanted = schemeId ? [].concat(schemeId) : null;
  return uploads.filter((u) => {
    if (u.deleted === true) return false;
    if (!wanted) return true;
    const ids = Array.isArray(u.schemeIds) ? u.schemeIds : u.schemeId ? [u.schemeId] : [];
    return ids.some((id) => wanted.includes(id));
  });
};

const schemeFolder = (doc) => safe(doc.schemeId || doc.schemeIds?.[0] || "unknown-scheme");

// Shared by both sources: one entry per video file, with a unique path inside
// the ZIP. `folderOf(doc)` gives the folder; duplicate paths get a numeric suffix.
const collectFrom = (docs, folderOf) => {
  const used = new Set();
  const files = [];
  for (const doc of docs) {
    for (const f of doc.files || []) {
      if (!f?.downloadUrl || !isVideoFile(f)) continue;
      const folder = folderOf(doc);
      const name = safe(f.fileName, true) || "video";
      let path = `${folder}/${name}`;
      // Windows and macOS filesystems are case-insensitive, so dedupe on lowercase.
      for (let n = 2; used.has(path.toLowerCase()); n++) {
        const dot = name.lastIndexOf(".");
        const stem = dot > 0 ? name.slice(0, dot) : name;
        const ext = dot > 0 ? name.slice(dot) : "";
        path = `${folder}/${stem} (${n})${ext}`;
      }
      used.add(path.toLowerCase());
      files.push({ url: f.downloadUrl, path, size: Number(f.fileSize) || 0 });
    }
  }
  return files;
};

/**
 * CCTV uploads → `<scheme>/<date>_<camera>/<fileName>`.
 */
export const collectVideoFiles = (uploads) =>
  collectFrom(uploads, (upload) =>
    [schemeFolder(upload),
      [safe(upload.date), safe(upload.cameraNumber)].filter(Boolean).join("_") || upload.id]
      .join("/"));

/**
 * Videos attached to incident reports → `<scheme>/Incidents/<reference>/<fileName>`.
 */
export const collectIncidentVideoFiles = (reports) =>
  collectFrom(reports, (report) =>
    [schemeFolder(report), "Incidents", safe(report.referenceId || report.id)].join("/"));

/**
 * Body cam / dash cam uploads hold one file per document (top-level fileName /
 * downloadUrl) → `<scheme>/<BodyCam|DashCam>/<date>/<fileName>`.
 */
export const collectCamVideoFiles = (uploads, label) =>
  collectFrom(
    uploads.map((u) => ({
      ...u,
      files: [{ fileName: u.fileName, downloadUrl: u.downloadUrl, fileType: u.fileType, fileSize: u.fileSize }],
    })),
    (u) => [schemeFolder(u), label, safe(u.date) || u.id].join("/"),
  );

export const totalBytes = (files) => files.reduce((sum, f) => sum + f.size, 0);

export const formatBytes = (bytes) => {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};
