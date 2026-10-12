import { describe, it, expect } from "vitest";
import { computeUptimeReport, getReportCameras } from "../cctvUptimeReport";

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);
const CAMS = ["CAM 1", "CAM 2", "CAM 10"];

const fault = (over) => ({
  camera: "CAM 1",
  status: "completed",
  createdAt: NOW - 5 * HOUR,
  completedAt: NOW - 4 * HOUR,
  referenceId: "CCTV-001",
  ...over,
});

describe("computeUptimeReport", () => {
  it("reports 100% uptime for every camera when there are no faults", () => {
    const r = computeUptimeReport({ faults: [], cameras: CAMS, now: NOW });
    expect(r.cameras.map((c) => c.uptimePct)).toEqual([100, 100, 100]);
    expect(r.totals).toEqual({
      avgUptimePct: 100,
      totalOutages: 0,
      avgMttrMins: null,
      liveFaults: 0,
    });
  });

  it("counts a completed fault inside the window", () => {
    const r = computeUptimeReport({ faults: [fault()], cameras: CAMS, now: NOW });
    const cam = r.cameras[0];
    expect(cam.name).toBe("CAM 1");
    expect(cam.downMins).toBe(60);
    expect(cam.outages).toBe(1);
    expect(cam.mttrMins).toBe(60);
    expect(cam.uptimePct).toBe(95.8);
    expect(cam.faultRefs).toEqual(["CCTV-001"]);
  });

  it("clips down-time of a fault that started before the window", () => {
    const r = computeUptimeReport({
      faults: [fault({ createdAt: NOW - 30 * HOUR, completedAt: NOW - 20 * HOUR })],
      cameras: CAMS,
      now: NOW,
    });
    expect(r.cameras[0].downMins).toBe(4 * 60);
  });

  it("treats a live fault as down until now and flags it", () => {
    const r = computeUptimeReport({
      faults: [fault({ status: "live", completedAt: undefined, createdAt: NOW - 2 * HOUR })],
      cameras: CAMS,
      now: NOW,
    });
    expect(r.cameras[0].liveFault).toBe(true);
    expect(r.cameras[0].downMins).toBe(120);
    expect(r.totals.liveFaults).toBe(1);
  });

  it("ignores faults resolved before the window, unknown cameras and incomplete docs", () => {
    const r = computeUptimeReport({
      faults: [
        fault({ createdAt: NOW - 40 * HOUR, completedAt: NOW - 30 * HOUR }),
        fault({ camera: "CAM 99" }),
        fault({ completedAt: undefined }),
        fault({ createdAt: undefined }),
      ],
      cameras: CAMS,
      now: NOW,
    });
    expect(r.totals.totalOutages).toBe(0);
  });

  it("sorts faulted cameras first, then numerically", () => {
    const r = computeUptimeReport({
      faults: [fault({ camera: "CAM 10" })],
      cameras: CAMS,
      now: NOW,
    });
    expect(r.cameras.map((c) => c.name)).toEqual(["CAM 10", "CAM 1", "CAM 2"]);
  });

  it("accepts Firestore-style timestamps", () => {
    const ts = (ms) => ({ toMillis: () => ms });
    const r = computeUptimeReport({
      faults: [fault({ createdAt: ts(NOW - 2 * HOUR), completedAt: ts(NOW - HOUR) })],
      cameras: CAMS,
      now: NOW,
    });
    expect(r.cameras[0].downMins).toBe(60);
  });
});

describe("getReportCameras", () => {
  it("returns third-party cameras without the 'All Working Correctly' option", () => {
    const cams = getReportCameras("A66-WJ");
    expect(cams).toHaveLength(20);
    expect(cams).not.toContain("All Working Correctly");
  });

  it("returns internal cameras and an empty list for unknown schemes", () => {
    expect(getReportCameras("M48").length).toBeGreaterThan(0);
    expect(getReportCameras("nope")).toEqual([]);
  });
});
