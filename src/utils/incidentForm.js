// Pure helpers for the incident report form. No React/Firebase imports so the
// (bug-prone) time math can be unit-tested in isolation.

// Format a date as DD/MM/YYYY.
export const formatDateToBritish = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Minutes between two HH:MM times, wrapping past midnight. null if either missing.
export const minutesBetween = (time1, time2) => {
  if (!time1 || !time2) return null;
  const [hours1, mins1] = time1.split(":").map(Number);
  const [hours2, mins2] = time2.split(":").map(Number);
  const totalMins1 = hours1 * 60 + mins1;
  const totalMins2 = hours2 * 60 + mins2;
  let diff = totalMins2 - totalMins1;
  if (diff < 0) diff += 24 * 60;
  return diff;
};

// Derive the "X mins" duration fields from the spotted/on-site/cleared times.
export const calculateTimeDifferences = (data) => {
  const result = { ...data };

  if (data.timeSpotted && data.timeOnSite) {
    const mins = minutesBetween(data.timeSpotted, data.timeOnSite);
    if (mins !== null) result.timeSpottedToOn = `${mins} mins`;
  }

  if (data.timeOnSite && data.timeCleared) {
    const mins = minutesBetween(data.timeOnSite, data.timeCleared);
    if (mins !== null) result.timeOnsiteToCleared = `${mins} mins`;
  }

  return result;
};

// Either gap longer than this is more likely a typo than a real response or
// clear-up time. Short overnight gaps (23:50 → 00:05) are fine; it's the
// "7:56 PM then 5:55" slip, which minutesBetween reads as the next day (~10h),
// that this is here to catch.
export const MAX_PLAUSIBLE_GAP_MINUTES = 180;

// "19:56" -> "7:56 PM" — the 12-hour form staff see in the time inputs.
export const formatTime12h = (time) => {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

// 599 -> "9h 59m", 180 -> "3h", 45 -> "45m".
export const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// The time pairs that look wrong, for a "double-check these" prompt before
// saving. Only pairs with both times filled in are checked. `wrapsPastMidnight`
// means the second time is earlier on the clock, so it was read as the next day.
export const findImplausibleTimeGaps = (data, maxMinutes = MAX_PLAUSIBLE_GAP_MINUTES) => {
  const pairs = [
    ["Time Spotted → Time On Site", data.timeSpotted, data.timeOnSite],
    ["Time On Site → Time Cleared", data.timeOnSite, data.timeCleared],
  ];
  return pairs.flatMap(([label, from, to]) => {
    const minutes = minutesBetween(from, to);
    if (minutes === null || minutes <= maxMinutes) return [];
    return [{ label, from, to, minutes, wrapsPastMidnight: to < from }];
  });
};
