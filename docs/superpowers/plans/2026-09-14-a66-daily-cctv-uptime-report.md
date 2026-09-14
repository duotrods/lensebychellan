# A66 Daily CCTV Uptime Report Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send an automated daily email (09:00 Europe/London) to a configured recipient with a PDF "CCTV Uptime Report" for scheme A66 (`A66-WJ`), covering only the trailing 24 hours, with any camera that had a fault reported in that window clearly marked with its fault reference.

**Architecture:** A new Cloud Function in `functions/index.js` combines the existing `onSchedule` cron pattern (`scheduledFirestoreBackup`) with the existing pdfkit-buffer + nodemailer-attachment pattern (`generateIncidentPDF` / `sendIncidentAlertNotification`). It ports the uptime-aggregation math already used by the client dashboard (`getCCTVUptimeData` in `src/services/clientDataService.js`) into a server-side helper fixed to a 24h window, queried directly against `cctvFaultsReports` via the Admin SDK — no shared module, no cache writes, no frontend changes.

**Tech Stack:** Firebase Cloud Functions v2 (Node 22, CommonJS), `firebase-admin` (Firestore Admin SDK), `pdfkit`, `nodemailer` (Gmail SMTP, existing `SMTP_PASS` secret).

**Design spec:** `docs/superpowers/specs/2026-09-14-a66-daily-cctv-uptime-report-design.md`

**Note on testing:** the spec explicitly scopes out automated unit tests for the new aggregation helper — `functions/` has no test runner configured today (only an unused `firebase-functions-test` dev dependency), unlike `src/utils/`'s Vitest setup. Verification here is manual: a temporary HTTP-triggered endpoint (Task 5) lets you fire the whole pipeline on demand and inspect the real email/PDF before the cron goes live, then it's removed (Task 7).

---

### Task 1: Add the report recipient constant to `emailConfig.js`

**Files:**
- Modify: `functions/emailConfig.js`

- [ ] **Step 1: Add the constant, next to the other recipient constants**

Add this near the bottom of `functions/emailConfig.js`, just above the `SMTP_SENDER`/`SMTP_USER` block:

```js
// Recipient for the automated daily A66 CCTV uptime report.
// Placeholder until real A66/WJ contacts are confirmed for this report.
const A66_UPTIME_REPORT_RECIPIENT = "rroduot@gmail.com";
```

- [ ] **Step 2: Export it**

In the `module.exports = { ... }` block at the end of the file, add `A66_UPTIME_REPORT_RECIPIENT,` (alongside the existing entries like `WIDELOAD_REPORT_RECIPIENT,`).

- [ ] **Step 3: Commit**

```bash
git add functions/emailConfig.js
git commit -m "feat: add A66 uptime report recipient config

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Import the new constant into `index.js`

**Files:**
- Modify: `functions/index.js:9-19`

- [ ] **Step 1: Add `A66_UPTIME_REPORT_RECIPIENT` to the existing destructured require**

Current code (`functions/index.js:9-19`):

```js
const {
  INCIDENT_ALERT_RECIPIENTS,
  AVERA_REPORT_SCHEMES,
  AVERA_REPORT_RECIPIENT,
  LENSEASSIST_REPORT_RECIPIENT,
  WIDELOAD_REPORT_SCHEMES,
  WIDELOAD_REPORT_RECIPIENT,
  CCTV_FAULT_ALERT_RECIPIENTS,
  SMTP_SENDER,
  SMTP_USER,
} = require("./emailConfig");
```

Change to:

```js
const {
  INCIDENT_ALERT_RECIPIENTS,
  AVERA_REPORT_SCHEMES,
  AVERA_REPORT_RECIPIENT,
  LENSEASSIST_REPORT_RECIPIENT,
  WIDELOAD_REPORT_SCHEMES,
  WIDELOAD_REPORT_RECIPIENT,
  CCTV_FAULT_ALERT_RECIPIENTS,
  A66_UPTIME_REPORT_RECIPIENT,
  SMTP_SENDER,
  SMTP_USER,
} = require("./emailConfig");
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "feat: import A66 uptime report recipient in index.js

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Add the `computeA66UptimeReport()` aggregation helper

