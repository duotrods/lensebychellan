// List of all schemes/clients in the system
export const SCHEMES = [
  {
    id: 'A417',
    fullName: 'A417 Missing Link - Kier',
    shortName: 'A417 Missing Link',
    contractor: 'Kier'
  },
  {
    id: 'GALLOWS',
    fullName: 'Gallows Corner - Costain',
    shortName: 'Gallows Corner',
    contractor: 'Costain'
  },
  {
    id: 'A1',
    fullName: 'A1 Birtley to Coalhouse - Costain',
    shortName: 'A1 Birtley to Coalhouse',
    contractor: 'Costain'
  },
  {
    id: 'M3',
    fullName: 'M3 Jct 9 - Balfour Beatty',
    shortName: 'M3 Jct 9',
    contractor: 'Balfour Beatty'
  },
  {
    id: 'HS2',
    fullName: 'HS2- Traffix',
    shortName: 'HS2',
    contractor: 'Traffix'
  },
  {
    id: 'A47',
    fullName: 'A47 Thickthorn - Core',
    shortName: 'A47 Thickthorn',
    contractor: 'Core'
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
