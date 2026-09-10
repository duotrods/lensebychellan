// Pure helpers for incident report derived values.
// Kept free of Firebase imports so they can be unit-tested in isolation and
// reused wherever incident data is processed.

// Total number of recovery vehicles requested on an incident.
export const countVehicles = (formData) => {
  const r = formData?.recoveryRequested;
  if (!r || typeof r !== "object") return 0;
  return (r.light || 0) + (r.heavy || 0) + (r.ipv || 0) + (r.hetos || 0);
};

// A "pure" incident excludes free recoveries, drive-offs, incursions and
// property damage. Stored on each report so it can be filtered at query time.
export const isPureIncident = (formData) =>
  formData.incidentType !== "Free Recovery" &&
  formData.incidentType !== "Drive Off" &&
  formData.incursion !== "YES" &&
  formData.incursionToGainAdvantage !== "YES" &&
  !formData.propertyDamage;

// A drive off — logged either as the incident type or as the fault. The
// vehicle leaves before or without recovery, so there's no attendance to
// time: the form hides Time On Site / Time Cleared for these, and the Time to
// Site / Time to Recover metrics skip them so they don't skew response times.
// Everything else about a drive off is still recorded and counted as normal.
export const isDriveOff = (record) =>
  record?.incidentType === "Drive Off" || record?.fault === "Drive Off";
