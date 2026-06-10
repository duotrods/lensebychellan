// Pure reference-ID formatting, separated from the Firestore counter logic so
// it can be unit-tested without Firebase.
// Format: PREFIX + zero-padded number (e.g. IN01). Demo submissions get a
// "-DEMO" suffix; third-party submissions get "-TP-<COMPANY>" and draw from an
// isolated per-company counter (so every company's numbering starts at 1).

const REFERENCE_CONFIGS = {
  incident: { prefix: "IN", digits: 2, counterName: "incidentReports" },
  assetDamage: { prefix: "AD", digits: 2, counterName: "assetDamage" },
  dailyOccurrence: { prefix: "DO", digits: 2, counterName: "dailyOccurrence" },
  cctvCheck: { prefix: "CC", digits: 2, counterName: "cctvCheck" },
  cctvFaults: { prefix: "CF", digits: 2, counterName: "cctvFaults" },
};

export const getReferenceConfig = (type) => {
  const config = REFERENCE_CONFIGS[type];
  if (!config) throw new Error(`Unknown form type: ${type}`);
  return config;
};

// Normalize a company name into a stable uppercase slug used in both the
// counter document id and the reference suffix (e.g. "NewCo" -> "NEWCO").
export const normalizeCompany = (company) =>
  String(company || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

// Resolve which counter document a submission should draw from.
export const getCounterName = (config, { isDemo, thirdPartyCompany } = {}) => {
  const company = normalizeCompany(thirdPartyCompany);
  if (company) return `${config.counterName}_tp_${company}`;
  if (isDemo) return `${config.counterName}_demo`;
  return config.counterName;
};

export const formatReferenceId = (
  config,
  number,
  { isDemo, thirdPartyCompany } = {},
) => {
  const formattedNumber = String(number).padStart(config.digits, "0");
  const company = normalizeCompany(thirdPartyCompany);
  if (company) {
    return `${config.prefix}${formattedNumber}-TP-${company}`;
  }
  return isDemo
    ? `${config.prefix}${formattedNumber}-DEMO`
    : `${config.prefix}${formattedNumber}`;
};
