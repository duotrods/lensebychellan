/* eslint-disable no-undef */
/**
 * Email recipient configuration.
 * Update these addresses when contacts change.
 */

// Per-scheme recipients for incident alert emails (incursion YES or asset damage).
// Key matches the scheme's fullName as stored in Firestore reports.
const INCIDENT_ALERT_RECIPIENTS = {
  "A417 Missing Link - Kier": ["david@chellan.co.uk"],
  "M3 Jct 9 - Balfour Beatty": ["david@chellan.co.uk"],
  "A47 Thickthorn - Core": ["david@chellan.co.uk"],
  "A452 HS2 - Traffix": ["david@chellan.co.uk"],
  default: ["david@chellan.co.uk"],
};

// SMTP sender address
const SMTP_SENDER = '"LENSE by Chellan" <alerts@chellan.co.uk>';
const SMTP_USER = "alerts@chellan.co.uk";

module.exports = {
  INCIDENT_ALERT_RECIPIENTS,
  SMTP_SENDER,
  SMTP_USER,
};
