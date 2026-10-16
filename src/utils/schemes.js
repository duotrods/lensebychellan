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
    id: "Gallows",
    fullName: "Gallows Corner - Costain",
    shortName: "Costain - GC",
    contractor: "Gallows Corner",
    // Gallows was "Costain" before its rename; older documents still carry these.
    legacyIds: ["Costain"],
    legacyNames: ["Costain - Gallows Corner"],
  },
  {
    id: "SimisterIsland",
    fullName: "Simister Island - Costain",
    shortName: "Simister Island",
    contractor: "Costain",
    reports: { avera: true },
  },
  {
    id: "M48",
    fullName: "M48 - Severn Bridge",
    shortName: "M48 SB",
    contractor: "Severn Bridge",
  },
   {
    id: "A303",
    fullName: "A303 - Roadside Technologies",
    shortName: "A303 RT",
    contractor: "Roadside Technologies",
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
  //NewCo company
  {
    id: "A66-WJ",
    fullName: "A66 - WJ Scheme 1",
    company: "WJ",
    reports: { avera: true, wideload: true },
    cameras: [
      "All Working Correctly",
      "CAM 1",
      "CAM 2",
      "CAM 3",
      "CAM 4",
      "CAM 5",
      "CAM 6",
      "CAM 7",
      "CAM 8",
      "CAM 9",
      "CAM 10",
      "CAM 11",
      "CAM 12",
      "CAM 13",
      "CAM 14",
      "CAM 15",
      "CAM 16",
      "CAM 17",
      "CAM 18",
      "CAM 19",
      "CAM 20",
    ],
  },
  // {
  //   id: "CO2",
  //   fullName: "CO2 - Scheme 2",
  //   company: "NewCo",
  //   cameras: [
  //     "All Working Correctly",
  //     "CAM 1",
  //     "CAM 2",
  //     "CAM 3",
  //     "CAM 4",
  //     "CAM 5",
  //   ],
  // },
  // {
  //   id: "CO3",
  //   fullName: "CO3 - Scheme 3",
  //   company: "NewCo",
  //   cameras: [
  //     "All Working Correctly",
  //     "CAM 1",
  //     "CAM 2",
  //     "CAM 3",
  //     "CAM 4",
  //     "CAM 5",
  //   ],
  // },
  // //NewCo3 company
  // {
  //   id: "NEWCO2",
  //   fullName: "NewCo - Scheme 2",
  //   company: "NewCo3",
  //   cameras: [
  //     "All Working Correctly",
  //     "CAM 1",
  //     "CAM 2",
  //     "CAM 3",
  //     "CAM 4",
  //     "CAM 5",
  //   ],
  // },
];

// Returns the third party scheme object if the given scheme ID belongs to a third party scheme,
// or null if it is an internal/demo scheme.
export const getThirdPartySchemeById = (id) => {
  if (!id) return null;
  return (
    THIRD_PARTY_SCHEMES.find((s) => s.id === id) ||
    ARCHIVED_THIRD_PARTY_SCHEMES.find((s) => s.id === id) ||
    null
  );
};

// Returns all scheme IDs belonging to a third-party company.
// Used to scope data for TP Staff / LiveOp / CCTVOp (who see all company schemes).
export const getSchemeIdsForCompany = (company) => {
  if (!company) return null;
  const ids = THIRD_PARTY_SCHEMES.filter((s) => s.company === company).map((s) => s.id);
  return ids.length > 0 ? ids : null;
};

// All internal (non-demo, non-third-party) scheme IDs. Real LENSE staff are
// scoped to these so third-party forms never leak into their dashboard/feeds.
export const getInternalSchemeIds = () =>
  SCHEMES.filter((s) => !s.isDemo).map((s) => s.id);

// All third-party scheme IDs across every company. Used to subtract TP forms
// from the cached non-demo totals when counting for real staff.
export const getAllThirdPartySchemeIds = () =>
  THIRD_PARTY_SCHEMES.map((s) => s.id);

// Unique third-party company names (e.g. ["WJ", "NewCo", "NewCo3"]).
// Used by the admin Third Party Reports company filter.
export const getThirdPartyCompanies = () => [
  ...new Set(THIRD_PARTY_SCHEMES.map((s) => s.company)),
];

