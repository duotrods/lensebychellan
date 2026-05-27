/* eslint-disable no-undef */
/**
 * Email recipient configuration.
 * Update these addresses when contacts change.
 */

// Per-scheme recipients for incident alert emails (incursion YES or asset damage).
// Key matches the scheme's fullName as stored in Firestore reports.

// const INCIDENT_ALERT_RECIPIENTS = {
//   "A417 Missing Link - Kier": ["david@chellan.co.uk, wayne@chellan.co.uk"],
//   "M3 Jct 9 - Balfour Beatty": [
//     "david@chellan.co.uk, wayne@chellan.co.uk, adam.kyprianou@balfourbeatty.com, Leon.Ireland@balfourbeatty.com",
//   ],
//   "A47 Thickthorn - Core": ["david@chellan.co.uk, wayne@chellan.co.uk"],
//   "A452 HS2 - Traffix": ["david@chellan.co.uk, wayne@chellan.co.uk"],
//   "Gallows Corner - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"],
//   "Simister Island - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"],
//   default: ["david@chellan.co.uk, wayne@chellan.co.uk"],
// };

const INCIDENT_ALERT_RECIPIENTS = {
  "A417 Missing Link - Kier": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
  "M3 Jct 9 - Balfour Beatty": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
  "A47 Thickthorn - Core": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
  "A452 HS2 - Traffix": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
  "Gallows Corner - Costain": ["rroduot@gmail.com"],
  "Simister Island - Costain": ["rroduot@gmail.com"],
  default: ["duotrodolinor@gmail.com, rroduot@gmail.com"],
};

// SMTP sender address
const SMTP_SENDER = '"LENSE by Chellan" <alerts@chellan.co.uk>';
const SMTP_USER = "alerts@chellan.co.uk";

module.exports = {
  INCIDENT_ALERT_RECIPIENTS,
  SMTP_SENDER,
  SMTP_USER,
};
