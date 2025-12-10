# Firebase Indexes Setup Guide

Your client-side pages require Firebase composite indexes to work properly. Follow one of these methods to set them up:

## 🚀 Quick Method (Recommended)

Simply click the index creation links from your browser console errors, or use these direct links:

### Required Indexes:

1. **Incident Reports Index**
   - Collection: `incidentReports`
   - Fields: `schemeId` (ASC) + `createdAt` (DESC)
   - [Click here to create](https://console.firebase.google.com/v1/r/project/lensebychellan/firestore/indexes?create_composite=ClZwcm9qZWN0cy9sZW5zZWJ5Y2hlbGxhbi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvaW5jaWRlbnRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCHNjaGVtZUlkEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ)

2. **CCTV Check Forms Index**
   - Collection: `cctvCheckForms`
   - Fields: `schemeId` (ASC) + `createdAt` (DESC)
   - [Click here to create](https://console.firebase.google.com/v1/r/project/lensebychellan/firestore/indexes?create_composite=ClVwcm9qZWN0cy9sZW5zZWJ5Y2hlbGxhbi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY2N0dkNoZWNrRm9ybXMvaW5kZXhlcy9fEAEaDAoIc2NoZW1lSWQQARoNCgljcmVhdGVkQXQQARoMCghfX25hbWVfXxAB)

**Index Build Time:** 5-10 minutes (usually faster for empty collections)

---

## 🛠️ CLI Method (For Production)

Use Firebase CLI to deploy all indexes at once:

```bash
# 1. Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Deploy indexes
firebase deploy --only firestore:indexes
```

This will create all 5 required indexes from `firestore.indexes.json`:
- ✅ `incidentReports` (schemeId + createdAt)
- ✅ `cctvCheckForms` (schemeId + createdAt)
- ✅ `assetDamageReports` (schemeId + createdAt)
- ✅ `dailyOccurrenceReports` (schemeId + createdAt)
- ✅ `cctvUploads` (scheme + uploadedAt)

---

## 📋 Manual Method (Firebase Console)

If you prefer to create indexes manually:

1. Go to [Firebase Console - Firestore Indexes](https://console.firebase.google.com/project/lensebychellan/firestore/indexes)
2. Click "Add Index"
3. For each collection, add a composite index:

### incidentReports Index
- Collection ID: `incidentReports`
- Fields:
  - `schemeId` - Ascending
  - `createdAt` - Descending

### cctvCheckForms Index
- Collection ID: `cctvCheckForms`
- Fields:
  - `schemeId` - Ascending
  - `createdAt` - Descending

### assetDamageReports Index
- Collection ID: `assetDamageReports`
- Fields:
  - `schemeId` - Ascending
  - `createdAt` - Descending

### dailyOccurrenceReports Index
- Collection ID: `dailyOccurrenceReports`
- Fields:
  - `schemeId` - Ascending
  - `createdAt` - Descending

### cctvUploads Index
- Collection ID: `cctvUploads`
- Fields:
  - `scheme` - Ascending
  - `uploadedAt` - Descending

---

## ✅ Verify Indexes

After creating indexes:

1. Go to [Firestore Indexes](https://console.firebase.google.com/project/lensebychellan/firestore/indexes)
2. Wait until all indexes show **"Enabled"** status (not "Building")
3. Refresh your app - the pages should now load data without errors

---

## 🎯 What These Indexes Do

These composite indexes allow Firebase to efficiently query collections when:
- **Filtering** by `schemeId` (to show only the client's scheme data)
- **Sorting** by `createdAt` or `uploadedAt` (to show newest items first)

Without these indexes, Firebase cannot perform these compound queries for performance and cost optimization reasons.

---

## 🐛 Troubleshooting

**Q: Index creation links don't work?**
- Make sure you're logged into Firebase Console with the correct Google account
- Verify you have editor/owner permissions on the `lensebychellan` project

**Q: Indexes are stuck on "Building"?**
- This is normal for the first time
- Empty collections build in 1-2 minutes
- Collections with data may take 5-10 minutes
- Large collections (1000+ docs) may take up to 30 minutes

**Q: Still getting index errors after creation?**
- Hard refresh your app (Ctrl+Shift+R or Cmd+Shift+R)
- Check Firebase Console to confirm all indexes show "Enabled"
- Clear browser cache and reload

**Q: Want to see index build progress?**
- Go to Firebase Console > Firestore > Indexes
- Check the "Status" column for each index

---

## 📊 After Setup

Once indexes are built, your client pages will display:
- **Analytics Page** - Real-time charts and statistics
- **Reports Page** - All incident, asset damage, daily logs, and CCTV check reports
- **CCTV Recordings Page** - Video uploads from staff members

All data is automatically filtered by the client's scheme ID for security and relevance.