// Returns the scheme-ID array a *staff-side* viewer is scoped to for forms,
// counts, search, and live feeds. (Admin views are intentionally unscoped and
// do not call this.)
// - Demo users: only the demo scheme
// - TP Staff/LiveOp/CCTVOp: all schemes belonging to their company
// - Real staff: all internal (non-demo) schemes
export const getViewerSchemeScope = (userProfile) => {
  if (!userProfile) return getInternalSchemeIds();
  if (isDemoUser(userProfile)) return [DEMO_SCHEME_ID];
  const tpStaffRoles = [
    "thirdpartystaff",
    "thirdpartyliveoperator",
    "thirdpartycctvoperator",
  ];
  if (tpStaffRoles.includes(userProfile.role)) {
    const ids = userProfile.company
      ? getSchemeIdsForCompany(userProfile.company)
      : // Legacy fallback: accounts that still carry schemeIds/schemeId
        userProfile.schemeIds ||
        (userProfile.schemeId ? [userProfile.schemeId] : null);
    return ids && ids.length > 0 ? ids : getInternalSchemeIds();
  }
  return getInternalSchemeIds();
};

// Like getViewerSchemeScope, but also includes IDs that older documents may still
// carry: a scheme's legacy IDs (e.g. Gallows was "Costain") and archived schemes of
// the viewer's own kind. READ-ONLY: never use for the schemeIds of a document being written.
export const getViewerReadScope = (userProfile) => {
  const scope = getViewerSchemeScope(userProfile);
  const known = [...SCHEMES, ...THIRD_PARTY_SCHEMES, ...ARCHIVED_SCHEMES, ...ARCHIVED_THIRD_PARTY_SCHEMES];
  const extra = scope.flatMap(
    (id) => known.find((s) => s.id === id)?.legacyIds || [],
  );

  // Archived schemes stay readable for the viewers who could see them while active
  const internalIds = new Set(getInternalSchemeIds());
  if (scope.length > 0 && scope.every((id) => internalIds.has(id))) {
    extra.push(...ARCHIVED_SCHEMES.filter((s) => !s.isDemo).flatMap((s) => [s.id, ...(s.legacyIds || [])]));
  } else if (userProfile?.company) {
    extra.push(
      ...ARCHIVED_THIRD_PARTY_SCHEMES.filter((s) => s.company === userProfile.company).map((s) => s.id),
    );
  }
  return [...new Set([...scope, ...extra])];
};

// Returns the filtered list of SCHEMES a user should see in form dropdowns.
// - Demo users: only the demo scheme
// - TP Staff/LiveOp/CCTVOp: all schemes belonging to their company (via userProfile.company)
// - TP Client: only their assigned schemeIds array (admin-assigned)
// - Client: only their assigned schemeIds array (admin-assigned)
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
  if (userProfile.role === "client") {
    const assignedIds =
      userProfile.schemeIds ||
      (userProfile.schemeId ? [userProfile.schemeId] : []);
    return SCHEMES.filter((s) => assignedIds.includes(s.id));
  }
  return SCHEMES.filter((s) => !s.isDemo);
};

// Helper function to get scheme by ID
export const getSchemeById = (id) => {
  return (
    SCHEMES.find((scheme) => scheme.id === id) ||
    ARCHIVED_SCHEMES.find((scheme) => scheme.id === id)
  );
};

