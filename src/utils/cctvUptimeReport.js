import { CAMERA_OPTIONS_BY_SCHEME, getThirdPartySchemeById } from "./schemes";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_WORKING = "All Working Correctly";

// Firestore Timestamp, Date or epoch ms → epoch ms (undefined when missing).
const toMs = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return undefined;
};

/** Camera names for a scheme (internal or third-party), minus the "all working" option. */
export const getReportCameras = (schemeId) => {
  const cams =
    getThirdPartySchemeById(schemeId)?.cameras ||
    CAMERA_OPTIONS_BY_SCHEME[schemeId] ||
    [];
  return cams.filter((c) => c !== ALL_WORKING);
};

/**
 * Per-camera uptime over the trailing 24h. Mirrors computeA66UptimeReport in
 * functions/index.js — keep the two in sync.
 */
export const computeUptimeReport = ({ faults, cameras, now = Date.now() }) => {
  const windowStartMs = now - DAY_MS;
  const cameraMap = {};
  for (const cam of cameras) {
    cameraMap[cam] = { outages: 0, totalDownMs: 0, liveFault: false, faultRefs: [] };
  }

  for (const data of faults) {
    const createdMs = toMs(data.createdAt);
    if (createdMs === undefined) continue;

    const completedMs = toMs(data.completedAt);
    const isLive = data.status === "live";
    const isCompleted = data.status === "completed" && completedMs !== undefined;
    if (!isLive && !isCompleted) continue;

    const faultEndMs = isLive ? now : completedMs;
    if (faultEndMs < windowStartMs) continue;

    const stats = cameraMap[data.camera || "Unknown"];
    if (!stats) continue;

    // Count only the part of the fault that falls inside the window.
    const downMs = Math.max(0, faultEndMs - Math.max(createdMs, windowStartMs));

    if (isLive) stats.liveFault = true;
    stats.totalDownMs += downMs;
    stats.outages += 1;
    if (data.referenceId) stats.faultRefs.push(data.referenceId);
  }

  const result = Object.entries(cameraMap).map(([name, s]) => ({
    name,
    uptimePct: parseFloat(
      Math.max(0, Math.min(100, ((DAY_MS - s.totalDownMs) / DAY_MS) * 100)).toFixed(1),
    ),
    downMins: Math.round(s.totalDownMs / 60000),
    outages: s.outages,
    mttrMins: s.outages > 0 ? Math.round(s.totalDownMs / s.outages / 60000) : null,
    liveFault: s.liveFault,
    faultRefs: s.faultRefs,
  }));

  const camNum = (name) => parseInt(name.replace(/\D/g, ""), 10) || 0;
  result.sort((a, b) => {
    const aF = a.faultRefs.length > 0;
    const bF = b.faultRefs.length > 0;
    if (aF !== bF) return aF ? -1 : 1;
    return camNum(a.name) - camNum(b.name);
  });

  const withMttr = result.filter((c) => c.mttrMins !== null);
  return {
    windowStart: new Date(windowStartMs),
    windowEnd: new Date(now),
    cameras: result,
    totals: {
      avgUptimePct: result.length
        ? parseFloat((result.reduce((s, c) => s + c.uptimePct, 0) / result.length).toFixed(1))
        : 100,
      totalOutages: result.reduce((s, c) => s + c.outages, 0),
      avgMttrMins: withMttr.length
        ? Math.round(withMttr.reduce((s, c) => s + c.mttrMins, 0) / withMttr.length)
        : null,
      liveFaults: result.filter((c) => c.liveFault).length,
    },
  };
};
