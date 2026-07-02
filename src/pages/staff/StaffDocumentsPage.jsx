import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import {
  Upload,
  Download,
  Link2,
  Search,
  FolderOpen,
  Trash2,
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

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

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

  // Composer drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New-document fields
  const [scheme, setScheme] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [title, setTitle] = useState("");
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
    const onKey = (e) => e.key === "Escape" && !submitting && setDrawerOpen(false);
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
      const key = `documents/${userProfile.uid}/${Date.now()}_${selectedFile.name}`;
      const arrayBuffer = await selectedFile.arrayBuffer();
      await r2Client.send(
        new PutObjectCommand({
          Bucket: import.meta.env.VITE_R2_BUCKET,
          Key: key,
          Body: new Uint8Array(arrayBuffer),
          ContentType: selectedFile.type || "application/octet-stream",
        }),
      );
      const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`;

      await staffService.submitDocument(
        {
          kind: "file",
          title: title.trim(),
          category,
          scheme,
          fileName: selectedFile.name,
          fileUrl: key,
          downloadUrl: publicUrl,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || "application/octet-stream",
        },
        userProfile.uid,
        userProfile.displayName,
      );
      toast.success("Document added");
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

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? Clients will no longer see it.`))
      return;
    try {
      await staffService.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Document deleted");
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Couldn't delete the document. Try again.");
    }
  };

  const categoryCounts = documents.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});

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
      <div className="min-h-full">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-gray-900">
              Documents
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <span className="tabular-nums font-medium text-gray-700">
                {documents.length}
              </span>
              {documents.length === 1 ? "file" : "files"} in the library — visible
              to each scheme's clients
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 lg:flex-none">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search titles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full lg:w-64 pl-9 pr-3 h-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-shadow"
              />
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 active:bg-teal-700 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              New document
            </button>
          </div>
        </div>

        {/* Category rail — underlined segments with live counts */}
        <div className="flex items-center gap-6 border-b border-gray-200 overflow-x-auto mb-1">
          {CATEGORIES.map((cat) => {
            const count = cat === "All" ? documents.length : categoryCounts[cat] || 0;
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative -mb-px whitespace-nowrap pb-3 text-sm transition-colors ${
                  active
                    ? "text-teal-600 font-semibold"
                    : "text-gray-500 hover:text-gray-800 font-medium"
                }`}
              >
                {cat}
                <span className="ml-1.5 tabular-nums text-xs text-gray-400">
                  {count}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-teal-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Library */}
        {loading ? (
          <div className="py-24 text-center">
            <span className="loading loading-spinner loading-md text-teal-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-800 font-medium">
              {search || activeCategory !== "All"
                ? "Nothing matches that filter"
                : "No documents filed yet"}
            </p>
            <p className="text-sm text-gray-500 mt-1 mb-5 max-w-xs">
              {search || activeCategory !== "All"
                ? "Try a different category or clear your search."
                : "Add your first file to share it with a scheme's clients."}
            </p>
            {!search && activeCategory === "All" && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New document
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4">
            {/* Column heads */}
            <div className="hidden md:grid grid-cols-[1fr_140px_120px_130px_90px_80px] gap-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <span>Document</span>
              <span>Category</span>
              <span className="hidden lg:block">Scheme</span>
              <span className="hidden lg:block">Added by</span>
              <span>Date</span>
              <span className="text-right">Actions</span>
            </div>

            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {filtered.map((doc) => {
                const type = getDocumentType(doc);
                return (
                  <li
                    key={doc.id}
                    className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_120px_130px_90px_80px] gap-x-4 gap-y-2 items-center px-3 py-3.5 hover:bg-gray-50/70 transition-colors rounded-lg"
                  >
                    {/* Document */}
                    <div className="flex items-center gap-3 min-w-0">
                      <TypeTag type={type} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-2 md:hidden mt-0.5">
                          <CategoryLabel category={doc.category} />
                          <span className="text-xs text-gray-400 tabular-nums">
                            {formatDocumentDate(doc.uploadedAt)}
                          </span>
                        </div>
                        {doc.kind === "embed" && (
                          <span className="hidden md:inline text-[11px] font-medium text-teal-600">
                            Live link
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="hidden md:block">
                      <CategoryLabel category={doc.category} />
                    </div>

                    {/* Scheme */}
                    <div className="hidden lg:block text-sm text-gray-500 truncate">
                      {doc.scheme}
                    </div>

                    {/* Added by */}
                    <div className="hidden lg:block text-sm text-gray-500 truncate">
                      {doc.uploadedBy?.name || "—"}
                    </div>

                    {/* Date */}
                    <div className="hidden md:block text-sm text-gray-400 tabular-nums">
                      {formatDocumentDate(doc.uploadedAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {doc.kind === "embed" ? (
                        <a
                          href={doc.embedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-9 h-9 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Open live link"
                        >
                          <Link2 className="w-[18px] h-[18px]" />
                        </a>
                      ) : (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-9 h-9 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-[18px] h-[18px]" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="inline-flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Composer drawer */}
      <div
        className={`fixed inset-0 z-60 bg-gray-900/30 transition-opacity duration-200 motion-reduce:transition-none ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => !submitting && setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Add a new document"
        className={`fixed inset-y-0 right-0 z-70 w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New document</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Appears in the client portal for the scheme you pick.
            </p>
          </div>
          <button
            onClick={() => !submitting && setDrawerOpen(false)}
            className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              File <span className="text-red-500">*</span>
            </label>
            {selectedFile ? (
              <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-3">
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
                <input type="file" className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>
        </div>

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
            {submitting ? "Adding…" : "Add document"}
          </button>
        </div>
      </aside>
    </StaffSidebarLayout>
  );
};

export default StaffDocumentsPage;
