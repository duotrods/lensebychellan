import { Download } from "lucide-react";
import {
  formatDate,
  formatTime,
  getReportTypeBadge,
} from "../../../utils/reportDisplay";

// Fallback detail modal shown when a report type has no dedicated view route.
const ReportDetailModal = ({ report, onClose, onDownload }) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Report Details</h2>
            <button onClick={onClose} className="btn btn-sm btn-ghost">
              ✕
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Reference ID</p>
              <p className="font-mono font-semibold">{report.referenceId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <span className={`badge ${getReportTypeBadge(report.reportType)}`}>
                {report.reportType.replace("-", " ").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">
                {formatDate(report.timestamp || report.date)}{" "}
                {formatTime(report.timestamp || report.time)}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Title/Type</p>
              <p className="font-medium">
                {report.type || report.title || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{report.location || "N/A"}</p>
            </div>
            {report.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-700">{report.description}</p>
              </div>
            )}
            {report.submittedBy && (
              <div>
                <p className="text-sm text-gray-500">Submitted By</p>
                <p className="font-medium">
                  {report.submittedBy?.name ||
                    (typeof report.submittedBy === "string"
                      ? report.submittedBy
                      : "Staff")}
                </p>
              </div>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => onDownload(report)}
              className="btn btn-brand flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </button>
            <button onClick={onClose} className="btn btn-outline flex-1">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
