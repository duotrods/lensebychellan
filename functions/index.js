/* eslint-disable no-undef */
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const {
  INCIDENT_ALERT_RECIPIENTS,
  SMTP_SENDER,
  SMTP_USER,
} = require("./emailConfig");

admin.initializeApp();

const smtpPass = defineSecret("SMTP_PASS");

// Logo embedded as base64 so the Cloud Function doesn't need file system access
const fs = require("fs");
const path = require("path");
const LOGO_B64 = fs.readFileSync(path.join(__dirname, "chellanpng.png")).toString("base64");

const BASE_URL = (process.env.INCIDENT_BASE_URL || "http://localhost:5173").replace(/\/+$/, "");

/**
 * Generates a PDF buffer for an incident report using pdfkit.
 * Layout mirrors the frontend jsPDF version in pdfGenerator.js.
 */
function generateIncidentPDF(report) {
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

    // All measurements in mm converted to points (1mm = 2.8346pt) to exactly match jsPDF frontend
    const MM = 2.8346;
    const PW = 595.28;
    const PH = 841.89;
    const M = 20 * MM;   // 20mm margin = 56.7pt
    const CW = PW - M * 2;
    const TEAL = "#00BAA8";

    const now = new Date();
    const genDate = now.toLocaleDateString("en-GB");
    const genTime = now.toLocaleTimeString("en-GB");

    // yPosition starts at 50mm (matching jsPDF yPosition = 50 after header)
    let y = 50 * MM;

    doc.on("pageAdded", () => {
      y = 20 * MM;
      doc.y = y;
    });

    const sync = () => { doc.y = y; };

    const checkBreak = (neededMM = 14) => {
      if (y + neededMM * MM > PH - 15 * MM) {
        doc.addPage();
        y = 20 * MM;
        doc.y = y;
      }
    };

    // ── HEADER ── exact match to jsPDF frontend ──────────────────────────────
    // Frontend: white rect height=40mm, logo 50×25mm centered at y=5mm,
    // "LENSE BY CHELLAN" bold 14pt at y=35mm, then yPosition=50mm
    doc.rect(0, 0, PW, 40 * MM).fill("#FFFFFF");

    const logoW = 50 * MM;   // 50mm
    const logoH = 25 * MM;   // 25mm
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

    // ── REPORT TITLE BANNER ── matches frontend exactly ──────────────────────
    // Frontend: doc.setFillColor(240,240,240); doc.rect(margin, yPosition-5, contentWidth, 12, "F")
    // doc.text("Incident Report", margin+5, yPosition+3, fontSize=14 bold); yPosition+=15
    doc.rect(M, y - 5 * MM, CW, 12 * MM).fill("#F0F0F0");
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Incident Report", M + 5 * MM, y + 1 * MM, { width: CW, lineBreak: false });
    y += 15 * MM;
    sync();

    // Reference number
    if (report.referenceId) {
      doc
        .fontSize(10)
        .fillColor("#646464")
        .font("Helvetica")
        .text(`Reference Number: ${report.referenceId}`, M, y, { lineBreak: false });
      y += 6 * MM;
      sync();
    }

    // Generated timestamp
    doc
      .fontSize(9)
      .fillColor("#787878")
      .font("Helvetica")
      .text(`Generated: ${genDate} at ${genTime}`, M, y, { lineBreak: false });
    y += 10 * MM;
    sync();

    // Teal divider
    doc.moveTo(M, y).lineTo(PW - M, y).strokeColor(TEAL).lineWidth(0.5).stroke();
    y += 12 * MM;
    sync();

    // ── HELPERS ──────────────────────────────────────────────────────────────
    const addSectionHeader = (title) => {
      checkBreak(14);
      // Frontend: rect at yPosition-2, height 8, teal; text at margin+3, yPosition+4; y+=12
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
      // Frontend: label at margin, value at margin+50mm; label width = 49mm, value width = contentWidth-50mm
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

    // ── BASIC INFORMATION ────────────────────────────────────────────────────
    addSectionHeader("BASIC INFORMATION");
    addField("Report Date", report.date || "N/A");
    addField("Time Spotted", report.timeSpotted || "N/A");
    addField("Scheme/Location", report.scheme || "N/A");
    y += 3 * MM;
    sync();

    // ── REPORT DETAILS ───────────────────────────────────────────────────────
    addSectionHeader("REPORT DETAILS");
    if (report.section) addField("Section", report.section);
    if (report.weatherConditions)
      addField("Weather Conditions", report.weatherConditions);
    if (report.trafficConditions)
      addField("Traffic Conditions", report.trafficConditions);
    if (report.nhLog) addField("NH Log", report.nhLog);
    if (report.collarNumber) addField("Collar Number", report.collarNumber);
    addField("Incursion", report.incursion || "NO");
    addField("Asset Damage?", report.propertyDamage ? "Yes" : "No");
    if (report.propertyDamage && report.assetType)
      addField("Asset Type", report.assetType);
    if (report.propertyDamage && report.damageType)
      addField("Damage Type", report.damageType);
    if (report.reportedBy) addField("Reported By", report.reportedBy);
    if (report.cameraNumber) addField("Camera Number", report.cameraNumber);
    if (report.markerPost) addField("Marker Post", report.markerPost);
    if (report.track) addField("Track", report.track);
    if (report.incidentType) addField("Incident Type", report.incidentType);
    if (report.fault) addField("Fault", report.fault);
    if (report.affectedLanes && report.affectedLanes.length > 0) {
      addField("Affected Lanes", report.affectedLanes.join(", "));
    }
    if (report.emergencyServices && report.emergencyServices.length > 0) {
      addField("Emergency Services", report.emergencyServices.join(", "));
    }
    if (report.recoveryRequested) {
      const r = report.recoveryRequested;
      const parts = [];
      if (r.light) parts.push(`Light: ${r.light}`);
      if (r.heavy) parts.push(`Heavy: ${r.heavy}`);
      if (r.ipv) parts.push(`IPV: ${r.ipv}`);
      if (r.hetos) parts.push(`HETOS: ${r.hetos}`);
      if (parts.length > 0) addField("Recovery Requested", parts.join(", "));
    }
    y += 3 * MM;
    sync();

    // ── TIME INFORMATION ─────────────────────────────────────────────────────
    addSectionHeader("TIME INFORMATION");
    if (report.timeSpotted) addField("Time Spotted", report.timeSpotted);
    if (report.timeOnSite) addField("Time On Site", report.timeOnSite);
    if (report.timeCleared) addField("Time Cleared", report.timeCleared);
    if (report.closedLogCollar)
      addField("Closed Log Collar Number", report.closedLogCollar);
    y += 3 * MM;
    sync();

    // ── VEHICLES INVOLVED ────────────────────────────────────────────────────
    if (
      report.vehicles &&
      report.vehicles.some((v) => v.type || v.make || v.model || v.vin)
    ) {
      addSectionHeader("VEHICLES INVOLVED");
      report.vehicles.forEach((v, i) => {
        if (v.type || v.make || v.model || v.vin) {
          const vehicleStr = [v.type, v.make, v.model, v.vin]
            .filter(Boolean)
            .join(" | ");
          addField(`Vehicle ${i + 1}`, vehicleStr);
        }
      });
      y += 3 * MM;
      sync();
    }

    // ── DESCRIPTION ──────────────────────────────────────────────────────────
    if (report.description) {
      addSectionHeader("DESCRIPTION");
      checkBreak(10);
      doc
        .fontSize(10)
        .fillColor("#000000")
        .font("Helvetica")
        .text(report.description, M, y, { width: CW });
      y = doc.y + 8 * MM;
      sync();
    }

    // ── REPORT INFORMATION ───────────────────────────────────────────────────
    y += 5 * MM;
    addSectionHeader("REPORT INFORMATION");
    const submitter =
      report.submittedBy?.name ||
      report.submittedBy ||
      report.firstName ||
      "N/A";
    addField("Submitted By", submitter);
    if (report.lastEditedBy?.name)
      addField("Last Edited By", report.lastEditedBy.name);

    // ── FOOTER on every page ─────────────────────────────────────────────────
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

/**
 * Returns the list of recipients for a given scheme name.
 */
function getRecipientsForScheme(scheme) {
  return (
    INCIDENT_ALERT_RECIPIENTS[scheme] ||
    INCIDENT_ALERT_RECIPIENTS["default"] ||
    []
  );
}

/**
 * Callable function to send alert emails when an incident report contains
 * an incursion (YES) or asset damage. Includes a PDF attachment matching the
 * frontend report layout. Recipients are hardcoded per scheme, server-side only.
 */
exports.sendIncidentAlertNotification = onCall(
  { secrets: [smtpPass] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to send notifications",
      );
    }

    const { reportData, isUpdate } = request.data;

    if (!reportData) {
      throw new HttpsError("invalid-argument", "Report data is required");
    }

    const hasIncursion = reportData.incursion === "YES";
    const hasAssetDamage = reportData.propertyDamage === true;

    if (!hasIncursion && !hasAssetDamage) {
      return {
        success: true,
        message: "No alert triggers present",
        emailsSent: 0,
      };
    }

    const triggers = [];
    if (hasIncursion) triggers.push("Incursion");
    if (hasAssetDamage) triggers.push("Asset Damage");
    const triggerLabel = triggers.join(" & ");

    const scheme = reportData.scheme || "Unknown Scheme";
    const recipients = getRecipientsForScheme(scheme);

    if (recipients.length === 0) {
      console.log(`No recipients configured for scheme: ${scheme}`);
      return {
        success: true,
        message: "No recipients configured for this scheme",
        emailsSent: 0,
      };
    }

    // Generate PDF attachment
    const pdfBuffer = await generateIncidentPDF({
      ...reportData,
      submittedBy: reportData.submittedBy || request.auth.token?.name || "N/A",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_USER,
        pass: smtpPass.value(),
      },
    });

    const reportLink = reportData.id
      ? `${BASE_URL}/dashboard/client/reports/incident/${reportData.id}`
      : null;

    const subject = `${isUpdate ? "[UPDATED] " : ""}ALERT: ${triggerLabel} — ${scheme} — ${reportData.referenceId || "New Report"}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Incident Alert</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px;">${triggerLabel} Reported</p>
        </div>

        <div style="padding: 20px; background-color: #f9fafb;">
          <div style="padding: 12px; background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 20px;">
            <strong style="color: #991b1b;">Triggers:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #991b1b;">
              ${hasIncursion ? "<li>Incursion: YES</li>" : ""}
              ${hasAssetDamage ? `<li>Asset Damage: ${reportData.assetType || "N/A"} — ${reportData.damageType || "N/A"}</li>` : ""}
            </ul>
          </div>

          <h2 style="color: #374151; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
            Incident Details
          </h2>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Reference ID:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.referenceId || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Scheme:</td>
              <td style="padding: 8px 0; color: #111827;">${scheme}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Section:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.section || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Marker Post:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.markerPost || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Incident Type:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.incidentType || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">NH Log:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.nhLog || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Submitted By:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.submittedBy || "N/A"}</td>
            </tr>
          </table>

          ${reportData.description
        ? `
          <h3 style="color: #374151; margin-top: 20px;">Description</h3>
          <p style="background-color: white; padding: 15px; border-radius: 8px; color: #374151;">
            ${reportData.description}
          </p>`
        : ""
      }

          ${reportLink ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${reportLink}"
               style="background-color: #00BAA8; color: white; padding: 12px 28px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;
                      font-size: 14px; display: inline-block;">
              View Full Report
            </a>
            <p style="margin-top: 8px; color: #6b7280; font-size: 12px;">
              You may need to log in to view the report.
            </p>
          </div>` : ""}

          <p style="margin-top: 20px; color: #6b7280; font-size: 13px;">
            The full incident report is attached as a PDF.
          </p>
        </div>

        <div style="background-color: #374151; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated alert from LENSE by Chellan</p>
        </div>
      </div>
    `;

    const pdfFilename = `incident-report-${reportData.referenceId || Date.now()}.pdf`;

    const emailPromises = recipients.map((recipient) =>
      transporter
        .sendMail({
          from: SMTP_SENDER,
          to: recipient,
          subject,
          html: htmlContent,
          attachments: [
            {
              filename: pdfFilename,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        })
        .then(() => {
          console.log(`Incident alert sent to ${recipient} (${scheme})`);
        })
        .catch((err) => {
          console.error(`Failed to send incident alert to ${recipient}:`, err);
        }),
    );

    await Promise.all(emailPromises);

    await admin
      .firestore()
      .collection("emailLogs")
      .add({
        reportType: "incident-alert",
        reportId: reportData.id || null,
        referenceId: reportData.referenceId || null,
        scheme,
        triggers,
        recipients,
        isUpdate: isUpdate || false,
        sentBy: request.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      message: `Incident alert sent for: ${triggerLabel}`,
      emailsSent: recipients.length,
    };
  },
);

/**
 * Callable function to delete a user from both Authentication and Firestore.
 * Can only be called by authenticated admin users.
 */
exports.deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to call this function",
    );
  }

  const { targetUid } = request.data;
  const callerUid = request.auth.uid;

  try {
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(callerUid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can delete users");
    }

    const targetUserDoc = await admin
      .firestore()
      .collection("users")
      .doc(targetUid)
      .get();

    if (!targetUserDoc.exists) {
      throw new HttpsError("not-found", "Target user not found in Firestore");
    }

    const targetUserData = targetUserDoc.data();

    if (targetUserData.role === "admin") {
      throw new HttpsError("permission-denied", "Cannot delete admin users");
    }

    if (targetUid === callerUid) {
      throw new HttpsError("invalid-argument", "Cannot delete yourself");
    }

    await admin
      .firestore()
      .collection("auditLogs")
      .add({
        action: "user_deleted",
        performedBy: callerUid,
        targetUser: targetUid,
        deletedUserData: {
          email: targetUserData.email,
          displayName: targetUserData.displayName,
          role: targetUserData.role,
          company: targetUserData.company,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    try {
      await admin.auth().deleteUser(targetUid);
      console.log(`Successfully deleted auth user: ${targetUid}`);
    } catch (authError) {
      console.error("Error deleting from Auth:", authError);
      if (authError.code !== "auth/user-not-found") {
        throw authError;
      }
    }

    await admin.firestore().collection("users").doc(targetUid).delete();
    console.log(`Successfully deleted user document: ${targetUid}`);

    return {
      success: true,
      message: `User ${targetUserData.displayName} has been completely deleted`,
    };
  } catch (error) {
    console.error("Delete user error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Failed to delete user: ${error.message}`);
  }
});

