import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * Send notification emails for Asset Damage reports
 * @param {Object} reportData - The report data to include in the email
 * @param {Array} notificationTypes - Array of notification types (e.g., ['TM Manager', 'Client'])
 * @param {boolean} isUpdate - Whether this is an update to an existing report
 * @returns {Promise<Object>} - Result of the email sending operation
 */
export const sendAssetDamageNotification = async (reportData, notificationTypes, isUpdate = false) => {
  // Don't send if no notifications selected or only N/A
  if (!notificationTypes || notificationTypes.length === 0) {
    return { success: true, message: 'No notifications to send', emailsSent: 0 };
  }

  const validNotifications = notificationTypes.filter(n => n !== 'N/A');
  if (validNotifications.length === 0) {
    return { success: true, message: 'No notifications to send (N/A selected)', emailsSent: 0 };
  }

  try {
    const sendNotification = httpsCallable(functions, 'sendAssetDamageNotification');
    const result = await sendNotification({
      reportData,
      notificationTypes: validNotifications,
      isUpdate
    });

    return result.data;
  } catch (error) {
    console.error('Error sending notification emails:', error);
    // Don't throw - we don't want email failures to break the form submission
    return {
      success: false,
      message: `Failed to send notifications: ${error.message}`,
      emailsSent: 0
    };
  }
};

export default {
  sendAssetDamageNotification
};
