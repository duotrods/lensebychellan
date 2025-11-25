import { USER_ROLES } from './constants';

export const isAdmin = (role) => role === USER_ROLES.ADMIN;
export const isStaff = (role) => role === USER_ROLES.STAFF;
export const isClient = (role) => role === USER_ROLES.CLIENT;

export const canModifyRole = (userRole, targetRole) => {
  // Admins can only modify staff roles
  return userRole === USER_ROLES.ADMIN && targetRole === USER_ROLES.STAFF;
};

export const validateRoleSelection = (role) => {
  // During signup, only staff and client can be selected
  return [USER_ROLES.STAFF, USER_ROLES.CLIENT].includes(role);
};
