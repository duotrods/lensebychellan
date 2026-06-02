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