//Back up schedule every 6 hours at minute 0
exports.scheduledFirestoreBackup = onSchedule(
  {
    schedule: "0 */6 * * *",
    timezone: "Europe/London",
    region: "europe-west2"
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 13).replace("T", "/"); 
    const outputUri = `gs://${projectId}-firestore-backups/backup-${timestamp}`;

    const tokenRes = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    const { access_token } = await tokenRes.json();

    const exportRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ outputUriPrefix: outputUri }),
      }
    );

    if (!exportRes.ok) {
      const err = await exportRes.text();
      throw new Error(`Firestore export failed: ${exportRes.status} ${err}`);
    }
    console.log(`Firestore backup successful: ${outputUri}`);
  }
);
// ─── One-time backfill: set isPureIncident on all existing incidentReports ───
// Trigger once via: https://<region>-<project>.cloudfunctions.net/backfillPureIncident
// Protected by a secret key — pass ?key=YOUR_SECRET in the URL.
// DELETE or disable this function after running it successfully.
// exports.backfillPureIncident = onRequest(async (req, res) => {
//   const SECRET = "backfill-pure-2024"; // change this to anything you want
//   if (req.query.key !== SECRET) {
//     res.status(401).send("Unauthorized — pass ?key=YOUR_SECRET in the URL");
//     return;
//   }

