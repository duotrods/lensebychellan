// Demo scheme ID constant
export const DEMO_SCHEME_ID = 'DMO1';

// List of all schemes/clients in the system
export const SCHEMES = [
  {
    id: 'A417',
    fullName: 'A417 Missing Link - Kier',
    shortName: 'A417 Missing Link',
    contractor: 'Kier'
  },
  {
    id: 'M3',
    fullName: 'M3 Jct 9 - Balfour Beatty',
    shortName: 'M3 Jct 9',
    contractor: 'Balfour Beatty'
  },
  {
    id: 'A47',
    fullName: 'A47 Thickthorn - Core',
    shortName: 'A47 Thickthorn',
    contractor: 'Core'
  },
  {
    id: 'DMO1',
    fullName: 'DMO1 Demo Scheme - Demo',
    shortName: 'Demo Scheme',
    contractor: 'Demo',
    isDemo: true
  }
];

// Helper function to get scheme by ID
export const getSchemeById = (id) => {
  return SCHEMES.find(scheme => scheme.id === id);
};

// Helper function to get scheme by full name
export const getSchemeByFullName = (fullName) => {
  return SCHEMES.find(scheme => scheme.fullName === fullName);
};

// Helper function to extract scheme ID from full name
export const extractSchemeId = (fullName) => {
  if (!fullName) {
    console.error('extractSchemeId called with undefined or null fullName');
    return null;
  }
  const scheme = getSchemeByFullName(fullName);
  return scheme ? scheme.id : fullName.split(' ')[0]; // Fallback to first word
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
