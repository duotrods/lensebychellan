// Pure helpers for the admin "Export to Excel" feature: date-range presets and
// turning raw report docs into sheet data for `write-excel-file`. No Firebase
// imports so it can be unit-tested in isolation — the service fetches, this
// only shapes.

// Firestore collection for each exportable report type, in sheet order.
export const EXPORT_TYPES = [
  { key: "incident", label: "Incidents", collection: "incidentReports" },
  { key: "assetDamage", label: "Asset Damage", collection: "assetDamageReports" },
  { key: "dailyOccurrence", label: "Daily Logs", collection: "dailyOccurrenceReports" },
  { key: "cctvCheck", label: "CCTV Checks", collection: "cctvCheckForms" },
  { key: "cctvFaults", label: "CCTV Faults", collection: "cctvFaultsReports" },
];

export const DATE_RANGE_PRESETS = [
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" },
  { value: "all", label: "All time" },
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// "YYYY-MM-DD" (from <input type="date">) → local-time Date, or null.
const parseDateInput = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

const formatDay = (d) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Resolves a preset to `{ startDate, endDate, label }`. "all" returns
 * `{ startDate: null, endDate: null }` (no createdAt filter). Returns null for
 * an incomplete or inverted custom range.
 */
export function resolveDateRange(preset, custom = {}, now = new Date()) {
  let startDate;
  let endDate;
  switch (preset) {
    case "all":
      return { startDate: null, endDate: null, label: "All time" };
    case "thisMonth":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = endOfDay(now);
      break;
    case "lastMonth":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case "last30":
      startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      endDate = endOfDay(now);
      break;
    case "thisYear":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = endOfDay(now);
      break;
    case "custom": {
      const from = parseDateInput(custom.from);
      const to = parseDateInput(custom.to);
      if (!from || !to || from > to) return null;
      startDate = startOfDay(from);
      endDate = endOfDay(to);
      break;
    }
    default:
      return null;
  }
  return { startDate, endDate, label: `${formatDay(startDate)} – ${formatDay(endDate)}` };
}

// Firestore Timestamp / Date / {seconds} / ISO string / millis → Date, or null.
export function toJsDate(value) {
  if (value == null || value === "") return null;
  let d;
  if (typeof value.toDate === "function") d = value.toDate();
  else if (value instanceof Date) d = value;
  else if (typeof value.seconds === "number") d = new Date(value.seconds * 1000);
  else if (typeof value === "string" || typeof value === "number") d = new Date(value);
  else return null;
  return isNaN(d.getTime()) ? null : d;
}

// Excel caps a cell at 32,767 characters.
const MAX_CELL = 32767;

// Normalises any field value into something a cell can hold.
function cell(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return cell(value.filter((v) => v != null && v !== "").join(", "));
  if (typeof value.toDate === "function") return toJsDate(value);
  if (typeof value === "object") return value.name ? cell(value.name) : null;
  const s = String(value);
  return s.length > MAX_CELL ? s.slice(0, MAX_CELL - 1) + "…" : s;
}

const yesNo = (v) => (v ? "Yes" : "No");

const personName = (p) => (p && typeof p === "object" ? p.name || null : p || null);

// Older CCTV docs store blackspot as an array; non-empty (and not the
// "All Working Correctly" sentinel) means yes. Mirrors pdfGenerator.
const isBlackspot = (v) =>
  v === true ||
  (Array.isArray(v) && v.length > 0 && v[0] !== "All Working Correctly");

const schemeLabel = (r) =>
  r.scheme || (r.schemeIds?.length ? r.schemeIds.join(", ") : r.schemeId) || null;

// A date that may be a Timestamp or a free-text string: keep strings that
// don't parse (e.g. "Mon 3rd") rather than dropping them.
const dateOrText = (v) => toJsDate(v) ?? cell(v);

// Each column: header, width (chars), and a getter from the row source.
const INCIDENT_COLUMNS = [
  ["Reference ID", 16, (r) => r.referenceId || r.id],
  ["Created", 18, (r) => toJsDate(r.createdAt)],
  ["Scheme", 24, schemeLabel],
  ["Location", 22, (r) => r.location],
  ["Section", 14, (r) => r.section],
  ["Incident Type", 20, (r) => r.incidentType],
  ["Fault", 18, (r) => r.fault],
  ["Incursion", 10, (r) => r.incursion],
  ["Incursion to Gain Benefit", 12, (r) => r.incursionToGainAdvantage],
  ["Stood Down", 10, (r) => (r.standDown === undefined ? null : yesNo(r.standDown))],
  ["Asset Damage", 10, (r) => yesNo(r.propertyDamage)],
  ["Asset Type", 16, (r) => (r.propertyDamage ? r.assetType : null)],
  ["Damage Type", 16, (r) => (r.propertyDamage ? r.damageType : null)],
  ["Camera Number", 14, (r) => r.cameraNumber],
  ["Marker Post", 12, (r) => r.markerPost],
  ["Track", 10, (r) => r.track],
  ["Affected Lanes", 18, (r) => r.affectedLanes],
  ["Emergency Services", 18, (r) => r.emergencyServices],
  ["Recovery Requested", 20, (r) => {
    const x = r.recoveryRequested;
    if (!x || typeof x !== "object") return null;
    return [
      x.light && `Light: ${x.light}`,
      x.heavy && `Heavy: ${x.heavy}`,
      x.ipv && `IPV: ${x.ipv}`,
      x.hetos && `HETOS: ${x.hetos}`,
    ].filter(Boolean);
  }],
  ["Weather", 14, (r) => r.weatherConditions],
  ["Traffic", 14, (r) => r.trafficConditions],
  ["NH Log", 12, (r) => r.nhLog],
  ["Collar Number", 12, (r) => r.collarNumber],
  ["Reported By", 16, (r) => r.reportedBy],
  ["Time Spotted", 10, (r) => r.timeSpotted],
  ["Time On Site", 10, (r) => r.timeOnSite],
  ["Time Cleared", 10, (r) => r.timeCleared],
  ["Closed Log Collar", 12, (r) => r.closedLogCollar],
  ["Vehicles", 30, (r) =>
    (r.vehicles || [])
      .map((v) => [v.type, v.make, v.model, v.vin].filter(Boolean).join(" | "))
      .filter(Boolean)
      .join("; ")],
  ["Description", 50, (r) => r.description],
  ["Status", 12, (r) => r.status],
  ["Submitted By", 18, (r) => personName(r.submittedBy)],
  ["Last Edited By", 18, (r) => personName(r.lastEditedBy)],
];

const ASSET_DAMAGE_COLUMNS = [
  ["Reference ID", 16, (r) => r.referenceId || r.id],
  ["Created", 18, (r) => toJsDate(r.createdAt)],
  ["Scheme", 24, schemeLabel],
  ["Location", 22, (r) => r.location],
  ["Damage Type", 16, (r) => r.damageType],
  ["Asset Name", 18, (r) => r.assetName],
  ["Severity", 12, (r) => r.severity],
  ["Estimated Cost (£)", 14, (r) => {
    const n = Number(r.estimatedCost);
    return r.estimatedCost !== "" && r.estimatedCost != null && Number.isFinite(n)
      ? n
      : r.estimatedCost;
  }],
  ["Repair Status", 14, (r) => r.repairStatus],
  ["Description", 50, (r) => r.description],
  ["Status", 12, (r) => r.status],
  ["Submitted By", 18, (r) => personName(r.submittedBy)],
];

// Daily logs are flattened to one row per occurrence; `r` is
// `{ report, occ, index }` where `occ` falls back to the report itself.
const DAILY_LOG_COLUMNS = [
  ["Reference ID", 16, ({ report }) => report.referenceId || report.id],
  ["Created", 18, ({ report }) => toJsDate(report.createdAt)],
  ["Occurrence #", 8, ({ index }) => index + 1],
  ["Scheme", 24, ({ report, occ }) => occ.scheme || schemeLabel(report)],
  ["Date", 14, ({ occ }) => dateOrText(occ.date)],
  ["Time", 10, ({ occ }) => occ.time],
  ["Location", 22, ({ occ }) => occ.location],
  ["Title", 20, ({ occ }) => occ.title],
  ["Category", 16, ({ occ }) => occ.category],
  ["URN", 12, ({ occ }) => occ.urn],
  ["Recovery Required", 10, ({ occ }) =>
    occ.recoveryRequired === undefined ? null : yesNo(occ.recoveryRequired)],
  ["RCC", 12, ({ occ }) => occ.rcc],
  ["Name/Initials", 14, ({ occ }) => occ.nameInitials],
  ["Description", 50, ({ occ }) => occ.description],
  ["Action Taken", 40, ({ occ }) => occ.actionTaken],
  ["Weather", 14, ({ report, occ }) => occ.weatherConditions ?? report.weatherConditions],
  ["Traffic Flow", 14, ({ report, occ }) => occ.trafficFlow ?? report.trafficFlow],
  ["Submitted By", 18, ({ report }) => personName(report.submittedBy)],
];

// CCTV check sections, as stored on the form (field names are historical).
// Demo section is deliberately left out — admin views exclude DMO1.
const CCTV_SECTIONS = [
  { schemeId: "A417", name: "A417", cameras: "a417Cameras", comments: "a417Comments", blackspot: "a417Blackspot", tss: "a417TssInformed" },
  { schemeId: "A47", name: "A11/A47 Kier/Core", cameras: "kierCore", comments: "kierCoreComments", blackspot: "kierCoreBlackspot", tss: "kierCoreTssInformed" },
  { schemeId: "M3", name: "M3 Jct 9", cameras: "m3Jct9", comments: "m3Jct9Comments", blackspot: "m3Jct9Blackspot", tss: "m3TssInformed" },
  { schemeId: "A452", name: "A452 HS2", cameras: "A452", comments: "A452Comments", blackspot: "A452Blackspot", tss: "A452TssInformed" },
  { schemeId: "Gallows", name: "Costain - GC", cameras: "Costain", comments: "CostainComments", blackspot: "CostainBlackspot", tss: "CostainTssInformed" },
  { schemeId: "SimisterIsland", name: "Simister Island - Costain", cameras: "csi", comments: "csiComments", blackspot: "csiBlackspot", tss: "csiTssInformed" },
];

// `r` is `{ report, section }`; section is null for a certified whole-check.
const CCTV_CHECK_COLUMNS = [
  ["Reference ID", 16, ({ report }) => report.referenceId || report.id],
  ["Report Date", 12, ({ report }) => report.date],
  ["Report Time", 10, ({ report }) => report.time],
  ["Created", 18, ({ report }) => toJsDate(report.createdAt)],
  ["Checked By", 18, ({ report }) => report.firstName || personName(report.submittedBy)],
  ["Scheme", 24, ({ section }) => (section ? section.name : "All Schemes")],
  ["Status", 22, ({ report, section }) => {
    if (!section) return "Certified";
    const cams = report[section.cameras] || [];
    if (cams.includes("NONE")) return "All cameras working";
    return cams.length ? "Issues reported" : null;
  }],
  ["Cameras Not Working", 40, ({ report, section }) => {
    if (!section) return null;
    const cams = (report[section.cameras] || []).filter((c) => c !== "NONE");
    return cams;
  }],
  ["Blackspot", 10, ({ report, section }) => (section ? yesNo(isBlackspot(report[section.blackspot])) : null)],
  ["TSS Informed", 10, ({ report, section }) => (section ? yesNo(report[section.tss]) : null)],
  ["Comments", 50, ({ report, section }) =>
    section
      ? report[section.comments]
      : report.certificationText ||
        "I certify that a full CCTV check of all schemes has been completed."],
];

const CCTV_FAULT_COLUMNS = [
  ["Reference ID", 16, (r) => r.referenceId || r.id],
  ["Created", 18, (r) => toJsDate(r.createdAt)],
  ["Scheme", 24, schemeLabel],
  ["Camera", 20, (r) => r.camera],
  ["Status", 12, (r) => r.status],
  ["Blackspot Camera", 10, (r) => yesNo(r.blackspotCamera)],
  ["TSS Informed", 10, (r) => yesNo(r.tssInformed)],
  ["Client Acknowledged", 12, (r) => yesNo(r.clientAcknowledged)],
  ["Completed By", 18, (r) => personName(r.completedBy)],
  ["Completed At", 18, (r) => toJsDate(r.completedAt)],
  ["Description", 50, (r) => r.comments],
  ["Notes", 50, (r) => {
    const notes = r.clientNotes?.length
      ? r.clientNotes
      : r.clientNote
        ? [{ text: r.clientNote, authorName: "Operator" }]
        : [];
    return notes
      .map((n) => {
        const who = n.authorName || (n.authorRole === "cctvfaultoperator" ? "Operator" : "Staff");
        return `${who}: ${n.text ?? ""}`;
      })
      .join("\n");
  }],
  ["Submitted By", 18, (r) => personName(r.submittedBy)],
];

// Expands a raw report into the row sources for its sheet.
function dailyLogRows(report) {
  const occs = Array.isArray(report.occurrences) && report.occurrences.length
    ? report.occurrences
    : [report];
  return occs.map((occ, index) => ({ report, occ: occ || {}, index }));
}

function cctvCheckRows(report, schemeId) {
  if (report.certified) return [{ report, section: null }];
  const hasData = (s) =>
    (Array.isArray(report[s.cameras]) && report[s.cameras].length > 0) ||
    (typeof report[s.comments] === "string" && report[s.comments].trim() !== "");
  return CCTV_SECTIONS
    .filter((s) => (!schemeId || s.schemeId === schemeId) && hasData(s))
    .map((section) => ({ report, section }));
}

const SHEET_SPECS = {
  incident: { columns: INCIDENT_COLUMNS, rows: (r) => [r] },
  assetDamage: { columns: ASSET_DAMAGE_COLUMNS, rows: (r) => [r] },
  dailyOccurrence: { columns: DAILY_LOG_COLUMNS, rows: dailyLogRows },
  cctvCheck: { columns: CCTV_CHECK_COLUMNS, rows: cctvCheckRows },
  cctvFaults: { columns: CCTV_FAULT_COLUMNS, rows: (r) => [r] },
};

const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#D9F2EF" };
const DATE_FORMAT = "dd/mm/yyyy hh:mm";

/** Builds the column header row + data rows for one report type. */
export function buildTypeSheet(typeKey, reports, schemeId = null) {
  const spec = SHEET_SPECS[typeKey];
  const header = spec.columns.map(([h]) => ({ value: h, ...HEADER_STYLE }));
  const rows = reports.flatMap((r) => spec.rows(r, schemeId));
  const data = [header, ...rows.map((src) => spec.columns.map(([, , get]) => cell(get(src))))];
  return { data, columns: spec.columns.map(([, width]) => ({ width })), rowCount: rows.length };
}

// Excel sheet names: ≤31 chars, none of : \ / ? * [ ]
const safeSheetName = (s) => s.replace(/[:\\/?*[\]]/g, " ").slice(0, 31);

/**
 * Turns `{ [typeKey]: reports[] }` into the multi-sheet array
 * `write-excel-file` expects: a Summary sheet then one sheet per included type.
 * Types missing from `reportsByType` are skipped entirely.
 */
export function buildExportWorkbook(reportsByType, { rangeLabel, schemeLabel: scheme, schemeId = null, generatedAt = new Date() }) {
  const typeSheets = EXPORT_TYPES
    .filter((t) => Array.isArray(reportsByType[t.key]))
    .map((t) => ({ type: t, ...buildTypeSheet(t.key, reportsByType[t.key], schemeId) }));

  const bold = (value) => ({ value, fontWeight: "bold" });
  const summary = [
    [bold("Staff Reports Export")],
    [bold("Date range"), rangeLabel],
    [bold("Scheme"), scheme],
    [bold("Generated"), generatedAt],
    [],
    [{ value: "Report type", ...HEADER_STYLE }, { value: "Reports", ...HEADER_STYLE }, { value: "Rows", ...HEADER_STYLE }],
    ...typeSheets.map((s) => [s.type.label, reportsByType[s.type.key].length, s.rowCount]),
  ];

  return [
    { sheet: "Summary", data: summary, columns: [{ width: 22 }, { width: 30 }, { width: 10 }], dateFormat: DATE_FORMAT },
    ...typeSheets.map((s) => ({
      sheet: safeSheetName(s.type.label),
      data: s.data,
      columns: s.columns,
      dateFormat: DATE_FORMAT,
      stickyRowsCount: 1,
    })),
  ];
}

export function exportFileName(rangeLabel, now = new Date()) {
  const stamp = now.toISOString().slice(0, 10);
  const range = rangeLabel === "All time" ? "all-time" : "range";
  return `staff-reports_${range}_${stamp}.xlsx`;
}