**Files:**
- Modify: `functions/index.js` (add after `scheduledFirestoreBackup`, i.e. after line 1137's closing `);`, before the commented-out `backfillPureIncident` block)
- Test: none (manual verification in Task 6 — see "Note on testing" above)

This ports the math from `getCCTVUptimeData` (`src/services/clientDataService.js:2356-2481`), fixed to a 24h window, using the Admin SDK.

- [ ] **Step 1: Add the scheme/camera constants and the helper function**

Insert this block right after the `scheduledFirestoreBackup` function's closing `);` (currently ending at `functions/index.js:1137`):

```js
// ─── A66 daily CCTV uptime report ──────────────────────────────────────────

const A66_SCHEME_ID = "A66-WJ";
// Mirrors the camera list for A66-WJ in src/utils/schemes.js (THIRD_PARTY_SCHEMES).
// Duplicated here (not imported) since functions/ is CommonJS and can't import
// the frontend's ES module — same convention as generateIncidentPDF mirroring
// pdfGenerator.js.
const A66_CAMERAS = Array.from({ length: 20 }, (_, i) => `CAM ${i + 1}`);

/**
 * Aggregates A66's CCTV fault reports over the trailing 24 hours into
 * per-camera uptime stats, mirroring the math in getCCTVUptimeData
 * (src/services/clientDataService.js) but fixed to a 24h window and using
 * the Admin SDK. Returns fault reference ids per camera so the PDF can mark
 * exactly which fault(s) affected it.
 */
async function computeA66UptimeReport() {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
  const periodMs = windowEnd.getTime() - windowStart.getTime();

  const snap = await admin
    .firestore()
    .collection("cctvFaultsReports")
    .where("schemeIds", "array-contains", A66_SCHEME_ID)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(windowStart))
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();

  const cameraMap = {};
  for (const cam of A66_CAMERAS) {
    cameraMap[cam] = { outages: 0, totalDownMs: 0, liveFault: false, faultRefs: [] };
  }

  const now = Date.now();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const cam = data.camera || "Unknown";
    if (!cameraMap[cam]) {
      cameraMap[cam] = { outages: 0, totalDownMs: 0, liveFault: false, faultRefs: [] };
    }

    if (data.status === "live") {
      cameraMap[cam].liveFault = true;
      const downMs = now - (data.createdAt?.toMillis?.() || now);
      cameraMap[cam].totalDownMs += downMs;
      cameraMap[cam].outages += 1;
      if (data.referenceId) cameraMap[cam].faultRefs.push(data.referenceId);
    } else if (data.status === "completed" && data.completedAt && data.createdAt) {
      const downMs = data.completedAt.toMillis() - data.createdAt.toMillis();
      if (downMs > 0) {
        cameraMap[cam].totalDownMs += downMs;
        cameraMap[cam].outages += 1;
      }
      if (data.referenceId) cameraMap[cam].faultRefs.push(data.referenceId);
    }
  }

  const cameras = Object.entries(cameraMap).map(([name, stats]) => {
    const downMins = Math.round(stats.totalDownMs / 60000);
    const uptimePct = Math.max(
      0,
      Math.min(100, ((periodMs - stats.totalDownMs) / periodMs) * 100),
    );
    const mttrMins =
      stats.outages > 0 ? Math.round(stats.totalDownMs / stats.outages / 60000) : null;
    return {
      name,
      uptimePct: parseFloat(uptimePct.toFixed(1)),
      downMins,
      outages: stats.outages,
      mttrMins,
      liveFault: stats.liveFault,
      faultRefs: stats.faultRefs,
    };
  });

  // Faulted cameras first (worst first, matching the dashboard's convention),
  // then numerically by camera number.
  cameras.sort((a, b) => {
    const aFaulted = a.faultRefs.length > 0;
    const bFaulted = b.faultRefs.length > 0;
    if (aFaulted !== bFaulted) return aFaulted ? -1 : 1;
    const aNum = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
    const bNum = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
    return aNum - bNum;
  });

  const withMttr = cameras.filter((c) => c.mttrMins !== null);
  const totals = {
    avgUptimePct: cameras.length
      ? parseFloat((cameras.reduce((s, c) => s + c.uptimePct, 0) / cameras.length).toFixed(1))
      : 100,
    totalOutages: cameras.reduce((s, c) => s + c.outages, 0),
    avgMttrMins: withMttr.length
      ? Math.round(withMttr.reduce((s, c) => s + c.mttrMins, 0) / withMttr.length)
      : null,
    liveFaults: cameras.filter((c) => c.liveFault).length,
  };

  return { windowStart, windowEnd, cameras, totals };
}
```

- [ ] **Step 2: Sanity-check the file still parses**

Run: `cd functions && node -e "require('./index.js')"`
Expected: no syntax errors printed (it will fail at runtime trying to reach Firebase Admin's default credentials in a bare `node -e` — that's fine and expected; a `SyntaxError` or `ReferenceError` is what you're checking for, not full success).

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat: add computeA66UptimeReport aggregation helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Add the `generateA66UptimeReportPDF()` PDF builder

**Files:**
- Modify: `functions/index.js` (add directly after the `computeA66UptimeReport` function from Task 3)
- Test: none (manual verification in Task 6)

Mirrors the visual style of `generateIncidentPDF` (`functions/index.js:36-303`): same A4/mm-to-pt layout, same header/logo, same teal section-header and label/value helpers, duplicated locally rather than shared (matching that function's own self-contained style).

- [ ] **Step 1: Add the function**

```js
/**
 * Generates a PDF buffer for the A66 daily CCTV uptime report using pdfkit.
 * Visual style mirrors generateIncidentPDF (header/logo, teal section
 * headers, label/value rows) but with a per-camera table instead of
 * incident fields.
 */
function generateA66UptimeReportPDF(reportData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
    });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const MM = 2.8346;
    const PW = 595.28;
    const PH = 841.89;
    const M = 20 * MM;
    const CW = PW - M * 2;
    const TEAL = "#00BAA8";

    const now = new Date();
    const genDate = now.toLocaleDateString("en-GB");
    const genTime = now.toLocaleTimeString("en-GB");
    const fmtRange = (d) =>
      `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

    let y = 50 * MM;
    doc.on("pageAdded", () => {
      y = 20 * MM;
      doc.y = y;
    });
    const sync = () => {
      doc.y = y;
    };
    const checkBreak = (neededMM = 14) => {
      if (y + neededMM * MM > PH - 15 * MM) {
        doc.addPage();
        y = 20 * MM;
        doc.y = y;
      }
    };

    // ── HEADER ──
    doc.rect(0, 0, PW, 40 * MM).fill("#FFFFFF");
    const logoW = 50 * MM;
    const logoH = 25 * MM;
    const logoX = (PW - logoW) / 2;
    try {
      doc.image(Buffer.from(LOGO_B64, "base64"), logoX, 5 * MM, {
        width: logoW,
        height: logoH,
      });
    } catch {
      // fallback — white space only
    }
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("LENSE BY CHELLAN", 0, 35 * MM, { align: "center", width: PW, lineBreak: false });

    // ── TITLE BANNER ──
    doc.rect(M, y - 5 * MM, CW, 12 * MM).fill("#F0F0F0");
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("A66 - WJ Scheme 1 — CCTV Uptime Report", M + 5 * MM, y + 1 * MM, {
        width: CW,
        lineBreak: false,
      });
    y += 15 * MM;
    sync();

    doc
      .fontSize(10)
      .fillColor("#646464")
      .font("Helvetica")
      .text(
        `Report Window: ${fmtRange(reportData.windowStart)} - ${fmtRange(reportData.windowEnd)}`,
        M,
        y,
        { lineBreak: false },
      );
    y += 6 * MM;
    sync();

    doc
      .fontSize(9)
      .fillColor("#787878")
      .font("Helvetica")
      .text(`Generated: ${genDate} at ${genTime}`, M, y, { lineBreak: false });
    y += 10 * MM;
    sync();

    doc.moveTo(M, y).lineTo(PW - M, y).strokeColor(TEAL).lineWidth(0.5).stroke();
    y += 12 * MM;
    sync();

    // ── HELPERS ──
    const addSectionHeader = (title) => {
      checkBreak(14);
      doc.rect(M, y - 2 * MM, CW, 8 * MM).fill(TEAL);
      doc
        .fontSize(10)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(title, M + 3 * MM, y + 2 * MM, { width: CW - 6 * MM, lineBreak: false });
      y += 12 * MM;
      sync();
      doc.fillColor("#000000");
    };

    const addField = (label, value) => {
      if (value === undefined || value === null || value === "") return;
      checkBreak(7);
      const rowY = y;
      doc
        .fontSize(10)
        .fillColor("#3C3C3C")
        .font("Helvetica-Bold")
        .text(`${label}:`, M, rowY, { width: 49 * MM, lineBreak: false });
      doc
        .font("Helvetica")
        .fillColor("#000000")
        .text(value.toString(), M + 50 * MM, rowY, { width: CW - 50 * MM });
      y = Math.max(doc.y, rowY + 7 * MM) + 0.5 * MM;
      sync();
    };

    // ── SUMMARY ──
    addSectionHeader("SUMMARY");
    addField("Average Uptime", `${reportData.totals.avgUptimePct}%`);
    addField("Average Downtime", `${(100 - reportData.totals.avgUptimePct).toFixed(1)}%`);
    addField("Total Outages", reportData.totals.totalOutages);
    addField(
      "Average MTTR",
      reportData.totals.avgMttrMins !== null ? `${reportData.totals.avgMttrMins} mins` : "N/A",
    );
    y += 3 * MM;
    sync();

    // ── PER-CAMERA BREAKDOWN ──
    addSectionHeader("PER-CAMERA BREAKDOWN");

    const cols = [
      { label: "Camera", x: 0, width: 65 },
      { label: "Uptime %", x: 65, width: 55 },
      { label: "Downtime", x: 120, width: 65 },
      { label: "Outages", x: 185, width: 50 },
      { label: "MTTR", x: 235, width: 50 },
      { label: "Status", x: 285, width: CW - 285 },
    ];

    checkBreak(8);
    doc.fontSize(9).fillColor("#3C3C3C").font("Helvetica-Bold");
    cols.forEach((c) => {
      doc.text(c.label, M + c.x, y, { width: c.width, lineBreak: false });
    });
    y += 7 * MM;
    sync();
    doc.moveTo(M, y - 1 * MM).lineTo(PW - M, y - 1 * MM).strokeColor("#C8C8C8").lineWidth(0.3).stroke();

    doc.font("Helvetica").fillColor("#000000");
    reportData.cameras.forEach((cam) => {
      checkBreak(7);
      const rowY = y;
      const status =
        cam.faultRefs.length > 0
          ? `Fault Reported (Ref: ${cam.faultRefs.join(", ")})`
          : "Online";

      doc.fontSize(9).fillColor("#000000");
      doc.text(cam.name, M + cols[0].x, rowY, { width: cols[0].width, lineBreak: false });
      doc.text(`${cam.uptimePct}%`, M + cols[1].x, rowY, { width: cols[1].width, lineBreak: false });
      doc.text(`${cam.downMins}m`, M + cols[2].x, rowY, { width: cols[2].width, lineBreak: false });
      doc.text(String(cam.outages), M + cols[3].x, rowY, { width: cols[3].width, lineBreak: false });
      doc.text(cam.mttrMins !== null ? `${cam.mttrMins}m` : "-", M + cols[4].x, rowY, {
        width: cols[4].width,
        lineBreak: false,
      });
      doc
        .fillColor(cam.faultRefs.length > 0 ? "#B91C1C" : "#15803D")
        .text(status, M + cols[5].x, rowY, { width: cols[5].width });
      doc.fillColor("#000000");

      y = Math.max(doc.y, rowY + 7 * MM) + 0.5 * MM;
      sync();
    });

    // ── FOOTER on every page ──
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      doc
        .moveTo(M, PH - 10 * MM)
        .lineTo(PW - M, PH - 10 * MM)
        .strokeColor("#C8C8C8")
        .lineWidth(0.3)
        .stroke();
      doc
        .fontSize(8)
        .fillColor("#808080")
        .font("Helvetica")
        .text(`Generated on ${genDate} at ${genTime}`, M, PH - 7 * MM, {
          width: CW / 2,
          lineBreak: false,
        });
      doc.text(`Page ${i + 1} of ${totalPages}`, M + CW / 2, PH - 7 * MM, {
        align: "right",
        width: CW / 2,
        lineBreak: false,
      });
    }

    doc.end();
  });
}
```

- [ ] **Step 2: Sanity-check the file still parses**

Run: `cd functions && node -e "require('./index.js')"`
Expected: no `SyntaxError`/`ReferenceError`.

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat: add generateA66UptimeReportPDF PDF builder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Add the scheduled function and a temporary manual-trigger endpoint

**Files:**
- Modify: `functions/index.js` (add directly after `generateA66UptimeReportPDF` from Task 4)

- [ ] **Step 1: Add the email-sending helper, the scheduled export, and the temporary manual trigger**

```js
/**
 * Builds and sends the A66 daily CCTV uptime report email (PDF attached).
 * Shared by the scheduled function and the temporary manual-trigger endpoint
 * below so both paths are guaranteed to behave identically.
 */
