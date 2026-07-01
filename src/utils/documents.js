// Shared helpers for the Documents feature (staff upload + client view).

export const DOCUMENT_CATEGORIES = [
  "Reports",
  "Maintenance",
  "Scheme Info",
  "Contracts",
];

// Hosts allowed for embedded (read-only iframe) online documents.
// Excel Online / OneDrive / SharePoint / Office and Google Sheets/Docs live docs.
const ALLOWED_EMBED_HOSTS = [
  "onedrive.live.com",
  "1drv.ms",
  "sharepoint.com",
  "office.com",
  "officeapps.live.com",
  "office.net",
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
];

// Returns true if the URL is a valid https link on an allowed embed host.
export const isAllowedEmbedUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_EMBED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
};

// Classify a document into an icon type: "excel" | "pdf" | "word" | "image" | "link" | "file"
export const getDocumentType = (docItem) => {
  if (docItem?.kind === "embed") return "link";

  const name = (docItem?.fileName || docItem?.title || "").toLowerCase();
  const mime = (docItem?.fileType || "").toLowerCase();

  if (mime.includes("spreadsheet") || /\.(xlsx?|csv|ods)$/.test(name))
    return "excel";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    /\.(docx?|odt)$/.test(name)
  )
    return "word";
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(name))
    return "image";
  return "file";
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Format a Firestore Timestamp (or Date) to a short readable date.
export const formatDocumentDate = (uploadedAt) => {
  if (!uploadedAt) return "—";
  const date = uploadedAt.toDate
    ? uploadedAt.toDate()
    : new Date(uploadedAt.seconds ? uploadedAt.seconds * 1000 : uploadedAt);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
