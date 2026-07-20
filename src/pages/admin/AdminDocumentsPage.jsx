import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DOCUMENT_CATEGORIES,
  getDocumentType,
  formatFileSize,
  formatDocumentDate,
} from "../../utils/documents";
import { SCHEMES, DEMO_SCHEME_ID } from "../../utils/schemes";

// Non-demo schemes for the dropdown — mirrors StaffReportsPage.
const availableSchemes = SCHEMES.filter((s) => !s.isDemo);

const PAGE_SIZE = 10;
const SEARCH_LIMIT = 50; // bounded search — cost-capped instead of scanning everything

// Demo scheme (DMO1) docs never surface in the admin view — mirrors StaffReportsPage.
const excludeDemo = (docs) =>
  docs.filter((d) => {
    if (Array.isArray(d.schemeIds) && d.schemeIds.length > 0) {
      return !d.schemeIds.every((id) => id === DEMO_SCHEME_ID);
    }
    return d.schemeId !== DEMO_SCHEME_ID;
  });

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
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterScheme, setFilterScheme] = useState("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDoc, setConfirmDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination — cursor-based, page cache means Prev/back-navigation costs 0 reads.
  const [currentPage, setCurrentPage] = useState(1);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageCacheRef = useRef({}); // { pageNum: { data, cursor, hasMore } }

  // Search — bounded single fetch (SEARCH_LIMIT) instead of scanning everything.
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef(null);

  const isSearchMode = search.trim() !== "";

  useEffect(() => {
    loadPage(true);
    loadTotalCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFilters = (overrideCategory = null, overrideScheme = null) => {
    const category = overrideCategory !== null ? overrideCategory : filterCategory;
    const scheme = overrideScheme !== null ? overrideScheme : filterScheme;
    return {
      category: category !== "all" ? category : null,
      schemeId: scheme !== "all" ? scheme : null,
    };
  };

  const loadPage = async (
    resetPage = false,
    targetPage = null,
    overrideCategory = null,
    overrideScheme = null,
  ) => {
    // Already-visited pages are served from cache — no Firestore read.
    if (targetPage && pageCacheRef.current[targetPage]) {
      const cached = pageCacheRef.current[targetPage];
      setDocuments(cached.data);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      setCurrentPage(targetPage);
      return;
    }

    try {
      setLoading(true);
      const effectiveCursor = resetPage ? null : cursor;
      const result = await staffService.getDocumentsPaginated(
        PAGE_SIZE,
        effectiveCursor,
        activeFilters(overrideCategory, overrideScheme),
      );
      const cleaned = excludeDemo(result.documents);
      setDocuments(cleaned);
      setCursor(result.cursor);
      setHasMore(result.hasMore);

      const pageNum = targetPage || (resetPage ? 1 : currentPage);
      pageCacheRef.current[pageNum] = {
        data: cleaned,
        cursor: result.cursor,
        hasMore: result.hasMore,
      };

      if (resetPage) setCurrentPage(1);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const loadTotalCount = async (overrideCategory = null, overrideScheme = null) => {
    try {
      const count = await staffService.getDocumentsCount(
        activeFilters(overrideCategory, overrideScheme),
      );
      setTotalCount(count);
    } catch (error) {
      console.warn("Could not load documents count:", error);
    }
  };

  const runSearch = async (term, overrideCategory = null, overrideScheme = null) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await staffService.getDocumentsPaginated(
        SEARCH_LIMIT,
        null,
        activeFilters(overrideCategory, overrideScheme),
      );
      const matches = excludeDemo(result.documents).filter((d) =>
        (d.title || "").toLowerCase().includes(term.toLowerCase()),
      );
      setSearchResults(matches);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const resetPagination = () => {
    setCursor(null);
    setCurrentPage(1);
    pageCacheRef.current = {};
  };

  const handleCategoryChange = (newCategory) => {
    setFilterCategory(newCategory);
    resetPagination();
    if (isSearchMode) {
      runSearch(search, newCategory, null);
    } else {
      loadPage(true, null, newCategory, null);
    }
    loadTotalCount(newCategory, null);
  };

  const handleSchemeChange = (newScheme) => {
    setFilterScheme(newScheme);
    resetPagination();
    if (isSearchMode) {
      runSearch(search, null, newScheme);
    } else {
      loadPage(true, null, null, newScheme);
    }
    loadTotalCount(null, newScheme);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      runSearch(value);
    }, 300);
  };

  const handleNextPage = () => {
    if (!hasMore) return;
    loadPage(false, currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    loadPage(false, currentPage - 1);
  };

  const confirmDelete = async () => {
    if (!confirmDoc) return;
    setDeleting(true);
    try {
      await staffService.deleteDocument(confirmDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDoc.id));
      setSearchResults((prev) => prev.filter((d) => d.id !== confirmDoc.id));
      // Cached pages may now be stale (one doc short) — drop the cache so
      // Prev/Next re-fetches instead of showing a phantom deleted row.
      pageCacheRef.current = {};
      toast.success("Document deleted");
      setConfirmDoc(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  const currentDocs = isSearchMode ? searchResults : documents;
  const isLoading = isSearchMode ? searchLoading : loading;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <AdminSidebarLayout>
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Documents</h1>
          <p className="text-gray-600">
            All documents across every scheme. Download files, preview live
            links, or remove documents.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by document title..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Filter by Category */}
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full"
            >
              <option value="all">All Categories</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Filter by Scheme */}
            <select
              value={filterScheme}
              onChange={(e) => handleSchemeChange(e.target.value)}
              className="select bg-white border-gray-300 rounded-lg w-full"
            >
              <option value="all">All Schemes</option>
              {availableSchemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>
              {isSearchMode
                ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${search}"${
                    searchResults.length === SEARCH_LIMIT
                      ? ` (showing top ${SEARCH_LIMIT} — refine your search)`
                      : ""
                  }`
                : `Page ${currentPage}${totalPages > 1 ? ` of ${totalPages}` : ""}${
                    totalCount > 0 ? ` (${totalCount} total documents)` : ""
                  }`}
            </span>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="loading loading-spinner loading-lg text-teal-500"></div>
            </div>
          ) : currentDocs.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No documents found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-teal-500">
                    <tr>
                      <th className="text-left text-white">Category</th>
                      <th className="text-left text-white">File</th>
                      <th className="text-left text-white">Scheme</th>
                      <th className="text-left text-white">Date</th>
                      <th className="text-left text-white">Size</th>
                      <th className="text-center text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDocs.map((doc) => {
                      const type = getDocumentType(doc);
                      return (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td>
                            <CategoryBadge category={doc.category} />
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <FileIcon
                                type={type}
                                className="w-7 h-7 shrink-0"
                              />
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
                          <td className="text-sm text-gray-600 max-w-xs truncate">
                            {doc.scheme || "—"}
                          </td>
                          <td className="text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDocumentDate(doc.uploadedAt)}
                            </div>
                          </td>
                          <td className="text-sm text-gray-500">
                            {doc.kind === "embed"
                              ? "—"
                              : formatFileSize(doc.fileSize)}
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-2">
                              {doc.kind === "embed" ? (
                                <button
                                  onClick={() => setViewing(doc)}
                                  className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              ) : (
                                <a
                                  href={doc.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-ghost text-purple-600 hover:text-purple-800"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => setConfirmDoc(doc)}
                                className="btn btn-sm btn-ghost text-red-600 hover:text-red-800"
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
              </div>

              {/* Pagination — hidden while searching */}
              {!isSearchMode && (currentPage > 1 || hasMore) && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {currentPage}
                    {totalPages > 1 ? ` of ${totalPages}` : ""}
                    {totalCount > 0 ? ` (${totalCount} total documents)` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">
                      Page {currentPage}
                      {totalPages > 1 ? ` of ${totalPages}` : ""}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasMore}
                      className="btn btn-sm btn-outline"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
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
