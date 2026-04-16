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

// Third-party subscriber schemes
// Add a new entry here whenever you onboard a new third-party company or scheme.
// - id: unique scheme ID baked into every invite code — must be consistent across all users on that scheme
// - fullName: human-readable name shown in dropdowns and stored on user accounts
// - company: used to group schemes in the dropdown — all schemes for the same company share this value
// - cameras: list of camera names shown in the CCTV Check form for this scheme (update with real names before go-live)
export const THIRD_PARTY_SCHEMES = [
  {
    id: "NEWCO1",
    fullName: "NewCo - Scheme 1",
    company: "NewCo",
    cameras: [
      "All Working Correctly",
      "CAM 1",
      "CAM 2",
      "CAM 3",
      "CAM 4",
      "CAM 5",
    ],
  },
  {
    id: "CO2",
    fullName: "CO2 - Scheme 2",
    company: "NewCo",
    cameras: [
      "All Working Correctly",
      "CAM 1",
      "CAM 2",
      "CAM 3",
      "CAM 4",
      "CAM 5",
    ],
  },
  {
    id: "NEWCO2",
    fullName: "NewCo - Scheme 2",
    company: "NewCo3",
    cameras: [
      "All Working Correctly",
      "CAM 1",
      "CAM 2",
      "CAM 3",
      "CAM 4",
      "CAM 5",
    ],
  },
];

// Returns the third party scheme object if the given scheme ID belongs to a third party scheme,
// or null if it is an internal/demo scheme.
export const getThirdPartySchemeById = (id) => {
  if (!id) return null;
  return THIRD_PARTY_SCHEMES.find((s) => s.id === id) || null;
};

// Returns all scheme IDs belonging to a third-party company.
// Used to scope data for TP Staff / LiveOp / CCTVOp (who see all company schemes).
export const getSchemeIdsForCompany = (company) => {
  if (!company) return null;
  const ids = THIRD_PARTY_SCHEMES.filter((s) => s.company === company).map((s) => s.id);
  return ids.length > 0 ? ids : null;
};

// Returns the filtered list of SCHEMES a user should see in form dropdowns.
// - Demo users: only the demo scheme
// - TP Staff/LiveOp/CCTVOp: all schemes belonging to their company (via userProfile.company)
// - TP Client: only their assigned schemeIds array (admin-assigned)
// - Internal staff: all non-demo schemes
export const getSchemesForUser = (userProfile) => {
  if (!userProfile) return [];
  if (isDemoUser(userProfile)) {
    return SCHEMES.filter((s) => s.isDemo);
  }
  const tpStaffRoles = ["thirdpartystaff", "thirdpartyliveoperator", "thirdpartycctvoperator"];
  if (tpStaffRoles.includes(userProfile.role)) {
    if (userProfile.company) {
      return THIRD_PARTY_SCHEMES.filter((s) => s.company === userProfile.company);
    }
    // Fallback: legacy accounts that still have schemeId
    const assignedIds =
      userProfile.schemeIds ||
      (userProfile.schemeId ? [userProfile.schemeId] : []);
    return THIRD_PARTY_SCHEMES.filter((s) => assignedIds.includes(s.id));
  }
  if (userProfile.role === "thirdpartyclient") {
    const assignedIds =
      userProfile.schemeIds ||
      (userProfile.schemeId ? [userProfile.schemeId] : []);
    return THIRD_PARTY_SCHEMES.filter((s) => assignedIds.includes(s.id));
  }
  return SCHEMES.filter((s) => !s.isDemo);
};

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
