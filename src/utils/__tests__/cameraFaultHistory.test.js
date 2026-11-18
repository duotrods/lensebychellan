import { describe, it, expect } from "vitest";
import { buildCameraFaultHistory } from "../cameraFaultHistory";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);
const ts = (ms) => ({ toMillis: () => ms });

const fault = (over) => ({
  id: "f1",
  camera: "CCTV 5",
  status: "completed",
  referenceId: "CCTV-001",
  createdAt: ts(NOW - 5 * DAY),
  completedAt: ts(NOW - 5 * DAY + 2 * HOUR),
  ...over,
});

const run = (faults, extra = {}) => buildCameraFaultHistory({ faults, now: NOW, ...extra });

describe("buildCameraFaultHistory", () => {
  it("returns no cameras when there are no faults", () => {
    expect(run([]).cameras).toEqual([]);
  });

  it("groups several fault forms of the same camera into one entry", () => {
    const r = run([
      fault({ id: "a", referenceId: "CCTV-001" }),
      fault({ id: "b", referenceId: "CCTV-002", createdAt: ts(NOW - 2 * DAY), completedAt: ts(NOW - 2 * DAY + HOUR) }),
      fault({ id: "c", camera: "CCTV 9", referenceId: "CCTV-003" }),
    ]);
    const cam5 = r.cameras.find((c) => c.camera === "CCTV 5");
    expect(cam5.faultCount).toBe(2);
    expect(cam5.faults.map((f) => f.referenceId)).toEqual(["CCTV-001", "CCTV-002"]); // oldest first
    expect(r.cameras).toHaveLength(2);
  });

  it("ignores faults that were resolved before the 30 day window", () => {
    const r = run([
      fault({ id: "old", createdAt: ts(NOW - 40 * DAY), completedAt: ts(NOW - 39 * DAY) }),
    ]);
    expect(r.cameras).toEqual([]);
  });

  it("keeps a fault that started before the window but ended inside it", () => {
    const r = run([
      fault({ id: "x", createdAt: ts(NOW - 35 * DAY), completedAt: ts(NOW - 10 * DAY) }),
    ]);
    expect(r.cameras).toHaveLength(1);
  });

  it("keeps a still-live fault however old it is, with no end", () => {
    const r = run([fault({ id: "live", status: "live", completedAt: undefined, createdAt: ts(NOW - 60 * DAY) })]);
    expect(r.cameras[0].hasLive).toBe(true);
    expect(r.cameras[0].faults[0].endMs).toBeNull();
  });

  it("merges notes from every fault of a camera, newest first", () => {
    const r = run([
      fault({
        id: "a",
        referenceId: "CCTV-001",
        clientNotes: [{ text: "Engineer booked", addedAt: new Date(NOW - 4 * DAY).toISOString(), authorName: "Sam", authorRole: "cctvfaultoperator" }],
      }),
      fault({
        id: "b",
        referenceId: "CCTV-002",
        createdAt: ts(NOW - 2 * DAY),
        completedAt: ts(NOW - 2 * DAY + HOUR),
        clientNotes: [
          { text: "Power fault again", addedAt: new Date(NOW - 2 * DAY + 10 * 60000).toISOString(), authorName: "Ann", authorRole: "staff" },
          { text: "Replaced", addedAt: new Date(NOW - 1 * DAY).toISOString(), authorName: "Sam", authorRole: "cctvfaultoperator" },
        ],
      }),
    ]);
    const notes = r.cameras[0].notes;
    expect(notes.map((n) => n.text)).toEqual(["Replaced", "Power fault again", "Engineer booked"]);
    expect(notes.map((n) => n.referenceId)).toEqual(["CCTV-002", "CCTV-002", "CCTV-001"]);
  });

  it("falls back to the legacy clientNote string, dated at the fault start and flagged", () => {
    const r = run([fault({ clientNote: "  Old style note  " })]);
    expect(r.cameras[0].notes).toEqual([
      expect.objectContaining({ text: "Old style note", legacy: true, atMs: NOW - 5 * DAY }),
    ]);
  });

  it("uses clientNotes and ignores clientNote when both exist", () => {
    const r = run([
      fault({ clientNote: "legacy", clientNotes: [{ text: "threaded", addedAt: new Date(NOW - DAY).toISOString() }] }),
    ]);
    expect(r.cameras[0].notes.map((n) => n.text)).toEqual(["threaded"]);
  });

  it("accepts Timestamp, Date, epoch ms and ISO string times", () => {
    const r = run([
      fault({ id: "a", createdAt: new Date(NOW - 3 * DAY), completedAt: NOW - 3 * DAY + HOUR }),
      fault({ id: "b", createdAt: ts(NOW - 2 * DAY), completedAt: ts(NOW - 2 * DAY + HOUR), clientNotes: [{ text: "n", addedAt: "not a date" }] }),
    ]);
    expect(r.cameras[0].faults.map((f) => f.startMs)).toEqual([NOW - 3 * DAY, NOW - 2 * DAY]);
    expect(r.cameras[0].notes[0].atMs).toBe(NOW - 2 * DAY); // invalid note date falls back to fault start
  });

  it("skips faults with no camera or no created time", () => {
    const r = run([fault({ camera: "  " }), fault({ createdAt: undefined })]);
    expect(r.cameras).toEqual([]);
  });

  it("orders cameras: live first, then most faults, then name", () => {
    const r = run([
      fault({ id: "1", camera: "CCTV 10" }),
      fault({ id: "2", camera: "CCTV 2" }),
      fault({ id: "3", camera: "CCTV 2", createdAt: ts(NOW - DAY), completedAt: ts(NOW - DAY + HOUR) }),
      fault({ id: "4", camera: "CCTV 7", status: "live", completedAt: undefined }),
    ]);
    expect(r.cameras.map((c) => c.camera)).toEqual(["CCTV 7", "CCTV 2", "CCTV 10"]);
  });

  it("reports the window it used", () => {
    const r = run([], { days: 7 });
    expect(r.windowStartMs).toBe(NOW - 7 * DAY);
    expect(r.windowEndMs).toBe(NOW);
  });

  it("all time (days = null) keeps old resolved faults and starts the window at the earliest one", () => {
    const r = run(
      [
        fault({ id: "old", createdAt: ts(NOW - 200 * DAY), completedAt: ts(NOW - 199 * DAY) }),
        fault({ id: "new", camera: "CCTV 9", createdAt: ts(NOW - 3 * DAY), completedAt: ts(NOW - 3 * DAY + HOUR) }),
      ],
      { days: null },
    );
    expect(r.cameras.map((c) => c.camera).sort()).toEqual(["CCTV 5", "CCTV 9"]);
    expect(r.windowStartMs).toBe(NOW - 200 * DAY);
  });

  it("all time with no faults falls back to a 30 day window", () => {
    const r = run([], { days: null });
    expect(r.cameras).toEqual([]);
    expect(r.windowStartMs).toBe(NOW - 30 * DAY);
  });
});
