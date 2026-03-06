# Lense by Chellan — Technical System Documentation

> **Engineer's Reference / Cheat Sheet** — covers every feature, file, data model, service method, hook, route, and Firestore rule in the system.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS + DaisyUI |
| State / Cache | TanStack Query (React Query) |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Storage (CCTV uploads) |
| Functions | Firebase Cloud Functions (user deletion) |
| Analytics | Vercel Analytics + Speed Insights |
| Notifications | react-hot-toast |
| Icons | lucide-react |
| PDF Export | Custom `pdfGenerator.js` util |

---

## 2. Project Structure

```
src/
├── App.jsx                          # Root router — all route definitions
├── main.jsx                         # React entry point
├── index.css
│
├── config/
│   └── firebase.js                  # Firebase app init (auth, db, functions, storage)
│
├── context/
│   ├── AuthContext.jsx              # Global auth state (currentUser, userProfile, role)
│   └── StaffCCTVFaultsContext.jsx   # Real-time CCTV faults feed for staff (onSnapshot)
│
├── hooks/
│   ├── useAuth.js                   # Consumes AuthContext → { currentUser, userProfile, role, updateActiveScheme }
│   ├── useCCTVFaults.js             # useLiveCCTVFaults, usePaginatedCCTVFaults, useStaffLiveCCTVFaults
│   ├── useLiveIncidents.js          # Real-time incident subscription for clients/live operators
│   ├── useLiveOperatorIncidents.js  # Real-time incidents for live operator dashboard
│   └── useCCTVReminder.js          # Reminder hook for CCTV check schedule
│
├── services/
│   ├── authService.js               # Firebase Auth operations + OTP signup flows
│   ├── firestoreService.js          # Admin-level user/scheme CRUD + audit logs + login logs
│   ├── clientDataService.js         # Client/operator queries: CCTV faults, incidents, notes
│   ├── staffService.js              # Staff queries: all report types, live faults subscription
│   ├── otpService.js                # OTP validation, creation, mark-as-used
│   ├── referenceIdService.js        # Auto-increment reference IDs (CF01, IN01, etc.)
│   ├── roleService.js               # Role check helpers
│   └── emailService.js              # Email notifications
│
├── utils/
│   ├── constants.js                 # USER_ROLES, ROLE_LABELS, DASHBOARD_ROUTES, AUTH_ERRORS
│   ├── schemes.js                   # SCHEMES array, helpers: getSchemeById, extractSchemeId, isDemoUser
│   ├── pdfGenerator.js              # PDF export logic
│   ├── imageCompression.js          # Image compression before upload
│   ├── roleHelpers.js               # Role utility helpers
│   └── errorHandling.js             # AppError class
│
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.jsx       # Wraps routes — checks auth + allowedRoles
│   │   ├── SignInForm.jsx
│   │   ├── SignUpForm.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── EmailVerification.jsx
│   │
│   ├── layout/
│   │   ├── StaffSidebarLayout.jsx        # Staff nav shell
│   │   ├── ClientSidebarLayout.jsx       # Client nav shell
│   │   ├── AdminSidebarLayout.jsx        # Admin nav shell
│   │   ├── LiveOperatorSidebarLayout.jsx # Live operator nav shell
│   │   ├── CCTVOperatorSidebarLayout.jsx # CCTV operator nav + SchemeSwitcher
│   │   ├── DashboardLayout.jsx           # Generic layout wrapper
│   │   └── LogoutConfirmModal.jsx
│   │
│   ├── dashboard/
│   │   ├── AdminDashboard.jsx            # Admin stats + user counts
│   │   ├── NewStaffDashboard.jsx         # Staff home with live fault summary
│   │   ├── NewClientDashboard.jsx        # Client home
│   │   ├── LiveOperatorDashboard.jsx     # Live operator home
│   │   └── LiveCameraOperatorDashboard.jsx  # CCTV operator + client fault dashboard (chat notes)
│   │
│   ├── admin/
│   │   ├── SchemeAssignment.jsx     # Assign/remove schemes; role filter (client/CCTV operator); Scheme Overview tab
│   │   ├── OTPManagement.jsx        # Create/revoke OTP codes and staff invite codes
│   │   ├── StaffManagement.jsx      # View/archive/promote/delete staff
│   │   └── LoginLogs.jsx            # Paginated login audit trail
│   │
│   ├── client/
│   │   └── SchemeSwitcher.jsx       # Dropdown to switch activeSchemeId (reloads page)
│   │
│   ├── staff/
│   │   ├── NoticeBoard.jsx          # Activity notice board for staff
│   │   └── CCTVCheckReminder.jsx    # Reminder overlay if CCTV check overdue
│   │
│   └── common/
│       ├── ErrorBoundary.jsx
│       └── LoadingSpinner.jsx
│
├── pages/
│   ├── Dashboard.jsx                # Role-based dashboard router (picks correct dashboard component)
│   ├── SignInPage.jsx
│   ├── SignUpPage.jsx
│   ├── ForgotPasswordPage.jsx
│   │
│   ├── auth/
│   │   └── AuthActionPage.jsx       # Handles Firebase email action links (verify, reset)
│   │
│   ├── staff/
│   │   ├── FormsSelectionPage.jsx          # Form picker page
│   │   ├── CCTVCheckFormPage.jsx           # CCTV check form (create/edit)
│   │   ├── IncidentReportFormPage.jsx      # Incident report form
│   │   ├── AssetDamageFormPage.jsx         # Asset damage form
│   │   ├── DailyOccurrenceFormPage.jsx     # Daily occurrence form
│   │   ├── CCTVFaultsFormPage.jsx          # CCTV fault form (create/edit + complete)
│   │   ├── CCTVFaultsLivePage.jsx          # Live fault table + expandable chat thread
│   │   ├── CCTVFaultsView.jsx              # Fault detail view (with NoteThread chat bubbles)
│   │   ├── CCTVUploadsPage.jsx             # CCTV footage upload management
│   │   ├── IncidentReportView.jsx
│   │   ├── CCTVCheckView.jsx
│   │   ├── AssetDamageView.jsx
│   │   └── DailyOccurrenceView.jsx
│   │
│   ├── admin/
│   │   ├── OTPManagementPage.jsx
│   │   ├── SchemeAssignmentPage.jsx
│   │   ├── StaffManagementPage.jsx
│   │   ├── StaffReportsPage.jsx            # Searchable paginated reports across all types
│   │   ├── ClientChartsPage.jsx            # Client analytics charts
│   │   ├── IncidentReportDetailPage.jsx
│   │   ├── CCTVCheckDetailPage.jsx
│   │   ├── AssetDamageDetailPage.jsx
│   │   └── DailyLogsDetailPage.jsx
│   │
│   ├── client/
│   │   ├── ReportsPage.jsx                 # Paginated/searchable report list for client
│   │   ├── AnalyticsPage.jsx
│   │   ├── CCTVRecordingsPage.jsx
│   │   ├── LiveIncidentsPage.jsx           # Real-time incidents
│   │   ├── CCTVFaultView.jsx               # Single fault view for client/CCTV operator
│   │   ├── IncidentReportView.jsx
│   │   ├── AssetDamageView.jsx
│   │   ├── DailyOccurrenceView.jsx
│   │   └── CCTVCheckView.jsx
│   │
│   └── liveoperator/
│       └── IncidentDetailPage.jsx
```

