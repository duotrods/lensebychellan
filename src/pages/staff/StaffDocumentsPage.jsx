import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { staffService } from "../../services/staffService";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import {
  Upload,
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
  User,
  X,
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

const StaffDocumentsPage = () => {
  const { userProfile } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Metadata
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
      toast.error("Failed to load documents");
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
    const isUnder50MB = file.size <= 50 * 1024 * 1024;
    if (!isUnder50MB) {
      toast.error(`${file.name} exceeds 50MB limit`);
      return;
    }
    setSelectedFile(file);
    if (!title) setTitle(file.name);
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
      toast.error("Please select a scheme");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file");
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
      toast.success("Document uploaded");

      resetForm();
      loadDocuments();
    } catch (error) {
      console.error("Failed to add document:", error);
      toast.error("Failed to add document");
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">Documents</h3>
          <p className="text-gray-600">
            Upload files for a scheme — only that scheme's clients will see them.
          </p>
        </div>

        {/* Add panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          {/* Scheme + category + title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">
                  Scheme <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              >
                <option value="">Please Select</option>
                {schemeOptions.map((s) => (
                  <option key={s.id} value={s.fullName}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="label">
              <span className="label-text font-semibold mb-2">
                Title <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Incident Summary"
              className="input bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
            />
          </div>

          <div className="min-h-[188px]">
          {selectedFile ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon
                    type={getDocumentType({
                      kind: "file",
                      fileName: selectedFile.name,
                      fileType: selectedFile.type,
                    })}
                    className="w-7 h-7 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-gray-400 hover:text-red-500"
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
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 mb-4 transition-colors cursor-pointer ${
                  isDragging
                    ? "border-teal-400 bg-teal-50"
                    : "border-gray-300 hover:border-teal-400 hover:bg-teal-50"
                }`}
              >
                <div className="p-3 bg-teal-100 rounded-full">
                  <Upload className="w-6 h-6 text-teal-600" />
                </div>
                <p className="font-semibold text-gray-700">
                  Drag &amp; drop a file, or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  PDF, Excel, Word, images — up to 50MB
                </p>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Upload document"}
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
                          <FileIcon type={type} className="w-8 h-8 shrink-0" />
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
                        <CategoryBadge category={doc.category} />
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
    </StaffSidebarLayout>
  );
};

export default StaffDocumentsPage;
