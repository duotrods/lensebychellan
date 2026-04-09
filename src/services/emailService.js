import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * Send alert email when an incident report contains incursion YES or asset damage.
 * Recipients are hardcoded server-side — no email addresses in the frontend.
 * @param {Object} reportData - The report data
 * @param {boolean} isUpdate - Whether this is an update to an existing report
 */
export const sendIncidentAlertNotification = async (reportData, isUpdate = false) => {
  const hasIncursion = reportData.incursion === "YES";
  const hasAssetDamage = reportData.propertyDamage === true;

  if (!hasIncursion && !hasAssetDamage) {
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