---

## 3. User Roles

Defined in `src/utils/constants.js`:

```js
USER_ROLES = {
  ADMIN:        'admin',
  STAFF:        'staff',
  CLIENT:       'client',
  LIVEOPERATOR: 'liveoperator',
  CCTVOPERATOR: 'cctvfaultoperator'
}
```

| Role | Firestore field | Dashboard route | Signup method |
|---|---|---|---|
| `admin` | `role: 'admin'` | `/dashboard/admin` | Promoted from staff by admin |
| `staff` | `role: 'staff'` | `/dashboard/staff` | Staff invite code (OTP) |
| `client` | `role: 'client'` | `/dashboard/client` | Client OTP tied to schemeId |
| `liveoperator` | `role: 'liveoperator'` | `/dashboard/liveoperator` | Staff invite code |
| `cctvfaultoperator` | `role: 'cctvfaultoperator'` | `/dashboard/cctvoperator` | Client OTP tied to schemeId |

---

## 4. Authentication Flows

### 4a. Standard Email Sign-in
```
authService.signInWithEmail(email, password)
  → signInWithEmailAndPassword(auth, ...)
  → firestoreService.updateLastLogin(uid)          // non-critical, won't throw
  → firestoreService.logUserLogin(uid, ...)        // login audit log (15-day TTL)
```

