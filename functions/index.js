const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

admin.initializeApp();

// Define the SMTP password secret
const smtpPass = defineSecret("SMTP_PASS");

// Email configuration will be created inside the function to access the secret

// Email recipient mapping by scheme and notification type
// Easy to update later - just change the email addresses here
const EMAIL_RECIPIENTS = {
  // M3 Scheme
  "M3 Jct 9 - Balfour Beatty": {
    "TM Manager": "david@chellan.co.uk",
    "Maintenance Team": "chellanclientdemo@outlook.com",
    "Safety Officer": "chellanstaffdemo@outlook.com",
  },

  "A417 Missing Link - Kier": {
    "TM Manager": "david@chellan.co.uk",
    "Maintenance Team": "chellanclientdemo@outlook.com",
    "Safety Officer": "chellanstaffdemo@outlook.com",
  },

  "A47 Thickthorn - Core": {
    "TM Manager": "david@chellan.co.uk",
    "Maintenance Team": "chellanclientdemo@outlook.com",
    "Safety Officer": "chellanstaffdemo@outlook.com",
  },
};

/**
 * Get recipient email based on scheme and notification type
 */
function getRecipientEmail(scheme, notificationType) {
  const schemeConfig = EMAIL_RECIPIENTS[scheme] || EMAIL_RECIPIENTS["default"];
  return schemeConfig[notificationType] || null;
}

/**
 * Callable function to send notification emails for Asset Damage reports
 */
