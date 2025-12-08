# Step-by-Step Setup Guide - Client OTP System

Follow these steps exactly to get your client system working!

---

## 📋 **STEP 1: Deploy Firestore Security Rules** (5 minutes)

### What you'll do:
Upload security rules to Firebase to protect client data

### Instructions:

1. **Open Firebase Console**
   ```
   - Go to: https://console.firebase.google.com
   - Click on your project
   - Click "Firestore Database" in the left sidebar
   - Click the "Rules" tab at the top
   ```

2. **Copy the Security Rules**
   - Open the file: `FIRESTORE_SECURITY_RULES.md` (in this folder)
   - Copy everything from line 10 to line 165 (the entire rules block)
   - Or copy from below:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper function to get user data
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Helper function to check user role
    function hasRole(role) {
      return isSignedIn() && getUserData().role == role;
    }

    // Helper function to check if user belongs to a scheme
    function belongsToScheme(schemeId) {
      return isSignedIn() && getUserData().schemeId == schemeId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn() && request.auth.uid == userId;
      allow create: if isSignedIn();
      allow update: if isSignedIn()
                    && request.auth.uid == userId
                    && request.resource.data.role == resource.data.role
                    && request.resource.data.schemeId == resource.data.schemeId;
      allow read: if hasRole('admin');
      allow update: if hasRole('admin');
    }

    // Client OTP Codes collection
    match /clientOTPs/{otpCode} {
      allow read: if true;
      allow create: if hasRole('admin');
      allow update: if hasRole('admin')
                    || (request.auth != null
                        && request.resource.data.isUsed == true
                        && request.resource.data.usedBy == request.auth.uid);
      allow delete: if false;
    }

    // Incident Reports collection
    match /incidentReports/{reportId} {
      allow create: if hasRole('staff');
      allow read: if hasRole('staff');
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;
      allow read: if hasRole('admin');
      allow update: if hasRole('staff');
      allow update: if hasRole('admin');
    }

    // CCTV Check Forms collection (UPDATED NAME)
    match /cctvCheckForms/{checkId} {
      allow create: if hasRole('staff');
      allow read: if hasRole('staff');
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;
      allow read: if hasRole('admin');
      allow update: if hasRole('staff');
      allow update: if hasRole('admin');
    }

    // Daily Occurrence Reports collection (UPDATED NAME)
    match /dailyOccurrenceReports/{logId} {
      allow create: if hasRole('staff');
      allow read: if hasRole('staff');
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;
      allow read: if hasRole('admin');
      allow update: if hasRole('staff');
      allow update: if hasRole('admin');
    }

    // Asset Damage Reports collection
    match /assetDamageReports/{reportId} {
      allow create: if hasRole('staff');
      allow read: if hasRole('staff');
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;
      allow read: if hasRole('admin');
      allow update: if hasRole('staff');
      allow update: if hasRole('admin');
    }

    // Audit Logs collection (admin only)
    match /auditLogs/{logId} {
      allow read: if hasRole('admin');
      allow write: if hasRole('admin');
    }

    // Activities collection (for notice board)
    match /activities/{activityId} {
      allow read: if hasRole('staff') || hasRole('admin');
      allow write: if hasRole('staff') || hasRole('admin');
    }
  }
}
```

3. **Paste in Firebase**
   ```
   - Select ALL text in the Firebase Rules editor
   - Delete it
   - Paste the new rules
   - Click "Publish" button at the top
   ```

4. **Verify Rules Are Published**
   ```
   - You should see a green success message
   - The rules should now be active
   ```

✅ **Step 1 Complete!** Security rules are now protecting your data.

---

## 🚀 **STEP 2: Start Your Development Server** (1 minute)

### What you'll do:
Run your React app locally

### Instructions:

1. **Open Terminal/Command Prompt**
   ```
   - Open VS Code
   - Press Ctrl + ` (backtick) to open terminal
   - Or use your regular terminal/command prompt
   ```

