import { getFunctions, httpsCallable } from 'firebase/functions';
import { schemeSendsReport } from '../utils/schemes';

const functions = getFunctions();

/**
 * Send alert email when an incident report contains an escalated incursion
 * (incursion YES and incursion-to-gain-advantage YES), asset damage, was
 * reported by "Avera" on a scheme that sends Avera reports, was reported by "Lense Assist",
 * or is a "Wideload" incident type on a scheme that sends Wideload reports.
 * Recipients are resolved server-side — no email addresses in the frontend.
 * @param {Object} reportData - The report data
 * @param {boolean} isUpdate - Whether this is an update to an existing report
 */
export const sendIncidentAlertNotification = async (reportData, isUpdate = false) => {
  const hasIncursion = reportData.incursion === "YES";
  const hasIncursionToGainAdvantage = reportData.incursionToGainAdvantage === "YES";
  const hasAssetDamage = reportData.propertyDamage === true;
  const incursionEscalated = hasIncursion && hasIncursionToGainAdvantage;
  const averaTrigger =
    reportData.reportedBy === "Avera" &&
    schemeSendsReport("avera", reportData.scheme, reportData.schemeId);
  const lenseAssistTrigger = reportData.reportedBy === "Lense Assist";
  const wideloadTrigger =
    reportData.incidentType === "Wideload" &&
    schemeSendsReport("wideload", reportData.scheme, reportData.schemeId);

  if (!incursionEscalated && !hasAssetDamage && !averaTrigger && !lenseAssistTrigger && !wideloadTrigger) {
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