### 4b. Client OTP Signup
```
authService.signUpClientWithOTP(email, password, userData, otpCode)
  → otpService.validateOTP(otpCode)               // reads /clientOTPs/{otpCode}
  → createUserWithEmailAndPassword(auth, ...)
  → updateProfile(user, { displayName })
  → sendEmailVerification(user)
  → firestoreService.createUserDocument(uid, {
       role: 'client',
       schemeId: otpValidation.schemeId,
       schemeIds: [schemeId],                       // auto-converted in createUserDocument
       schemeNames: { [schemeId]: schemeName },
       activeSchemeId: schemeId,
       ...
    })
  → otpService.markOTPAsUsed(otpCode, uid)         // non-blocking
```

### 4c. Staff Invite Code Signup
```
authService.signUpStaffWithOTP(email, password, userData, otpCode)
  → otpService.validateStaffInviteCode(otpCode)   // reads /staffInviteCodes/{code}
  → createUserWithEmailAndPassword(auth, ...)
  → firestoreService.createUserDocument(uid, { role: 'staff', ... })
  → otpService.markStaffInviteCodeAsUsed(code, uid)
```

### 4d. CCTV Operator Signup
```
authService.signUpCCTVFaultOperatorWithOTP(email, password, userData, otpCode)
  → otpService.validateOTP(otpCode)               // same OTP pool as clients
  → createUserWithEmailAndPassword(auth, ...)
  → firestoreService.createUserDocument(uid, {
       role: 'cctvfaultoperator',
       schemeId: otpValidation.schemeId,           // singular — no schemeIds array!
       schemeName: otpValidation.schemeName,
       ...
    })
```
> ⚠️ **Important**: CCTV operators store `schemeId` (singular). Clients store `schemeIds` (array). This difference drives Firestore rule fallbacks.

### 4e. AuthContext Values
```js
const {
  currentUser,       // Firebase Auth user object
  userProfile,       // Firestore /users/{uid} document
  loading,
  error,
  isAuthenticated,   // !!currentUser
  isEmailVerified,   // currentUser.emailVerified
  role,              // userProfile.role
  updateActiveScheme // async (schemeId) → writes activeSchemeId to Firestore + refreshes profile
} = useAuth();
```

---

## 5. Firestore Data Model

### 5a. Collections

| Collection | Purpose |
|---|---|
| `users` | All user profiles |
| `clientOTPs` | OTP codes for client + CCTV operator signup |
| `staffInviteCodes` | Invite codes for staff + live operator signup |
| `incidentReports` | Incident report documents |
| `cctvCheckForms` | CCTV check form documents |
| `assetDamageReports` | Asset damage report documents |
| `dailyOccurrenceReports` | Daily occurrence report documents |
| `cctvFaultsReports` | CCTV fault reports (live + completed, with chat notes) |
| `cctvUploads` | CCTV footage upload metadata |
| `activities` | Activity/notice board entries |
| `counters` | Reference ID counters (CF, IN, CC, DA, DO) |
| `auditLogs` | Admin action audit trail |
| `loginLogs` | Login audit trail (15-day TTL via Firestore TTL policy) |

---

### 5b. User Document (`/users/{uid}`)

```js
{
  uid: string,
  email: string,
  displayName: string,
  role: 'admin' | 'staff' | 'client' | 'liveoperator' | 'cctvfaultoperator',
  emailVerified: boolean,
  isActive: boolean,
  isArchived: boolean,
  canCreateAdmins: boolean,           // super admin flag — set manually

  // Scheme fields (client + CCTV operator)
  schemeId: string,                   // legacy single scheme / CCTV operator primary
  schemeName: string,                 // legacy
  schemeIds: string[],                // multi-scheme array (client after assignment)
  schemeNames: { [schemeId]: string },// display name map
  activeSchemeId: string,             // currently selected scheme

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt: Timestamp,
  archivedAt: Timestamp | null,
  archivedBy: uid | null,

  // Metadata
  metadata: {
    signInMethod: 'email' | 'google',
    userAgent: string,
    otpCode: string | null,
    inviteCode: string | null,
    invitedBy: string | null
  }
}
```