// Helper function to get scheme by full name
export const getSchemeByFullName = (fullName) => {
  return (
    SCHEMES.find((scheme) => scheme.fullName === fullName) ||
    THIRD_PARTY_SCHEMES.find((scheme) => scheme.fullName === fullName) ||
    ARCHIVED_SCHEMES.find((scheme) => scheme.fullName === fullName) ||
    ARCHIVED_THIRD_PARTY_SCHEMES.find((scheme) => scheme.fullName === fullName) ||
    null
  );
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

// Resolve the human-readable name for a user's active scheme.
// Order: per-scheme map (correct source, always matches active scheme) →
// static lookup across internal AND third-party schemes → legacy single-value fields.
// Replaces the buggy local copies that preferred the stale `activeSchemeName`
// field (never updated on scheme switch) and only searched internal SCHEMES.
export const getActiveSchemeName = (userProfile) => {
  if (!userProfile) return "";
  const activeId = userProfile.activeSchemeId || userProfile.schemeId;
  if (activeId && userProfile.schemeNames?.[activeId]) {
    return userProfile.schemeNames[activeId];
  }
  if (activeId) {
    const scheme = getSchemeById(activeId) || getThirdPartySchemeById(activeId);
    if (scheme) return scheme.fullName;
  }
  return userProfile.activeSchemeName || userProfile.schemeName || "";
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
    "CCTV 8","CCTV 9","CCTV 10","CCTV 11","CCTV 12","CCTV 13","CCTV 14", "NEW CCTV 13",
    "NEW CCTV 14","CCTV 15","CCTV 16","CCTV 17","CCTV 18","CCTV 19","CCTV 20",
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
    "CCTV 23","CCTV 24","CCTV 25","CCTV 26","CCTV 27","CCTV 28","CCTV 29","CCTV 30", "CCTV 31",
    "3301","3302","3303","3304","3305","3306",
    "3401","3402","3403","3404","3407","3408","3409","3410",
  ],
  A452: [
    "CAM 15","CAM 16",
    "CAM 17","CAM 18",
    "CAM 19","CAM 20",
    "CAM 21"
  ],
  Gallows: [
    "Tower 1 - CAM 1","Tower 1 - CAM 2","Tower 1 - CAM 3","Tower 1 - CAM 4",
    "Tower 2 - CAM 1","Tower 2 - CAM 2","Tower 2 - CAM 3","Tower 2 - CAM 4",
  ],
  M48: [
    "CAM 1", "CAM 2", "CAM 3", "CAM 4", "CAM 5",
    "CAM 6", "CAM 7", "CAM 8", "CAM 9", "CAM 10"
  ],
   SimisterIsland: [
    "CAM 1","CAM 2.1/2.2","CAM 3","CAM 4","CAM 5","CAM 6","CAM 7","CAM 8","CAM 9","CAM 10.1/10.2",
    "CAM 11","CAM 12","CAM 13","CAM 14","CAM 15","CAM 16","CAM 17","CAM 18","CAM 19","CAM 20",
    "CAM 21.1/21.2","CAM 22","CAM 24.1/24.2","CAM 25","CAM 26","CAM 27","CAM 28","CAM 29","CAM 30",
    "CAM 31","CAM 32","CAM 33","CAM 34",
  ],
  A303: [
    "CAM 1","CAM 2","CAM 3","CAM 4","CAM 5"
  ],
  DMO1: [
    "DEMO-CAM-1","DEMO-CAM-2","DEMO-CAM-3","DEMO-CAM-4",
    "DEMO-CAM-5","DEMO-CAM-6","DEMO-CAM-7","DEMO-CAM-8",
  ],
};

// ---------------------------------------------------------------------------
// Scheme registry
// The lists above are the static baseline (and offline fallback). Scheme documents
// from Firestore are overlaid on top of it by setSchemes(): a doc with the same id
// replaces the static entry, a new id adds a scheme, and `active: false` archives it.
// Static schemes can therefore never disappear because the collection is partial or
// empty. Archived schemes leave the dropdown lists but still resolve in lookups.
// ---------------------------------------------------------------------------
export const ARCHIVED_SCHEMES = [];
export const ARCHIVED_THIRD_PARTY_SCHEMES = [];

const STATIC_CAMERA_OPTIONS = JSON.parse(JSON.stringify(CAMERA_OPTIONS_BY_SCHEME));
const STATIC_INTERNAL_SCHEMES = SCHEMES.map((s) => ({ ...s }));
const STATIC_THIRD_PARTY_SCHEMES = THIRD_PARTY_SCHEMES.map((s) => ({ ...s }));

const replaceContents = (target, items) => {
  target.length = 0;
  target.push(...items);
};

// Scheme documents describing today's static schemes, used to seed Firestore.
export const getStaticSchemeDocs = () => [
  ...STATIC_INTERNAL_SCHEMES.map((s) => ({
    id: s.id,
    type: "internal",
    fullName: s.fullName,
    shortName: s.shortName,
    contractor: s.contractor,
    isDemo: !!s.isDemo,
    cameras: STATIC_CAMERA_OPTIONS[s.id] || [],
    legacyIds: s.legacyIds || [],
    legacyNames: s.legacyNames || [],
    ...(s.reports ? { reports: s.reports } : {}),
    active: true,
  })),
  ...STATIC_THIRD_PARTY_SCHEMES.map((s) => ({
    id: s.id,
    type: "thirdparty",
    fullName: s.fullName,
    company: s.company,
    cameras: s.cameras || [],
    legacyIds: s.legacyIds || [],
    legacyNames: s.legacyNames || [],
    ...(s.reports ? { reports: s.reports } : {}),
    active: true,
  })),
];

