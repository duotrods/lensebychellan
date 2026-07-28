/* eslint-disable no-undef */
/**
 * Email recipient configuration.
 * Update these addresses when contacts change.
 */

// Per-scheme recipients for incident alert emails (incursion YES, incursion to
// gain advantage YES, or asset damage).
// Key matches the scheme's fullName as stored in Firestore reports.

const INCIDENT_ALERT_RECIPIENTS = {
  "A417 Missing Link - Kier": ["david@chellan.co.uk, wayne@chellan.co.uk"],
  "M3 Jct 9 - Balfour Beatty": [
    "david@chellan.co.uk, wayne@chellan.co.uk, adam.kyprianou@balfourbeatty.com, Leon.Ireland@balfourbeatty.com",
  ],
  "A47 Thickthorn - Core": ["david@chellan.co.uk, wayne@chellan.co.uk"],
  "A452 HS2 - Traffix": ["david@chellan.co.uk, wayne@chellan.co.uk"],
  "Gallows Corner - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"],
  "Simister Island - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"],
  "A66 - WJ Scheme 1": ["Jonathan.Pettman@balfourbeatty.com, lee.mason@wjsunstone.com, david@chellan.co.uk, wayne@chellan.co.uk"],
  default: ["david@chellan.co.uk, wayne@chellan.co.uk"],
};

// const INCIDENT_ALERT_RECIPIENTS = {
//   "A417 Missing Link - Kier": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "M3 Jct 9 - Balfour Beatty": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "A47 Thickthorn - Core": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "A452 HS2 - Traffix": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "Gallows Corner - Costain": ["rroduot@gmail.com"],
//   "Simister Island - Costain": ["rroduot@gmail.com"],
//   "A66 - WJ Scheme 1": ["rroduot@gmail.com"],
//   default: ["duotrodolinor@gmail.com, rroduot@gmail.com"],
// };

// Schemes where an "Avera"-reported incident triggers its own dedicated PDF
// email, independent of the incursion/asset-damage alert above.
const AVERA_REPORT_SCHEMES = ["Simister Island - Costain", "A66 - WJ Scheme 1"];
const AVERA_REPORT_RECIPIENT = "jack.gander-compton@wjsuntone.com, david@chellan.co.uk, wayne@chellan.co.uk";
// const AVERA_REPORT_RECIPIENT = "rroduot@gmail.com";


const LENSEASSIST_REPORT_RECIPIENT = "admin@chellan.co.uk";
// const LENSEASSIST_REPORT_RECIPIENT = "rroduot@gmail.com";

const WIDELOAD_REPORT_RECIPIENT = "david@chellan.co.uk";
// const WIDELOAD_REPORT_RECIPIENT = "rroduot@gmail.com";
const WIDELOAD_REPORT_SCHEMES = ["A66 - WJ Scheme 1"];

// SMTP sender address
const SMTP_SENDER = '"LENSE by Chellan" <alerts@chellan.co.uk>';
const SMTP_USER = "alerts@chellan.co.uk";


module.exports = {
  WIDELOAD_REPORT_RECIPIENT,
  WIDELOAD_REPORT_SCHEMES,
  INCIDENT_ALERT_RECIPIENTS,
  AVERA_REPORT_SCHEMES,
  AVERA_REPORT_RECIPIENT,
  LENSEASSIST_REPORT_RECIPIENT,
  SMTP_SENDER,
  SMTP_USER,
};
