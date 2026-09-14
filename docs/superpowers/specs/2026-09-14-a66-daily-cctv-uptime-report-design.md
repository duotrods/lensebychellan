# A66 Daily CCTV Uptime Report Email — Design

## Goal

Scheme A66 ("A66 - WJ Scheme 1", internal id `A66-WJ`) currently only exposes CCTV uptime data
through the on-demand client dashboard (`CCTVUptimePage.jsx`, 7/14/30/90-day ranges). Add an
automated email, sent once every 24 hours, containing a PDF "CCTV Uptime Report" scoped to
**A66 only** and the **last 24 hours only**, so recipients get a daily digest without opening the
dashboard. Any camera that had a fault reported in that 24h window must be clearly marked in the
PDF as having had a fault reported (not just shown with reduced uptime %).

## Scope

- A66 (`A66-WJ`) only. Not a generalized "daily report for any scheme" feature — hardcoded to this
  one scheme, matching how `AVERA_REPORT_SCHEMES` / `WIDELOAD_REPORT_SCHEMES` in `emailConfig.js`
  already hardcode scheme-specific behavior for A66.
- Fixed 24-hour lookback window ending at send time. No date-range picker, no other cadence.
- Recipients: a new dedicated list in `emailConfig.js`, defaulting to a placeholder
  (`rroduot@gmail.com`) until real WJ contacts are confirmed — a one-line swap later.
- Send time: 09:00 Europe/London, daily.
- Reuses the existing uptime aggregation logic (`getCCTVUptimeData` in `clientDataService.js`) as
  a reference, ported server-side — not called directly, since it's a client-SDK function backed
  by a 15-minute Firestore cache doc that isn't meaningful for a fixed 24h server-side job.
- Out of scope: any UI changes to the existing dashboard; any other scheme; making the report
  cadence/recipients configurable via the admin UI (recipients live in `emailConfig.js` like every
  other scheme email list in this codebase).

## Architecture

New scheduled Cloud Function in `functions/index.js`, following the two existing patterns already
in that file:

- **Scheduling** — `onSchedule` exactly like `scheduledFirestoreBackup` (`functions/index.js:1101`):
  ```js
  exports.sendA66DailyCCTVUptimeReport = onSchedule(
    { schedule: "0 9 * * *", timezone: "Europe/London", region: "europe-west2", secrets: [smtpPass] },
    async () => { ... }
  );
  ```
- **PDF + email** — same pdfkit-buffer-then-nodemailer-attachment pattern as
  `generateIncidentPDF` (`functions/index.js:36`) and `sendIncidentAlertNotification`
  (`functions/index.js:360`): build the PDF into a `Buffer` via a promise wrapping
  `PDFDocument`/`doc.on("end")`, then `nodemailer.createTransport({ service: "gmail", auth: { user:
  SMTP_USER, pass: smtpPass.value() } })` and `transporter.sendMail({ ..., attachments: [{ filename,
  content: pdfBuffer }] })`.

This keeps the new function self-contained and consistent with the codebase's existing convention
of duplicating report-generation logic per Cloud Function rather than sharing modules across the
frontend (ESM/Vite) and `functions/` (CommonJS) boundary — the same reason `generateIncidentPDF`
already mirrors `pdfGenerator.js` instead of importing it.

## Data aggregation (ported server-side)

A new local helper in `functions/index.js`, `computeA66UptimeReport()`, mirrors the math in
`getCCTVUptimeData` (`src/services/clientDataService.js:2356-2481`) but fixed to a 24h window and
using the Admin SDK instead of the client SDK:

1. Camera list: the 20 real cameras for `A66-WJ` (`CAM 1`..`CAM 20`), ported as a local constant —
   same mirroring convention as the PDF layout, since `functions/` can't import the frontend's ES
   module `schemes.js` directly. (`"All Working Correctly"` is excluded, matching
   `clientDataService.js:2412`'s filter.)
2. Query: `cctvFaultsReports` where `schemeIds array-contains "A66-WJ"` and `createdAt >= (now -
   24h)`, via `admin.firestore()`. No 500-doc cap is needed here (unlike the dashboard's 500-doc
   safety limit for up to 90 days) since 24h of fault volume is inherently small, but the same cap
   is kept for parity/safety.
3. Per camera, accumulate exactly as `clientDataService.js:2418-2438` does:
   - `status === "live"` → still-open fault: downtime = `now - createdAt`, `outages += 1`.
   - `status === "completed"` → downtime = `completedAt - createdAt`, `outages += 1`.
   - Additionally (new, not in the dashboard version): collect each fault's `referenceId` and
     `status` per camera, so the report can show **which** fault(s) affected a camera, not just a
     downtime number.
4. Derive per camera: `uptimePct` (`(periodMs - totalDownMs) / periodMs`, clamped 0–100),
   `downMins`, `outages`, `mttrMins` (`totalDownMs / outages`, only when `outages > 0`) — same
   formulas as `clientDataService.js:2440-2458`, with `periodMs` fixed to `24 * 60 * 60 * 1000`.
5. Totals: `avgUptimePct`, `totalOutages`, `avgMttrMins`, `liveFaults` — same reduction as
   `clientDataService.js:2462-2475`.
6. No write to `cctvUptimeCache` — that cache is for the client dashboard's read path; this job has
   its own 24h cadence and doesn't need it.

## PDF content

Full 20-camera table every send (not just faulted cameras), reusing the visual language already
established in `generateIncidentPDF` (TEAL `#00BAA8` section bars, A4/mm-to-pt layout, page-break at
y > 270 per `functions/index.js` and `pdfGenerator.js:194-231`):

1. **Header** — logo (reuse the existing embedded `LOGO_B64`) + title `"A66 - WJ Scheme 1 — CCTV
   Uptime Report"` + the 24h window as an explicit date/time range (e.g. "13 Sep 2026 09:00 – 14
   Sep 2026 09:00"), generated timestamp.
2. **Summary section** (teal section header "SUMMARY", four `addField`-style rows): Average
   Uptime %, Average Downtime %, Total Outages, Average MTTR — same four metrics as the dashboard's
   summary tiles (`CCTVUptimePage.jsx`).
3. **Per-camera table** (teal section header "PER-CAMERA BREAKDOWN"), one row per camera, columns:
   Camera | Uptime % | Downtime | Outages | MTTR | Status.
   - No fault in the window → Status = `"Online"`.
   - Fault(s) in the window → Status = `"Fault Reported (Ref: CCTV-XXX)"` using the fault's
     `referenceId`; if a camera had more than one fault in the 24h window, join reference ids with
     `", "` (e.g. `"Fault Reported (Ref: CCTV-041, CCTV-044)"`). This directly satisfies "note in
     the PDF that the fault has been reported" — every faulted camera's row is unambiguous and
     traceable back to the fault record, per your answer to use ref-id-based wording.
   - Sort order: faulted cameras first (matching the dashboard's "worst uptime first" convention at
     `clientDataService.js:2460`), then alphabetically/numerically by camera name.

## Email

- **Recipients**: new `A66_UPTIME_REPORT_RECIPIENT` constant added to `functions/emailConfig.js`,
  following the exact existing convention in that file (a plain string/array, with a comment noting
  it's a placeholder pending real WJ contacts):
  ```js
  // Placeholder recipient until real A66/WJ contacts are confirmed for this report.
  const A66_UPTIME_REPORT_RECIPIENT = "rroduot@gmail.com";
  ```
  Exported and imported into `index.js` alongside the other `emailConfig.js` constants.
- **Subject**: `"A66 CCTV Uptime Report — <24h window date>"`.
- **Body**: short plain-text/HTML summary (avg uptime %, total outages, live fault count) plus a
  note that full detail is in the attached PDF — matching the brevity of the existing blackspot
  alert email body (`functions/index.js` around line 982).
- **Attachment**: the generated PDF buffer, filename `a66-cctv-uptime-report-<YYYY-MM-DD>.pdf`.
- Sent via the same `SMTP_SENDER` / `SMTP_USER` / `smtpPass` secret already configured for every
  other email in this file — no new SMTP config needed.

## Files touched

- `functions/index.js` — new `computeA66UptimeReport()` helper, new PDF-building function (e.g.
  `generateA66UptimeReportPDF(reportData)`, mirroring `generateIncidentPDF`'s structure), new
  `exports.sendA66DailyCCTVUptimeReport` scheduled function.
- `functions/emailConfig.js` — new `A66_UPTIME_REPORT_RECIPIENT` constant, exported.

No frontend files change — this is a backend-only scheduled job with no UI surface.

## Cost & resource impact

This feature sits entirely inside existing free tiers; the estimated marginal cost is effectively
$0/month. Approximate figures below (GCP/Firebase pricing can shift — re-check the current pricing
page if this needs to be a formal budget number):

- **Firestore reads**: one query/day (`cctvFaultsReports` filtered by `schemeIds` + 24h
  `createdAt`). Firestore bills per document *returned*, so cost tracks A66's actual daily fault
  volume, not collection size. Realistic case (0–10 faults/day) ≈ 300 reads/month, a fraction of a
  cent at $0.06/100k reads. Worst case (hitting the 500-doc cap every day) ≈ 15,000 reads/month ≈
  $0.009/month.
- **Firestore writes**: none — unlike the dashboard's `getCCTVUptimeData`, this job doesn't write
  to `cctvUptimeCache`, so no added write cost or storage growth.
- **Cloud Function invocations/compute**: 30 invocations/month (once daily) against a 2M/month
  free tier; a few seconds of compute per run, well inside the free GB-seconds allowance.
- **Cloud Scheduler**: `onSchedule` provisions a Scheduler job under the hood — this becomes a
  second job in the project alongside `scheduledFirestoreBackup`. Free tier is 3 jobs *per billing
  account* (not per project), so this is free unless other Firebase/GCP projects on the same
  billing account already have scheduled jobs eating into that allowance — worth a one-time check.
- **Email**: sent via the existing `alerts@chellan.co.uk` Gmail SMTP transport, no new config. One
  extra email/day is negligible against Gmail's daily send caps (500/day regular, 2,000/day
  Workspace).
- **Storage**: the PDF is generated in memory and attached directly to the email — never written
  to Cloud Storage or Firestore, so no incremental storage cost over time.

## Out of scope

- Any other scheme getting the same report (this spec is A66-only; generalizing later is a
  separate feature if requested).
- Making the schedule, window length, or recipients admin-configurable via the UI.
- Writing to `cctvUptimeCache` or otherwise touching the existing dashboard's read/cache path.
- Automated unit tests for the new aggregation helper — `functions/` currently has no test runner
  configured (only `firebase-functions-test` as a dev dependency, unused), unlike `src/utils/`
  which has the Vitest setup CLAUDE.md describes. Adding a full test harness to `functions/` for
  one helper is out of proportion to this feature; verified manually instead (see below).

## Verification

- Manual end-to-end test before relying on the cron: temporarily add a protected `onRequest`
  wrapper (same disposable pattern already used for `backfillPureIncident`,
  `functions/index.js:1142` — a secret-key-gated HTTP endpoint, deleted after use) that calls the
  same `computeA66UptimeReport()` + PDF + send logic on demand, so the email/PDF can be triggered
  and inspected once via a browser hit before the schedule goes live.
- Confirm via Firebase Functions logs (`firebase deploy --only functions` then `npm run logs` in
  `functions/`) that the scheduled function fires at 09:00 Europe/London and completes without
  error.
- Manual inspection of one real report: verify the 24h window boundaries are correct, a
  known/seeded fault in that window shows up as "Fault Reported (Ref: ...)" on the right camera
  row, and a camera with no fault shows "Online" + 100% uptime.
- `npm run lint` (root) clean if the linter covers `functions/`; otherwise a manual read-through
  since there's no functions-specific lint script today.