2. **Navigate to Project**
   ```bash
   cd c:\Users\fresh\Documents\lensebychellan
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Wait for Server to Start**
   ```
   - You should see: "Local: http://localhost:5173"
   - The app should open in your browser
   - If not, manually open: http://localhost:5173
   ```

✅ **Step 2 Complete!** Your app is now running.

---

## 👤 **STEP 3: Login as Admin** (1 minute)

### What you'll do:
Access the admin dashboard

### Instructions:

1. **Navigate to Sign In**
   ```
   - Go to: http://localhost:5173/signin
   - Or click "Sign In" on your homepage
   ```

2. **Login with Admin Credentials**
   ```
   Email: [your admin email]
   Password: [your admin password]
   ```

3. **Verify You're in Admin Dashboard**
   ```
   - URL should be: /dashboard/admin
   - You should see "Admin Dashboard" heading
   - You should see a button: "Manage Client Access Codes"
   ```

✅ **Step 3 Complete!** You're logged in as admin.

---

## 🔑 **STEP 4: Generate OTP Code for A417** (2 minutes)

### What you'll do:
Create an access code for the A417 scheme

### Instructions:

1. **Click "Manage Client Access Codes" Button**
   ```
   - It's a teal button in the top right
   - URL will change to: /dashboard/admin/otp-management
   ```

2. **Click "Generate New Code" Button**
   ```
   - A modal/popup will appear
   - Title: "Generate New Access Code"
   ```

3. **Select Scheme from Dropdown**
   ```
   - Click the dropdown labeled "Select Scheme"
   - Select: "A417 Missing Link - Kier"
   - You'll see: "Code will be generated for: A417"
   ```

4. **Click "Generate Code" Button**
   ```
   - Wait 1-2 seconds
   - You'll see a success message
   - The modal will close
   ```

5. **Find Your New Code in the Table**
   ```
   - Look at the OTP table
   - First row should be your new code
   - Format: A417-2024-XXXXXX (random letters)
   - Status should be: "Available" (green checkmark)
   ```

6. **Copy the Code**
   ```
   - Click the "Copy" button next to the code
   - Or manually copy the code from the table
   - Save it somewhere (Notepad, etc.)
   ```

**Example Code:** `A417-2024-ABC123` (yours will be different)

✅ **Step 4 Complete!** OTP code generated and copied.

---

## 👥 **STEP 5: Register a Client Account** (3 minutes)

### What you'll do:
Create a test client account for A417 scheme

### Instructions:

1. **Open New Incognito/Private Window**
   ```
   - Chrome: Ctrl + Shift + N
   - Firefox: Ctrl + Shift + P
   - Edge: Ctrl + Shift + N
   - Or just logout from admin account
   ```

2. **Navigate to Signup Page**
   ```
   - Go to: http://localhost:5173/signup
   - You should see "Create Account" heading
   ```

3. **Select "Client" Role**
   ```
   - In the "I am a:" dropdown, select "Client"
   - This will reveal the Scheme Access Code field
   ```

4. **Enter the OTP Code**
   ```
   Field: Scheme Access Code
   Value: [Paste the code you copied, e.g., A417-2024-ABC123]

   Note: It's case-insensitive, so uppercase or lowercase is fine
   ```

5. **Fill in Client Details**
   ```
   Full Name: John Smith
   Email: john@a417project.com (or any test email)
   Password: Test123! (or any password with 6+ characters)
   Confirm Password: Test123!
   Company Name: A417 Highway Management
   Phone Number: (optional, can leave blank)
   ```

6. **Click "Sign Up" Button**
   ```
   - Wait 2-3 seconds
   - You should see: "Account created! Please verify your email."
   - You'll be redirected to: /signin
   ```

7. **Check Email for Verification (IMPORTANT)**
   ```
   - Open the email inbox for the email you used
   - Look for email from Firebase
   - Subject: "Verify your email for..."
   - Click the verification link
   - Close that tab
   ```

✅ **Step 5 Complete!** Client account created and verified.

---

## 🔓 **STEP 6: Login as Client** (1 minute)

### What you'll do:
Access the client dashboard

### Instructions:

1. **Navigate to Sign In Page**
   ```
   - URL: http://localhost:5173/signin
   - If not already there, navigate there manually
   ```

2. **Enter Client Credentials**
   ```
   Email: john@a417project.com (the email you used)
   Password: Test123! (the password you used)
   ```

3. **Click "Sign In" Button**
   ```
   - Wait 1-2 seconds
   - You should be redirected to: /dashboard/client
   ```

4. **Verify Client Dashboard**
   ```
   ✓ Sidebar shows: "Your Scheme"
   ✓ Sidebar shows: "A417"
   ✓ Sidebar shows: "A417 Missing Link - Kier"
   ✓ Dashboard heading shows: "Welcome back, John Smith!"
   ✓ You see 4 stat cards
   ✓ You see charts (may show "No data" if no incidents yet)
   ```

✅ **Step 6 Complete!** Client is logged in and can see their dashboard!

---

## 📊 **STEP 7: Test with Sample Data** (5 minutes)

### What you'll do:
Submit an incident report as staff and verify client can see it

### Instructions:

**Part A: Login as Staff**

1. **Open Another Incognito/Private Window**
   ```
   - Or use regular window if you logged out
   ```

2. **Go to Staff Sign In**
   ```
   - Navigate to: http://localhost:5173/signin
   ```

3. **Login as Staff**
   ```
   Email: [your staff email]
   Password: [your staff password]

   Note: You must have a staff account already created
   If you don't have one, use your admin account (it can access forms too)
   ```

**Part B: Submit Incident Report**

1. **Navigate to Forms**
   ```
   - Click "Forms" in the sidebar
   - Or go directly to: /dashboard/staff/forms/incident-report
   ```

2. **Fill Out Incident Report**
   ```
   IMPORTANT FIELDS:

   Scheme: Select "A417 Missing Link - Kier" ✅ CRITICAL!
   Section: Select any (e.g., A417)
   Date: Select today's date
   First Name: Test
   Last Name: Staff
   Weather Conditions: Select any (e.g., Dry)
   NH Log: 12345
   Collar Number: 67890
   Incursion: Select "NO"
   Reported By: Select "CCTV"
   Camera Number: 23
   Traffic Conditions: Select "Light"
   Marker Post: 2.3
   Track: Select "A"
   Incident Type: Select "Free Recovery"
   Affected Lanes: Check at least one (e.g., Lane 1)
   Emergency Services: Check "N/A"
   Recovery Requested: Select 0 for all
   Description: Test incident for A417 client dashboard
   ```

3. **Submit the Form**
   ```
   - Scroll to bottom
   - Click "Submit" button
   - Wait for success message
   - You'll be redirected to staff dashboard
   ```

**Part C: Verify Client Can See It**

1. **Go Back to Client Window**
   ```
   - Switch to the window where client is logged in
   - Or re-login as client
   ```

2. **Refresh the Dashboard**
   ```
   - Press F5 or click refresh button
   - Wait 2-3 seconds for data to load
   ```

3. **Check for the Incident**
   ```
   ✓ Stats card "Total Incidents" should show: 1
   ✓ "Incident Type" chart should show: 1 incident
   ✓ "Recent Incidents" should list your test incident
   ✓ Should show: "Free Recovery" type
   ```

✅ **Step 7 Complete!** Client can see scheme-specific data!

---

## ✅ **STEP 8: Test Data Isolation** (3 minutes)

### What you'll do:
Verify client CANNOT see other schemes' data

### Instructions:

**Part A: Create OTP for Different Scheme**

1. **Login as Admin Again**
   ```
   - Open new window or logout from staff
   - Go to: /dashboard/admin/otp-management
   ```

2. **Generate OTP for M3 Scheme**
   ```
   - Click "Generate New Code"
   - Select: "M3 Jct 9 - Balfour Beatty"
   - Click "Generate Code"
   - Copy the M3 code (e.g., M3-2024-XYZ789)
   ```

**Part B: Submit Incident for M3**

1. **Login as Staff**

2. **Submit Another Incident**
   ```
   - Go to Incident Report form
   - THIS TIME select: "M3 Jct 9 - Balfour Beatty" ✅ DIFFERENT SCHEME
   - Fill other required fields
   - Submit
   ```

**Part C: Verify A417 Client CANNOT See M3 Data**

1. **Go to A417 Client Dashboard**
   ```
   - Login as john@a417project.com
   - Go to dashboard
   ```

2. **Check Stats**
   ```
   ✓ Total Incidents should still show: 1 (not 2!)
   ✓ Recent Incidents should only show the A417 incident
   ✓ Should NOT show the M3 incident
   ```

3. **Success!**
   ```
   If you only see 1 incident (the A417 one), data isolation is working!
   The A417 client cannot see M3 data - perfect! ✅
   ```

✅ **Step 8 Complete!** Data isolation verified!

---

## 🎉 **FINAL VERIFICATION CHECKLIST**

Go through this checklist to make sure everything works:

### Admin Functions:
- [ ] Can login as admin
- [ ] Can access OTP Management page
- [ ] Can see dropdown with all 6 schemes
- [ ] Can generate OTP codes
- [ ] Codes show in table with correct format (e.g., A417-2024-XXXXXX)
- [ ] Can copy codes to clipboard

### Client Registration:
- [ ] Can access /client/signup page
- [ ] Can enter OTP code
- [ ] Form validates OTP code
- [ ] Can complete registration
- [ ] Receives verification email
- [ ] Account is created with correct scheme

### Client Dashboard:
- [ ] Can login at /client/signin
- [ ] Sidebar shows correct scheme ID and name
- [ ] Dashboard loads without errors
- [ ] Stats cards display
- [ ] Charts display (even if empty)
- [ ] Navigation menu works

### Data Filtering:
- [ ] Client sees incidents for their scheme
- [ ] Client does NOT see other schemes' incidents
- [ ] Stats are scheme-specific
- [ ] Charts only show scheme data

### Staff Forms:
- [ ] Staff can select scheme from dropdown
- [ ] Form submits successfully
- [ ] Data appears in client dashboard
- [ ] schemeId is automatically added

---

## 🐛 **Troubleshooting**

### Problem: "Invalid OTP code" error
**Solution:**
- Check code is copied correctly
- Check code hasn't been used already
- Check admin generated the code successfully
- Try generating a new code

### Problem: Client dashboard shows "No data"
**Solution:**
- Make sure you submitted at least one incident/form
- Check that the form had the correct scheme selected
- Wait 5-10 seconds and refresh
- Check browser console for errors (F12)

### Problem: Client sees other schemes' data
**Solution:**
- Verify Firestore security rules are published
- Check user document has correct schemeId
- Clear browser cache and re-login

### Problem: Charts not loading
**Solution:**
- Open browser console (F12)
- Look for Firestore index errors
- Click the link in the error to create indexes
- Wait 1-2 minutes for indexes to build

### Problem: Can't access /client/signup
**Solution:**
- Make sure dev server is running (npm run dev)
- Check URL is exactly: http://localhost:5173/client/signup
- Clear browser cache
- Try incognito window

---

## 📞 **Next Steps**

Once everything is working:

1. **Generate OTP codes for all 6 schemes**
   ```
   - A417 Missing Link - Kier
   - Gallows Corner - Costain
   - A1 Birtley to Coalhouse - Costain
   - M3 Jct 9 - Balfour Beatty
   - HS2- Traffix
   - A47 Thickthorn - Core
   ```

2. **Share codes with actual clients**
   ```
   - Email or securely send OTP codes
   - Include link: http://localhost:5173/client/signup
   (or your production URL when deployed)
   ```

3. **Train clients how to:**
   ```
   - Register with OTP code
   - Verify email
   - Login at /client/signin
   - Navigate their dashboard
   ```

4. **Start collecting real data**
   ```
   - Staff submits actual incidents
   - Clients see real-time updates
   - Everyone has access to their scheme's data
   ```

---

## 🎊 **Congratulations!**

Your Client OTP System is now fully operational! Each of your 6 highway schemes can now:
- ✅ Register with unique OTP codes
- ✅ Access their own dashboard
- ✅ See real-time data and charts
- ✅ View only their scheme's incidents
- ✅ Have secure, isolated data

**You're all set! Happy monitoring!** 🚗📊
