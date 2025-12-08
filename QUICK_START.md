# Quick Start Guide - Client OTP System

## 🚀 Get Started in 5 Steps

### Step 1: Deploy Security Rules (5 minutes)
```
1. Open Firebase Console
2. Go to Firestore Database → Rules
3. Copy content from FIRESTORE_SECURITY_RULES.md
4. Paste and click "Publish"
```

### Step 2: Update One Form File (10 minutes)
```javascript
// Open: src/pages/staff/IncidentReportFormPage.jsx
// Find the submit function and add schemeId:

const handleSubmit = async (formData) => {
  const reportData = {
    ...formData,
    schemeId: 'A417', // Add this line
    createdBy: userProfile.uid,
    createdAt: serverTimestamp(),
  };

  await submitReport(reportData);
};
```

Repeat for:
- CCTVCheckFormPage.jsx
- DailyOccurrenceFormPage.jsx
- AssetDamageFormPage.jsx

### Step 3: Test Admin OTP Generation (2 minutes)
```
1. Run your app: npm run dev
2. Login as admin
3. Click "Manage Client Access Codes"
4. Click "Generate New Code"
5. Enter:
   - Scheme ID: A417
   - Scheme Name: A417 Motorway
6. Copy the generated code
```

### Step 4: Test Client Registration (3 minutes)
```
1. Navigate to /client/signup
2. Enter the OTP code from Step 3
3. Fill in:
   - Full Name: Test Client
   - Email: testclient@example.com
   - Password: password123
   - Company: Test Company
4. Click "Create Client Account"
5. Check email and verify
```

### Step 5: Test Client Dashboard (2 minutes)
```
1. Login at /client/signin
2. Check sidebar shows: A417 - A417 Motorway
3. Dashboard should load (might show "No data" if no incidents yet)
4. Submit a test incident as staff
5. Refresh client dashboard - should appear!
```

---

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN PANEL                          │
├─────────────────────────────────────────────────────────────┤
│  Generates OTP Code                                          │
│  ┌──────────────────────┐                                   │
│  │  A417-2024-ABC123   │ ← Creates unique code              │
│  └──────────────────────┘                                   │
│         ↓                                                    │
│  Stored in Firestore                                        │
│  ┌─────────────────────────────────────┐                   │
│  │ Collection: clientOTPs              │                   │
│  │ {                                   │                   │
│  │   otpCode: "A417-2024-ABC123"      │                   │
│  │   schemeId: "A417"                 │                   │
│  │   isUsed: false                    │                   │
│  │ }                                   │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘

                        ↓ Share code

┌─────────────────────────────────────────────────────────────┐
│                      CLIENT SIGNUP                           │
├─────────────────────────────────────────────────────────────┤
│  Enter OTP: A417-2024-ABC123                                │
│         ↓                                                    │
│  System validates OTP                                        │
│         ↓                                                    │
│  If valid, gets scheme info                                  │
│  ┌──────────────────────┐                                   │
│  │ schemeId: "A417"     │                                   │
│  │ schemeName: "A417    │                                   │
│  │ Motorway"            │                                   │
│  └──────────────────────┘                                   │
│         ↓                                                    │
│  Creates user with scheme                                    │
│  ┌─────────────────────────────────────┐                   │
│  │ Collection: users                   │                   │
│  │ {                                   │                   │
│  │   role: "client"                    │                   │
│  │   schemeId: "A417"                  │                   │
│  │   schemeName: "A417 Motorway"      │                   │
│  │ }                                   │                   │
│  └─────────────────────────────────────┘                   │
│         ↓                                                    │
│  Marks OTP as used                                          │
└─────────────────────────────────────────────────────────────┘

                        ↓ Login

