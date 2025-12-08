# Client OTP System - Setup & Usage Guide

This guide explains how to set up and use the Client OTP (One-Time Password) system for scheme-specific access.

## Table of Contents
1. [System Overview](#system-overview)
2. [Setup Instructions](#setup-instructions)
3. [Admin Workflow](#admin-workflow)
4. [Client Workflow](#client-workflow)
5. [Data Schema](#data-schema)
6. [Troubleshooting](#troubleshooting)

---

## System Overview

The Client OTP system allows you to:
- **Generate unique access codes** for each scheme (e.g., A417, M1, etc.)
- **Control client registration** via admin-generated OTP codes
- **Isolate client data** so each client only sees their own scheme's information
- **Track OTP usage** and see which codes have been used

### How It Works

```
Admin → Generates OTP (A417-2024-ABC123) → Shares with Client
                                              ↓
Client → Enters OTP during signup → Account linked to scheme
                                              ↓
Client Dashboard → Shows only A417 scheme data
```

---

## Setup Instructions

### 1. Deploy Firestore Security Rules

1. Open Firebase Console: [https://console.firebase.google.com](https://console.firebase.google.com)
2. Go to **Firestore Database** → **Rules**
3. Copy the rules from `FIRESTORE_SECURITY_RULES.md`
4. Click **Publish**

⚠️ **Important**: Security rules are required to protect client data!

### 2. Create Firestore Indexes

The client dashboard queries need composite indexes. Firebase will prompt you to create them when you first run queries. Alternatively, create them manually:

**Index 1: Incident Reports by Scheme**
- Collection: `incidentReports`
- Fields:
  - `schemeId` (Ascending)
  - `createdAt` (Descending)

**Index 2: CCTV Checks by Scheme**
- Collection: `cctvChecks`
- Fields:
  - `schemeId` (Ascending)
  - `createdAt` (Descending)

**Index 3: Daily Occurrences by Scheme**
- Collection: `dailyOccurrences`
- Fields:
  - `schemeId` (Ascending)
  - `createdAt` (Descending)

### 3. Update Staff Form Submissions

**CRITICAL**: All staff forms must include the `schemeId` field. Update your form submission code:

#### Example: Incident Report Form
```javascript
// In IncidentReportFormPage.jsx
const handleSubmit = async (formData) => {
  const reportData = {
    ...formData,
    schemeId: 'A417', // TODO: Get from staff profile or form dropdown
    createdBy: userProfile.uid,
    createdAt: serverTimestamp(),
  };

  await submitIncidentReport(reportData);
};
```

**Two Options for Scheme Assignment:**

**Option A: Add to Staff Profile** (Recommended)
```javascript
// Update staff user document to include:
{
  role: 'staff',
  assignedScheme: 'A417',
  assignedSchemeName: 'A417 Motorway'
}

// Then in forms:
schemeId: userProfile.assignedScheme
```

**Option B: Scheme Dropdown in Forms**
```javascript
// Add to each form:
<select name="schemeId" required>
  <option value="A417">A417 Motorway</option>
  <option value="M1">M1 Motorway</option>
  <option value="A14">A14 Highway</option>
</select>
```

---

## Admin Workflow

### Generating OTP Codes

1. **Login as Admin**
   - Navigate to `/dashboard/admin`

2. **Open OTP Management**
   - Click "Manage Client Access Codes" button

3. **Generate New Code**
   - Click "Generate New Code"
   - Enter Scheme ID (e.g., "A417")
   - Enter Scheme Name (e.g., "A417 Motorway")
   - Click "Generate Code"

4. **Share with Client**
   - Copy the generated code (e.g., `A417-2024-ABC123`)
   - Share via email, phone, or secure messaging
   - Each code can only be used once

### Managing OTP Codes

The OTP Management dashboard shows:
- **Total Codes**: All generated codes
- **Available**: Unused codes ready for new clients
- **Used**: Codes already claimed by clients

You can:
- ✓ View all codes with status
- ✓ Copy codes to clipboard
- ✓ See creation and usage dates
- ✓ Filter by scheme

---

## Client Workflow

### Registration Process

1. **Navigate to Client Signup**
   - Go to `/client/signup`

2. **Enter OTP Code**
   - Client receives OTP code from admin
   - Enter code in the "Scheme Access Code" field
   - Format: `A417-2024-ABC123` (case-insensitive)

3. **Complete Registration**
   - Fill in personal details
   - Email, password, company name
   - Click "Create Client Account"

4. **Verify Email**
   - Check email for verification link
   - Click to verify

5. **Login**
   - Go to `/client/signin`
   - Use email and password
   - Redirected to scheme-specific dashboard

### Client Dashboard Features

Once logged in, clients see:

**Stats Cards:**
- Total Incidents (last 30 days)
- Vehicles Dispatched
- CCTV Uptime percentage
- Response Time average

**Charts:**
- Lane Affected distribution
- Incident Type breakdown
- Incidents Over Time (weekly)
- Incidents Spotted By source

**Recent Activity:**
- Last 10 incidents
- Status indicators
- Location and time information

**Navigation:**
- Dashboard
- Analytics (coming soon)
- Reports (coming soon)
- CCTV Recordings (coming soon)

---

## Data Schema

### User Document (Firestore)
```javascript
{
  uid: "abc123",
  displayName: "John Smith",
  email: "john@example.com",
  role: "client",
  company: "Highway Management Ltd",
  phone: "+44 123 456 7890",

  // Client-specific fields
  schemeId: "A417",
  schemeName: "A417 Motorway",

  // Metadata
  emailVerified: true,
  createdAt: Timestamp,
  lastLoginAt: Timestamp,
  metadata: {
    signInMethod: "email",
    otpCode: "A417-2024-ABC123"
  }
}
```

### OTP Document (Firestore)
```javascript
{
  otpCode: "A417-2024-ABC123",
  schemeId: "A417",
  schemeName: "A417 Motorway",
  isUsed: false,
  createdBy: "admin-uid",
  createdAt: Timestamp,
  usedBy: "client-uid" | null,
  usedAt: Timestamp | null
}
```

### Incident Report (Example)
```javascript
{
  // Must include schemeId for client filtering
  schemeId: "A417",

  // Report data
  incidentType: "Accident",
  laneAffected: "Lane 1",
  location: "Junction 12",
  vehicleDispatched: true,
  spottedBy: "CCTV",
  status: "Resolved",

  // Metadata
  createdBy: "staff-uid",
  createdAt: Timestamp,
}
```

---

## Troubleshooting

### Client Can't See Any Data

**Problem**: Client dashboard shows "No data"

**Solutions**:
1. Check that forms include `schemeId` field
2. Verify staff is submitting data for that scheme
3. Check Firestore security rules are deployed
4. Verify indexes are created in Firestore

### OTP Code Not Working

**Problem**: "Invalid OTP code" or "Code already used"

**Solutions**:
1. Check code is entered correctly (case-insensitive)
2. Verify code hasn't been used by another client
3. Check admin generated the code correctly
4. Review `clientOTPs` collection in Firestore

### Charts Not Loading

**Problem**: Dashboard shows loading spinner forever

**Solutions**:
1. Open browser console and check for errors
2. Verify Firestore composite indexes are created
3. Check security rules allow client to read data
4. Ensure `schemeId` matches between user and data

### Client Sees Wrong Scheme Data

**Problem**: Client sees data from different schemes

**Solutions**:
1. Check user document has correct `schemeId`
2. Verify security rules are properly deployed
3. Review `clientDataService` queries include scheme filter
4. Check form submissions have correct `schemeId`

---

## File Structure

Key files in the implementation:

```
src/
├── services/
│   ├── otpService.js              # OTP CRUD operations
│   ├── clientDataService.js       # Scheme-specific data queries
│   └── authService.js             # Auth with OTP support
├── components/
│   ├── auth/
│   │   ├── ClientSignUpForm.jsx   # Client registration with OTP
│   │   └── ClientSignInForm.jsx   # Client login
│   ├── dashboard/
│   │   └── NewClientDashboard.jsx # Scheme-specific dashboard
│   ├── admin/
│   │   └── OTPManagement.jsx      # Admin OTP generator
│   └── layout/
│       └── ClientSidebarLayout.jsx # Client UI layout
└── pages/
    ├── ClientSignUpPage.jsx       # Client signup route
    ├── ClientSignInPage.jsx       # Client login route
    └── admin/
        └── OTPManagementPage.jsx  # Admin OTP route
```

---

## Next Steps

1. ✅ Deploy Firestore security rules
2. ✅ Create Firestore indexes
3. ⬜ Update staff forms to include `schemeId`
4. ⬜ Test OTP generation and client registration
5. ⬜ Create test client account
6. ⬜ Verify client can only see their scheme's data
7. ⬜ Train admin staff on OTP management
8. ⬜ Train clients on registration process

---

## Support

For issues or questions:
1. Check browser console for errors
2. Review Firestore logs in Firebase Console
3. Verify security rules in Firebase Console
4. Check this documentation for troubleshooting steps
