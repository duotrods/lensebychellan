# Third Party Subscriber Roles — Design Spec
**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Add a full set of third-party subscriber roles to LENSE to support external companies paying to use the platform. Each third-party company gets a complete mirror of the internal role set, scoped to their assigned scheme only. They cannot see any other scheme's data.

This spec covers the access layer only — role definitions, invite code flows, signup, routing, and admin management. Form internals (making camera sections data-driven per scheme) and form data isolation are out of scope and will be tackled in a future spec.

---

## Third-Party Role Set

| Role | Internal Equivalent | Who | What they do |
|------|-------------------|-----|-------------|
| `thirdpartyoperator` | `staff` | On-the-ground staff | Submit forms (Incident, Daily Occurrence, CCTV Check) |
| `thirdpartyclient` | `client` | Manager/supervisor | View reports, analytics, data for their scheme |
| `thirdpartyliveoperator` | `liveoperator` | Live incident operator | Monitor live incidents for their scheme |
| `thirdpartycctvoperator` | `cctvfaultoperator` | CCTV fault operator | Log and manage CCTV faults for their scheme |

All four roles are scoped to their assigned scheme(s) only. They sign up with one starting scheme baked into their invite code. Admins can then assign additional schemes via the existing SchemeAssignment page — exactly the same way it works for internal `client` users.

---

## Scope

**In scope:**
- Four new role constants, labels, routes, and helpers
- Four new Firestore collections for invite codes (one per role)
- OTP service methods for each role (create, validate, mark used)
- Auth service signup methods for each role — signup assigns one starting scheme from the invite code
- New protected routes and dashboard entry points for each role
- Admin UI — new "Third Party Codes" section in OTP Management page covering all four roles
- SchemeAssignment page extended to show all four third-party roles so admins can assign additional schemes after signup

**Out of scope:**
- Making CCTV Check / other form sections data-driven per scheme
- Form data isolation (tagging submissions to the third-party scheme ID)
- Billing / subscription management

---

## Data Model

### User document (Firestore `users` collection)
All four third-party roles follow the same user document shape. They start with one scheme from the invite code. Additional schemes are added by an admin via SchemeAssignment — stored in `schemeIds` (array), exactly like internal `client` users.

```js
{
  displayName: "John Smith",
  email: "john@newco.com",
  role: "thirdpartyoperator",         // or thirdpartyclient, thirdpartyliveoperator, thirdpartycctvoperator
  schemeId: "NEWCO1",                 // starting scheme — kept for backward compatibility
  schemeName: "NewCo Scheme - NewCo",
  schemeIds: ["NEWCO1"],              // array — grows as admin assigns more schemes
  schemeNames: { "NEWCO1": "NewCo Scheme - NewCo" },
  activeSchemeId: "NEWCO1",           // which scheme is currently active (for multi-scheme switcher)
  emailVerified: false,
  metadata: {
    signInMethod: "email",
    ipAddress: null,
    userAgent: "...",
    accessCode: "ABC123"
  }
}
```

### Invite code documents

Four Firestore collections, one per role, all with the same document shape:

| Role | Collection |
|------|-----------|
| `thirdpartyoperator` | `thirdPartyOperatorCodes` |
| `thirdpartyclient` | `thirdPartyClientCodes` |
| `thirdpartyliveoperator` | `thirdPartyLiveOperatorCodes` |
| `thirdpartycctvoperator` | `thirdPartyCCTVOperatorCodes` |

