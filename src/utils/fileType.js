// Shared file-type detection for attachments.
//
// IMPORTANT: a file's stored `fileType` is whatever the browser reported as
// `file.type` at upload time. Some videos (notably .mov/.mkv/.avi, and even
// .mp4 on certain OS/browser combos) upload with a blank or non-`video/` MIME,
// so MIME alone is unreliable. We fall back to the filename extension, matching
// the detection the incident detail view has always used.

const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "webm", "mkv", "m4v"];
const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "heic",
  "heif",
  "svg",
];

const getExtension = (file) => {
  const name = file?.fileName || file?.name;
  if (!name || !name.includes(".")) return "";
  return name.split(".").pop().toLowerCase();
};

export const isVideoFile = (file) => {
  if (!file) return false;
  if (file.fileType && file.fileType.startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.includes(getExtension(file));
};

export const isImageFile = (file) => {
  if (!file) return false;
  // A video must never be treated as an image, even if its extension list grows.
  if (isVideoFile(file)) return false;
  if (file.fileType && file.fileType.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.includes(getExtension(file));
};
