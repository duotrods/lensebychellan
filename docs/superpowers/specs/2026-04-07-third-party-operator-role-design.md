# Third Party Operator Role — Design Spec
**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Add a `thirdpartyoperator` role to LENSE to support external companies subscribing to the platform. Third-party operators get the same functionality as internal staff (Incident Sheet, Daily Occurrence, CCTV Check forms, dashboard) but are scoped to their assigned scheme(s) only.

This spec covers the access layer only — role definition, invite code flow, signup, routing, and admin management. Form internals (making camera sections data-driven per scheme) are out of scope and will be tackled in a future spec.

---

## Scope

**In scope:**
- New `thirdpartyoperator` role constant and helper
- New Firestore collection `thirdPartyOperatorCodes` for invite codes with scheme baked in
- New OTP service methods for creating, validating, and marking codes used
- New auth service signup method
- New protected route `/dashboard/thirdparty` with its own dashboard entry point
- Admin UI tab in OTP Management page for generating third-party invite codes

**Out of scope:**
- Making CCTV Check / other form sections data-driven per scheme
- Form data isolation (tagging submissions to the third-party scheme ID)
- Billing / subscription management

---

## Data Model

### User document (Firestore `users` collection)
Third-party operator users follow the same shape as `cctvfaultoperator` users:

```js
{
  displayName: "John Smith",
  email: "john@newco.com",
  role: "thirdpartyoperator",
  schemeId: "NEWCO1",
  schemeName: "NewCo Scheme - NewCo",
  emailVerified: false,
  metadata: {
    signInMethod: "email",
    ipAddress: null,
    userAgent: "...",
    accessCode: "ABC123"
  }
}
```

### Invite code document (Firestore `thirdPartyOperatorCodes` collection)

```js
{
  code: "ABC123",
  schemeId: "NEWCO1",
  schemeName: "NewCo Scheme - NewCo",
  createdBy: "adminUid",
  createdAt: Timestamp,
  isUsed: false,
  usedBy: null,
  usedAt: null
}
```

One code per user. Codes are single-use. Admin generates and shares them out-of-band.

---

## Section 1: Role & Constants

**File:** `src/utils/constants.js`

Add to `USER_ROLES`:
```js
THIRDPARTYOPERATOR: 'thirdpartyoperator'
```

Add to `ROLE_LABELS`:
```js
thirdpartyoperator: 'Third Party Operator'
```

Add to `DASHBOARD_ROUTES`:
```js
thirdpartyoperator: '/dashboard/thirdparty'
```

**File:** `src/utils/roleHelpers.js`

Add helper:
```js
export const isThirdPartyOperator = (role) => role === USER_ROLES.THIRDPARTYOPERATOR;
```

---

## Section 2: Invite Code System

**File:** `src/services/otpService.js`

Three new methods mirroring the `cctvOperatorOTPs` pattern:

### `createThirdPartyOperatorCode(schemeId, schemeName, adminUid)`
- Generates a random alphanumeric code
- Writes a document to `thirdPartyOperatorCodes` with `isUsed: false`
- Returns the generated code string

### `validateThirdPartyOperatorCode(code)`
- Queries `thirdPartyOperatorCodes` where `code == code` and `isUsed == false`
- Returns `{ isValid: true, schemeId, schemeName }` on success
- Returns `{ isValid: false }` if not found or already used

### `markThirdPartyOperatorCodeAsUsed(code, uid)`
- Updates the matching document: `isUsed: true`, `usedBy: uid`, `usedAt: serverTimestamp()`

---

## Section 3: Signup Flow

**File:** `src/services/authService.js`

New method: `signUpThirdPartyOperatorWithOTP(email, password, userData, otpCode)`

Steps:
1. Call `otpService.validateThirdPartyOperatorCode(otpCode)` — throw `AppError` if invalid
2. `createUserWithEmailAndPassword` — create Firebase Auth user
3. `updateProfile` — set display name
4. `sendEmailVerification`
5. `firestoreService.createUserDocument` with `role: 'thirdpartyoperator'`, `schemeId`, `schemeName` from validation result
6. `otpService.markThirdPartyOperatorCodeAsUsed` (non-blocking, same pattern as other roles)

**Signup UI:**  
The existing staff signup page (`SignUpPage` / relevant form) gains a new role option for third-party operators. When selected, the flow uses `signUpThirdPartyOperatorWithOTP`. The invite code field label and placeholder are updated to reflect the third-party context (e.g. "Third Party Access Code").

---

## Section 4: Routing & Dashboard

**File:** `src/utils/constants.js`  
`DASHBOARD_ROUTES['thirdpartyoperator'] = '/dashboard/thirdparty'` (covered in Section 1)

**File:** `src/App.jsx`  
New protected route:
```jsx
<Route path="/dashboard/thirdparty/*" element={
  <ProtectedRoute allowedRoles={['thirdpartyoperator']}>
    <ThirdPartyDashboard />
  </ProtectedRoute>
} />
```

**File:** `src/pages/thirdparty/ThirdPartyDashboard.jsx` (new file)  
A thin wrapper that renders `NewStaffDashboard` (or `StaffSidebarLayout` with the same content). No logic duplication. Exists as its own route entry point so it can diverge independently in future.

**File:** `src/components/auth/ProtectedRoute.jsx`  
Audit every `allowedRoles` array in `ProtectedRoute` and in `App.jsx` route definitions. Any route that allows `staff` (forms, reports, CCTV check, daily occurrence, incident report) must also allow `thirdpartyoperator`. Routes that are staff-only for internal reasons (e.g. admin tools, staff management) must not be extended.

---

## Section 5: Admin — Invite Code Management

**File:** `src/pages/admin/OTPManagementPage.jsx` and `src/components/admin/OTPManagement.jsx`

A new tab **"Third Party Codes"** is added alongside the existing CCTV operator codes tab. The tab UI matches the existing pattern:

- Scheme selector dropdown (from `SCHEMES` list, plus a free-text field for new scheme IDs not yet in the list)
- "Generate Code" button — calls `otpService.createThirdPartyOperatorCode`
- Code display with copy-to-clipboard
- List of existing codes showing: scheme, created date, used/unused status, used-by name if used

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| New role vs flag on staff | New role | Clean separation, consistent with existing role system |
| Invite code approach | Scheme baked into code at creation | Matches `cctvfaultoperator` pattern, admin controls access precisely |
| Dashboard route | Own route `/dashboard/thirdparty` | Isolation for future divergence |
| Form changes | Out of scope | Form data-driving is a separate, larger piece of work |
| Data isolation | Out of scope | Tackled when forms become data-driven |

---

## Files Touched

| File | Change |
|------|--------|
| `src/utils/constants.js` | Add role, label, route |
| `src/utils/roleHelpers.js` | Add `isThirdPartyOperator` helper |
| `src/services/otpService.js` | Add 3 new methods |
| `src/services/authService.js` | Add `signUpThirdPartyOperatorWithOTP` |
| `src/pages/auth/SignUpPage.jsx` | Add third-party operator option |
| `src/App.jsx` | Add `/dashboard/thirdparty` route |
| `src/pages/thirdparty/ThirdPartyDashboard.jsx` | New file — thin wrapper |
| `src/components/auth/ProtectedRoute.jsx` | Audit and add `thirdpartyoperator` to allowed roles |
| `src/pages/admin/OTPManagementPage.jsx` | Add Third Party Codes tab |
| `src/components/admin/OTPManagement.jsx` | Add Third Party Codes tab UI |
