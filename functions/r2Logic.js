// Pure rules for R2 upload URLs (no firebase imports so Vitest can test them).
// Which roles may upload under which key prefix. The key always contains the
// caller's own uid, so nobody can overwrite another user's file.
const STAFF = ["staff", "thirdpartystaff"];
const UPLOAD_PREFIXES = {
  "incident-reports": STAFF,
  "cctv-uploads": STAFF,
  documents: [...STAFF, "client", "thirdpartyclient"],
  "dashcam-uploads": ["staff", "client"],
  "bodycam-uploads": ["staff", "client"],
};

// Returns the object key, or null when this role may not upload under that prefix.
function uploadKey(role, prefix, uid, fileName, now = Date.now()) {
  const roles = Object.prototype.hasOwnProperty.call(UPLOAD_PREFIXES, prefix) ? UPLOAD_PREFIXES[prefix] : null;
  if (!roles || !roles.includes(role)) return null;
  const safeName = String(fileName || "file").replace(/[^\w.\- ]/g, "_").slice(-120);
  return `${prefix}/${uid}/${now}_${safeName}`;
}

module.exports = { UPLOAD_PREFIXES, uploadKey };
