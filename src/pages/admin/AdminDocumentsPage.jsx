import { useState, useEffect } from "react";
import { staffService } from "../../services/staffService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
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
  Trash2,
  X,
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

// Confirmation dialog shown before a document is deleted.
const DeleteConfirmModal = ({ doc, deleting, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-lg font-bold text-gray-800 text-center mb-1">
        Delete document?
      </h2>
      <p className="text-sm text-gray-500 text-center mb-5">
        &quot;<span className="font-medium text-gray-700">{doc.title}</span>&quot;
        will no longer be visible to anyone. This can&apos;t be undone here.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:bg-red-700 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

const AdminDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDoc, setConfirmDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const all = await staffService.getDocuments();
      setDocuments(all);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDoc) return;
    setDeleting(true);
    try {
      await staffService.deleteDocument(confirmDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDoc.id));
      toast.success("Document deleted");
      setConfirmDoc(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
      loadDocuments();
    } finally {
      setDeleting(false);
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
    <AdminSidebarLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <FolderOpen className="w-7 h-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          </div>
          <p className="text-gray-500 ml-10">
            All documents across every scheme. Download files, preview live
            links, or remove documents.
          </p>
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
                            <span className="text-sm font-medium text-gray-800 leading-snug block">
                              {doc.title}
                            </span>
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
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-500">
                          {doc.scheme || "—"}
                        </span>
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
                      <td className="px-4 py-4">
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
                          <button
                            onClick={() => setConfirmDoc(doc)}
                            className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {confirmDoc && (
        <DeleteConfirmModal
          doc={confirmDoc}
          deleting={deleting}
          onConfirm={confirmDelete}
          onCancel={() => !deleting && setConfirmDoc(null)}
        />
      )}
    </AdminSidebarLayout>
  );
};

export default AdminDocumentsPage;