---

### 5c. CCTV Fault Report (`/cctvFaultsReports/{id}`)

```js
{
  referenceId: string,             // e.g. 'CF01', 'CF02' — uppercase
  schemeId: string,
  schemeIds: string[],             // array for multi-scheme query support
  scheme: string,                  // display name
  camera: string,
  date: string,                    // British format 'DD/MM/YYYY'
  time: string,                    // 'HH:MM'
  comments: string,
  status: 'live' | 'completed',

  // Acknowledgment
  clientAcknowledged: boolean,
  acknowledgedAt: Timestamp | null,
  clientNote: string,              // legacy single note

  // Chat notes array (new format)
  clientNotes: [
    {
      text: string,
      addedAt: string,             // ISO string
      authorRole: 'cctvfaultoperator' | 'staff',
      authorName: string
    }
  ],

  // Completion
  completedBy: { name: string, uid: string } | null,
  completedAt: Timestamp | null,

  // Files
  files: string[],                 // Storage URLs

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  submittedBy: { name: string, uid: string }
}
```

---

### 5d. Reference ID Format

All IDs are **UPPERCASE** with a 2-letter prefix + zero-padded number:

| Report Type | Prefix | Example | Counter doc |
|---|---|---|---|
| CCTV Fault | `CF` | `CF01` | `counters/cctvFaults` |
| Incident | `IN` | `IN01` | `counters/incidents` |
| CCTV Check | `CC` | `CC01` | `counters/cctvChecks` |
| Asset Damage | `DA` | `DA01` | `counters/assetDamage` |
| Daily Occurrence | `DO` | `DO01` | `counters/dailyOccurrence` |

> Search terms must always be `.toUpperCase()` before querying.

---

## 6. Services — Method Reference

### `authService` (`src/services/authService.js`)

| Method | Signature | Notes |
|---|---|---|
| `signInWithEmail` | `(email, password)` | Updates lastLoginAt |
| `signInWithGoogle` | `()` | Returns `{ user, isNewUser }` |
| `signOut` | `()` | Clears sessionStorage notice board flag |
| `resetPassword` | `(email)` | Sends Firebase reset email |
| `resendVerificationEmail` | `()` | Re-sends to currentUser |
| `signUpWithEmail` | `(email, password, userData)` | Staff-less signup |
| `signUpClientWithOTP` | `(email, password, userData, otpCode)` | Validates clientOTPs |
| `signUpStaffWithOTP` | `(email, password, userData, otpCode)` | Validates staffInviteCodes |
| `signUpCCTVFaultOperatorWithOTP` | `(email, password, userData, otpCode)` | Uses clientOTPs; saves singular schemeId |
| `signUpLiveOperatorWithOTP` | `(email, password, userData, otpCode)` | Validates staffInviteCodes |

---

### `firestoreService` (`src/services/firestoreService.js`)

| Method | Access | Description |
|---|---|---|
| `createUserDocument(uid, userData)` | Any | Creates `/users/{uid}`; auto-converts client schemeId → schemeIds |
| `getUserDocument(uid)` | Any | Gets `/users/{uid}` |
| `updateLastLogin(uid)` | Any | Non-throwing lastLoginAt update |
| `updateUserProfile(uid, updates)` | Any | Partial update + updatedAt |
| `updateEmailVerificationStatus(uid, bool)` | Any | Non-throwing |
| `logActivity(activityData)` | Any | Writes to `activities` (non-critical) |
| `getAllUsers()` | Admin | Returns all users (no pagination) |
| `getAllUsersPaginated(limit, lastDoc, role)` | Admin | Role-filtered cursor pagination |
| `getUsersPaginated(limit, lastDoc)` | Admin | All users paginated + total count |
| `getUsersCountByRole()` | Admin | 4 parallel aggregation reads → `{ total, staff, client, cctvfaultoperator }` |
| `updateUserRole(targetUid, newRole, adminUid)` | Admin | Staff roles only; creates audit log |
| `assignSchemeToUser(userId, schemeId, schemeName, adminUid)` | Admin | Appends to schemeIds; sets activeSchemeId if first |
| `removeSchemeFromUser(userId, schemeId, adminUid)` | Admin | Requires ≥2 schemes; updates activeSchemeId if removing active |
| `promoteToAdmin(targetUid, adminUid)` | Admin | Staff → admin only; no self-promotion |
| `archiveUser(targetUid, adminUid)` | Admin | Sets isArchived; no self-archive; no admin archive |
| `unarchiveUser(targetUid, adminUid)` | Admin | Clears archive fields |
| `deleteUser(targetUid, adminUid)` | Admin | Calls Cloud Function `deleteUserAccount` |
| `createAuditLog(logData)` | Internal | Writes to `auditLogs` |
| `logUserLogin(uid, name, email, role)` | Any | 15-day TTL loginLog entry |
| `getLoginLogsPaginated(pageSize, lastDoc)` | Admin | Cursor pagination on loginLogs |
| `getLoginLogsCount()` | Admin | Aggregate count |

