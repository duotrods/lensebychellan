import { toMs } from "./cctvUptimeReport";

const DAY_MS = 24 * 60 * 60 * 1000;

// Timestamp | Date | epoch ms | ISO string → epoch ms (undefined when missing/invalid).
// clientNotes[].addedAt is an ISO string while createdAt/completedAt are Timestamps.
const toTime = (v) => {
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? undefined : ms;
  }
  return toMs(v);
};

/**
 * Groups CCTV faults by camera for the client "camera fault history" charts.
 * Input must already be one scheme's faults (the same camera name exists in several
 * schemes). Only cameras with a fault overlapping the last `days` days (or any, when
 * `days` is null) are returned.
 *
 * Per camera: its faults as timeline bars (endMs null = still live) and the notes from
 * every one of those faults merged into one list, newest first.
 */
export const buildCameraFaultHistory = ({ faults, now = Date.now(), days = 30 }) => {
  // days = null means "all time": every fault counts and the timeline starts at the earliest one.
  const allTime = days === null || days === undefined;
  const cutoffMs = allTime ? -Infinity : now - days * DAY_MS;
  let earliestMs = Infinity;
  const byCamera = new Map();

  for (const fault of faults || []) {
    const camera = typeof fault.camera === "string" ? fault.camera.trim() : "";
    const startMs = toTime(fault.createdAt);
    if (!camera || startMs === undefined) continue;

    const isLive = fault.status === "live";
    const endMs = isLive ? null : (toTime(fault.completedAt) ?? startMs);
    // A live fault is always relevant; a resolved one only if it ended inside the window.
    if (!isLive && endMs < cutoffMs) continue;
    earliestMs = Math.min(earliestMs, startMs);

    if (!byCamera.has(camera)) {
      byCamera.set(camera, { camera, faultCount: 0, hasLive: false, faults: [], notes: [] });
    }
    const entry = byCamera.get(camera);
    entry.faultCount += 1;
    entry.hasLive = entry.hasLive || isLive;
    entry.faults.push({
      id: fault.id,
      referenceId: fault.referenceId || fault.id,
      status: isLive ? "live" : "completed",
      startMs,
      endMs,
      comments: fault.comments || "",
    });

    const base = { faultId: fault.id, referenceId: fault.referenceId || fault.id };
    const threaded = Array.isArray(fault.clientNotes)
      ? fault.clientNotes.filter((n) => n && typeof n.text === "string" && n.text.trim())
      : [];
    if (threaded.length > 0) {
      for (const n of threaded) {
        entry.notes.push({
          ...base,
          text: n.text.trim(),
          atMs: toTime(n.addedAt) ?? startMs,
          authorName: n.authorName || "",
          authorRole: n.authorRole || "",
          legacy: false,
        });
      }
    } else if (typeof fault.clientNote === "string" && fault.clientNote.trim()) {
      // Older faults kept one undated string; place it at the fault's start.
      entry.notes.push({
        ...base,
        text: fault.clientNote.trim(),
        atMs: startMs,
        authorName: "",
        authorRole: "",
        legacy: true,
      });
    }
  }

  const cameras = [...byCamera.values()];
  for (const c of cameras) {
    c.faults.sort((a, b) => a.startMs - b.startMs);
    c.notes.sort((a, b) => b.atMs - a.atMs);
  }
  cameras.sort(
    (a, b) =>
      Number(b.hasLive) - Number(a.hasLive) ||
      b.faultCount - a.faultCount ||
      a.camera.localeCompare(b.camera, undefined, { numeric: true }),
  );

  const windowStartMs = allTime
    ? Number.isFinite(earliestMs) ? earliestMs : now - 30 * DAY_MS
    : cutoffMs;
  return { windowStartMs, windowEndMs: now, cameras };
};
