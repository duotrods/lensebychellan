import { useState } from "react";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Search,
  Filter,
  FolderOpen,
  Clock,
  User,
} from "lucide-react";

const MOCK_DOCUMENTS = [
  {
    id: 1,
    name: "Monthly Incident Summary - April 2026.xlsx",
    type: "excel",
    size: "1.2 MB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "2 May 2026",
    category: "Reports",
  },
  {
    id: 2,
    name: "CCTV Maintenance Schedule Q2 2026.pdf",
    type: "pdf",
    size: "845 KB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "28 Apr 2026",
    category: "Maintenance",
  },
  {
    id: 3,
    name: "Scheme A417 Camera Locations.pdf",
    type: "pdf",
    size: "3.4 MB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "15 Apr 2026",
    category: "Scheme Info",
  },
  {
    id: 4,
    name: "Incident Data Export - March 2026.xlsx",
    type: "excel",
    size: "2.1 MB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "1 Apr 2026",
    category: "Reports",
  },
  {
    id: 5,
    name: "Service Level Agreement 2026.pdf",
    type: "pdf",
    size: "560 KB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "10 Jan 2026",
    category: "Contracts",
  },
  {
    id: 6,
    name: "Camera Fault Log - Q1 2026.xlsx",
    type: "excel",
    size: "980 KB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "31 Mar 2026",
    category: "Maintenance",
  },
  {
    id: 7,
    name: "Operational Procedures Manual.pdf",
    type: "pdf",
    size: "4.7 MB",
    uploadedBy: "Chellan Admin",
    uploadedAt: "5 Feb 2026",
    category: "Scheme Info",
  },
];

const CATEGORIES = ["All", "Reports", "Maintenance", "Scheme Info", "Contracts"];

const FileIcon = ({ type, className }) => {
  if (type === "excel") return <FileSpreadsheet className={`${className} text-emerald-600`} />;
  if (type === "pdf") return <FileText className={`${className} text-red-500`} />;
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
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[category] || "bg-gray-100 text-gray-600"}`}>
      {category}
    </span>
  );
};

const StaffDocumentsPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const filtered = MOCK_DOCUMENTS.filter((doc) => {
    const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <StaffSidebarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <FolderOpen className="w-7 h-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          </div>
          <p className="text-gray-500 ml-10">
            Upload and download documents shared between Chellan and your team — reports, spreadsheets, PDFs and more.
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 mb-8 transition-colors cursor-pointer ${
            dragOver ? "border-teal-400 bg-teal-50" : "border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50"
          }`}
        >
          <div className="p-4 bg-teal-100 rounded-full">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 text-lg">Drag & drop files here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse — PDF, Excel, Word, and more</p>
          </div>
          <button className="mt-2 px-5 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors">
            Browse Files
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
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No documents found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">File</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Uploaded by</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Size</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <FileIcon type={doc.type} className="w-8 h-8 shrink-0" />
                        <span className="text-sm font-medium text-gray-800 leading-snug">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <CategoryBadge category={doc.category} />
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <User className="w-3.5 h-3.5" />
                        {doc.uploadedBy}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {doc.uploadedAt}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-400">{doc.size}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          This feature is coming soon. File uploads and downloads will be fully functional in the next release.
        </p>
      </div>
    </StaffSidebarLayout>
  );
};

export default StaffDocumentsPage;
