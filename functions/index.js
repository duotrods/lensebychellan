const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

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