//   const db = admin.firestore();
//   const snapshot = await db.collection("incidentReports").get();

//   if (snapshot.empty) {
//     res.status(200).json({ message: "No incidents found.", updated: 0 });
//     return;
//   }

//   let updated = 0;
//   let skipped = 0;
//   const BATCH_SIZE = 500; // Firestore max per batch

//   // Split all docs into chunks of 500
//   const docs = snapshot.docs;
//   for (let i = 0; i < docs.length; i += BATCH_SIZE) {
//     const chunk = docs.slice(i, i + BATCH_SIZE);
//     const batch = db.batch();

//     chunk.forEach((doc) => {
//       const d = doc.data();
//       const isPureIncident =
//         d.incidentType !== "Free Recovery" &&
//         d.incidentType !== "Drive Off" &&
//         d.incursion !== "YES" &&
//         !d.propertyDamage;

//       // Only write if the field is missing or wrong — avoids unnecessary writes
//       if (d.isPureIncident !== isPureIncident) {
//         batch.update(doc.ref, { isPureIncident });
//         updated++;
//       } else {
//         skipped++;
//       }
//     });

//     await batch.commit();
//     console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1} — ${updated} updated so far`);
//   }

//   res.status(200).json({
//     message: "Backfill complete.",
//     total: docs.length,
//     updated,
//     skipped,
//   });
// });