---

### `clientDataService` (`src/services/clientDataService.js`)

| Method | Description |
|---|---|
| `subscribeCCTVFaults(schemeId, onData, onError)` | **onSnapshot** — live faults only (status != 'completed'); returns unsubscribe fn |
| `getCCTVFaultsPaginated(schemeId, pageSize, lastDoc)` | Cursor pagination on completed faults |
| `getCCTVFaultsCount(schemeId)` | Aggregate count of completed faults |
| `acknowledgeCCTVFault(faultId, clientNote, authorRole, authorName)` | Sets clientAcknowledged + appends to clientNotes[] |
| `addClientNote(faultId, noteText, authorRole, authorName)` | arrayUnion into clientNotes[] with `{ text, addedAt, authorRole, authorName }` |
| `getIncidents(schemeId)` | Paginated incidents for client |
| `subscribeIncidents(schemeId, onData, onError)` | **onSnapshot** for live incidents |

---

### `staffService` (`src/services/staffService.js`)

Key methods (staff-side):

| Method | Description |
|---|---|
| `subscribeAllLiveCCTVFaults(onData, onError)` | **onSnapshot** — ALL schemes, live faults |
| `getCCTVFaultsReports()` | All CCTV faults (staff paginated list) |
| `createCCTVFaultReport(data)` | Creates report + increments counter |
| `updateCCTVFaultReport(id, data)` | Updates fault (edit/complete) |
| `createIncidentReport(data)` | Creates + increments CF counter |
| `getIncidentReports()` | Paginated incident list |
| `createCCTVCheckForm(data)` | Creates CCTV check |
| `createAssetDamageReport(data)` | Creates asset damage report |
| `createDailyOccurrenceReport(data)` | Creates daily log |
| `searchReports(type, term)` | Prefix range query on referenceId (uppercase) |

---

## 7. Hooks Reference

### `useAuth()` → `src/hooks/useAuth.js`
Thin wrapper around `AuthContext`. Returns:
```js
{ currentUser, userProfile, loading, error, isAuthenticated, isEmailVerified, role, updateActiveScheme }
```

### `useLiveCCTVFaults(schemeId)` → `src/hooks/useCCTVFaults.js`
- Calls `clientDataService.subscribeCCTVFaults(schemeId, ...)` → **onSnapshot**
- Returns `{ faults, loading, error }`
- Notes inside each fault update **automatically** (same document subscription)
- Cleans up unsubscribe on unmount

### `usePaginatedCCTVFaults(schemeId, pageSize)` → `src/hooks/useCCTVFaults.js`
- Server-side cursor pagination on completed faults
- Built-in **page cache** (`pageCacheRef`) — revisiting a page costs 0 reads
- Returns `{ faults, loading, error, currentPage, totalPages, totalCount, goToNextPage, goToPrevPage, refresh, pageSize }`

### `useStaffLiveCCTVFaults()` → `src/hooks/useCCTVFaults.js`
- Calls `staffService.subscribeAllLiveCCTVFaults(...)` → **onSnapshot** across all schemes
- Used by `StaffCCTVFaultsContext`

### `StaffCCTVFaultsContext` → `src/context/StaffCCTVFaultsContext.jsx`
- Wraps `useStaffLiveCCTVFaults()` in a context
- Used by `CCTVFaultsLivePage` → `useStaffCCTVFaultsContext()`
- Provides `{ faults, loading }`

