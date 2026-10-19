// Pure validation for scheme documents (no Firebase imports, unit-testable).

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/;

// Fields that identify a scheme on stored reports and must never change after creation.
export const IMMUTABLE_SCHEME_FIELDS = ["id", "fullName", "type"];

const cleanList = (list) =>
  Array.isArray(list)
    ? [...new Set(list.map((v) => String(v).trim()).filter(Boolean))]
    : [];

// Returns { ok, errors[], value } for a scheme about to be created.
// `existing` is the current list of scheme docs (active and archived), used to keep
// ids, full names and legacy values unique so lookups stay unambiguous.
export const validateNewScheme = (input, existing = []) => {
  const errors = [];
  const id = String(input?.id || "").trim();
  const fullName = String(input?.fullName || "").trim();
  const type = input?.type === "thirdparty" ? "thirdparty" : "internal";

  if (!ID_PATTERN.test(id)) {
    errors.push("ID must be 2-32 characters: letters, numbers, - or _ (no spaces).");
  }
  if (!fullName) errors.push("Full name is required.");
  if (type === "thirdparty" && !String(input?.company || "").trim()) {
    errors.push("Company is required for third-party schemes.");
  }

  const legacyIds = cleanList(input?.legacyIds);
  const legacyNames = cleanList(input?.legacyNames);
  const taken = (key, value) =>
    existing.some(
      (s) =>
        s[key] === value ||
        (s.legacyIds || []).includes(value) ||
        (s.legacyNames || []).includes(value),
    );
  if (id && taken("id", id)) errors.push(`ID "${id}" is already used.`);
  if (fullName && taken("fullName", fullName)) errors.push(`Full name "${fullName}" is already used.`);
  [...legacyIds, ...legacyNames].forEach((v) => {
    if (taken("id", v) || taken("fullName", v)) errors.push(`"${v}" is already used by another scheme.`);
  });

  const value = {
    id,
    type,
    fullName,
    shortName: String(input?.shortName || "").trim() || fullName,
    contractor: String(input?.contractor || "").trim(),
    company: type === "thirdparty" ? String(input?.company || "").trim() : "",
    isDemo: false,
    cameras: cleanList(input?.cameras),
    legacyIds,
    legacyNames,
    active: true,
  };
  return { ok: errors.length === 0, errors, value };
};

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// Validate a list of recipient addresses. Returns { ok, errors[], value } where value is
// the trimmed, de-duplicated list (blank entries dropped).
export const validateRecipients = (list) => {
  const value = [...new Set((list || []).map((v) => String(v).trim()).filter(Boolean))];
  const errors = value
    .filter((email) => !EMAIL_PATTERN.test(email))
    .map((email) => `"${email}" is not a valid email address.`);
  return { ok: errors.length === 0, errors, value };
};

// Returns { ok, errors[], value } for a patch applied to an existing scheme.
// Rejects any attempt to change id, fullName or type.
export const validateSchemeUpdate = (current, patch) => {
  const errors = [];
  IMMUTABLE_SCHEME_FIELDS.forEach((field) => {
    if (patch?.[field] !== undefined && patch[field] !== current?.[field]) {
      errors.push(`"${field}" cannot be changed after a scheme is created.`);
    }
  });

  const value = { ...patch };
  IMMUTABLE_SCHEME_FIELDS.forEach((field) => delete value[field]);
  if ("cameras" in value) value.cameras = cleanList(value.cameras);
  if ("legacyIds" in value) value.legacyIds = cleanList(value.legacyIds);
  if ("legacyNames" in value) value.legacyNames = cleanList(value.legacyNames);
  if ("reports" in value) {
    value.reports = {
      avera: !!value.reports?.avera,
      wideload: !!value.reports?.wideload,
      uptime: !!value.reports?.uptime,
      // On unless an admin turns it off, so existing schemes keep getting these emails.
      lenseAssist: value.reports?.lenseAssist !== false,
    };
  }
  return { ok: errors.length === 0, errors, value };
};