async function sendA66UptimeReportEmail() {
  const reportData = await computeA66UptimeReport();
  const pdfBuffer = await generateA66UptimeReportPDF(reportData);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: smtpPass.value(),
    },
  });

  const dateStr = reportData.windowEnd.toISOString().slice(0, 10);
  const pdfFilename = `a66-cctv-uptime-report-${dateStr}.pdf`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #00BAA8; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">A66 CCTV Uptime Report</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Last 24 hours</p>
      </div>
      <div style="padding: 20px; background-color: #f9fafb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Average Uptime:</td>
            <td style="padding: 8px 0; color: #111827;">${reportData.totals.avgUptimePct}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Total Outages:</td>
            <td style="padding: 8px 0; color: #111827;">${reportData.totals.totalOutages}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Live Faults:</td>
            <td style="padding: 8px 0; color: #111827;">${reportData.totals.liveFaults}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #6b7280; font-size: 13px;">
          Full per-camera breakdown is attached as a PDF.
        </p>
      </div>
      <div style="background-color: #374151; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">This is an automated notification from LENSE by Chellan</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: SMTP_SENDER,
    to: A66_UPTIME_REPORT_RECIPIENT,
    subject: `A66 CCTV Uptime Report - ${dateStr}`,
    html: emailHtml,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  console.log(`A66 daily CCTV uptime report sent for ${dateStr}`);
  return reportData;
}

