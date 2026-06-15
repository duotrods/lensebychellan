import { USER_ROLES } from "./constants";

export const isAdmin = (role) => role === USER_ROLES.ADMIN;
export const isStaff = (role) => role === USER_ROLES.STAFF;
export const isClient = (role) => role === USER_ROLES.CLIENT;
export const isLiveOperator = (role) => role === USER_ROLES.LIVEOPERATOR;
export const isCCTVOperator = (role) => role === USER_ROLES.CCTVOPERATOR;

// Roles that support multi-scheme assignment via SchemeAssignment page
export const MULTI_SCHEME_ROLES = new Set([
  USER_ROLES.CLIENT,
  USER_ROLES.CCTVOPERATOR,
]);

export const canModifyRole = (userRole, targetRole) => {
  return userRole === USER_ROLES.ADMIN && targetRole === USER_ROLES.STAFF;
};

export const validateRoleSelection = (role) => {
  return [
    USER_ROLES.STAFF,
    USER_ROLES.CLIENT,
    USER_ROLES.LIVEOPERATOR,
    USER_ROLES.CCTVOPERATOR,
  ].includes(role);
};
