import { describe, it, expect } from "vitest";
import {
  resolveDateRange,
  toJsDate,
  buildTypeSheet,
  buildExportWorkbook,
  exportFileName,
} from "../reportExport";

const NOW = new Date(2026, 8, 28, 14, 30); // 28 Sep 2026
const ts = (d) => ({ toDate: () => d }); // Firestore Timestamp stand-in

// Row values (skipping the header) for one column by header name.
const column = (sheet, header) => {
  const i = sheet.data[0].findIndex((h) => h.value === header);
  return sheet.data.slice(1).map((row) => row[i]);
};

describe("resolveDateRange", () => {
  it("returns no bounds for all time", () => {
    expect(resolveDateRange("all", {}, NOW)).toEqual({ startDate: null, endDate: null, label: "All time" });
  });

  it("covers the whole previous month", () => {
    const r = resolveDateRange("lastMonth", {}, NOW);
    expect(r.startDate).toEqual(new Date(2026, 7, 1));
    expect(r.endDate).toEqual(new Date(2026, 7, 31, 23, 59, 59, 999));
  });

  it("handles January's last month rolling back a year", () => {
    const r = resolveDateRange("lastMonth", {}, new Date(2026, 0, 10));
    expect(r.startDate).toEqual(new Date(2025, 11, 1));
    expect(r.endDate).toEqual(new Date(2025, 11, 31, 23, 59, 59, 999));
  });

  it("makes a custom range inclusive of both days", () => {
    const r = resolveDateRange("custom", { from: "2026-03-01", to: "2026-03-01" }, NOW);
    expect(r.startDate).toEqual(new Date(2026, 2, 1));
    expect(r.endDate).toEqual(new Date(2026, 2, 1, 23, 59, 59, 999));
  });

  it("rejects incomplete or inverted custom ranges", () => {
    expect(resolveDateRange("custom", { from: "2026-03-01" }, NOW)).toBeNull();
    expect(resolveDateRange("custom", { from: "2026-03-02", to: "2026-03-01" }, NOW)).toBeNull();
  });
});

describe("toJsDate", () => {
  it("accepts Timestamps, {seconds}, strings and rejects junk", () => {
    const d = new Date(2026, 0, 1);
    expect(toJsDate(ts(d))).toBe(d);
    expect(toJsDate({ seconds: 0 })).toEqual(new Date(0));
    expect(toJsDate("2026-01-01T00:00:00Z")).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(toJsDate("not a date")).toBeNull();
    expect(toJsDate(null)).toBeNull();
  });
});

describe("buildTypeSheet", () => {
  it("writes incident fields, joining arrays and naming the submitter", () => {
    const created = new Date(2026, 8, 1, 9, 0);
    const sheet = buildTypeSheet("incident", [
      {
        id: "x1",
        referenceId: "INC-001",
        createdAt: ts(created),
        affectedLanes: ["L1", "L2"],
        propertyDamage: false,
        assetType: "Barrier", // ignored when no damage
        submittedBy: { name: "Sam" },
        recoveryRequested: { light: 1, heavy: 0 },
      },
    ]);
    expect(column(sheet, "Reference ID")).toEqual(["INC-001"]);
    expect(column(sheet, "Created")).toEqual([created]);
    expect(column(sheet, "Affected Lanes")).toEqual(["L1, L2"]);
    expect(column(sheet, "Asset Damage")).toEqual(["No"]);
    expect(column(sheet, "Asset Type")).toEqual([null]);
    expect(column(sheet, "Submitted By")).toEqual(["Sam"]);
    expect(column(sheet, "Recovery Requested")).toEqual(["Light: 1"]);
  });

  it("flattens daily logs to one row per occurrence", () => {
    const sheet = buildTypeSheet("dailyOccurrence", [
      { referenceId: "DO-1", occurrences: [{ title: "A" }, { title: "B" }] },
      { referenceId: "DO-2", title: "Legacy" }, // no occurrences array
    ]);
    expect(sheet.rowCount).toBe(3);
    expect(column(sheet, "Reference ID")).toEqual(["DO-1", "DO-1", "DO-2"]);
    expect(column(sheet, "Occurrence #")).toEqual([1, 2, 1]);
    expect(column(sheet, "Title")).toEqual(["A", "B", "Legacy"]);
  });

  it("splits CCTV checks into one row per scheme section with data", () => {
    const check = {
      referenceId: "CC-1",
      a417Cameras: ["CAM 1", "CAM 2"],
      a417Blackspot: ["CAM 1"], // legacy array form
      a417TssInformed: true,
      m3Jct9: ["NONE"],
      kierCore: [],
      demoCameras: ["DEMO"], // never exported
    };
    const sheet = buildTypeSheet("cctvCheck", [check]);
    expect(column(sheet, "Scheme")).toEqual(["A417", "M3 Jct 9"]);
    expect(column(sheet, "Cameras Not Working")).toEqual(["CAM 1, CAM 2", null]);
    expect(column(sheet, "Status")).toEqual(["Issues reported", "All cameras working"]);
    expect(column(sheet, "Blackspot")).toEqual(["Yes", "No"]);
    expect(column(sheet, "TSS Informed")).toEqual(["Yes", "No"]);
  });

  it("limits CCTV check rows to the filtered scheme", () => {
    const sheet = buildTypeSheet("cctvCheck", [{ a417Cameras: ["X"], m3Jct9: ["Y"] }], "M3");
    expect(column(sheet, "Scheme")).toEqual(["M3 Jct 9"]);
  });

  it("exports a certified check as a single All Schemes row", () => {
    const sheet = buildTypeSheet("cctvCheck", [{ certified: true, a417Cameras: ["X"] }]);
    expect(column(sheet, "Scheme")).toEqual(["All Schemes"]);
    expect(column(sheet, "Status")).toEqual(["Certified"]);
  });

  it("keeps a numeric estimated cost numeric", () => {
    const sheet = buildTypeSheet("assetDamage", [{ estimatedCost: "250.5" }, { estimatedCost: "TBC" }]);
    expect(column(sheet, "Estimated Cost (£)")).toEqual([250.5, "TBC"]);
  });

  it("truncates text to Excel's cell limit", () => {
    const sheet = buildTypeSheet("cctvFaults", [{ comments: "a".repeat(40000) }]);
    expect(column(sheet, "Description")[0]).toHaveLength(32767);
  });
});

describe("buildExportWorkbook", () => {
  it("adds a summary sheet and only the requested types", () => {
    const sheets = buildExportWorkbook(
      { incident: [{}, {}], dailyOccurrence: [{ occurrences: [{}, {}, {}] }] },
      { rangeLabel: "All time", schemeLabel: "All schemes", generatedAt: NOW },
    );
    expect(sheets.map((s) => s.sheet)).toEqual(["Summary", "Incidents", "Daily Logs"]);
    const summaryRows = sheets[0].data.slice(-2);
    expect(summaryRows).toEqual([
      ["Incidents", 2, 2],
      ["Daily Logs", 1, 3],
    ]);
    expect(sheets[1].stickyRowsCount).toBe(1);
  });
});

describe("exportFileName", () => {
  it("names all-time and ranged exports distinctly", () => {
    expect(exportFileName("All time", NOW)).toMatch(/^staff-reports_all-time_\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(exportFileName("1 Sep – 28 Sep", NOW)).toMatch(/^staff-reports_range_/);
  });
});