const toInternalScheme = (d) => ({
  id: d.id,
  fullName: d.fullName,
  shortName: d.shortName || d.fullName,
  contractor: d.contractor || "",
  ...(d.isDemo ? { isDemo: true } : {}),
  ...(d.legacyIds?.length ? { legacyIds: d.legacyIds } : {}),
  ...(d.legacyNames?.length ? { legacyNames: d.legacyNames } : {}),
  ...(d.reports ? { reports: d.reports } : {}),
});

const toThirdPartyScheme = (d) => ({
  id: d.id,
  fullName: d.fullName,
  company: d.company || "",
  cameras: d.cameras || [],
  ...(d.legacyIds?.length ? { legacyIds: d.legacyIds } : {}),
  ...(d.legacyNames?.length ? { legacyNames: d.legacyNames } : {}),
  ...(d.reports ? { reports: d.reports } : {}),
});

// Apply scheme documents on top of the static baseline. Returns true if applied.
export const setSchemes = (docs) => {
  if (!Array.isArray(docs)) return false;
  const valid = docs.filter((d) => d && d.id && d.fullName);
  if (valid.length === 0) return false;

  const byId = new Map(getStaticSchemeDocs().map((d) => [d.id, d]));
  valid.forEach((d) => byId.set(d.id, { ...byId.get(d.id), ...d }));
  const all = [...byId.values()];

  const isActive = (d) => d.active !== false;
  const internal = all.filter((d) => d.type !== "thirdparty");
  const thirdParty = all.filter((d) => d.type === "thirdparty");

  replaceContents(SCHEMES, internal.filter(isActive).map(toInternalScheme));
  replaceContents(ARCHIVED_SCHEMES, internal.filter((d) => !isActive(d)).map(toInternalScheme));
  replaceContents(THIRD_PARTY_SCHEMES, thirdParty.filter(isActive).map(toThirdPartyScheme));
  replaceContents(ARCHIVED_THIRD_PARTY_SCHEMES, thirdParty.filter((d) => !isActive(d)).map(toThirdPartyScheme));

  Object.keys(CAMERA_OPTIONS_BY_SCHEME).forEach((k) => delete CAMERA_OPTIONS_BY_SCHEME[k]);
  Object.assign(CAMERA_OPTIONS_BY_SCHEME, STATIC_CAMERA_OPTIONS);
  internal.forEach((d) => {
    if (Array.isArray(d.cameras) && d.cameras.length > 0) {
      CAMERA_OPTIONS_BY_SCHEME[d.id] = d.cameras;
    }
  });
  return true;
};

// Does this scheme send a dedicated "avera" or "wideload" report email? `schemeValue` is
// whatever a report stores: id, full name, or an older id / name. Mirrors
// functions/schemeAlerts.js sendsReport, using the registry instead of Firestore.
export const schemeSendsReport = (kind, schemeValue, schemeId) => {
  const find = (value) =>
    value &&
    [...SCHEMES, ...THIRD_PARTY_SCHEMES, ...ARCHIVED_SCHEMES, ...ARCHIVED_THIRD_PARTY_SCHEMES].find(
      (s) =>
        s.id === value ||
        s.fullName === value ||
        (s.legacyIds || []).includes(value) ||
        (s.legacyNames || []).includes(value),
    );
  const scheme = find(schemeValue) || find(schemeId);
  return !!scheme?.reports?.[kind];
};

// True for schemes that are defined in code. They always come back from the static
// baseline, so they can be archived but never deleted.
export const isStaticSchemeId = (id) =>
  STATIC_INTERNAL_SCHEMES.some((s) => s.id === id) ||
  STATIC_THIRD_PARTY_SCHEMES.some((s) => s.id === id);

// Back to the static baseline (offline fallback and test isolation).
export const resetSchemesToStatic = () => {
  replaceContents(SCHEMES, STATIC_INTERNAL_SCHEMES.map((s) => ({ ...s })));
  replaceContents(THIRD_PARTY_SCHEMES, STATIC_THIRD_PARTY_SCHEMES.map((s) => ({ ...s })));
  replaceContents(ARCHIVED_SCHEMES, []);
  replaceContents(ARCHIVED_THIRD_PARTY_SCHEMES, []);
  Object.keys(CAMERA_OPTIONS_BY_SCHEME).forEach((k) => delete CAMERA_OPTIONS_BY_SCHEME[k]);
  Object.assign(CAMERA_OPTIONS_BY_SCHEME, JSON.parse(JSON.stringify(STATIC_CAMERA_OPTIONS)));
};