### `useLiveIncidents(schemeId)` → `src/hooks/useLiveIncidents.js`
- **onSnapshot** for incidents; used by client live incidents page

---

## 8. Schemes System

Defined in `src/utils/schemes.js`:

```js
SCHEMES = [
  { id: 'A417', fullName: 'A417 Missing Link - Kier',    contractor: 'Kier' },
  { id: 'M3',   fullName: 'M3 Jct 9 - Balfour Beatty',  contractor: 'Balfour Beatty' },
  { id: 'A47',  fullName: 'A47 Thickthorn - Core',       contractor: 'Core' },
  { id: 'A452', fullName: 'A452 HS2 - Traffix',          contractor: 'Traffix' },
  { id: 'DMO1', fullName: 'DMO1 Demo Scheme - Demo',     contractor: 'Demo', isDemo: true },
]
```

**Helpers:**
- `getSchemeById(id)` — find by ID
- `getSchemeByFullName(fullName)` — find by full name
- `extractSchemeId(fullName)` — extract ID from full name (fallback: first word)
- `isDemoUser(userProfile)` — checks schemeIds or schemeId for DMO1
- `isDemoScheme(schemeId)` — `schemeId === 'DMO1'`

**Scheme Switching** (`SchemeSwitcher` component):
1. User picks scheme from dropdown
2. Calls `updateActiveScheme(schemeId)` from AuthContext
3. Writes `activeSchemeId` to Firestore
4. Calls `window.location.reload()` to re-render with new scheme

> Clients and CCTV operators with `schemeIds.length > 1` see the switcher in their sidebar.

---

## 9. All Routes

```
PUBLIC
  /                                       Landing page
  /signin                                 Sign in
  /signup                                 Sign up (role selection → OTP)
  /forgot-password                        Password reset
  /__/auth/action                         Firebase email action handler

ADMIN (role: 'admin')
  /dashboard/admin                        Admin dashboard
  /dashboard/admin/otp-management         Create/revoke OTPs
  /dashboard/admin/scheme-assignment      Assign schemes to clients/CCTV operators
  /dashboard/admin/staff-management       Manage staff users
  /dashboard/admin/staff-reports          All reports, searchable, paginated
  /dashboard/admin/client-charts          Analytics charts
  /dashboard/admin/staff-reports/incident/:id
  /dashboard/admin/staff-reports/cctv/:id
  /dashboard/admin/staff-reports/asset/:id
  /dashboard/admin/staff-reports/daily/:id

STAFF (role: 'staff')
  /dashboard/staff                        Staff dashboard
  /dashboard/staff/forms                  Form selection
  /dashboard/staff/forms/cctv-check       CCTV check form
  /dashboard/staff/forms/incident-report  Incident form
  /dashboard/staff/forms/asset-damage     Asset damage form
  /dashboard/staff/forms/daily-occurence  Daily occurrence form
  /dashboard/staff/forms/cctv-faults      CCTV fault form (?edit=id to edit)
  /dashboard/staff/cctv-faults            Live fault table + chat (CCTVFaultsLivePage)
  /dashboard/staff/cctv-uploads           CCTV footage uploads
  /dashboard/staff/reports/incident/:id
  /dashboard/staff/reports/cctv-check/:id
  /dashboard/staff/reports/asset-damage/:id
  /dashboard/staff/reports/daily-logs/:id
  /dashboard/staff/reports/cctv-faults/:id  Fault detail with NoteThread

CLIENT (role: 'client')
  /dashboard/client                       Client dashboard
  /dashboard/client/live-incidents        Real-time incident feed
  /dashboard/client/live-camera-faults    CCTV fault + chat (LiveCameraOperatorDashboard)
  /dashboard/client/cctv-fault/:id        Single fault view
  /dashboard/client/incident/:id
  /dashboard/client/analytics             Analytics charts
  /dashboard/client/reports               Paginated reports
  /dashboard/client/reports/incident/:id
  /dashboard/client/reports/asset-damage/:id
  /dashboard/client/reports/daily-occurrence/:id
  /dashboard/client/reports/cctv-check/:id
  /dashboard/client/cctv-recordings       CCTV footage viewer

CCTV OPERATOR (role: 'cctvfaultoperator')
  /dashboard/cctvoperator                 Dashboard (same LiveCameraOperatorDashboard component)
  /dashboard/cctvoperator/cctv-fault/:id  Fault detail view

LIVE OPERATOR (role: 'liveoperator')
  /dashboard/liveoperator                 Live operator dashboard
  /dashboard/liveoperator/incident/:id    Incident detail
```

