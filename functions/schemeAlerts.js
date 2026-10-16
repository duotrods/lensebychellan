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

// kind: "incident" | "cctvFault".
// Order: recipients saved for the scheme in the admin page -> the static config in
// emailConfig.js (by stored name, then by the scheme's current full name) -> default.
function getRecipients({ kind, scheme, schemeId, schemes, alerts, staticRecipients }) {
  const doc = findScheme(scheme, schemes) || findScheme(schemeId, schemes);
  const field = kind === "cctvFault" ? "cctvFaultRecipients" : "incidentRecipients";
  const saved = doc ? normalizeEmails(alerts[doc.id]?.[field]) : [];
  if (saved.length > 0) return saved;
  return (
    staticRecipients[scheme] ||
    (doc && staticRecipients[doc.fullName]) ||
    staticRecipients.default ||
    []
  );
}

// kind: "avera" | "wideload". A flag set on the scheme in the admin page wins; schemes
// that were never edited keep the static list from emailConfig.js.
function sendsReport({ kind, scheme, schemeId, schemes, staticSchemes }) {
  const doc = findScheme(scheme, schemes) || findScheme(schemeId, schemes);
  if (doc && typeof doc.reports?.[kind] === "boolean") return doc.reports[kind];
  return staticSchemes.includes(scheme) || (!!doc && staticSchemes.includes(doc.fullName));
}

module.exports = { normalizeEmails, findScheme, getRecipients, sendsReport };
