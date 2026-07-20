import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Schemes where an "Avera"-reported incident triggers its own dedicated PDF
// email to Jack, independent of the incursion/asset-damage alert below.
// Mirrors functions/emailConfig.js's AVERA_REPORT_SCHEMES (kept in sync
// manually — the frontend and functions/ are separate packages).
const AVERA_REPORT_SCHEMES = ["Simister Island - Costain", "A66 - WJ Scheme 1"];

/**
 * Send alert email when an incident report contains an escalated incursion
 * (incursion YES and incursion-to-gain-advantage YES), asset damage, or was
 * reported by "Avera" on Simister Island / A66.
 * Recipients are hardcoded server-side — no email addresses in the frontend.
 * @param {Object} reportData - The report data
 * @param {boolean} isUpdate - Whether this is an update to an existing report
 */
export const sendIncidentAlertNotification = async (reportData, isUpdate = false) => {
  const hasIncursion = reportData.incursion === "YES";
  const hasIncursionToGainAdvantage = reportData.incursionToGainAdvantage === "YES";
  const hasAssetDamage = reportData.propertyDamage === true;
  const incursionEscalated = hasIncursion && hasIncursionToGainAdvantage;
  const averaTrigger =
    reportData.reportedBy === "Avera" && AVERA_REPORT_SCHEMES.includes(reportData.scheme);

  if (!incursionEscalated && !hasAssetDamage && !averaTrigger) {
    return { success: true, message: "No alert triggers present", emailsSent: 0 };
  }

  try {
    const sendAlert = httpsCallable(functions, 'sendIncidentAlertNotification');
    const result = await sendAlert({ reportData, isUpdate });
    return result.data;
  } catch (error) {
    console.error('Error sending incident alert:', error);
    return {
      success: false,
      message: `Failed to send alert: ${error.message}`,
      emailsSent: 0,
    };
  }
};

export default {
  sendIncidentAlertNotification,
};