---

## 10. Firestore Security Rules Summary

File: `firestore.rules`

### Helper Functions
```js
isSignedIn()             // request.auth != null
getUserRole()            // reads /users/{uid}.role (1 read per rule eval)
getUserScheme()          // reads /users/{uid}.schemeId — for CCTV operator fallback
getUserSchemes()         // reads /users/{uid}.schemeIds — multi-scheme array
hasSchemeAccess(docSchemeIds)   // userSchemes.hasAny(docSchemeIds)
hasOldSchemeAccess(docSchemeId) // docSchemeId in userSchemes
```

### Per-Collection Access

| Collection | Create | Read | Update | Delete |
|---|---|---|---|---|
| `users` | Signed in | Own doc or admin | Own doc or admin | Own doc or admin |
| `clientOTPs` | Admin | Public (for signup validation) | Admin | Admin |
| `staffInviteCodes` | Admin | Public | Admin | Admin |
| `incidentReports` | Staff | Admin/Staff/LiveOp/Client(scheme) | Staff/Admin | Staff/Admin |
| `cctvCheckForms` | Staff | Admin/Staff/Client(scheme) | Staff/Admin | Staff/Admin |
| `assetDamageReports` | Staff | Admin/Staff/Client(scheme) | Staff/Admin | Staff/Admin |
| `dailyOccurrenceReports` | Staff | Admin/Staff/Client(scheme) | Staff/Admin | Staff/Admin |
| `cctvFaultsReports` | Staff | See below | See below | Staff/Admin |
| `cctvUploads` | Staff | Admin/Staff/Client(scheme) | Staff/Admin | Staff/Admin |
| `activities` | Staff | Admin/Staff | Staff | — |
| `counters` | Staff | Staff | Staff | — |
| `auditLogs` | Admin | Admin | — | — |
| `loginLogs` | Any signed in | Admin | — | — |

### `cctvFaultsReports` — Get Rule
```
Admin OR Staff
OR Client with hasSchemeAccess(schemeIds) OR hasOldSchemeAccess(schemeId)
OR cctvfaultoperator with:
   hasSchemeAccess(schemeIds)
   OR hasOldSchemeAccess(schemeId)
   OR getUserScheme() == resource.data.schemeId          ← singular fallback
   OR getUserScheme() in resource.data.schemeIds         ← array fallback
```

### `cctvFaultsReports` — Update Rule
```
Staff OR Admin                                            ← unrestricted fields
OR Client with schemeAccess → only ['clientAcknowledged', 'acknowledgedAt', 'updatedAt']
OR cctvfaultoperator with schemeAccess → only ['clientAcknowledged', 'clientNote', 'clientNotes', 'acknowledgedAt', 'updatedAt']
```

---

## 11. Chat Notes System (CCTV Faults)

### Data Schema
Each note in `clientNotes[]`:
```js
{
  text: string,
  addedAt: string,          // new Date().toISOString()
  authorRole: 'cctvfaultoperator' | 'staff',
  authorName: string        // userProfile.displayName
}
```

### Who Can Write Notes
| Role | Can add notes | Method |
|---|---|---|
| `cctvfaultoperator` | Yes | `clientDataService.addClientNote(id, text, role, name)` |
| `staff` | Yes | `clientDataService.addClientNote(id, text, 'staff', name)` |
| `client` | No | Firestore rule blocks clientNotes writes for client role |

### Real-Time Behaviour
- **Live faults panel** (`LiveCameraOperatorDashboard` + `CCTVFaultsLivePage`): notes update instantly — both use `onSnapshot` subscriptions that already watch the fault document
- **Completed faults history**: paginated one-time reads — notes are static until page reload
- **CCTVFaultsView** (staff detail): one-time load via `staffService.getCCTVFaultsReports()`