exports.sendAssetDamageNotification = onCall(
  { secrets: [smtpPass] },
  async (request) => {
    // Check if the request is authenticated
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to send notifications",
      );
    }

    const { reportData, notificationTypes, isUpdate } = request.data;

    if (!reportData || !notificationTypes || notificationTypes.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Report data and notification types are required",
      );
    }

    // Filter out "N/A" from notifications
    const validNotifications = notificationTypes.filter((n) => n !== "N/A");

    if (validNotifications.length === 0) {
      return {
        success: true,
        message: "No notifications to send (N/A selected)",
        emailsSent: 0,
      };
    }

    // Create transporter inside function to access the secret
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "alerts@chellan.co.uk",
        pass: smtpPass.value(),
      },
    });

    const scheme = reportData.scheme || "Unknown Scheme";
    const emailPromises = [];
    const emailsSentTo = [];

    for (const notificationType of validNotifications) {
      const recipientEmail = getRecipientEmail(scheme, notificationType);

      if (!recipientEmail) {
        console.log(`No email configured for ${scheme} - ${notificationType}`);
        continue;
      }

      // Build email content
      const subject = `${isUpdate ? "[UPDATED] " : ""}Asset Damage Report - ${scheme} - ${reportData.referenceId || "New Report"}`;

      const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Asset Damage Report</h1>
          <p style="margin: 5px 0 0 0;">${isUpdate ? "Report Updated" : "New Report Submitted"}</p>
        </div>

        <div style="padding: 20px; background-color: #f9fafb;">
          <h2 style="color: #374151; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">
            Report Details
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
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Time:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.location || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Marker Post:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.markerPost || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Asset Type:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.assetType || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Damage Type:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.damageType || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Incident Report #:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.incidentnum || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">NH Log:</td>
              <td style="padding: 8px 0; color: #111827;">${reportData.nhLog || "N/A"}</td>
            </tr>
          </table>

          <h3 style="color: #374151; margin-top: 20px;">Description</h3>
          <p style="background-color: white; padding: 15px; border-radius: 8px; color: #374151;">
            ${reportData.description || "No description provided"}
          </p>

          ${
            reportData.actionTaken
              ? `
          <h3 style="color: #374151; margin-top: 20px;">Action Taken</h3>
          <p style="background-color: white; padding: 15px; border-radius: 8px; color: #374151;">
            ${reportData.actionTaken}
          </p>
          `
              : ""
          }

          <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Notification sent to:</strong> ${notificationType}
            </p>
            <p style="margin: 5px 0 0 0; color: #92400e;">
              <strong>Submitted by:</strong> ${reportData.submittedBy || "Unknown"}
            </p>
          </div>
        </div>

        <div style="background-color: #374151; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from LENSE by Chellan</p>
        </div>
      </div>
    `;

      const mailOptions = {
        from: '"LENSE by Chellan" <alerts@chellan.co.uk>',
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
      };

      emailPromises.push(
        transporter
          .sendMail(mailOptions)
          .then(() => {
            console.log(
              `Email sent to ${recipientEmail} for ${notificationType}`,
            );
            emailsSentTo.push({
              type: notificationType,
              email: recipientEmail,
            });
          })
          .catch((error) => {
            console.error(`Failed to send email to ${recipientEmail}:`, error);
          }),
      );
    }

    try {
      await Promise.all(emailPromises);

      // Log the notification in Firestore
      await admin
        .firestore()
        .collection("emailLogs")
        .add({
          reportType: "asset-damage",
          reportId: reportData.id || null,
          referenceId: reportData.referenceId || null,
          scheme: scheme,
          notificationTypes: validNotifications,
          emailsSentTo: emailsSentTo,
          isUpdate: isUpdate || false,
          sentBy: request.auth.uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: true,
        message: `Notifications sent successfully`,
        emailsSent: emailsSentTo.length,
        recipients: emailsSentTo,
      };
    } catch (error) {
      console.error("Error sending notifications:", error);
      throw new HttpsError(
        "internal",
        `Failed to send notifications: ${error.message}`,
      );
    }
  },
);

// ─── Scheduled CCTV Check Email ───────────────────────────────────────────────

// Recipients for the scheduled CCTV check report — add/remove emails as needed
const CCTV_REPORT_RECIPIENTS = ["david@chellan.co.uk"];

/**
 * Generates a PDF buffer from a cctvCheckForms document.
 * Layout matches the frontend pdfGenerator.js (jsPDF version).
 */
function generateCCTVCheckPDF(check) {
  return new Promise((resolve, reject) => {
    // margins: 0 so pdfkit's auto-page-break never fires before our manual guard
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const PW = 595.28;
    const PH = 841.89;
    const M = 50;
    const CW = PW - M * 2;
    const TEAL = "#00BAA8";
    let y = 20;

    // Keep pdfkit's internal cursor in sync with our y so it never auto-adds pages
    const sync = () => {
      doc.y = y;
    };

    const checkBreak = (needed = 40) => {
      if (y + needed > PH - 60) {
        doc.addPage();
        y = 20;
        doc.y = y;
      }
    };

    const addSectionHeader = (title) => {
      checkBreak(22);
      doc.rect(M, y, CW, 16).fill(TEAL);
      doc
        .fontSize(10)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(title, M + 5, y + 3, { width: CW - 10, lineBreak: false });
      y += 22;
      sync();
      doc.fillColor("#000000");
    };

    const addField = (label, value, bold = false) => {
      if (value === undefined || value === null || value === "") return;
      checkBreak(16);
      const rowY = y;
      doc
        .fontSize(10)
        .fillColor("#3C3C3C")
        .font("Helvetica-Bold")
        .text(`${label}:`, M, rowY, { width: 130, lineBreak: false });
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fillColor("#000000")
        .text(value.toString(), M + 135, rowY, { width: CW - 135 });
      // Let pdfkit report where the wrapped value ended, then add a small gap
      y = Math.max(doc.y, rowY + 14) + 2;
      sync();
    };

    const addSubHeader = (title) => {
      checkBreak(18);
      doc.rect(M, y, CW, 14).fill("#F5F5F5");
      doc
        .fontSize(11)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(title, M + 3, y + 1, { width: CW - 6, lineBreak: false });
      y += 18;
      sync();
    };

    // ── HEADER ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 55).fill("#FFFFFF");
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("LENSE BY CHELLAN", 0, 26, {
        align: "center",
        width: PW,
        lineBreak: false,
      });
    y = 62;
    sync();

    // ── REPORT TITLE BANNER ─────────────────────────────────────────────
    doc.rect(M, y - 5, CW, 18).fill("#F0F0F0");
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("CCTV Check Report", M + 5, y, { width: CW, lineBreak: false });
    y += 22;
    sync();

    // Reference number
    if (check.referenceId) {
      doc
        .fontSize(10)
        .fillColor("#646464")
        .font("Helvetica")
        .text(`Reference Number: ${check.referenceId}`, M, y, {
          lineBreak: false,
        });
      y += 14;
      sync();
    }

    // Generated timestamp
    const now = new Date();
    const genDate = now.toLocaleDateString("en-GB");
    const genTime = now.toLocaleTimeString("en-GB");
    doc
      .fontSize(9)
      .fillColor("#787878")
      .font("Helvetica")
      .text(`Generated: ${genDate} at ${genTime}`, M, y, { lineBreak: false });
    y += 14;
    sync();

    // Teal divider
    doc
      .moveTo(M, y)
      .lineTo(PW - M, y)
      .strokeColor(TEAL)
      .lineWidth(0.5)
      .stroke();
    y += 16;
    sync();

    // ── BASIC INFORMATION ───────────────────────────────────────────────
    addSectionHeader("BASIC INFORMATION");
    if (check.date) addField("Report Date", check.date);
    if (check.time) addField("Report Time", check.time);
    addField("Scheme/Location", "All Schemes");
    if (check.firstName) addField("Checked By", check.firstName);
    y += 5;
    sync();

    // ── REPORT DETAILS ──────────────────────────────────────────────────
    addSectionHeader("REPORT DETAILS");

    const sections = [
      { label: "A417", key: "a417Cameras", commentsKey: "a417Comments" },
      {
        label: "A11/A47 Kier/Core",
        key: "kierCore",
        commentsKey: "kierCoreComments",
      },
      { label: "M3 Jct 9", key: "m3Jct9", commentsKey: "m3Jct9Comments" },
      { label: "A452 HS2", key: "A452", commentsKey: "A452Comments" },
    ];

    let hasSections = false;
    sections.forEach(({ label, key, commentsKey }) => {
      const cameras = check[key];
      if (!cameras || cameras.length === 0) return;
      hasSections = true;
      y += 3;
      sync();
      addSubHeader(label);
      const allWorking =
        cameras.includes("All Working Correctly") || cameras.includes("NONE");
      if (allWorking) {
        addField("Status", "All cameras working correctly", true);
      } else {
        addField("Issues Reported", cameras.join(", "), true);
      }
      if (check[commentsKey] && check[commentsKey].trim() !== "") {
        addField("Comments", check[commentsKey]);
      }
      y += 3;
      sync();
    });

    if (!hasSections) {
      doc
        .fontSize(11)
        .fillColor("#6b7280")
        .font("Helvetica")
        .text("No camera data recorded.", M, y);
      y = doc.y + 5;
      sync();
    }

    // ── REPORT INFORMATION ──────────────────────────────────────────────
    y += 5;
    sync();
    addSectionHeader("REPORT INFORMATION");
    const submitter =
      check.submittedBy?.name ||
      (typeof check.submittedBy === "string" ? check.submittedBy : null);
    if (submitter) addField("Submitted By", submitter);

    // Light divider
    y += 8;
    doc
      .moveTo(M, y)
      .lineTo(PW - M, y)
      .strokeColor("#C8C8C8")
      .lineWidth(0.3)
      .stroke();

    // ── FOOTER ──────────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .fillColor("#808080")
      .font("Helvetica")
      .text(`Generated on ${genDate} at ${genTime}`, M, PH - 25, {
        width: CW / 2,
        lineBreak: false,
      });
    doc.text("Page 1 of 1", M + CW / 2, PH - 25, {
      align: "right",
      width: CW / 2,
      lineBreak: false,
    });

    doc.end();
  });
}

/**
 * TEST VERSION — runs every minute so you can verify the email works.
 * To test: uncomment the block below, deploy, wait ~1 min, check your inbox.
 * Then comment it back out and re-deploy with the production version below.
 */
// exports.scheduledCCTVCheckEmailTEST = onSchedule(
//   {
//     schedule: "* * * * *",   // every minute — for testing only
//     timeZone: "Europe/London",
//     secrets: [smtpPass],
//   },
//   async () => {
//     const snapshot = await admin
//       .firestore()
//       .collection("cctvCheckForms")
//       .orderBy("createdAt", "desc")
//       .limit(1)
//       .get();
//     if (snapshot.empty) { console.log("No CCTV checks found."); return; }
//     const check = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
//     const pdfBuffer = await generateCCTVCheckPDF(check);
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: "alerts@chellan.co.uk", pass: smtpPass.value() },
//     });
//     for (const recipient of CCTV_REPORT_RECIPIENTS) {
//       await transporter.sendMail({
//         from: '"LENSE by Chellan" <alerts@chellan.co.uk>',
//         to: recipient,
//         subject: `[TEST] CCTV Check Report — ${check.date || "N/A"} ${check.time || ""}`.trim(),
//         text: `TEST EMAIL — Latest CCTV check (${check.referenceId || "N/A"}) attached.`,
//         attachments: [{ filename: `cctv-check-${check.referenceId || check.id}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
//       });
//       console.log(`[TEST] CCTV report emailed to: ${recipient}`);
//     }
//   },
// );

/**
 * PRODUCTION — sends a PDF of the latest CCTV check at 8am and 11pm (London time)
 */
exports.scheduledCCTVCheckEmail = onSchedule(
  {
    schedule: "0 0,12 * * *",

    timeZone: "Europe/London",
    secrets: [smtpPass],
  },
  // For testing, use this schedule instead to run every 3 minute — just remember to change it back before deploying to production!
  // {
  //   schedule: "*/3 * * * *", // every 3 minutes — for testing only
  //   timeZone: "Europe/London",
  //   secrets: [smtpPass],
  // },
  async () => {
    // 1. Fetch the latest CCTV check
    const snapshot = await admin
      .firestore()
      .collection("cctvCheckForms")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No CCTV checks found — skipping scheduled email.");
      return;
    }

    const check = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    console.log(`Sending scheduled CCTV report for: ${check.referenceId}`);

    // 2. Generate PDF
    const pdfBuffer = await generateCCTVCheckPDF(check);

    // 3. Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "alerts@chellan.co.uk",
        pass: smtpPass.value(),
      },
    });

    // 4. Send to each recipient
    for (const recipient of CCTV_REPORT_RECIPIENTS) {
      await transporter.sendMail({
        from: '"LENSE by Chellan" <alerts@chellan.co.uk>',
        to: recipient,
        subject:
          `CCTV Check Report — ${check.date || "N/A"} ${check.time || ""}`.trim(),
        text: `The latest CCTV check (${check.referenceId || "N/A"}) is attached as a PDF.`,
        attachments: [
          {
            filename: `cctv-check-${check.referenceId || check.id}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
      console.log(`CCTV report emailed to: ${recipient}`);
    }

    // 5. Log to Firestore
    await admin
      .firestore()
      .collection("emailLogs")
      .add({
        reportType: "cctv-check-scheduled",
        reportId: check.id,
        referenceId: check.referenceId || null,
        recipients: CCTV_REPORT_RECIPIENTS,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  },
);

// ─── End Scheduled CCTV Check Email ───────────────────────────────────────────

/**
 * Callable function to delete a user from both Authentication and Firestore
 * This function can only be called by authenticated admin users
 */
exports.deleteUserAccount = onCall(async (request) => {
  // Check if the request is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to call this function",
    );
  }

  const { targetUid } = request.data;
  const callerUid = request.auth.uid;

  try {
    // Get the caller's Firestore document to verify admin role
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(callerUid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can delete users");
    }

    // Get target user document
    const targetUserDoc = await admin
      .firestore()
      .collection("users")
      .doc(targetUid)
      .get();

    if (!targetUserDoc.exists) {
      throw new HttpsError("not-found", "Target user not found in Firestore");
    }

    const targetUserData = targetUserDoc.data();

    // Prevent deletion of admin users
    if (targetUserData.role === "admin") {
      throw new HttpsError("permission-denied", "Cannot delete admin users");
    }

    // Prevent self-deletion
    if (targetUid === callerUid) {
      throw new HttpsError("invalid-argument", "Cannot delete yourself");
    }

    // Create audit log before deletion
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

    // Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(targetUid);
      console.log(`Successfully deleted auth user: ${targetUid}`);
    } catch (authError) {
      console.error("Error deleting from Auth:", authError);
      // If user doesn't exist in Auth, continue with Firestore deletion
      if (authError.code !== "auth/user-not-found") {
        throw authError;
      }
    }

    // Delete from Firestore
    await admin.firestore().collection("users").doc(targetUid).delete();

    console.log(`Successfully deleted user document: ${targetUid}`);

    return {
      success: true,
      message: `User ${targetUserData.displayName} has been completely deleted`,
    };
  } catch (error) {
    console.error("Delete user error:", error);

    // If it's already an HttpsError, rethrow it
    if (error instanceof HttpsError) {
      throw error;
    }

    // Otherwise, wrap it in an HttpsError
    throw new HttpsError("internal", `Failed to delete user: ${error.message}`);
  }
});
