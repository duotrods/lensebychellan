# Production Deployment Checklist

## 1. Update Firebase Project Target

Your production Firebase project is different from staging (`lensebychellan-staging`). Make sure your production `.env` points to the production project.

Run this to find your production project ID:
```bash
firebase projects:list
```

---

## 2. Create a Production `.env`

Your hosting platform (Vercel) needs these vars set for production:

```
VITE_FIREBASE_API_KEY=<prod key>
VITE_FIREBASE_AUTH_DOMAIN=<prod>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<prod project id>
VITE_FIREBASE_STORAGE_BUCKET=<prod>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<prod sender id>
VITE_FIREBASE_APP_ID=<prod app id>

VITE_R2_ENDPOINT=https://720e8642c7f1cb44716feb6f1ac67cc9.r2.cloudflarestorage.com
VITE_R2_ACCESS_KEY_ID=da52a3c5313963043c77c1d6fd31eccf
VITE_R2_SECRET_ACCESS_KEY=86e2949a379a50836147fd6297b5590aac14e8abb4ace9ed2d30ce446744111e
VITE_R2_BUCKET=lensebychellan-cctv
VITE_R2_PUBLIC_URL=https://pub-d741fbe789ce48f7ab175a18579d9eff.r2.dev
```

> The R2 vars are the same for staging and production (R2 is not environment-specific unless you want separate buckets).

---

## 3. Deploy Firestore Indexes to Production

Switch your Firebase CLI target to production and deploy:

```bash
firebase use <prod-project-id>
firebase deploy --only firestore:indexes
```

This deploys the 3 new composite indexes needed for sub-filters on ReportsPage:
- `schemeIds CONTAINS` + `incursion ASC` + `createdAt DESC`
- `schemeIds CONTAINS` + `incidentType ASC` + `createdAt DESC`
- `schemeIds CONTAINS` + `propertyDamage ASC` + `createdAt DESC`

---

## 4. Apply CORS to Production Firebase Storage

If the production bucket still holds old files that need to be downloaded, apply CORS:

Create `cors.json`:
```json
[{
  "origin": ["https://lense.live"],
  "method": ["GET"],
  "maxAgeSeconds": 3600
}]
```

Then run:
```bash
gsutil cors set cors.json gs://<prod-bucket>.firebasestorage.app
```

---

## 5. Merge and Deploy Code

Normal git flow — merge to main → push → Vercel auto-deploys.

All code changes included in this deploy:
- R2 migration for CCTV uploads (`CCTVUploadsPage.jsx`)
- R2 migration for incident report images (`IncidentReportFormPage.jsx`)
- Dashboard stat card fixes (Incidents excludes Free Recovery + Incursions; Asset Damage replaces CCTV Checks)
- ReportsPage pagination count fixes for sub-filters
- Server-side filtering for Incursions, Free Recovery, Asset Damage

---

## 6. Post-Deploy Testing

- [ ] Upload a CCTV video → confirm it appears in R2, URL is accessible
- [ ] Submit an incident report with images → confirm images upload to R2 and display in view pages
- [ ] Check dashboard stat cards → Incidents count excludes Free Recovery + Incursions
- [ ] Click Incursions filter on ReportsPage → confirm correct count and reports load
- [ ] Click Asset Damage card → confirm reports appear
- [ ] Check Free Recovery filter → correct count and reports load
