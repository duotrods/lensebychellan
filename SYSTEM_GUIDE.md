# Complete System Guide for Beginners
## LenseBy Chellan - Multi-Scheme Security Management System

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Multi-Scheme System Explained](#multi-scheme-system-explained)
5. [Firebase Security Rules (Firestore Rules)](#firebase-security-rules)
6. [Authentication Flow](#authentication-flow)
7. [Key Services Explained](#key-services-explained)
8. [Components Breakdown](#components-breakdown)
9. [Data Flow Examples](#data-flow-examples)
10. [Common Patterns Used](#common-patterns-used)

---

## System Overview

### What Does This System Do?

This is a **security management platform** that handles multiple construction sites (called "schemes"). It allows:

- **Staff members** to create incident reports, CCTV checks, damage reports, and daily occurrence reports
- **Client users** to view reports and analytics for their assigned schemes
- **Admin users** to manage users, assign schemes to clients, and generate access codes

### Technology Stack

```
Frontend: React.js (JavaScript library for building user interfaces)
Backend: Firebase (Google's cloud platform)
  - Authentication: Firebase Auth (handles user login/signup)
  - Database: Cloud Firestore (NoSQL document database)
  - Storage: Firebase Storage (for images/videos)
  - Security: Firestore Security Rules (access control)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
├──────────────┬──────────────┬──────────────┬────────────────┤
│    Admin     │    Staff     │   Client     │  Unauthenticated│
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       │              │              │                │
       ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Authentication                         │
│  (Checks username/password, creates user accounts)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Firestore Security Rules                          │
│  (Checks: "Is this user allowed to read/write this data?")  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Cloud Firestore Database                      │
│                                                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │    users     │  │ incidentReports │  │  clientOTPs   │ │
│  │ collection   │  │   collection    │  │  collection   │ │
│  └──────────────┘  └─────────────────┘  └───────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ auditLogs    │  │ cctvCheckForms  │  │ cctvUploads   │ │
│  │ collection   │  │   collection    │  │  collection   │ │
│  └──────────────┘  └─────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## User Roles and Permissions

### 1. **Admin** 👨‍💼
**What they can do:**
- Create and manage Staff Access Codes
- Create and manage Client Access Codes (OTPs)
- Assign multiple schemes to client users
- Remove schemes from client users
- View all users in the system
- View audit logs (history of who did what)

**What they CANNOT do:**
- Create incident reports (only staff can do this)
- View client dashboards directly

**Real-world example:**
Think of an admin as a **company manager** who decides which construction sites each client can access.

---

### 2. **Staff** 👷
**What they can do:**
- Create incident reports
- Create CCTV check forms
- Create asset damage reports
- Create daily occurrence reports
- Upload CCTV recordings
- Update and delete their own reports

**What they CANNOT do:**
- Assign schemes to users
- View other staff members' data
- Create access codes

**Real-world example:**
Think of staff as **on-site security guards** who document everything happening at construction sites.

---

### 3. **Client** 👔
**What they can do:**
- View incident reports for their assigned schemes
- View CCTV recordings for their assigned schemes
- View analytics and statistics
- Switch between multiple schemes (if they have access to more than one)
- Download reports

**What they CANNOT do:**
- Create any reports
- See data from schemes they don't have access to
- Modify any data

**Real-world example:**
Think of clients as **construction company owners** who want to monitor their sites but don't want to see competitors' sites.

---

## Multi-Scheme System Explained

### What is a "Scheme"?

A **scheme** is a construction project/site. Your system manages multiple construction sites:

```javascript
// From src/utils/schemes.js
export const SCHEMES = [
  {
    id: 'A417',                              // Short unique ID
    fullName: 'A417 Missing Link - Kier',   // Full display name
    shortName: 'A417 Missing Link',         // Shorter name
    contractor: 'Kier'                      // Company working on it
  },
  {
    id: 'GALLOWS',
    fullName: 'Gallows Corner - Costain',
    shortName: 'Gallows Corner',
    contractor: 'Costain'
  },
  // ... more schemes
];
```

### Why Multi-Scheme?

**Problem:** Some clients manage multiple construction sites. They need to access reports from all their sites, but they shouldn't see reports from sites they don't manage.

**Solution:** Each client user has a list of scheme IDs they can access:

```javascript
// Example user document in Firestore
{
  uid: "abc123",
  email: "client@example.com",
  role: "client",
  schemeIds: ["A417", "GALLOWS"],  // This user can access 2 schemes
  schemeNames: {
    "A417": "A417 Missing Link - Kier",
    "GALLOWS": "Gallows Corner - Costain"
  },
  activeSchemeId: "A417"  // Currently viewing A417
}
```

### How Data is Tagged with Schemes

Every report document includes scheme information:

```javascript
// Example incident report document
{
  id: "report123",
  title: "Unauthorized Access Attempt",
  description: "Person tried to enter site without badge",
  schemeIds: ["A417"],  // NEW: Array of schemes (supports multi-scheme)
  schemeId: "A417",     // OLD: Single scheme (backward compatibility)
  createdAt: "2025-12-17T10:30:00Z",
  createdBy: "staff_user_id"
}
```

**Why both `schemeIds` and `schemeId`?**
- `schemeIds` is the new format (array) that supports future expansion
- `schemeId` is kept for backward compatibility with old data
- Queries use `schemeIds` but fall back to `schemeId` if needed

---

## Firebase Security Rules

### What Are Security Rules?

**Security Rules** are like a bouncer at a nightclub. They check:
1. "Are you logged in?" (Authentication)
2. "What's your role?" (Authorization)
3. "Are you allowed to do this action?" (Permission check)

### Important Concept: `get` vs `list`

This is **CRITICAL** to understand:

```javascript
// Example of reading data in Firestore

// METHOD 1: get (read ONE specific document)
const docRef = doc(db, 'incidentReports', 'report123');
const docSnap = await getDoc(docRef);  // Firestore knows which document you want

// METHOD 2: list (query/search for MULTIPLE documents)
const q = query(
  collection(db, 'incidentReports'),
  where('schemeIds', 'array-contains', 'A417')
);
const querySnapshot = await getDocs(q);  // Firestore doesn't know which documents match yet
```

**Why does this matter for security rules?**

```javascript
// In firestore.rules

// For GET (single document):
allow get: if resource.data.schemeIds.hasAny(getUserSchemes());
// ✅ WORKS because Firestore fetches the document first, then checks the rule

// For LIST (query):
allow list: if resource.data.schemeIds.hasAny(getUserSchemes());
// ❌ FAILS because Firestore can't check each document before running the query

// SOLUTION: Split into separate rules
allow get: if /* check document data */;
allow list: if /* check user role only */;
```

### Complete Security Rules Explained

Let's break down the `firestore.rules` file section by section:

#### Helper Functions

```javascript
// Helper function to check if user is authenticated
function isSignedIn() {
  return request.auth != null;
  // request.auth is automatically set by Firebase when user logs in
  // If null, user is not logged in
}

// Helper function to get user's role from users collection
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
  // This reads the user's document from Firestore and returns their role
  // request.auth.uid = the user's unique ID
}

// Helper function to get user's schemes array (multi-scheme support)
function getUserSchemes() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.schemeIds;
  // Returns the array of scheme IDs the user has access to
  // Example: ["A417", "GALLOWS"]
}

// Helper function to check if user has access to a scheme
function hasSchemeAccess(docSchemeIds) {
  let userSchemes = getUserSchemes();
  return userSchemes != null && docSchemeIds != null && userSchemes.hasAny(docSchemeIds);
  // hasAny() checks if any value in userSchemes exists in docSchemeIds
  // Example:
  //   userSchemes = ["A417", "GALLOWS"]
  //   docSchemeIds = ["A417"]
  //   Result: true (because A417 is in both arrays)
}

// Helper function to safely check backward compatibility
function hasOldSchemeAccess(docSchemeId) {
  let userSchemes = getUserSchemes();
  return userSchemes != null && docSchemeId != null && docSchemeId in userSchemes;
  // Checks if the old single schemeId is in the user's schemeIds array
}
```

#### Users Collection Rules

```javascript
match /users/{userId} {
  // READ: Users can read their own document, admins can read any user
  allow read: if isSignedIn() && (request.auth.uid == userId || getUserRole() == 'admin');

  // UPDATE: Users can update their own document, admins can update any user document
  allow update: if isSignedIn() && (request.auth.uid == userId || getUserRole() == 'admin');

  // CREATE: Any signed-in user can create a user document (during signup)
  allow create: if isSignedIn();

  // DELETE: Only users can delete their own document (admins should deactivate instead)
  allow delete: if isSignedIn() && request.auth.uid == userId;
}
```

**Breakdown:**
- `{userId}` is a wildcard - it matches any user ID
- `request.auth.uid` is the ID of the person making the request
- `||` means "OR"
- `&&` means "AND"

**Example scenarios:**

```javascript
// Scenario 1: User tries to read their own profile
// User ID: "user123"
// Document ID: "user123"
// request.auth.uid == userId → "user123" == "user123" → TRUE ✅

// Scenario 2: Admin tries to update another user
// Admin ID: "admin456"
// Document ID: "user123"
// request.auth.uid == userId → FALSE
// getUserRole() == 'admin' → TRUE
// FALSE || TRUE → TRUE ✅

// Scenario 3: Regular user tries to update another user
// User ID: "user789"
// Document ID: "user123"
// request.auth.uid == userId → FALSE
// getUserRole() == 'admin' → FALSE
// FALSE || FALSE → FALSE ❌ DENIED
```

#### Client OTPs Collection Rules

```javascript
match /clientOTPs/{otpId} {
  // Admin can do everything
  allow write: if isSignedIn() && getUserRole() == 'admin';

  // Allow read for OTP validation (needed during signup before user is authenticated)
  allow read: if true;
}
```

**Why `allow read: if true`?**

This seems dangerous, but it's necessary:

1. Admin creates OTP code: `"CODE123"`
2. New user goes to signup page
3. User enters code: `"CODE123"`
4. System needs to validate: "Is CODE123 a valid code?"
5. **BUT THE USER ISN'T LOGGED IN YET!**
6. So we allow anyone to read OTP codes to validate them
7. After validation succeeds, the user account is created

**Security note:** OTP codes are one-time use and expire, so even if someone reads them, they can't reuse them.

#### Incident Reports Collection Rules

```javascript
match /incidentReports/{reportId} {
  // Staff can create
  allow create: if isSignedIn() && getUserRole() == 'staff';

  // Get single document
  allow get: if isSignedIn() && (
    getUserRole() == 'admin' ||
    getUserRole() == 'staff' ||
    (getUserRole() == 'client' && (
      hasSchemeAccess(resource.data.schemeIds) ||
      hasOldSchemeAccess(resource.data.schemeId)
    ))
  );

  // List/query documents - allow clients to query their schemes
  allow list: if isSignedIn() && (
    getUserRole() == 'admin' ||
    getUserRole() == 'staff' ||
    getUserRole() == 'client'
  );

  allow update, delete: if isSignedIn() && getUserRole() == 'staff';
}
```

**Why separate `get` and `list`?**

```javascript
// GET (reading one specific report):
// ✅ Firestore fetches the document
// ✅ Then checks: "Does this document's schemeIds match user's schemeIds?"
// ✅ If yes, return document; if no, deny

// LIST (searching for reports):
// ❌ Firestore can't check each document before running the query
// ✅ So we allow the query to run (check role only)
// ✅ Then when user tries to READ each result, the GET rule applies
```

**Example:**

```javascript
// Client user with schemeIds: ["A417"]

// Query returns 3 documents:
// Doc 1: schemeIds: ["A417"] → GET rule passes ✅
// Doc 2: schemeIds: ["GALLOWS"] → GET rule fails ❌
// Doc 3: schemeIds: ["A417", "M3"] → GET rule passes ✅

// User sees Doc 1 and Doc 3, but not Doc 2
```

#### Audit Logs Collection Rules

```javascript
match /auditLogs/{logId} {
  // Only admins can write audit logs
  allow create: if isSignedIn() && getUserRole() == 'admin';

  // Only admins can read audit logs
  allow read: if isSignedIn() && getUserRole() == 'admin';
}
```

**What are audit logs?**

Audit logs track admin actions for accountability:

```javascript
// Example audit log document
{
  action: 'scheme_assigned',           // What happened
  performedBy: 'admin_user_id',        // Who did it
  targetUser: 'client_user_id',        // Who was affected
  schemeId: 'A417',                    // What scheme
  schemeName: 'A417 Missing Link - Kier',
  timestamp: '2025-12-17T10:30:00Z'    // When it happened
}
```

This helps answer questions like:
- "Who gave this client access to this scheme?"
- "When was this user's role changed?"
- "Which admin created this access code?"

---

## Authentication Flow

### How User Signup Works (Client with OTP)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Admin Creates OTP                                   │
├─────────────────────────────────────────────────────────────┤
│ Admin clicks "Generate Client Access Code"                  │
│   ↓                                                          │
│ System generates random code: "XYZ789"                       │
│   ↓                                                          │
│ System saves to Firestore:                                  │
│   {                                                          │
│     code: "XYZ789",                                          │
│     schemeId: "A417",                                        │
│     schemeName: "A417 Missing Link - Kier",                 │
│     isUsed: false,                                           │
│     expiresAt: "2025-12-24T10:30:00Z"                       │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Client Goes to Signup Page                          │
├─────────────────────────────────────────────────────────────┤
│ Client enters:                                               │
│   - Email: client@example.com                                │
│   - Password: SecurePass123                                  │
│   - Display Name: John Smith                                 │
│   - Company: Smith Construction Ltd                          │
│   - Access Code: XYZ789                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: System Validates OTP                                │
├─────────────────────────────────────────────────────────────┤
│ Code: src/services/otpService.js                            │
│                                                              │
│ async validateOTP(code) {                                    │
│   // Query Firestore for this code                          │
│   const q = query(                                           │
│     collection(db, 'clientOTPs'),                            │
│     where('code', '==', code)                                │
│   );                                                         │
│   const snapshot = await getDocs(q);                         │
│                                                              │
│   // Check if code exists                                    │
│   if (snapshot.empty) {                                      │
│     throw new Error('Invalid access code');                  │
│   }                                                          │
│                                                              │
│   const otpDoc = snapshot.docs[0];                           │
│   const otpData = otpDoc.data();                             │
│                                                              │
│   // Check if already used                                   │
│   if (otpData.isUsed) {                                      │
│     throw new Error('Access code already used');             │
│   }                                                          │
│                                                              │
│   // Check if expired                                        │
│   if (otpData.expiresAt.toDate() < new Date()) {            │
│     throw new Error('Access code expired');                  │
│   }                                                          │
│                                                              │
│   // Valid! Return scheme info                               │
│   return {                                                   │
│     schemeId: otpData.schemeId,                              │
│     schemeName: otpData.schemeName,                          │
│     otpId: otpDoc.id                                         │
│   };                                                         │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Create Firebase User Account                        │
├─────────────────────────────────────────────────────────────┤
│ Code: src/services/authService.js                           │
│                                                              │
│ const userCredential = await createUserWithEmailAndPassword(│
│   auth,                                                      │
│   'client@example.com',                                      │
│   'SecurePass123'                                            │
│ );                                                           │
│                                                              │
│ // Firebase creates:                                         │
│ // - uid: "abc123xyz" (unique ID)                           │
│ // - email: "client@example.com"                            │
│ // - passwordHash: (encrypted)                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Create User Document in Firestore                   │
├─────────────────────────────────────────────────────────────┤
│ Code: src/services/firestoreService.js                      │
│                                                              │
│ await setDoc(doc(db, 'users', 'abc123xyz'), {               │
│   uid: 'abc123xyz',                                          │
│   email: 'client@example.com',                               │
│   displayName: 'John Smith',                                 │
│   company: 'Smith Construction Ltd',                         │
│   role: 'client',                                            │
│   schemeIds: ['A417'],        // NEW multi-scheme format     │
│   schemeNames: {                                             │
│     'A417': 'A417 Missing Link - Kier'                       │
│   },                                                         │
│   activeSchemeId: 'A417',     // Currently viewing           │
│   schemeId: 'A417',           // OLD format (compatibility)  │
│   schemeName: 'A417 Missing Link - Kier',                    │
│   createdAt: serverTimestamp(),                              │
│   isActive: true                                             │
│ });                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Mark OTP as Used                                    │
├─────────────────────────────────────────────────────────────┤
│ await updateDoc(doc(db, 'clientOTPs', 'otp_doc_id'), {      │
│   isUsed: true,                                              │
│   usedBy: 'abc123xyz',                                       │
│   usedAt: serverTimestamp()                                  │
│ });                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: User is Logged In and Redirected to Dashboard       │
└─────────────────────────────────────────────────────────────┘
```

### How User Login Works

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Enters Credentials                             │
├─────────────────────────────────────────────────────────────┤
│ Email: client@example.com                                    │
│ Password: SecurePass123                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Firebase Authenticates                              │
├─────────────────────────────────────────────────────────────┤
│ const userCredential = await signInWithEmailAndPassword(    │
│   auth,                                                      │
│   'client@example.com',                                      │
│   'SecurePass123'                                            │
│ );                                                           │
│                                                              │
│ // Firebase checks:                                          │
│ // 1. Does this email exist? ✅                              │
│ // 2. Does the password match? ✅                            │
│ // 3. Return user object with uid                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Fetch User Profile from Firestore                   │
├─────────────────────────────────────────────────────────────┤
│ const userDoc = await getDoc(doc(db, 'users', uid));        │
│                                                              │
│ const userProfile = {                                        │
│   uid: 'abc123xyz',                                          │
│   email: 'client@example.com',                               │
│   displayName: 'John Smith',                                 │
│   role: 'client',                                            │
│   schemeIds: ['A417'],                                       │
│   activeSchemeId: 'A417'                                     │
│ };                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Store in React Context                              │
├─────────────────────────────────────────────────────────────┤
│ // Now available throughout the app                          │
│ const { user, userProfile } = useAuth();                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Redirect Based on Role                              │
├─────────────────────────────────────────────────────────────┤
│ if (role === 'admin') → /dashboard/admin                     │
│ if (role === 'staff') → /dashboard/staff                     │
│ if (role === 'client') → /dashboard/client                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Services Explained

### 1. authService.js

**Purpose:** Handles user authentication (signup, login, logout)

```javascript
// File: src/services/authService.js

class AuthService {
  // SIGNUP FOR CLIENT (with OTP)
  async signupWithOTP(email, password, displayName, company, accessCode) {
    try {
      // Step 1: Validate the access code
      const otpData = await otpService.validateOTP(accessCode);
      // Returns: { schemeId, schemeName, otpId }

      // Step 2: Create Firebase user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Step 3: Create user document in Firestore
      await firestoreService.createUserDocument(user.uid, {
        email,
        displayName,
        company,
        role: USER_ROLES.CLIENT,  // 'client'
        schemeId: otpData.schemeId,
        schemeName: otpData.schemeName
      });

      // Step 4: Mark OTP as used
      await otpService.markOTPAsUsed(otpData.otpId, user.uid);

      return user;
    } catch (error) {
      throw error;
    }
  }

  // LOGIN
  async login(email, password) {
    try {
      // Firebase handles password checking
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Fetch user profile from Firestore
      const userProfile = await firestoreService.getUserDocument(
        userCredential.user.uid
      );

      // Update last login time
      await firestoreService.updateLastLogin(userCredential.user.uid);

      return { user: userCredential.user, userProfile };
    } catch (error) {
      throw new AppError('Login failed', 'auth/login-failed', error);
    }
  }

  // LOGOUT
  async logout() {
    await signOut(auth);
  }
}
```

**Key concepts:**
- `createUserWithEmailAndPassword`: Firebase function that creates a new user
- `signInWithEmailAndPassword`: Firebase function that logs in a user
- `signOut`: Firebase function that logs out a user

---

### 2. firestoreService.js

**Purpose:** Handles all Firestore database operations

```javascript
// File: src/services/firestoreService.js

class FirestoreService {
  // CREATE USER DOCUMENT
  async createUserDocument(uid, userData) {
    try {
      const userRef = doc(db, 'users', uid);

      // Prepare document data
      const docData = {
        uid,
        ...userData,  // Spread operator: copies all properties from userData
        createdAt: serverTimestamp(),  // Firebase generates timestamp
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        canCreateAdmins: false
      };

      // If this is a client user with schemeId, convert to multi-scheme format
      if (userData.role === USER_ROLES.CLIENT && userData.schemeId) {
        docData.schemeIds = [userData.schemeId];  // Convert to array
        docData.schemeNames = {
          [userData.schemeId]: userData.schemeName  // Computed property name
        };
        docData.activeSchemeId = userData.schemeId;

        // Keep old fields for backward compatibility
        docData.schemeId = userData.schemeId;
        docData.schemeName = userData.schemeName;
      }

      await setDoc(userRef, docData);
    } catch (error) {
      throw new AppError('Failed to create user document', 'firestore/create-error', error);
    }
  }

  // GET USER DOCUMENT
  async getUserDocument(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      // Check if document exists
      return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
      throw new AppError('Failed to fetch user document', 'firestore/read-error', error);
    }
  }

  // ASSIGN SCHEME TO USER (Admin only)
  async assignSchemeToUser(userId, schemeId, schemeName, adminUid) {
    try {
      // Step 1: Verify admin role
      const adminUser = await this.getUserDocument(adminUid);
      if (adminUser?.role !== USER_ROLES.ADMIN) {
        throw new AppError('Unauthorized', 'firestore/permission-denied');
      }

      // Step 2: Get target user
      const targetUser = await this.getUserDocument(userId);
      if (!targetUser) {
        throw new AppError('User not found', 'firestore/not-found');
      }

      // Step 3: Verify target is a client
      if (targetUser.role !== USER_ROLES.CLIENT) {
        throw new AppError('Can only assign schemes to client users', 'firestore/permission-denied');
      }

      // Step 4: Check if scheme already assigned
      const currentSchemes = targetUser.schemeIds || [];
      if (currentSchemes.includes(schemeId)) {
        throw new AppError('Scheme already assigned to this user', 'firestore/already-exists');
      }

      // Step 5: Update user schemes
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        schemeIds: [...currentSchemes, schemeId],  // Add new scheme to array
        schemeNames: {
          ...(targetUser.schemeNames || {}),  // Copy existing names
          [schemeId]: schemeName  // Add new scheme name
        },
        // If this is the first scheme, set it as active
        ...(currentSchemes.length === 0 && { activeSchemeId: schemeId }),
        updatedAt: serverTimestamp()
      });

      // Step 6: Log audit trail
      await this.createAuditLog({
        action: 'scheme_assigned',
        performedBy: adminUid,
        targetUser: userId,
        schemeId: schemeId,
        schemeName: schemeName
      });

      return { success: true, message: 'Scheme assigned successfully' };
    } catch (error) {
      console.error('assignSchemeToUser error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to assign scheme', 'firestore/update-error', error);
    }
  }

  // CREATE AUDIT LOG
  async createAuditLog(logData) {
    try {
      const logsRef = collection(db, 'auditLogs');
      await addDoc(logsRef, {
        ...logData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}
```

**Key concepts:**

1. **Spread operator (`...`)**: Copies properties from one object to another
   ```javascript
   const user = { name: 'John', age: 30 };
   const newUser = { ...user, age: 31 };  // { name: 'John', age: 31 }
   ```

2. **Computed property name (`[key]: value`)**: Use variable as object key
   ```javascript
   const schemeId = 'A417';
   const obj = {
     [schemeId]: 'Scheme Name'  // Creates: { 'A417': 'Scheme Name' }
   };
   ```

3. **Conditional spread (`...(condition && { key: value })`)**: Add property only if condition is true
   ```javascript
   const obj = {
     name: 'John',
     ...(age > 18 && { isAdult: true })  // Only adds isAdult if age > 18
   };
   ```

4. **Optional chaining (`?.`)**: Safely access nested properties
   ```javascript
   const name = user?.profile?.displayName;  // Returns undefined if user or profile is null
   ```

---

### 3. clientDataService.js

**Purpose:** Handles data fetching for client dashboards

```javascript
// File: src/services/clientDataService.js

class ClientDataService {
  // GET INCIDENT REPORTS FOR A SCHEME
  async getIncidentReports(schemeId, limitCount = 50) {
    try {
      const incidentsRef = collection(db, 'incidentReports');

      // Try new schema first (schemeIds array)
      try {
        const q = query(
          incidentsRef,
          where('schemeIds', 'array-contains', schemeId),  // Find reports containing this scheme
          orderBy('createdAt', 'desc'),  // Newest first
          limit(limitCount)  // Max 50 results
        );

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log(`Found ${results.length} incidents for scheme ${schemeId}`);
        return results;
      } catch (indexError) {
        // If index doesn't exist, try simplified query
        if (indexError.code === 'failed-precondition') {
          console.warn('Index not available, trying simplified query');

          const simpleQuery = query(
            incidentsRef,
            where('schemeIds', 'array-contains', schemeId),
            limit(limitCount)
          );

          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Sort manually since we couldn't use orderBy
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;  // Descending order
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error('Error fetching incident reports:', error);
      throw error;
    }
  }

  // GET SCHEME STATISTICS
  async getSchemeStats(schemeId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Fetch multiple report types in parallel
      const [incidents, cctvChecks, damageReports] = await Promise.all([
        this.getIncidentReports(schemeId, 1000),
        this.getCCTVCheckForms(schemeId, 1000),
        this.getAssetDamageReports(schemeId, 1000)
      ]);

      // Filter by date
      const recentIncidents = incidents.filter(i =>
        i.createdAt?.toDate() >= cutoffDate
      );

      return {
        totalIncidents: recentIncidents.length,
        totalCCTVChecks: cctvChecks.length,
        totalDamageReports: damageReports.length,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error fetching scheme stats:', error);
      throw error;
    }
  }
}
```

**Key concepts:**

1. **`array-contains` query**: Finds documents where an array field contains a specific value
   ```javascript
   // Document: { schemeIds: ['A417', 'GALLOWS'] }
   where('schemeIds', 'array-contains', 'A417')  // ✅ Matches
   where('schemeIds', 'array-contains', 'M3')    // ❌ Doesn't match
   ```

2. **`Promise.all()`**: Runs multiple async operations in parallel
   ```javascript
   // Sequential (slow):
   const incidents = await getIncidents();
   const checks = await getChecks();
   const damage = await getDamage();

   // Parallel (fast):
   const [incidents, checks, damage] = await Promise.all([
     getIncidents(),
     getChecks(),
     getDamage()
   ]);
   ```

3. **Array methods**:
   - `map()`: Transform each element
   - `filter()`: Keep elements that match condition
   - `sort()`: Reorder elements

---

## Components Breakdown

### 1. AdminDashboard.jsx

**Purpose:** Main admin dashboard showing user statistics and management

```javascript
// File: src/components/dashboard/AdminDashboard.jsx

const AdminDashboard = () => {
  // STATE: Data that can change
  const [users, setUsers] = useState([]);  // List of all users
  const [loading, setLoading] = useState(true);  // Loading indicator

  // HOOKS: Access router and auth context
  const { userProfile } = useAuth();  // Get current user info
  const navigate = useNavigate();  // Navigate to different pages

  // EFFECT: Run when component loads
  useEffect(() => {
    loadUsers();  // Fetch users from Firestore
  }, []);  // Empty array = run once on mount

  const loadUsers = async () => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      setUsers(allUsers);  // Update state
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);  // Always stop loading, even if error
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Welcome back, {userProfile?.displayName}!</p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/dashboard/admin/otp-management')}>
            <Key className="w-4 h-4" />
            Manage Access Codes
          </button>
          <button onClick={() => navigate('/dashboard/admin/scheme-assignment')}>
            <Users className="w-4 h-4" />
            Assign Schemes
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h6>Total Users</h6>
          <p className="text-3xl">{users.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h6>Staff Members</h6>
          <p className="text-3xl">
            {users.filter(u => u.role === 'staff').length}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h6>Clients</h6>
          <p className="text-3xl">
            {users.filter(u => u.role === 'client').length}
          </p>
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bg-white rounded-xl shadow">
        {loading ? (
          <div className="p-8 text-center">
            <span className="loading loading-spinner"></span>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid}>
                  <td>{user.displayName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-error' :
                      user.role === 'staff' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.company || '-'}</td>
                  <td>
                    {user.emailVerified ? (
                      <span className="text-success">Verified</span>
                    ) : (
                      <span className="text-warning">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
```

**Key React concepts:**

1. **`useState`**: Creates state variable that causes re-render when changed
   ```javascript
   const [count, setCount] = useState(0);  // Initial value: 0
   setCount(5);  // Update to 5, component re-renders
   ```

2. **`useEffect`**: Runs code after component renders
   ```javascript
   useEffect(() => {
     // This code runs after render
     fetchData();
   }, [dependency]);  // Re-run if dependency changes
   ```

3. **`useNavigate`**: Programmatically navigate to different routes
   ```javascript
   const navigate = useNavigate();
   navigate('/dashboard/admin');  // Go to admin dashboard
   ```

4. **Conditional rendering**: Show different content based on condition
   ```javascript
   {loading ? <Spinner /> : <Content />}
   // If loading is true, show Spinner; otherwise show Content
   ```

5. **Array mapping**: Create list of elements from array
   ```javascript
   {users.map(user => (
     <div key={user.id}>{user.name}</div>
   ))}
   // Creates a div for each user
   ```

---

### 2. SchemeAssignment.jsx

**Purpose:** Admin interface to assign schemes to client users

```javascript
// File: src/components/admin/SchemeAssignment.jsx

const SchemeAssignment = () => {
  // STATE
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    schemeId: '',
    schemeName: ''
  });

  const { user } = useAuth();  // Get current admin user

  // LOAD USERS ON MOUNT
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await firestoreService.getAllUsers();
      // Filter to only show client users
      const clientUsers = allUsers.filter(u => u.role === USER_ROLES.CLIENT);
      setUsers(clientUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // OPEN MODAL TO ASSIGN SCHEME
  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
    // Reset form
    setFormData({
      schemeId: '',
      schemeName: ''
    });
  };

  // HANDLE SCHEME SELECTION IN DROPDOWN
  const handleSchemeSelect = (e) => {
    const selectedScheme = SCHEMES.find(s => s.id === e.target.value);
    if (selectedScheme) {
      setFormData({
        schemeId: selectedScheme.id,
        schemeName: selectedScheme.fullName
      });
    }
  };

  // ASSIGN SCHEME TO USER
  const handleAssignScheme = async (e) => {
    e.preventDefault();  // Prevent form submission reload

    try {
      await firestoreService.assignSchemeToUser(
        selectedUser.uid,
        formData.schemeId,
        formData.schemeName,
        user.uid  // Admin user ID
      );

      // Success! Reload users and close modal
      await loadUsers();
      setShowModal(false);
      alert('Scheme assigned successfully!');
    } catch (error) {
      console.error('Failed to assign scheme:', error);
      alert(`Failed to assign scheme: ${error.message}`);
    }
  };

  // REMOVE SCHEME FROM USER
  const handleRemoveScheme = async (userId, schemeId) => {
    if (!confirm('Are you sure you want to remove this scheme?')) {
      return;
    }

    try {
      await firestoreService.removeSchemeFromUser(
        userId,
        schemeId,
        user.uid
      );

      // Reload users
      await loadUsers();
      alert('Scheme removed successfully!');
    } catch (error) {
      console.error('Failed to remove scheme:', error);
      alert(`Failed to remove scheme: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <h2>Scheme Assignment</h2>

      {/* STATISTICS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h6>Total Clients</h6>
          <p className="text-2xl">{users.length}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h6>Multi-Scheme Clients</h6>
          <p className="text-2xl">
            {users.filter(u => (u.schemeIds?.length || 0) > 1).length}
          </p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h6>Total Scheme Assignments</h6>
          <p className="text-2xl">
            {users.reduce((sum, u) => sum + (u.schemeIds?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* USER TABLE */}
      <table className="table w-full">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Email</th>
            <th>Assigned Schemes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.uid}>
              <td>{user.displayName}</td>
              <td>{user.email}</td>
              <td>
                {/* Display assigned schemes as badges */}
                <div className="flex flex-wrap gap-2">
                  {(user.schemeIds || []).map(schemeId => (
                    <span key={schemeId} className="badge badge-primary">
                      {user.schemeNames?.[schemeId] || schemeId}
                      <button
                        onClick={() => handleRemoveScheme(user.uid, schemeId)}
                        className="ml-2 text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <button
                  onClick={() => handleOpenModal(user)}
                  className="btn btn-sm btn-primary"
                >
                  Assign Scheme
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL FOR ASSIGNING SCHEME */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3>Assign Scheme to {selectedUser?.displayName}</h3>

            <form onSubmit={handleAssignScheme}>
              {/* SCHEME DROPDOWN */}
              <div className="form-control">
                <label className="label">Select Scheme</label>
                <select
                  value={formData.schemeId}
                  onChange={handleSchemeSelect}
                  required
                  className="select select-bordered"
                >
                  <option value="">Choose a scheme...</option>
                  {SCHEMES.map(scheme => (
                    <option
                      key={scheme.id}
                      value={scheme.id}
                      disabled={selectedUser?.schemeIds?.includes(scheme.id)}
                    >
                      {scheme.fullName}
                      {selectedUser?.schemeIds?.includes(scheme.id) && ' (Already assigned)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* BUTTONS */}
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
                  Assign Scheme
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Key concepts:**

1. **Form handling**:
   ```javascript
   const handleSubmit = (e) => {
     e.preventDefault();  // Stop page reload
     // Process form data
   };
   ```

2. **Array reduce**: Sum or aggregate array values
   ```javascript
   const total = users.reduce((sum, user) => sum + user.count, 0);
   // Adds up all user.count values
   ```

3. **Optional chaining with default**: Safe array access
   ```javascript
   (user.schemeIds || []).map(...)
   // If schemeIds is null/undefined, use empty array instead
   ```

4. **Conditional CSS classes**: Apply classes based on condition
   ```javascript
   className={`badge ${user.role === 'admin' ? 'badge-error' : 'badge-info'}`}
   ```

---

## Data Flow Examples

### Example 1: Client Views Dashboard

```
1. User logs in
   ↓
2. AuthContext fetches user profile
   userProfile = {
     uid: "abc123",
     role: "client",
     schemeIds: ["A417"],
     activeSchemeId: "A417"
   }
   ↓
3. React Router redirects to /dashboard/client
   ↓
4. NewClientDashboard.jsx renders
   ↓
5. useEffect runs on mount
   ↓
6. loadDashboardData() is called
   ↓
7. clientDataService.getSchemeStats("A417", 30)
   ↓
8. Firestore query:
   WHERE schemeIds array-contains "A417"
   AND createdAt > (30 days ago)
   ↓
9. Firestore Security Rules check:
   - User is signed in? ✅
   - User role is "client"? ✅
   - Allow list query? ✅
   ↓
10. Query returns matching documents
    ↓
11. For each document, GET rule checks:
    - Does doc.schemeIds contain any of user.schemeIds? ✅
    ↓
12. Documents are returned to frontend
    ↓
13. React updates state with data
    ↓
14. Component re-renders with statistics
```

### Example 2: Admin Assigns Scheme to Client

```
1. Admin clicks "Assign Schemes" button
   ↓
2. Navigate to /dashboard/admin/scheme-assignment
   ↓
3. SchemeAssignment.jsx renders
   ↓
4. loadUsers() fetches all client users
   ↓
5. Admin clicks "Assign Scheme" for user "John Smith"
   ↓
6. Modal opens with scheme dropdown
   ↓
7. Admin selects "Gallows Corner - Costain"
   ↓
8. handleSchemeSelect updates formData:
   {
     schemeId: "GALLOWS",
     schemeName: "Gallows Corner - Costain"
   }
   ↓
9. Admin clicks "Assign Scheme" button
   ↓
10. handleAssignScheme calls:
    firestoreService.assignSchemeToUser(
      "john_uid",
      "GALLOWS",
      "Gallows Corner - Costain",
      "admin_uid"
    )
    ↓
11. assignSchemeToUser function:
    a. Verify admin role ✅
    b. Get target user document ✅
    c. Verify target is client ✅
    d. Check if scheme already assigned ✅
    e. Update user document:
       schemeIds: ["A417", "GALLOWS"]  (added GALLOWS)
       schemeNames: {
         "A417": "A417 Missing Link - Kier",
         "GALLOWS": "Gallows Corner - Costain"
       }
    ↓
12. Firestore Security Rules check:
    - User is signed in? ✅
    - User is admin? ✅
    - Allow update on users collection? ✅
    ↓
13. Update succeeds
    ↓
14. createAuditLog creates log:
    {
      action: "scheme_assigned",
      performedBy: "admin_uid",
      targetUser: "john_uid",
      schemeId: "GALLOWS",
      timestamp: "2025-12-17T10:30:00Z"
    }
    ↓
15. Frontend reloads users list
    ↓
16. Modal closes, success message shown
    ↓
17. John Smith now has access to both A417 and GALLOWS schemes
```

### Example 3: Staff Creates Incident Report

```
1. Staff user navigates to "Create Incident Report"
   ↓
2. IncidentReportForm.jsx renders
   ↓
3. Staff fills in form:
   - Title: "Unauthorized Access Attempt"
   - Description: "Person tried to enter without badge"
   - Scheme: "A417 Missing Link - Kier"
   - Severity: "High"
   - Photos: [photo1.jpg, photo2.jpg]
   ↓
4. Staff clicks "Submit Report"
   ↓
5. handleSubmit is called
   ↓
6. Upload photos to Firebase Storage
   photoURLs = [
     "https://storage.googleapis.com/...photo1.jpg",
     "https://storage.googleapis.com/...photo2.jpg"
   ]
   ↓
7. staffService.createIncidentReport({
     title: "Unauthorized Access Attempt",
     description: "Person tried to enter without badge",
     schemeId: "A417",
     schemeName: "A417 Missing Link - Kier",
     schemeIds: ["A417"],  // NEW multi-scheme format
     severity: "High",
     photoURLs: [...]
   })
   ↓
8. Firestore adds document to incidentReports collection
   ↓
9. Firestore Security Rules check:
   - User is signed in? ✅
   - User role is "staff"? ✅
   - Allow create on incidentReports? ✅
   ↓
10. Document is created with auto-generated ID
    ↓
11. Frontend navigates back to reports list
    ↓
12. Success message shown
    ↓
13. Report is now visible to:
    - All staff members
    - All admins
    - Client users with schemeIds containing "A417"
```

---

## Common Patterns Used

### Pattern 1: Error Handling with Custom Error Class

```javascript
// src/utils/errorHandling.js
export class AppError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.code = code;
    this.originalError = originalError;
  }
}

// Usage:
try {
  // Do something
} catch (error) {
  throw new AppError('User-friendly message', 'error/code', error);
}
```

**Why?** Provides consistent error structure across the app.

---

### Pattern 2: Service Layer Pattern

```
┌──────────────┐
│  Component   │  (UI layer - displays data)
└──────┬───────┘
       │ calls
       ▼
┌──────────────┐
│   Service    │  (Business logic layer)
└──────┬───────┘
       │ calls
       ▼
┌──────────────┐
│   Firebase   │  (Data layer)
└──────────────┘
```

**Example:**
```javascript
// Component (AdminDashboard.jsx)
const users = await firestoreService.getAllUsers();

// Service (firestoreService.js)
async getAllUsers() {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => doc.data());
}
```

**Why?** Separates UI from business logic, making code reusable and testable.

---

### Pattern 3: Context Provider Pattern

```javascript
// src/context/AuthContext.jsx
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await firestoreService.getUserDocument(firebaseUser.uid);
        setUser(firebaseUser);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return unsubscribe;  // Cleanup on unmount
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Usage in any component:
const { user, userProfile } = useAuth();
```

**Why?** Makes user data available to all components without prop drilling.

---

### Pattern 4: Protected Routes

```javascript
// src/components/routing/ProtectedRoute.jsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userProfile } = useAuth();

  // Not logged in?
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Logged in but wrong role?
  if (allowedRoles && !allowedRoles.includes(userProfile?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  // Authorized!
  return children;
};

// Usage in App.jsx:
<Route
  path="/dashboard/admin"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

**Why?** Prevents unauthorized users from accessing restricted pages.

---

### Pattern 5: Optimistic UI Updates

```javascript
const handleLikePost = async (postId) => {
  // 1. Update UI immediately (optimistic)
  setPosts(posts.map(p =>
    p.id === postId ? { ...p, likes: p.likes + 1 } : p
  ));

  try {
    // 2. Update database
    await updateDoc(doc(db, 'posts', postId), {
      likes: increment(1)
    });
  } catch (error) {
    // 3. Revert if error
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, likes: p.likes - 1 } : p
    ));
    alert('Failed to like post');
  }
};
```

**Why?** Makes UI feel faster by not waiting for server response.

---

## Summary

Your system is a **multi-tenant security management platform** that:

1. **Authenticates users** with Firebase Auth
2. **Authorizes access** with Firestore Security Rules
3. **Stores data** in Firestore NoSQL database
4. **Supports multiple schemes** per client user
5. **Tracks changes** with audit logs
6. **Separates concerns** with service layer pattern
7. **Protects routes** based on user roles

**Key technologies:**
- React for UI
- Firebase for backend
- Firestore for database
- Firestore Rules for security

**Key concepts to master:**
- React hooks (useState, useEffect, useContext)
- Async/await for promises
- Array methods (map, filter, reduce)
- Firebase queries (where, orderBy, limit)
- Security rules (get vs list, helper functions)
- Multi-scheme architecture (arrays vs single values)

Keep this guide handy as you continue learning and building features!
