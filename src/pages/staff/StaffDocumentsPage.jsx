import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { uploadFileToR2 } from "../../utils/r2Upload";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import {
  Upload,
  Download,
  Link2,
  Search,
  FolderOpen,
  Filter,
  User,
  Clock,
  X,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { isDemoUser, DEMO_SCHEME_ID, SCHEMES } from "../../utils/schemes";
import {
  DOCUMENT_CATEGORIES,
  getDocumentType,
  formatFileSize,
  formatDocumentDate,
} from "../../utils/documents";

const CATEGORIES = ["All", ...DOCUMENT_CATEGORIES];

// The label on the folder tab: a compact monospace type mark, tinted per kind.
const TYPE_META = {
  excel: { label: "XLS", cls: "bg-emerald-50 text-emerald-700" },
  pdf: { label: "PDF", cls: "bg-red-50 text-red-600" },
  word: { label: "DOC", cls: "bg-blue-50 text-blue-700" },
  image: { label: "IMG", cls: "bg-violet-50 text-violet-700" },
  link: { label: "LNK", cls: "bg-teal-50 text-teal-700" },
  other: { label: "FILE", cls: "bg-gray-100 text-gray-500" },
};

const TypeTag = ({ type, size = "row" }) => {
  const meta = TYPE_META[type] || TYPE_META.other;
  const dims = size === "row" ? "h-9 w-11 text-[10px]" : "h-10 w-12 text-[11px]";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-mono font-semibold tracking-widest shrink-0 ${dims} ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};

const CATEGORY_DOT = {
  Reports: "bg-blue-500",
  Maintenance: "bg-amber-500",
  "Scheme Info": "bg-violet-500",
  Contracts: "bg-teal-500",
};

const CategoryLabel = ({ category }) => (
  <span className="inline-flex items-center gap-2 text-sm text-gray-600">
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_DOT[category] || "bg-gray-400"}`}
    />
    {category}
  </span>
);

const StaffDocumentsPage = () => {
  const { userProfile } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Shared metadata
  const [scheme, setScheme] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [title, setTitle] = useState("");

  // File upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const schemeOptions = SCHEMES.filter((s) =>
    isDemoUser(userProfile) ? s.isDemo : !s.isDemo,
  );

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) =>
      e.key === "Escape" && !submitting && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, submitting]);

  const loadDocuments = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      const all = await staffService.getDocuments();
      const isDemo = isDemoUser(userProfile);
      const filtered = all.filter((d) => {
        const isDemoDoc = d.schemeId === DEMO_SCHEME_ID;
        return isDemo ? isDemoDoc : !isDemoDoc;
      });
      setDocuments(filtered);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Couldn't load documents. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setSelectedFile(null);
    // keep scheme + category selected for quick consecutive adds
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  };

  const selectFile = (file) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name} is over the 50MB limit`);
      return;
    }
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (submitting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleSubmit = async () => {
    if (!scheme) {
      toast.error("Pick a scheme first");
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
          scheme,
          fileName: selectedFile.name,
          fileUrl: key,
          downloadUrl,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || "application/octet-stream",
        },
        userProfile.uid,
        userProfile.displayName,
      );
      toast.success("Document uploaded");

      resetForm();
      setDrawerOpen(false);
      loadDocuments();
    } catch (error) {
      console.error("Failed to add document:", error);
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
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
    <StaffSidebarLayout>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Documents</h2>
            <p className="text-gray-600">
              Upload files for a scheme — only that scheme's clients will see
              them.
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New document
          </button>
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
              <p>No documents yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">File</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">
                    Scheme
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">
                    Uploaded by
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                    Date
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
                          <TypeTag type={type} />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-800 leading-snug block">
                              {doc.title}
                            </span>
                            {doc.kind === "embed" && (
                              <span className="text-[11px] font-medium text-teal-600">
                                Live link
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <CategoryLabel category={doc.category} />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-500">
                          {doc.scheme}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <User className="w-3.5 h-3.5" />
                          {doc.uploadedBy?.name || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDocumentDate(doc.uploadedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {doc.kind === "embed" ? (
                            <a
                              href={doc.embedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              <Link2 className="w-4 h-4" />
                              Open
                            </a>
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

      {/* Add document drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !submitting && setDrawerOpen(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800">
                New document
              </h4>
              <button
                onClick={() => !submitting && setDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Scheme <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                    required
                  >
                    <option value="">Select a scheme</option>
                    {schemeOptions.map((s) => (
                      <option key={s.id} value={s.fullName}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly incident summary"
                  className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                />
              </div>

              {selectedFile ? (
                <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <TypeTag
                      size="lg"
                      type={getDocumentType({
                        kind: "file",
                        fileName: selectedFile.name,
                        fileType: selectedFile.type,
                      })}
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

            {/* Drawer footer */}
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
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
    </StaffSidebarLayout>
  );
};

export default StaffDocumentsPage;