Each document:
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
THIRDPARTYOPERATOR: 'thirdpartyoperator',
THIRDPARTYCLIENT: 'thirdpartyclient',
THIRDPARTYLIVEOPERATOR: 'thirdpartyliveoperator',
THIRDPARTYCCTVOPERATOR: 'thirdpartycctvoperator',
```

Add to `ROLE_LABELS`:
```js
thirdpartyoperator: 'Third Party Operator',
thirdpartyclient: 'Third Party Client',
thirdpartyliveoperator: 'Third Party Live Operator',
thirdpartycctvoperator: 'Third Party CCTV Operator',
```

Add to `DASHBOARD_ROUTES`:
```js
thirdpartyoperator: '/dashboard/thirdparty/operator',
thirdpartyclient: '/dashboard/thirdparty/client',
thirdpartyliveoperator: '/dashboard/thirdparty/liveoperator',
thirdpartycctvoperator: '/dashboard/thirdparty/cctvoperator',
```

**File:** `src/utils/roleHelpers.js`

Add helpers:
```js
export const isThirdPartyOperator = (role) => role === USER_ROLES.THIRDPARTYOPERATOR;
export const isThirdPartyClient = (role) => role === USER_ROLES.THIRDPARTYCLIENT;
export const isThirdPartyLiveOperator = (role) => role === USER_ROLES.THIRDPARTYLIVEOPERATOR;
export const isThirdPartyCCTVOperator = (role) => role === USER_ROLES.THIRDPARTYCCTVOPERATOR;
```

---

## Section 2: Invite Code System

**File:** `src/services/otpService.js`

Three methods per role (12 total), all following the same pattern as `cctvOperatorOTPs`:

For each role, implement:
- `create[Role]Code(schemeId, schemeName, adminUid)` — generates alphanumeric code, writes to the role's collection
- `validate[Role]Code(code)` — returns `{ isValid, schemeId, schemeName }`
- `mark[Role]CodeAsUsed(code, uid)` — sets `isUsed: true`, `usedBy`, `usedAt`

Concrete method names:

| Role | Create | Validate | Mark Used |
|------|--------|----------|-----------|
| `thirdpartyoperator` | `createThirdPartyOperatorCode` | `validateThirdPartyOperatorCode` | `markThirdPartyOperatorCodeAsUsed` |
| `thirdpartyclient` | `createThirdPartyClientCode` | `validateThirdPartyClientCode` | `markThirdPartyClientCodeAsUsed` |
| `thirdpartyliveoperator` | `createThirdPartyLiveOperatorCode` | `validateThirdPartyLiveOperatorCode` | `markThirdPartyLiveOperatorCodeAsUsed` |
| `thirdpartycctvoperator` | `createThirdPartyCCTVOperatorCode` | `validateThirdPartyCCTVOperatorCode` | `markThirdPartyCCTVOperatorCodeAsUsed` |

---

## Section 3: Signup Flow

**File:** `src/services/authService.js`

Four new signup methods, one per role, all following the same steps as `signUpCCTVFaultOperatorWithOTP`:

1. Validate the invite code via the role's `validate*Code` method — throw `AppError` if invalid
2. `createUserWithEmailAndPassword`
3. `updateProfile` — set display name
4. `sendEmailVerification`
5. `firestoreService.createUserDocument` with the role string, `schemeId`, `schemeName` from the validated code
6. `mark*CodeAsUsed` (non-blocking)

Methods:
- `signUpThirdPartyOperatorWithOTP`
- `signUpThirdPartyClientWithOTP`
- `signUpThirdPartyLiveOperatorWithOTP`
- `signUpThirdPartyCCTVOperatorWithOTP`

**Signup UI:**
The existing signup page gains four new role options under a "Third Party" group. Each option uses its corresponding signup method. The invite code field label updates to "Third Party Access Code" for all four.

---

## Section 4: Routing & Dashboards

**File:** `src/App.jsx`

Four new protected routes:

```jsx
<Route path="/dashboard/thirdparty/operator/*" element={
  <ProtectedRoute allowedRoles={['thirdpartyoperator']}>
    <ThirdPartyOperatorDashboard />
  </ProtectedRoute>
} />
<Route path="/dashboard/thirdparty/client/*" element={
  <ProtectedRoute allowedRoles={['thirdpartyclient']}>
    <ThirdPartyClientDashboard />
  </ProtectedRoute>
} />
<Route path="/dashboard/thirdparty/liveoperator/*" element={
  <ProtectedRoute allowedRoles={['thirdpartyliveoperator']}>
    <ThirdPartyLiveOperatorDashboard />
  </ProtectedRoute>
} />
<Route path="/dashboard/thirdparty/cctvoperator/*" element={
  <ProtectedRoute allowedRoles={['thirdpartycctvoperator']}>
    <ThirdPartyCCTVOperatorDashboard />
  </ProtectedRoute>
} />
```

**New dashboard files** (all thin wrappers over existing dashboards):

| File | Wraps |
|------|-------|
| `src/pages/thirdparty/ThirdPartyOperatorDashboard.jsx` | `NewStaffDashboard` |
| `src/pages/thirdparty/ThirdPartyClientDashboard.jsx` | `NewClientDashboard` |
| `src/pages/thirdparty/ThirdPartyLiveOperatorDashboard.jsx` | existing live operator dashboard |
| `src/pages/thirdparty/ThirdPartyCCTVOperatorDashboard.jsx` | existing CCTV fault operator dashboard |

No logic duplication. Each exists as its own route entry point so it can diverge independently in future.

**File:** `src/components/auth/ProtectedRoute.jsx`

Audit every `allowedRoles` array in `ProtectedRoute` and `App.jsx`:
- Routes allowing `staff` → also allow `thirdpartyoperator`
- Routes allowing `client` → also allow `thirdpartyclient`
- Routes allowing `liveoperator` → also allow `thirdpartyliveoperator`
- Routes allowing `cctvfaultoperator` → also allow `thirdpartycctvoperator`
- Admin-only routes must not be extended to any third-party role

---

## Section 5: Admin — Invite Code Management

**File:** `src/pages/admin/OTPManagementPage.jsx` and `src/components/admin/OTPManagement.jsx`

A new **"Third Party Codes"** section is added to the OTP Management page. It contains four sub-tabs, one per third-party role:

- **Operator Codes** — for `thirdpartyoperator`
- **Client Codes** — for `thirdpartyclient`
- **Live Operator Codes** — for `thirdpartyliveoperator`
- **CCTV Operator Codes** — for `thirdpartycctvoperator`

Each sub-tab has:
- Scheme selector dropdown (from `SCHEMES` list, plus a free-text field for scheme IDs not yet in the list)
- "Generate Code" button — calls the appropriate `create*Code` method
- Code display with copy-to-clipboard
- List of existing codes: scheme, created date, used/unused status, used-by name if used

---

## Section 6: Admin — Scheme Assignment (Multi-Scheme Support)

**File:** `src/components/admin/SchemeAssignment.jsx`

The existing SchemeAssignment page already handles `client` and `cctvfaultoperator` users. It needs to be extended to also show all four third-party roles in the role filter tabs:

- Add **Third Party Operator**, **Third Party Client**, **Third Party Live Operator**, **Third Party CCTV Operator** tabs to the role filter
- No changes to the assign/remove scheme logic — it already works with `schemeIds` arrays and works the same for any role
- This is how admins add additional schemes to a third-party user after their initial signup

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| New roles vs flags on existing roles | Four new roles | Clean separation, consistent with existing role system |
| Invite code approach | Scheme baked into code at creation | Matches `cctvfaultoperator` pattern, admin controls access precisely |
| Dashboard routes | Own routes under `/dashboard/thirdparty/` | Isolation for future divergence per role |
| Form changes | Out of scope | Form data-driving is a separate, larger piece of work |
| Form data isolation | Out of scope | Tackled when forms become data-driven |

---

## Files Touched

| File | Change |
|------|--------|
| `src/utils/constants.js` | Add 4 roles, labels, routes |
| `src/utils/roleHelpers.js` | Add 4 helper functions |
| `src/services/otpService.js` | Add 12 new methods (3 per role) |
| `src/services/authService.js` | Add 4 signup methods |
| `src/pages/auth/SignUpPage.jsx` | Add third-party role options |
| `src/App.jsx` | Add 4 new protected routes |
| `src/pages/thirdparty/ThirdPartyOperatorDashboard.jsx` | New file — thin wrapper |
| `src/pages/thirdparty/ThirdPartyClientDashboard.jsx` | New file — thin wrapper |
| `src/pages/thirdparty/ThirdPartyLiveOperatorDashboard.jsx` | New file — thin wrapper |
| `src/pages/thirdparty/ThirdPartyCCTVOperatorDashboard.jsx` | New file — thin wrapper |
| `src/components/auth/ProtectedRoute.jsx` | Audit and extend allowedRoles for all 4 roles |
| `src/pages/admin/OTPManagementPage.jsx` | Add Third Party Codes section |
| `src/components/admin/OTPManagement.jsx` | Add Third Party Codes UI with 4 sub-tabs |
| `src/components/admin/SchemeAssignment.jsx` | Add all 4 third-party roles to role filter tabs |
