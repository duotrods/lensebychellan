// Pure reference-ID formatting, separated from the Firestore counter logic so
// it can be unit-tested without Firebase.
// Format: PREFIX + zero-padded number (e.g. IN01). Demo submissions get a
// "-DEMO" suffix; third-party submissions get "-TP-<schemeId>".

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

// Resolve which counter document a submission should draw from.
export const getCounterName = (config, { isDemo, thirdPartySchemeId } = {}) => {
  if (thirdPartySchemeId) return `${config.counterName}_tp_${thirdPartySchemeId}`;
  if (isDemo) return `${config.counterName}_demo`;
  return config.counterName;
};

export const formatReferenceId = (
  config,
  number,
  { isDemo, thirdPartySchemeId } = {},
) => {
  const formattedNumber = String(number).padStart(config.digits, "0");
  if (thirdPartySchemeId) {
    return `${config.prefix}${formattedNumber}-TP-${thirdPartySchemeId}`;
  }
  return isDemo
    ? `${config.prefix}${formattedNumber}-DEMO`
    : `${config.prefix}${formattedNumber}`;
};
