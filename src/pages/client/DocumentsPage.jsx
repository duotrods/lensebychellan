import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { clientDataService } from "../../services/clientDataService";
import { staffService } from "../../services/staffService";
import { uploadFileToR2 } from "../../utils/r2Upload";
import { getActiveSchemeName } from "../../utils/schemes";
import { USER_ROLES } from "../../utils/constants";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  Image as ImageIcon,
  Link2,
  File,
  Search,
  Filter,
  FolderOpen,
  Clock,
  Eye,
  X,
  Upload,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DOCUMENT_CATEGORIES,
  getDocumentType,
  formatFileSize,
  formatDocumentDate,
} from "../../utils/documents";

const CATEGORIES = ["All", ...DOCUMENT_CATEGORIES];

const FileIcon = ({ type, className }) => {
  if (type === "excel")
    return <FileSpreadsheet className={`${className} text-emerald-600`} />;
  if (type === "pdf")
    return <FileText className={`${className} text-red-500`} />;
  if (type === "word")
    return <FileType2 className={`${className} text-blue-600`} />;
  if (type === "image")
    return <ImageIcon className={`${className} text-purple-500`} />;
  if (type === "link")
    return <Link2 className={`${className} text-teal-600`} />;
  return <File className={`${className} text-gray-500`} />;
};

const CategoryBadge = ({ category }) => {
  const colors = {
    Reports: "bg-blue-100 text-blue-700",
    Maintenance: "bg-amber-100 text-amber-700",
    "Scheme Info": "bg-purple-100 text-purple-700",
    Contracts: "bg-teal-100 text-teal-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[category] || "bg-gray-100 text-gray-600"}`}
    >
      {category}
    </span>
  );
};

// Custom (non-native) dropdown for the upload drawer's Category field —
// a native <select>'s open option list is rendered by the OS/browser and
// can't be restyled, so this renders its own menu instead.
const CategoryDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 pl-3 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 text-left transition-colors hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
      >
        {value}
      </button>
      <ChevronDown
        className={`w-4 h-4 text-teal-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
      />
      {open && (
        <div className="absolute z-10 top-full mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {DOCUMENT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                c === value
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c}
              {c === value && <Check className="w-4 h-4 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Read-only modal that embeds a live online document (e.g. Excel Online).
const EmbedViewer = ({ doc, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="w-5 h-5 text-teal-600 shrink-0" />
          <h3 className="font-semibold text-gray-800 truncate">{doc.title}</h3>
          <span className="text-[11px] font-medium text-teal-600 shrink-0">
            Live · read-only
          </span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={doc.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg"
          >
            Open in new tab
          </a>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <iframe
        src={doc.embedUrl}
        title={doc.title}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  </div>
);

const DocumentsPage = () => {
  const { userProfile, role } = useAuth();
  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;
  const canUpload = role === USER_ROLES.CLIENT;

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadScheme = getActiveSchemeName(userProfile);

  const documentsQuery = useQuery({
    queryKey: ["clientDocuments", schemeId],
    queryFn: () => clientDataService.getDocuments(schemeId),
    enabled: !!schemeId,
  });

  useEffect(() => {
    if (documentsQuery.isError) {
      console.error("Failed to load documents:", documentsQuery.error);
    }
  }, [documentsQuery.isError, documentsQuery.error]);

  const documents = documentsQuery.data ?? [];
  const loading = !!schemeId && documentsQuery.isLoading;

  const resetForm = () => {
    setTitle("");
    setCategory(DOCUMENT_CATEGORIES[0]);
    setSelectedFile(null);
  };

  const selectFile = (file) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name} is over the 50MB limit`);
      return;
    }
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
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

  const handleCloseDrawer = () => {
    if (submitting) return;
    setDrawerOpen(false);
  };

  const handleSubmit = async () => {
    if (!uploadScheme) {
      toast.error("No scheme assigned to your account");
      return;
    }
    if (!title.trim()) {
      toast.error("Give the document a title");
      return;
    }
    if (!selectedFile) {
      toast.error("Choose a file to upload");
      return;
    }

    setSubmitting(true);
    try {
      const { key, downloadUrl } = await uploadFileToR2(
        selectedFile,
        "documents",
        userProfile.uid,
      );

      await staffService.submitDocument(
        {
          kind: "file",
          title: title.trim(),
          category,
          scheme: uploadScheme,
          fileName: selectedFile.name,
          fileUrl: key,
          downloadUrl,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || "application/octet-stream",
          uploadedByRole: "client",
        },
        userProfile.uid,
        userProfile.displayName,
      );
      toast.success("Document uploaded");

      resetForm();
      setDrawerOpen(false);
      documentsQuery.refetch();
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm("Delete this document?")) return;
    try {
      await staffService.deleteDocument(doc.id);
      toast.success("Document deleted");
      if (viewing?.id === doc.id) setViewing(null);
      documentsQuery.refetch();
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    }
  };

  const filtered = documents.filter((doc) => {
    const matchesCategory =
      activeCategory === "All" || doc.category === activeCategory;
    const matchesSearch = (doc.title || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <ClientSidebarLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
            <p className="text-gray-500">
              Reports, spreadsheets and files shared with you by Chellan. Live
              online documents always show the latest version.
            </p>
          </div>
          {canUpload && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors shrink-0"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-teal-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 w-56"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No documents available.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">File</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                    Size
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((doc) => {
                  const type = getDocumentType(doc);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <FileIcon type={type} className="w-8 h-8 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 leading-snug block">
                                {doc.title}
                              </span>
                              {doc.uploadedByRole === "client" && (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 shrink-0">
                                  Client upload
                                </span>
                              )}
                            </div>
                            {doc.kind === "embed" && (
                              <span className="text-[11px] font-medium text-teal-600">
                                Live document
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <CategoryBadge category={doc.category} />
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDocumentDate(doc.uploadedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-400">
                          {doc.kind === "embed"
                            ? "—"
                            : formatFileSize(doc.fileSize)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.kind === "embed" ? (
                            <button
                              onClick={() => setViewing(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          ) : (
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewing && (
        <EmbedViewer doc={viewing} onClose={() => setViewing(null)} />
      )}

      {/* Upload document drawer */}
      {canUpload && drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={handleCloseDrawer} />
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800">
                Upload document
              </h4>
              <button
                onClick={handleCloseDrawer}
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
                  {uploadScheme || "No scheme assigned"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Category
                </label>
                <CategoryDropdown value={category} onChange={setCategory} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly summary"
                  className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                />
              </div>

              {selectedFile ? (
                <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileIcon
                      type={getDocumentType({
                        kind: "file",
                        fileName: selectedFile.name,
                        fileType: selectedFile.type,
                      })}
                      className="w-8 h-8 shrink-0"
                    />
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
                    Drop a file, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, Excel, Word or images — up to 50MB
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseDrawer}
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
                {submitting ? "Saving…" : "Upload document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientSidebarLayout>
  );
};

export default DocumentsPage;
