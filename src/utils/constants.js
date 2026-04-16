export const USER_ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
  CLIENT: "client",
  LIVEOPERATOR: "liveoperator",
  CCTVOPERATOR: "cctvfaultoperator",
  // Third-party subscriber roles
  THIRDPARTYSTAFF: "thirdpartystaff",
  THIRDPARTYCLIENT: "thirdpartyclient",
  THIRDPARTYLIVEOPERATOR: "thirdpartyliveoperator",
  THIRDPARTYCCTVOPERATOR: "thirdpartycctvoperator",
};

export const ROLE_LABELS = {
  admin: "Administrator",
  staff: "Staff Member",
  client: "Client",
  liveoperator: "Live Operator",
  cctvfaultoperator: "CCTV Fault Operator",
  // Third-party
  thirdpartystaff: "Third Party Staff",
  thirdpartyclient: "Third Party Client",
  thirdpartyliveoperator: "Third Party Live Operator",
  thirdpartycctvoperator: "Third Party CCTV Operator",
};

export const DASHBOARD_ROUTES = {
  admin: "/dashboard/admin",
  staff: "/dashboard/staff",
  client: "/dashboard/client",
  liveoperator: "/dashboard/liveoperator",
  cctvfaultoperator: "/dashboard/cctvoperator",
  // Third-party
  thirdpartystaff: "/dashboard/thirdparty/staff",
  thirdpartyclient: "/dashboard/thirdparty/client",
  thirdpartyliveoperator: "/dashboard/thirdparty/liveoperator",
  thirdpartycctvoperator: "/dashboard/thirdparty/cctvoperator",
};

// Returns the base path for staff-dashboard-equivalent roles.
// Used everywhere instead of hardcoding '/dashboard/staff' so that
// third party operators navigate to their own routes correctly.
export const getStaffBasePath = (role) =>
  role === USER_ROLES.THIRDPARTYSTAFF
    ? "/dashboard/thirdparty/staff"
    : "/dashboard/staff";


export const AUTH_ERRORS = {
  "auth/email-already-in-use": "This email is already registered",
  "auth/weak-password": "Password should be at least 6 characters",
  "auth/invalid-email": "Invalid email address",
  "auth/user-not-found": "No account found with this email",
  "auth/wrong-password": "Incorrect password",
  "auth/too-many-requests": "Too many attempts. Please try again later",
  "auth/network-request-failed": "Network error. Check your connection",
  "auth/invalid-otp":
    "Invalid or expired access code. Please check with your administrator.",
  "auth/operation-not-allowed":
    "Email/password sign-in is not enabled. Please contact support.",
};
