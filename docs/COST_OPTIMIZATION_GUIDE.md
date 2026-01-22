# Firebase Cost Optimization Guide

## Current Cost: $0.01 (Very Low!)

Your current cost is minimal, but here are ways to keep it low as your app scales:

---

## 1. Storage Costs (Firebase Storage)

### Current Issue:
CCTV recordings and images are stored in Firebase Storage. This can grow expensive.

### Solutions:

#### A. Implement Automatic File Deletion
Add lifecycle rules to delete old files:

**In Firebase Console:**
1. Go to Storage → Rules
2. Set up automatic deletion for files older than 30/60/90 days
3. Or implement manual cleanup in your code

#### B. Compress Images Before Upload
```javascript
// Add to your upload code
import imageCompression from 'browser-image-compression';

const compressImage = async (file) => {
  const options = {
    maxSizeMB: 1, // Maximum file size in MB
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true
  };
  return await imageCompression(file, options);
};
```

#### C. Video Compression
For CCTV uploads, compress videos before uploading or use lower quality settings.

---

## 2. Firestore Costs (Database)

### Free Tier Limits:
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1GB storage

### Optimization Tips:

#### A. Reduce Unnecessary Reads
```javascript
// BAD - Reads entire collection every time
const allReports = await getDocs(collection(db, 'incidentReports'));

// GOOD - Use pagination and limits
const q = query(
  collection(db, 'incidentReports'),
  limit(10),
  orderBy('createdAt', 'desc')
);
```

#### B. Use Local Caching
Already implemented in your app! Firebase caches data locally.

#### C. Batch Operations
Instead of multiple writes, use batch:
```javascript
const batch = writeBatch(db);
batch.set(doc1, data1);
batch.set(doc2, data2);
await batch.commit(); // Only 1 write operation counted
```

---

## 3. Cloud Functions Costs

### Free Tier:
- 2 million invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

### Your Current Usage:
- 1 function (deleteUserAccount) - Very low usage

### Tips:
- ✅ Already optimized (only 1 function)
- Avoid creating too many Cloud Functions
- Each function invocation counts

---

## 4. Authentication Costs

**Good news: Firebase Authentication is FREE!**
- Unlimited users
- No cost for email/password auth

---

## 5. Bandwidth Costs

### Free Tier:
- 10GB/month download
- 360MB/day download

### Optimization:
- Compress images (already recommended above)
- Use CDN for static assets (optional, advanced)
- Lazy load images

---

## Cost Monitoring

### Check Your Usage:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Usage and Billing**
4. View breakdown by service

### Set Budget Alerts:
1. Go to Firebase Console → Usage and Billing
2. Click **Details & Settings**
3. Set budget alerts (e.g., alert at $5, $10, $20)

---

## Estimated Monthly Costs (Current Usage)

Based on your app:

| Service | Free Tier | Estimated Usage | Cost |
|---------|-----------|-----------------|------|
| Authentication | Unlimited | ~50 users | $0.00 |
| Firestore | 50K reads/day | ~5K reads/day | $0.00 |
| Storage | 5GB free | ~100MB | $0.00 |
| Cloud Functions | 2M invocations | ~100/month | $0.00 |
| Bandwidth | 10GB/month | ~500MB | $0.00 |
| **Total** | | | **~$0.00 - $2.00/month** |

---

## When Will Costs Increase?

### Storage (Biggest concern):
- If CCTV uploads accumulate without deletion
- **Solution:** Implement automatic cleanup after 30-60 days

### Firestore:
- If you get 1000+ users with heavy usage
- If reports exceed free tier limits

### Cloud Functions:
- Unlikely to exceed free tier with current setup

---

## Immediate Actions to Take

### 1. Set Budget Alerts (5 minutes)
```
Firebase Console → Billing → Set Alert at $5
```

### 2. Review Storage Usage (2 minutes)
```
Firebase Console → Storage → Check current usage
```

### 3. Implement File Cleanup (Recommended)
Create a scheduled Cloud Function to delete old files:

```javascript
// functions/index.js
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Runs daily at midnight
exports.cleanupOldFiles = onSchedule('every day 00:00', async () => {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles();

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  for (const file of files) {
    const [metadata] = await file.getMetadata();
    const created = new Date(metadata.timeCreated).getTime();

    if (created < thirtyDaysAgo) {
      await file.delete();
      console.log(`Deleted old file: ${file.name}`);
    }
  }
});
```

---

## Best Practices

1. **Delete old files** - Don't keep CCTV recordings forever
2. **Compress uploads** - Reduce file sizes before uploading
3. **Monitor usage** - Check Firebase Console weekly
4. **Set alerts** - Get notified before costs spike
5. **Use pagination** - Don't load all data at once
6. **Cache locally** - Firebase already does this

---

## Current Status: ✅ Very Optimized!

Your $0.01 cost is **excellent**. Most Firebase projects stay under $5/month unless they have:
- 1000+ active users
- Heavy video storage
- Millions of database operations

Keep monitoring and you'll be fine!
