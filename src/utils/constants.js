export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CLIENT: 'client'
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  staff: 'Staff Member',
  client: 'Client'
};

export const DASHBOARD_ROUTES = {
  admin: '/dashboard/admin',
  staff: '/dashboard/staff',
  client: '/dashboard/client'
};

export const AUTH_ERRORS = {
  'auth/email-already-in-use': 'This email is already registered',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/invalid-email': 'Invalid email address',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Check your connection'
};
