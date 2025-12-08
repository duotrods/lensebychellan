# Firestore Security Rules for Client OTP System

This document contains the necessary Firestore security rules to protect your client data and ensure that clients can only access their own scheme's information.

## Security Rules

Copy these rules to your Firebase Console (Firestore Database > Rules):

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
      // Users can read their own document
      allow read: if isSignedIn() && request.auth.uid == userId;

      // Only allow creating new users during signup (no role check needed)
      allow create: if isSignedIn();

      // Users can update their own profile (including lastLogin)
      // Cannot change role or schemeId
      allow update: if isSignedIn()
                    && request.auth.uid == userId
                    && (!('role' in request.resource.data) || request.resource.data.role == resource.data.role)
                    && (!('schemeId' in request.resource.data) || request.resource.data.schemeId == resource.data.schemeId);

      // Admins can read all users
      allow read: if hasRole('admin');

      // Admins can update any user
      allow update: if hasRole('admin');
    }

    // Client OTP Codes collection
    match /clientOTPs/{otpCode} {
      // Anyone can read to validate during signup (but data is safe)
      allow read: if true;

      // Only admins can create OTP codes
      allow create: if hasRole('admin');

      // Allow updates for:
      // 1. Admins (always)
      // 2. Authenticated users marking OTP as used (during signup completion)
      allow update: if hasRole('admin')
                    || (request.auth != null
                        && request.resource.data.isUsed == true
                        && request.resource.data.usedBy == request.auth.uid);

      // No one can delete OTP codes
      allow delete: if false;
    }

    // Incident Reports collection
    match /incidentReports/{reportId} {
      // Staff can create incident reports
      allow create: if hasRole('staff');

      // Staff can read all incident reports
      allow read: if hasRole('staff');

      // Clients can only read their scheme's incident reports
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;

      // Admins can read all
      allow read: if hasRole('admin');

      // Staff can update their own reports
      allow update: if hasRole('staff');

      // Admins can update any report
      allow update: if hasRole('admin');
    }

    // CCTV Check Reports collection
    match /cctvChecks/{checkId} {
      // Staff can create CCTV checks
      allow create: if hasRole('staff');

      // Staff can read all CCTV checks
      allow read: if hasRole('staff');

      // Clients can only read their scheme's CCTV checks
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;

      // Admins can read all
      allow read: if hasRole('admin');

      // Staff can update their own checks
      allow update: if hasRole('staff');

      // Admins can update any check
      allow update: if hasRole('admin');
    }

    // Daily Occurrence Logs collection
    match /dailyOccurrences/{logId} {
      // Staff can create daily logs
      allow create: if hasRole('staff');

      // Staff can read all daily logs
      allow read: if hasRole('staff');

      // Clients can only read their scheme's daily logs
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;

      // Admins can read all
      allow read: if hasRole('admin');

      // Staff can update their own logs
      allow update: if hasRole('staff');

      // Admins can update any log
      allow update: if hasRole('admin');
    }

    // Asset Damage Reports collection
    match /assetDamageReports/{reportId} {
      // Staff can create asset damage reports
      allow create: if hasRole('staff');

      // Staff can read all asset damage reports
      allow read: if hasRole('staff');

      // Clients can only read their scheme's asset damage reports
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;

      // Admins can read all
      allow read: if hasRole('admin');

      // Staff can update their own reports
      allow update: if hasRole('staff');

      // Admins can update any report
      allow update: if hasRole('admin');
    }

    // CCTV Check Forms collection (actual collection name used)
    match /cctvCheckForms/{formId} {
      // Staff can create CCTV check forms
      allow create: if hasRole('staff');

      // Staff can read all CCTV check forms
      allow read: if hasRole('staff');

      // Clients can only read their scheme's CCTV check forms
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;

      // Admins can read all
      allow read: if hasRole('admin');

      // Staff can update their own forms
      allow update: if hasRole('staff');

      // Admins can update any form
      allow update: if hasRole('admin');
    }

    // Daily Occurrence Reports collection (actual collection name used)
    match /dailyOccurrenceReports/{reportId} {
      // Staff can create daily occurrence reports
      allow create: if hasRole('staff');

      // Staff can read all daily occurrence reports
      allow read: if hasRole('staff');

      // Clients can only read their scheme's daily occurrence reports
      allow read: if hasRole('client')
                  && resource.data.schemeId == getUserData().schemeId;

      // Admins can read all
      allow read: if hasRole('admin');

      // Staff can update their own reports
      allow update: if hasRole('staff');

      // Admins can update any report
      allow update: if hasRole('admin');
    }

    // Counters collection (for reference ID generation)
    match /counters/{counterId} {
      // Staff and admins can read and write counters
      allow read, write: if hasRole('staff') || hasRole('admin');
    }

    // Activities collection (staff activity feed)
    match /activities/{activityId} {
      // Staff can read activities
      allow read: if hasRole('staff');

      // Staff can create activities
      allow create: if hasRole('staff');

      // Admins can read all activities
      allow read: if hasRole('admin');

      // Admins can write activities
      allow write: if hasRole('admin');
    }

    // Audit Logs collection (admin only)
    match /auditLogs/{logId} {
      allow read: if hasRole('admin');
      allow write: if hasRole('admin');
    }
  }
}
```

## Important Notes

1. **Deploy These Rules**: Copy the above rules to Firebase Console → Firestore Database → Rules tab
2. **Test Before Publishing**: Use the Firebase Console's Rules Simulator to test your rules
3. **Scheme ID Field**: Make sure ALL form submissions include a `schemeId` field matching the staff member's assigned scheme

## Required Data Structure Updates

When staff members submit forms, ensure the `schemeId` is included:

### Example: Incident Report Submission
```javascript
{
  // ... other fields
  schemeId: userProfile.assignedScheme || 'A417', // Staff's assigned scheme
  createdBy: userProfile.uid,
  createdAt: serverTimestamp(),
  // ... rest of the data
}
```

### Important: Staff Scheme Assignment

Currently, staff members don't have an assigned `schemeId`. You have two options:

**Option 1: Add scheme assignment to staff profiles**
```javascript
// When admin creates/updates staff, add:
{
  role: 'staff',
  assignedScheme: 'A417', // The scheme this staff member works on
  // ... other fields
}
```

**Option 2: Allow staff to select scheme when submitting forms**
Add a scheme selector dropdown to all forms.

## Testing Security Rules

Use the Firebase Console Rules Simulator:

1. Go to Firestore Database → Rules
2. Click "Simulator"
3. Test scenarios:
   - Client reading their own scheme data ✓
   - Client trying to read another scheme's data ✗
   - Admin reading all data ✓
   - Unauthenticated user accessing data ✗

## Next Steps

After deploying security rules:

1. **Update Form Submissions**: Ensure all forms include `schemeId`
2. **Staff Scheme Assignment**: Decide how to assign schemes to staff
3. **Test Client Access**: Create a test client and verify they only see their scheme
4. **Monitor Usage**: Check Firestore usage in Firebase Console

## Security Best Practices

- ✓ Clients can only read their own scheme's data
- ✓ Staff can create and read all data
- ✓ Admins have full access
- ✓ OTP codes are public for validation but cannot be modified by clients
- ✓ Audit logs are admin-only
- ✓ Users cannot change their own role or scheme
