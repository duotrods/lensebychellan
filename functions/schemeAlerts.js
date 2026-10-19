/* eslint-disable no-undef */
// Pure helpers that decide who gets a scheme's alert emails. No Firebase imports, so
// they can be unit-tested. The Firestore reads live in index.js.

// "a@x.com, b@y.com" or ["a@x.com, b@y.com", "c@z.com"] -> ["a@x.com", "b@y.com", "c@z.com"]
function normalizeEmails(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      list
        .flatMap((v) => String(v).split(/[,;\s]+/))
        .map((v) => v.trim())
        .filter((v) => v.includes("@")),
    ),
  ];
}

// Find the scheme document a report belongs to. Reports store the full name, the id,
// or an older id / name from before a rename. `schemes` is an array of scheme docs.
function findScheme(value, schemes) {
  if (!value) return null;
  return (
    schemes.find(
      (s) =>
        s.id === value ||
        s.fullName === value ||
        (s.legacyIds || []).includes(value) ||
        (s.legacyNames || []).includes(value),
    ) || null
  );
}

const RECIPIENT_FIELDS = {
  incident: "incidentRecipients",
  cctvFault: "cctvFaultRecipients",
  uptime: "uptimeRecipients",
};

// kind: "incident" | "cctvFault" | "uptime".
// Order: recipients saved for the scheme in the admin page -> the static config in
// emailConfig.js (by stored name, then by the scheme's current full name) -> default.
function getRecipients({ kind, scheme, schemeId, schemes, alerts, staticRecipients }) {
  const doc = findScheme(scheme, schemes) || findScheme(schemeId, schemes);
  const field = RECIPIENT_FIELDS[kind] || "incidentRecipients";
  const saved = doc ? normalizeEmails(alerts[doc.id]?.[field]) : [];
  if (saved.length > 0) return saved;
  return (
    staticRecipients[scheme] ||
    (doc && staticRecipients[doc.fullName]) ||
    staticRecipients.default ||
    []
  );
}

// kind: "avera" | "wideload" | "lenseAssist". A flag set on the scheme in the admin page
// wins; schemes that were never edited keep the static list from emailConfig.js, or are
// simply on when `defaultOn` is set (Lense Assist has no per-scheme list).
function sendsReport({ kind, scheme, schemeId, schemes, staticSchemes = [], defaultOn = false }) {
  const doc = findScheme(scheme, schemes) || findScheme(schemeId, schemes);
  if (doc && typeof doc.reports?.[kind] === "boolean") return doc.reports[kind];
  if (defaultOn) return true;
  return staticSchemes.includes(scheme) || (!!doc && staticSchemes.includes(doc.fullName));
}

// kind: "avera" | "wideload" | "lenseAssist". Recipients saved for the scheme in the admin page, else the
// single address from emailConfig.js (`fallback`).
function getReportRecipients({ kind, scheme, schemeId, schemes, alerts, fallback }) {
  const doc = findScheme(scheme, schemes) || findScheme(schemeId, schemes);
  const saved = doc ? normalizeEmails(alerts[doc.id]?.[`${kind}Recipients`]) : [];
  return saved.length > 0 ? saved : normalizeEmails(fallback);
}

const ALL_WORKING = "All Working Correctly";

// Schemes that get the daily CCTV uptime report, each with the cameras to report on and
// who receives it. A scheme is on when its admin flag `reports.uptime` is true; schemes
// never edited fall back to `fallbacks` ([{ id, fullName, cameras, recipients }]), which
// also covers a failed scheme read. Schemes with no cameras or no recipients are skipped.
function getUptimeSchemes({ schemes, alerts, fallbacks }) {
  const result = [];
  const seen = new Set();

  const add = (id, fullName, cameras, recipients) => {
    const list = cameras.filter((c) => c && c !== ALL_WORKING);
    if (seen.has(id) || list.length === 0 || recipients.length === 0) return;
    seen.add(id);
    result.push({ id, fullName, cameras: list, recipients });
  };

  for (const doc of schemes) {
    const fallback = fallbacks.find((f) => f.id === doc.id);
    const enabled =
      typeof doc.reports?.uptime === "boolean" ? doc.reports.uptime : !!fallback;
    if (!enabled || doc.active === false) continue;
    const saved = normalizeEmails(alerts[doc.id]?.uptimeRecipients);
    add(
      doc.id,
      doc.fullName,
      doc.cameras?.length ? doc.cameras : fallback?.cameras || [],
      saved.length > 0 ? saved : normalizeEmails(fallback?.recipients),
    );
  }
  // Fallback schemes with no scheme document yet (or the scheme read failed).
  for (const f of fallbacks) {
    if (schemes.some((d) => d.id === f.id)) continue;
    const saved = normalizeEmails(alerts[f.id]?.uptimeRecipients);
    add(f.id, f.fullName, f.cameras, saved.length > 0 ? saved : normalizeEmails(f.recipients));
  }
  return result;
}

module.exports = {
  normalizeEmails,
  findScheme,
  getRecipients,
  getReportRecipients,
  sendsReport,
  getUptimeSchemes,
};