┌─────────────────────────────────────────────────────────────┐
│                   CLIENT DASHBOARD                           │
├─────────────────────────────────────────────────────────────┤
│  Shows: A417 - A417 Motorway                                │
│         ↓                                                    │
│  Queries Firestore:                                          │
│  WHERE schemeId == "A417"                                    │
│         ↓                                                    │
│  ┌─────────────────────────────────────┐                   │
│  │ ✓ Incidents for A417 ONLY          │                   │
│  │ ✓ CCTV checks for A417 ONLY        │                   │
│  │ ✓ Daily logs for A417 ONLY         │                   │
│  │ ✗ Cannot see other schemes         │                   │
│  └─────────────────────────────────────┘                   │
│         ↓                                                    │
│  Displays in charts and tables                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Critical Files Checklist

### ✅ Already Created:
- [x] `src/services/otpService.js`
- [x] `src/services/clientDataService.js`
- [x] `src/services/authService.js` (updated)
- [x] `src/components/auth/ClientSignUpForm.jsx`
- [x] `src/components/auth/ClientSignInForm.jsx`
- [x] `src/components/dashboard/NewClientDashboard.jsx`
- [x] `src/components/layout/ClientSidebarLayout.jsx`
- [x] `src/components/admin/OTPManagement.jsx`
- [x] `src/pages/ClientSignUpPage.jsx`
- [x] `src/pages/ClientSignInPage.jsx`
- [x] `src/pages/admin/OTPManagementPage.jsx`
- [x] `src/App.jsx` (updated with routes)
- [x] `src/pages/Dashboard.jsx` (updated)

### ⚠️ Need Your Updates:
- [ ] Firebase security rules (deploy from FIRESTORE_SECURITY_RULES.md)
- [ ] `src/pages/staff/IncidentReportFormPage.jsx` (add schemeId)
- [ ] `src/pages/staff/CCTVCheckFormPage.jsx` (add schemeId)
- [ ] `src/pages/staff/DailyOccurrenceFormPage.jsx` (add schemeId)
- [ ] `src/pages/staff/AssetDamageFormPage.jsx` (add schemeId)
- [ ] Firestore indexes (create when prompted by Firebase)

---

## 🎬 Demo Script

### Creating First Client (Complete Flow)

**As Admin:**
```bash
1. npm run dev
2. Navigate to http://localhost:5173/signin
3. Login with admin credentials
4. Click "Manage Client Access Codes"
5. Click "Generate New Code"
6. Enter:
   Scheme ID: A417
   Scheme Name: A417 Motorway
7. Copy code: A417-2024-XXXXXX
```

**As Client (new browser/incognito):**
```bash
1. Navigate to http://localhost:5173/client/signup
2. Paste OTP code: A417-2024-XXXXXX
3. Fill in details:
   Name: John Smith
   Email: john@highway.com
   Password: Test123!
   Company: Highway Services Ltd
4. Click "Create Client Account"
5. Check email, click verification link
6. Navigate to http://localhost:5173/client/signin
7. Login with credentials
8. See dashboard with A417 scheme info
```

**As Staff:**
```bash
1. Login as staff member
2. Go to Forms → Incident Report
3. Submit test incident with schemeId: "A417"
```

**Back to Client:**
```bash
1. Refresh dashboard
2. See incident appear in charts and recent activity!
```

---

## 🔑 Environment Variables

Make sure your `.env` file has:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## 📞 Support

**Documentation:**
- Full Setup: [CLIENT_OTP_SETUP_GUIDE.md](CLIENT_OTP_SETUP_GUIDE.md)
- Security Rules: [FIRESTORE_SECURITY_RULES.md](FIRESTORE_SECURITY_RULES.md)
- Summary: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

**Troubleshooting:**
- Check browser console for errors
- Review Firebase Console → Firestore → Data
- Verify security rules in Firebase Console
- Check indexes are created

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Admin can generate OTP codes
- ✅ Client can register with OTP
- ✅ Client dashboard shows scheme name in sidebar
- ✅ Client only sees their scheme's data
- ✅ Charts populate with real data
- ✅ No console errors
- ✅ Security rules prevent unauthorized access

**That's it! You're ready to go! 🚀**
