/* eslint-disable no-undef */
/**
 * Email recipient configuration.
 * Update these addresses when contacts change.
 */

// Per-scheme recipients for incident alert emails (incursion YES, incursion to
// gain advantage YES, or asset damage).
// Key matches the scheme's fullName as stored in Firestore reports.


//Production incursion Incident alert recipients

const INCIDENT_ALERT_RECIPIENTS = {
  "A417 Missing Link - Kier":
    [
      "adam.cummins@kier.co.uk, david@chellan.co.uk, wayne@chellan.co.uk"
    ],
  "M3 Jct 9 - Balfour Beatty":
    [
      "david@chellan.co.uk, wayne@chellan.co.uk, adam.kyprianou@balfourbeatty.com, Leon.Ireland@balfourbeatty.com",
    ],
  "A47 Thickthorn - Core":
    [
      "abby.perry@corehighways.com,david@chellan.co.uk, wayne@chellan.co.uk"
    ],
  "A452 HS2 - Traffix":
    [
      "will@traffixuk.com, david@chellan.co.uk, wayne@chellan.co.uk"
    ],
  "Gallows Corner - Costain":
    [
      "david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"
    ],
  "Simister Island - Costain": 
    [
      "david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"
    ],
  "A66 - WJ Scheme 1": 
    [
      "Jonathan.Pettman@balfourbeatty.com, holly.lockwood@cumbria.police.uk, brussell@hwmartin.com, abriton2@hwmartin.com, adam.cummins@kier.co.uk, john.walker@kier.co.uk, martyn.stokes@virtusltd.com, Philip.Scott@balfourbeatty.com, lee.mason@wjsunstone.com, david@chellan.co.uk, wayne@chellan.co.uk"
    ],
  "M48 - Seven Bridge":
    [
      "bryan.dixon@amey.co.uk"
    ],
  default: ["david@chellan.co.uk, wayne@chellan.co.uk"],
};


//Testing Incident alert recipients

// const INCIDENT_ALERT_RECIPIENTS = {
//   "A417 Missing Link - Kier": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "M3 Jct 9 - Balfour Beatty": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "A47 Thickthorn - Core": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "A452 HS2 - Traffix": ["duotrodolinor@gmail.com, rroduot@gmail.com"],
//   "Gallows Corner - Costain": ["rroduot@gmail.com"],
//   "Simister Island - Costain": ["rroduot@gmail.com"],
//   "A66 - WJ Scheme 1": ["rroduot@gmail.com"],  
//   "M48 - Seven Bridge":
//     [
//       "rroduot@gmail.com"
//     ],
// };

// Per-scheme recipients for CCTV fault "blackspot camera" alerts — fires when
// a CCTV Faults report is submitted with blackspotCamera: true.
// Key matches the scheme's fullName as stored in Firestore reports (same
// convention as INCIDENT_ALERT_RECIPIENTS).

// Production CCTV fault blackspot alert recipients
const CCTV_FAULT_ALERT_RECIPIENTS = {
  "A417 Missing Link - Kier": ["adam.cummins@kier.co.uk, david@chellan.co.uk, wayne@chellan.co.uk"],
  "M3 Jct 9 - Balfour Beatty": ["adam.kyprianou@balfourbeatty.com, Leon.Ireland@balfourbeatty.com, david@chellan.co.uk, wayne@chellan.co.uk"],
  "A47 Thickthorn - Core": ["abby.perry@corehighways.com, david@chellan.co.uk, wayne@chellan.co.uk"],
  "A452 HS2 - Traffix": ["will@traffixuk.com, david@chellan.co.uk, wayne@chellan.co.uk"],
  "Gallows Corner - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"],
  "Simister Island - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Rob.hawkins@costain.com"],
  "A66 - WJ Scheme 1": ["Philip.Scott@balfourbeatty.com, Jonathan.Pettman@balfourbeatty.com, Dean.Shore@wjsunstone.com, david@chellan.co.uk, wayne@chellan.co.uk"],
  "M48 - Severn Bridge": ["bryan.dixon@amey.co.uk"],
  default: ["david@chellan.co.uk, wayne@chellan.co.uk"],
};

// // Testing CCTV fault blackspot alert recipients
// const CCTV_FAULT_ALERT_RECIPIENTS = {
//   "A417 Missing Link - Kier": ["rroduot@gmail.com"],
//   "M3 Jct 9 - Balfour Beatty": ["rroduot@gmail.com"],
//   "A47 Thickthorn - Core": ["rroduot@gmail.com"],
//   "A452 HS2 - Traffix": ["rroduot@gmail.com"],
//   "Gallows Corner - Costain": ["rroduot@gmail.com"],
//   "Simister Island - Costain": ["rroduot@gmail.com"],
//   "A66 - WJ Scheme 1": ["rroduot@gmail.com"],
//   "M48 - Severn Bridge": ["rroduot@gmail.com"],
//   // default: ["rroduot@gmail.com"],
// };

// Schemes where an "Avera"-reported incident triggers its own dedicated PDF
// email, independent of the incursion/asset-damage alert above.
const AVERA_REPORT_SCHEMES = ["Simister Island - Costain", "A66 - WJ Scheme 1"];

//Production Avera report recipients
const AVERA_REPORT_RECIPIENT = "jack.gander-compton@wjsuntone.com, david@chellan.co.uk, wayne@chellan.co.uk";

//Testing Avera report recipients
// const AVERA_REPORT_RECIPIENT = "rroduot@gmail.com";

// Production LenseAssist report recipients
const LENSEASSIST_REPORT_RECIPIENT = "admin@chellan.co.uk";

//Testing LenseAssist report recipients
// const LENSEASSIST_REPORT_RECIPIENT = "rroduot@gmail.com";


// Schemes where a WideLoad report triggers its own dedicated PDF email, independent
const WIDELOAD_REPORT_SCHEMES = ["A66 - WJ Scheme 1"];

// Production WideLoad report recipients
const WIDELOAD_REPORT_RECIPIENT = "david@chellan.co.uk";

//Testing WideLoad report recipients
// const WIDELOAD_REPORT_RECIPIENT = "rroduot@gmail.com";



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
  CCTV_FAULT_ALERT_RECIPIENTS,
  SMTP_SENDER,
  SMTP_USER,
};
