import { Camera, FileText, AlertTriangle, Calendar, Eye } from "lucide-react";
import { DEMO_SCHEME_ID } from "./schemes";

// Shared across StaffReportsPage, ThirdPartyReportsPage, and the live-reports
// hook so the type→icon/color mapping (and demo-scheme exclusion) can't drift.
export const FORM_TYPE_META = {
  "CCTV Check Sheet": { type: "CCTV Check", icon: Camera, color: "bg-purple-100 text-purple-600" },
  "Incident Report": { type: "Incident Report", icon: FileText, color: "bg-teal-100 text-teal-600" },
  "Asset Damage": { type: "Asset Damage", icon: AlertTriangle, color: "bg-orange-100 text-orange-600" },
  "Daily Occurrence": { type: "Daily Logs", icon: Calendar, color: "bg-blue-100 text-blue-600" },
  "CCTV Faults": { type: "CCTV Faults", icon: Eye, color: "bg-pink-100 text-pink-600" },
};

// Maps a Firestore collection name to the raw `type` label used above.
export const COLLECTION_TO_RAW_TYPE = {
  cctvCheckForms: "CCTV Check Sheet",
  incidentReports: "Incident Report",
  assetDamageReports: "Asset Damage",
  dailyOccurrenceReports: "Daily Occurrence",
  cctvFaultsReports: "CCTV Faults",
};

// Adds the display type/icon/color for a raw form doc tagged with its source type.
export function decorateForm(rawForm) {
  const meta = FORM_TYPE_META[rawForm.type];
  return meta ? { ...rawForm, ...meta } : rawForm;
}

// Excludes demo scheme (DMO1) forms from the admin view.
export function excludeDemoScheme(reports) {
  return reports.filter((report) => {
    if (report.schemeIds && Array.isArray(report.schemeIds)) {
      return !report.schemeIds.every((id) => id === DEMO_SCHEME_ID);
    }
    const schemeId = report.schemeId || report.scheme?.split(" ")[0];
    return schemeId !== DEMO_SCHEME_ID;
  });
}
