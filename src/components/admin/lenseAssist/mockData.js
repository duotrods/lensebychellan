// UI-preview mock data for the admin Lense Assist access page and the staff
// scheme assignment tab. Delete this file when the real data is wired in.

export const MOCK_LENSE_ASSIST_USERS = [
  { uid: "s1", displayName: "Amy Carter", email: "amy.carter@example.com", role: "staff", schemeIds: ["A417", "M3"], lenseAssist: true },
  { uid: "s2", displayName: "Ben Osei", email: "ben.osei@example.com", role: "staff", schemeIds: ["M3"], lenseAssist: true },
  { uid: "s3", displayName: "Chloe Patel", email: "chloe.patel@example.com", role: "staff", schemeIds: ["A47"], lenseAssist: false },
  { uid: "s4", displayName: "Dan Whitfield", email: "dan.whitfield@example.com", role: "staff", schemeIds: ["A452", "Gallows"], lenseAssist: false },
  { uid: "s5", displayName: "Eve Marsh", email: "eve.marsh@example.com", role: "staff", schemeIds: ["A417"], lenseAssist: true },
  { uid: "s6", displayName: "Femi Adeyemi", email: "femi.adeyemi@example.com", role: "thirdpartystaff", schemeIds: ["A66-WJ"], lenseAssist: false, ineligible: "Third-party account" },
  { uid: "s7", displayName: "Grace Lin", email: "grace.lin@example.com", role: "staff", schemeIds: ["DMO1"], lenseAssist: false, ineligible: "Demo scheme" },
  { uid: "c1", displayName: "Harry Doyle", email: "harry.doyle@kier.example.com", role: "client", schemeIds: ["A417"], company: "Kier", lenseAssist: true },
  { uid: "c2", displayName: "Isla Reed", email: "isla.reed@bb.example.com", role: "client", schemeIds: ["M3"], company: "Balfour Beatty", lenseAssist: false },
  { uid: "c3", displayName: "Jack Nolan", email: "jack.nolan@core.example.com", role: "client", schemeIds: ["A47"], company: "Core", lenseAssist: true },
  { uid: "c4", displayName: "Kara Singh", email: "kara.singh@traffix.example.com", role: "client", schemeIds: ["A452"], company: "Traffix", lenseAssist: false },
  { uid: "c5", displayName: "Liam Burke", email: "liam.burke@costain.example.com", role: "client", schemeIds: ["Gallows", "M3"], company: "Costain", lenseAssist: false },
  { uid: "c6", displayName: "Mia Frost", email: "mia.frost@wj.example.com", role: "thirdpartyclient", schemeIds: ["A66-WJ"], company: "WJ", lenseAssist: false, ineligible: "Third-party account" },
  { uid: "c7", displayName: "Noah Webb", email: "noah.webb@demo.example.com", role: "client", schemeIds: ["DMO1"], company: "Demo", lenseAssist: false, ineligible: "Demo scheme" },
];

export const MOCK_STAFF_SCHEME_USERS = [
  { uid: "m1", displayName: "Amy Carter", email: "amy.carter@example.com", role: "staff", schemeIds: ["A417", "M3"] },
  { uid: "m2", displayName: "Ben Osei", email: "ben.osei@example.com", role: "staff", schemeIds: ["M3"] },
  { uid: "m3", displayName: "Chloe Patel", email: "chloe.patel@example.com", role: "staff", schemeIds: ["A47", "A452", "Gallows"] },
  { uid: "m4", displayName: "Dan Whitfield", email: "dan.whitfield@example.com", role: "staff", schemeIds: [] },
  { uid: "m5", displayName: "Eve Marsh", email: "eve.marsh@example.com", role: "staff", schemeIds: ["A417"] },
  { uid: "m6", displayName: "Femi Adeyemi", email: "femi.adeyemi@example.com", role: "thirdpartystaff", schemeIds: ["A66-WJ"] },
  { uid: "m7", displayName: "Gus Holt", email: "gus.holt@example.com", role: "thirdpartystaff", schemeIds: [] },
];
