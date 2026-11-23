import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faTriangleExclamation,
  faCalendar,
  faEye,
  faBox,
  faVideoSlash,
} from "@fortawesome/free-solid-svg-icons";

// Presentation helpers shared by the client Reports page (table, modal, cards).
// Kept in one place so the page component stays focused on data/pagination logic.

export const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = timestamp.seconds
    ? new Date(timestamp.seconds * 1000)
    : new Date(timestamp);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.seconds
    ? new Date(timestamp.seconds * 1000)
    : new Date(timestamp);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Parse a DD/MM/YYYY string into a Date (or null).
export const parseBritishDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return null;
};

// Display date for a report — form date for incident/asset/cctv, else createdAt.
export const getReportDisplayDate = (report) => {
  if (
    (report.reportType === "incident" ||
      report.reportType === "asset-damage" ||
      report.reportType === "cctv-check" ||
      report.reportType === "cctv-faults") &&
    report.date
  ) {
    const date = parseBritishDate(report.date);
    if (date) {
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return report.date;
  }
  return formatDate(report.timestamp);
};

// Display time for a report.
export const getReportDisplayTime = (report) => {
  if (report.reportType === "incident" && report.timeSpotted) {
    return report.timeSpotted;
  }
  if (
    (report.reportType === "asset-damage" ||
      report.reportType === "cctv-check" ||
      report.reportType === "cctv-faults") &&
    report.time
  ) {
    return report.time;
  }
  return formatTime(report.timestamp);
};

export const getReportTypeIcon = (type) => {
  switch (type) {
    case "incident":
      return <FontAwesomeIcon icon={faTriangleExclamation} className="w-5 h-5 text-orange-500" />;
    case "asset-damage":
      return <FontAwesomeIcon icon={faBox} className="w-5 h-5 text-red-500" />;
    case "daily-occurrence":
      return <FontAwesomeIcon icon={faCalendar} className="w-5 h-5 text-blue-500" />;
    case "cctv-check":
      return <FontAwesomeIcon icon={faEye} className="w-5 h-5 text-green-500" />;
    case "cctv-faults":
      return <FontAwesomeIcon icon={faEye} className="w-5 h-5 text-purple-500" />;
    default:
      return <FontAwesomeIcon icon={faFileLines} className="w-5 h-5 text-gray-500" />;
  }
};

// Same rounded-full tinted pill (icon + label) as the Type column in the admin Reports table
// (StaffReportsPage renderFormTypeBadge), keyed by the client reportType values.
const TYPE_PILLS = {
  incident: { label: "Incident Report", icon: faTriangleExclamation, color: "bg-orange-100 text-orange-700" },
  "asset-damage": { label: "Asset Damage", icon: faFileLines, color: "bg-red-100 text-red-700" },
  "daily-occurrence": { label: "Daily Logs", icon: faCalendar, color: "bg-blue-100 text-blue-700" },
  "cctv-check": { label: "CCTV Check", icon: faEye, color: "bg-green-100 text-green-700" },
  "cctv-faults": { label: "CCTV Faults", icon: faVideoSlash, color: "bg-fuchsia-100 text-fuchsia-700" },
};

export const renderReportTypePill = (type) => {
  const pill = TYPE_PILLS[type] || {
    label: (type || "Report").replace(/-/g, " "),
    icon: faFileLines,
    color: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${pill.color}`}>
      <FontAwesomeIcon icon={pill.icon} className="w-3.5 h-3.5" />
      {pill.label}
    </span>
  );
};

export const getReportTypeBadge = (type) => {
  const badges = {
    incident: "badge-warning",
    "asset-damage": "badge-error",
    "daily-occurrence": "badge-info",
    "cctv-check": "badge-success",
    "cctv-faults": "badge-secondary",
  };
  return badges[type] || "badge-ghost";
};