### UI Rendering (`NoteThread` component — duplicated in 3 files)
```
cctvfaultoperator note  →  teal bubble,  right-aligned, rounded-tr-sm
staff note              →  blue bubble,  left-aligned,  rounded-tl-sm
legacy note (no role)   →  treated as cctvfaultoperator (teal, right)
```
Files containing `NoteThread`:
- `src/components/dashboard/LiveCameraOperatorDashboard.jsx`
- `src/pages/staff/CCTVFaultsLivePage.jsx`
- `src/pages/staff/CCTVFaultsView.jsx`

### Chat Input Behaviour
- **Operator** (LiveCameraOperatorDashboard): always-visible single-line input after acknowledgment; Enter key sends
- **Staff** (CCTVFaultsLivePage): "Notes (n)" toggle button per row → expands `<tr>` below with thread + input
- **Staff detail** (CCTVFaultsView): read-only thread display (no input — use live page for replies)

---

## 12. Pagination Pattern

Used in: `StaffReportsPage`, `ReportsPage`, `SchemeAssignment`, `LoginLogs`, `usePaginatedCCTVFaults`

```
Strategy: Firestore cursor-based pagination
  - First page: query(collection, orderBy, limit(n))
  - Next pages:  query(collection, orderBy, startAfter(lastDoc), limit(n))
  - Total count: getCountFromServer(query) → 1 aggregate read
  - Page cache:  useRef({}) keyed by page number → revisits = 0 reads

Module-level restore variables (StaffReportsPage, ReportsPage):
  _reportsRestore = { cursors, typeCursor, page, type, query }
  → Preserved on navigate-away, restored on back-navigate
```

---

## 13. Search Pattern

```
Search term → .toUpperCase() → Firestore prefix range query:
  where('referenceId', '>=', term)
  where('referenceId', '<=', term + '\uf8ff')

Debounce: 400ms via useRef timeout
Type filter: separate query parameter alongside search term
```

---

## 14. Scheme Assignment — Admin UI

File: `src/components/admin/SchemeAssignment.jsx`

**Tabs:**
1. **Client Assignments** — paginated user list with role filter toggle (Clients / CCTV Operators)
   - `effectiveSchemeIds = schemeIds?.length > 0 ? schemeIds : schemeId ? [schemeId] : []`
   - Add/remove scheme badges per user
2. **Scheme Overview** — groups all users (clients + live operators + CCTV operators) by scheme; colour-coded role badges

**Key operations:**
- `firestoreService.assignSchemeToUser(userId, schemeId, schemeName, adminUid)` — appends to schemeIds[]
- `firestoreService.removeSchemeFromUser(userId, schemeId, adminUid)` — removes; requires ≥2 schemes

---

## 15. Firebase Cost Optimisation Patterns

| Pattern | Saves |
|---|---|
| `getCountFromServer()` aggregation | 1 read regardless of doc count |
| Page cache in `usePaginatedCCTVFaults` | 0 reads on revisit |
| `onSnapshot` for live data | Only charges when data changes |
| Notes stored as array in fault doc | No subcollection = no extra reads |
| `staleTime: 5min` in React Query | Prevents redundant re-fetches |
| `refetchOnWindowFocus: false` | No refetch on tab switch |
| Login logs TTL (15 days) | Auto-delete — no manual cleanup needed |
| CCTV operator note updates free | Already subscribed to fault doc via live feed |

---

## 16. Environment & Deployment

- **Dev server:** `vite dev`
- **Build:** `vite build`
- **Firebase project aliases:** `.firebaserc` → default: `lensebychellan`, staging: `lensebychellan-staging`
- **Switch project:** `firebase use <alias>` or `firebase use <project-id>`
- **Deploy rules only:** `firebase deploy --only firestore:rules`
- **Never auto-deploy** — user handles all deployments manually

---

## 17. Key Environment Files

| File | Purpose |
|---|---|
| `firestore.rules` | Firestore security rules |
| `.firebaserc` | Project alias config |
| `firebase.json` | Firebase hosting + rules config |
| `vite.config.js` | Vite build config |
| `tailwind.config.js` | Tailwind + DaisyUI config |
| `src/config/firebase.js` | Firebase SDK init (auth, db, storage, functions) |

---

*Last updated: March 2026 — Lense by Chellan internal technical reference.*
