/**
 * Email recipient configuration.
 * Update these addresses when scheme contacts change.
 */

// Notification recipients per scheme and role
const EMAIL_RECIPIENTS = {
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

// Recipients for the scheduled CCTV check report (all schemes)
const CCTV_REPORT_RECIPIENTS = ["david@chellan.co.uk"];

// Recipients who only want to see the M3 Jct 9 section
const CCTV_M3_RECIPIENTS = ["david@chellan.co.uk"];

// SMTP sender address
const SMTP_SENDER = '"LENSE by Chellan" <alerts@chellan.co.uk>';
const SMTP_USER = "alerts@chellan.co.uk";

module.exports = {
  EMAIL_RECIPIENTS,
  CCTV_REPORT_RECIPIENTS,
  CCTV_M3_RECIPIENTS,
  SMTP_SENDER,
  SMTP_USER,
};
