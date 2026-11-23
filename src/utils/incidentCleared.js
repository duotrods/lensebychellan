const toMs = (ts) =>
  typeof ts?.toMillis === "function" ? ts.toMillis() : ts?.seconds != null ? ts.seconds * 1000 : undefined;

const parseHHMM = (v) => {
  const m = typeof v === "string" ? v.match(/^(\d{1,2}):(\d{2})/) : null;
  return m ? { h: Number(m[1]), min: Number(m[2]), mins: Number(m[1]) * 60 + Number(m[2]) } : null;
};

/**
 * Best estimate of when an incident was cleared, in epoch ms. Incidents only store the
 * cleared time as "HH:MM" text, so it is placed on the day the incident was created (the
 * next day when it is earlier than the spotted time, i.e. it ran past midnight).
 * Falls back to createdAt when there is no usable cleared time.
 */
export const getClearedMs = (incident) => {
  const createdMs = toMs(incident.createdAt);
  const cleared = parseHHMM(incident.timeCleared);
  if (createdMs === undefined || !cleared) return createdMs ?? 0;

  const day = new Date(createdMs);
  day.setHours(cleared.h, cleared.min, 0, 0);
  const spotted = parseHHMM(incident.timeSpotted);
  const dayMs = 24 * 60 * 60 * 1000;
  return day.getTime() + (spotted && cleared.mins < spotted.mins ? dayMs : 0);
};

/** Completed incidents, most recently cleared first. Returns a new array. */
export const sortByLatestCleared = (incidents) =>
  [...incidents].sort((a, b) => getClearedMs(b) - getClearedMs(a));
