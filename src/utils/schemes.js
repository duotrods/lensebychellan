// Demo scheme ID constant
export const DEMO_SCHEME_ID = "DMO1";

// List of all schemes/clients in the system
export const SCHEMES = [
  {
    id: "A417",
    fullName: "A417 Missing Link - Kier",
    shortName: "A417 Missing Link",
    contractor: "Kier",
  },
  {
    id: "M3",
    fullName: "M3 Jct 9 - Balfour Beatty",
    shortName: "M3 Jct 9",
    contractor: "Balfour Beatty",
  },
  {
    id: "A47",
    fullName: "A47 Thickthorn - Core",
    shortName: "A47 Thickthorn",
    contractor: "Core",
  },
  {
    id: "A452",
    fullName: "A452 HS2 - Traffix",
    shortName: "A452 HS2",
    contractor: "Traffix",
  },
  {
    id: "DMO1",
    fullName: "DMO1 Demo Scheme - Demo",
    shortName: "Demo Scheme",
    contractor: "Demo",
    isDemo: true,
  },
];

// Helper function to get scheme by ID
export const getSchemeById = (id) => {
  return SCHEMES.find((scheme) => scheme.id === id);
};

// Helper function to get scheme by full name
export const getSchemeByFullName = (fullName) => {
  return SCHEMES.find((scheme) => scheme.fullName === fullName);
};

// Helper function to extract scheme ID from full name
export const extractSchemeId = (fullName) => {
  if (!fullName) {
    console.error("extractSchemeId called with undefined or null fullName");
    return null;
  }
  const scheme = getSchemeByFullName(fullName);
  return scheme ? scheme.id : fullName.split(" ")[0]; // Fallback to first word
};

// Helper function to check if a user is a demo account
export const isDemoUser = (userProfile) => {
  if (!userProfile) return false;

  // Check if user has demo scheme assigned
  if (userProfile.schemeIds && userProfile.schemeIds.includes(DEMO_SCHEME_ID)) {
    return true;
  }

  // Backward compatibility: check single schemeId
  if (userProfile.schemeId === DEMO_SCHEME_ID) {
    return true;
  }

  return false;
};

// Helper function to check if a scheme ID is the demo scheme
export const isDemoScheme = (schemeId) => {
  return schemeId === DEMO_SCHEME_ID;
};

// Full camera list per scheme — single source of truth used by fault form and uptime page
export const CAMERA_OPTIONS_BY_SCHEME = {
  A417: [
    "CCTV 1","CCTV 2","CCTV 3","CCTV 4","CCTV 5","CCTV 6","CCTV 7",
    "CCTV 8","CCTV 9","CCTV 10","CCTV 11","CCTV 12","CCTV 13","CCTV 14",
    "CCTV 21","CCTV 22","CCTV 23","CCTV 24","CCTV 25","CCTV 26","CCTV 27",
    "CCTV 28","CCTV 29","CCTV 30","CCTV 31","CCTV 32","CCTV 33","CCTV 34","CCTV 35",
  ],
  A47: [
    "1100","1101","1102","1103","1104","1105","1106","1107","1108","1109",
    "1110","1111","1112","1114",
    "4701","4702","4703","4704","4705","4706","4707","4708","4709",
    "4711","4712","4713","4714","4715","4716","4717","4718","4719",
  ],
  M3: [
    "CCTV 1","CCTV 2","CCTV 3","CCTV 4","CCTV 5","CCTV 6","CCTV 7","CCTV 8",
    "CCTV 9","CCTV 10","CCTV 11","CCTV 12","CCTV 13","CCTV 14","CCTV 15",
    "CCTV 16","CCTV 17","CCTV 18","CCTV 19","CCTV 20","CCTV 21","CCTV 22",
    "CCTV 23","CCTV 24","CCTV 25","CCTV 26","CCTV 27","CCTV 28","CCTV 29","CCTV 30",
    "3301","3302","3303","3304","3305","3306",
    "3401","3402","3403","3404","3407","3408","3409","3410",
  ],
  A452: ["CAM 15","CAM 16","CAM 17","CAM 18","CAM 19","CAM 20","CAM 21"],
  DMO1: [
    "DEMO-CAM-1","DEMO-CAM-2","DEMO-CAM-3","DEMO-CAM-4",
    "DEMO-CAM-5","DEMO-CAM-6","DEMO-CAM-7","DEMO-CAM-8",
  ],
};
