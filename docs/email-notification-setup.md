# Email Notification System Documentation

## Overview
The LENS by Chellan application sends email notifications when Asset Damage Forms are submitted or updated. Emails are sent based on the "Notifications Sent To" checkboxes selected in the form.

---

## Current Configuration

| Setting | Value |
|---------|-------|
| Sender Email | `alerts@chellan.co.uk` |
| Sender Display Name | "LENSE by Chellan" |
| SMTP Service | Gmail (Google Workspace) |
| Password Storage | Firebase Secret (`SMTP_PASS`) |

---

## How It Works

1. User submits/updates an Asset Damage Form
2. Based on selected notification checkboxes, emails are sent to configured recipients
3. Email logs are saved to Firestore `emailLogs` collection

### Notification Types
- TM Manager
- Maintenance Team
- Safety Officer
- Client
- Police

---

## Changing Email Recipients

Edit the `EMAIL_RECIPIENTS` object in `functions/index.js` (around line 15):

```javascript
const EMAIL_RECIPIENTS = {
  "M3 Jct 9 - Balfour Beatty": {
    "TM Manager": "tm.manager@example.com",
    "Maintenance Team": "maintenance@example.com",
    "Safety Officer": "safety@example.com",
    "Client": "client@example.com",
    "Police": "police@example.com",
  },
  "A417 Missing Link - Kier": {
    // ... same structure
  },
  // Add more schemes as needed
};
```

**Important:** Scheme names must match exactly as they appear in `src/utils/schemes.js` (use the `fullName` value).

After editing, redeploy:
```bash
cd functions
firebase deploy --only functions
```

---

## Changing SMTP Credentials

### Step 1: Update Sender Email (if changing)

Edit `functions/index.js` line ~88:
```javascript
user: "your-new-email@example.com",
```

Also update the "from" field around line ~195:
```javascript
from: '"LENSE by Chellan" <your-new-email@example.com>',
```

### Step 2: Generate New App Password

1. Go to the Google Account for your sender email: https://myaccount.google.com/security
2. Ensure **2-Step Verification** is enabled
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Create a new App Password for "Mail"
5. Copy the 16-character password

### Step 3: Update Firebase Secret

Run this command:
```bash
firebase functions:secrets:set SMTP_PASS
```

Enter the new App Password **without spaces** (e.g., `abcdefghijklmnop`)

### Step 4: Redeploy Functions

```bash
cd functions
firebase deploy --only functions
```

Or if prompted after setting the secret, choose "Yes" to auto-redeploy.

---

## Troubleshooting

### Check Logs
```bash
firebase functions:log
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `535-5.7.8 Username and Password not accepted` | Wrong App Password or email mismatch | Regenerate App Password from the correct Google account |
| `No email configured for [scheme]` | Scheme not in EMAIL_RECIPIENTS | Add the scheme to the mapping |
| `User must be authenticated` | User not logged in | Ensure user is authenticated before submitting |

### Verify Secret is Set
```bash
firebase functions:secrets:access SMTP_PASS
```

---

## Files Involved

| File | Purpose |
|------|---------|
| `functions/index.js` | Firebase Function that sends emails |
| `src/services/emailService.js` | Frontend service that calls the function |
| `src/pages/staff/AssetDamageFormPage.jsx` | Form that triggers email notifications |

---

## Cost

- **Firebase Functions**: Free tier includes 2M invocations/month
- **Gmail SMTP**: Free for Google Workspace accounts (500 emails/day limit for regular Gmail)

---

## Future: Adding Email to Other Forms

To add email notifications to another form (e.g., Incident Report):

1. Create a new callable function in `functions/index.js` (copy `sendAssetDamageNotification` as template)
2. Add a new function in `src/services/emailService.js`
3. Import and call the service in the form's submit handler
4. Redeploy functions