exports.sendA66DailyCCTVUptimeReport = onSchedule(
  {
    schedule: "0 9 * * *",
    timezone: "Europe/London",
    region: "europe-west2",
    secrets: [smtpPass],
  },
  async () => {
    await sendA66UptimeReportEmail();
  },
);

// ─── TEMPORARY: manual trigger for verifying the A66 uptime report ─────────
// Hit once via browser/curl with ?key=..., inspect the email/PDF, then
// DELETE this exports.triggerA66UptimeReportManually block (see Task 7).
exports.triggerA66UptimeReportManually = onRequest(
  { secrets: [smtpPass] },
  async (req, res) => {
    const SECRET = "a66-uptime-verify-2026";
    if (req.query.key !== SECRET) {
      res.status(403).send("Forbidden");
      return;
    }
    try {
      const reportData = await sendA66UptimeReportEmail();
      res
        .status(200)
        .send(
          `Sent. Avg uptime ${reportData.totals.avgUptimePct}%, outages ${reportData.totals.totalOutages}, live faults ${reportData.totals.liveFaults}`,
        );
    } catch (err) {
      console.error("Manual A66 uptime report trigger failed:", err);
      res.status(500).send(String(err));
    }
  },
);
```

- [ ] **Step 2: Sanity-check the file still parses**

Run: `cd functions && node -e "require('./index.js')"`
Expected: no `SyntaxError`/`ReferenceError`.

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat: add A66 daily uptime report scheduled function + manual trigger for verification

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Deploy and manually verify end-to-end

**Files:** none (deployment + manual verification only)

- [ ] **Step 1: Confirm with the user before deploying**

Per standing project practice, confirm the deploy target (Firebase project alias) and get explicit
go-ahead before running any `firebase deploy`, even to a staging/testing project. Check
`.firebaserc` for available aliases and ask the user which to use if more than one exists.

- [ ] **Step 2: Deploy only the functions**

Run: `firebase deploy --only functions` (from the repo root, or `cd functions` first per that
project's own convention — check `firebase.json`'s functions `source` field if unsure).
Expected: deploy succeeds and lists `sendA66DailyCCTVUptimeReport` and
`triggerA66UptimeReportManually` as new functions.

- [ ] **Step 3: Trigger the manual endpoint**

Get the deployed URL for `triggerA66UptimeReportManually` from the deploy output (or the Firebase
console), then:

```bash
curl "https://<region>-<project>.cloudfunctions.net/triggerA66UptimeReportManually?key=a66-uptime-verify-2026"
```

Expected: HTTP 200 with a body like `Sent. Avg uptime 100%, outages 0, live faults 0` (or nonzero
numbers if A66 has a real fault in the last 24h at the time of testing).

- [ ] **Step 4: Inspect the received email**

Check the inbox for `A66_UPTIME_REPORT_RECIPIENT` (`rroduot@gmail.com`). Confirm:
- Subject and HTML summary match the totals from Step 3.
- The attached PDF opens and shows the LENSE header, the correct 24h window in "Report Window",
  the SUMMARY section, and all 20 cameras listed in PER-CAMERA BREAKDOWN.
- If A66 has no faults in the last 24h at test time, every camera shows "Online" and 100% uptime —
  to verify the fault-marking path, either wait for/seed a real `cctvFaultsReports` doc for
  `A66-WJ` with a `createdAt` inside the last 24h, or temporarily point the Firestore query at a
  wider test window and confirm a known past fault renders as
  `Fault Reported (Ref: <its referenceId>)` on the correct camera row.

- [ ] **Step 5: Confirm the schedule registered correctly**

In the Firebase console (Cloud Scheduler section, or `gcloud scheduler jobs list`), confirm a job
exists for `sendA66DailyCCTVUptimeReport` set to `0 9 * * *` in `Europe/London`.

---

### Task 7: Remove the temporary manual-trigger endpoint

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Delete the `triggerA66UptimeReportManually` export**

Remove the entire `exports.triggerA66UptimeReportManually = onRequest(...)` block added in Task 5
(including its `// ─── TEMPORARY ...` comment), now that Task 6 has confirmed the pipeline works.
Leave `sendA66UptimeReportEmail`, `computeA66UptimeReport`, `generateA66UptimeReportPDF`, and
`exports.sendA66DailyCCTVUptimeReport` in place — only the disposable HTTP endpoint goes.

- [ ] **Step 2: Sanity-check the file still parses**

Run: `cd functions && node -e "require('./index.js')"`
Expected: no `SyntaxError`/`ReferenceError`.

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "chore: remove temporary A66 uptime report manual-trigger endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Confirm with the user before redeploying**

Same as Task 6 Step 1 — confirm target project before running `firebase deploy --only functions`
again to remove `triggerA66UptimeReportManually` from the live project (it stays deployed until a
fresh deploy omits it).

- [ ] **Step 5: Redeploy**

Run: `firebase deploy --only functions`
Expected: deploy succeeds; `triggerA66UptimeReportManually` no longer appears in the function list;
`sendA66DailyCCTVUptimeReport` remains and keeps its existing Cloud Scheduler job untouched.

---

## Post-implementation note

`A66_UPTIME_REPORT_RECIPIENT` in `functions/emailConfig.js` is a placeholder
(`rroduot@gmail.com`). Swap it for the real WJ/client contact list once confirmed — a one-line
change, same as every other recipient constant in that file.
