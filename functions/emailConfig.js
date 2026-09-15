/* eslint-disable no-undef */
/**
 * Email recipient configuration.
 * Update these addresses when contacts change.
 *
 * PRODUCTION vs STAGING: exactly one of the two `const RECIPIENTS = {...}`
 * blocks below should be active. To switch environments, comment out the
 * active block and uncomment the other one — that's the only edit needed.
 * Every recipient constant in this file (INCIDENT_ALERT_RECIPIENTS,
 * CCTV_FAULT_ALERT_RECIPIENTS, AVERA_REPORT_RECIPIENT,
 * LENSEASSIST_REPORT_RECIPIENT, WIDELOAD_REPORT_RECIPIENT,
 * A66_UPTIME_REPORT_RECIPIENT) is derived from whichever `RECIPIENTS` object
 * ends up defined.
 */

// ─────────────────────────────────────────────────────────────────────────
// PRODUCTION recipients — ACTIVE by default
// ─────────────────────────────────────────────────────────────────────────


const RECIPIENTS = {
  // Per-scheme recipients for incident alert emails (incursion YES, incursion
  // to gain advantage YES, or asset damage). Key matches the scheme's
  // fullName as stored in Firestore reports.
  INCIDENT_ALERT_RECIPIENTS: {
    "A417 Missing Link - Kier": [
      "adam.cummins@kier.co.uk, david@chellan.co.uk, wayne@chellan.co.uk",
    ],
    "M3 Jct 9 - Balfour Beatty": [
      "david@chellan.co.uk, wayne@chellan.co.uk, adam.kyprianou@balfourbeatty.com, Leon.Ireland@balfourbeatty.com",
    ],
    "A47 Thickthorn - Core": [
      "abby.perry@corehighways.com,david@chellan.co.uk, wayne@chellan.co.uk",
    ],
    "A452 HS2 - Traffix": [
      "will@traffixuk.com, david@chellan.co.uk, wayne@chellan.co.uk",
    ],
    "Gallows Corner - Costain": [
      "david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com",
    ],
    "Simister Island - Costain": [
      "david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com",
    ],
    "A66 - WJ Scheme 1": [
      "Jonathan.Pettman@balfourbeatty.com, holly.lockwood@cumbria.police.uk, brussell@hwmartin.com, abriton2@hwmartin.com, adam.cummins@kier.co.uk, john.walker@kier.co.uk, martyn.stokes@virtusltd.com, Philip.Scott@balfourbeatty.com, lee.mason@wjsunstone.com, david@chellan.co.uk, wayne@chellan.co.uk",
    ],
    "M48 - Seven Bridge": ["bryan.dixon@amey.co.uk"],
    default: ["david@chellan.co.uk, wayne@chellan.co.uk"],
  },

  // Per-scheme recipients for CCTV fault "blackspot camera" alerts — fires
  // when a CCTV Faults report is submitted with blackspotCamera: true. Key
  // matches the scheme's fullName as stored in Firestore reports (same
  // convention as INCIDENT_ALERT_RECIPIENTS).
  CCTV_FAULT_ALERT_RECIPIENTS: {
    "A417 Missing Link - Kier": ["adam.cummins@kier.co.uk, david@chellan.co.uk, wayne@chellan.co.uk"],
    "M3 Jct 9 - Balfour Beatty": ["adam.kyprianou@balfourbeatty.com, Leon.Ireland@balfourbeatty.com, david@chellan.co.uk, wayne@chellan.co.uk"],
    "A47 Thickthorn - Core": ["abby.perry@corehighways.com, david@chellan.co.uk, wayne@chellan.co.uk"],
    "A452 HS2 - Traffix": ["will@traffixuk.com, david@chellan.co.uk, wayne@chellan.co.uk"],
    "Gallows Corner - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Mark.Krall@costain.com"],
    "Simister Island - Costain": ["david@chellan.co.uk, wayne@chellan.co.uk, Rob.hawkins@costain.com"],
    "A66 - WJ Scheme 1": ["Philip.Scott@balfourbeatty.com, Jonathan.Pettman@balfourbeatty.com, Dean.Shore@wjsunstone.com, david@chellan.co.uk, wayne@chellan.co.uk"],
    "M48 - Severn Bridge": ["bryan.dixon@amey.co.uk"],
    default: ["david@chellan.co.uk, wayne@chellan.co.uk"],
  },

  AVERA_REPORT_RECIPIENT: "jack.gander-compton@wjsuntone.com, david@chellan.co.uk, wayne@chellan.co.uk",
  LENSEASSIST_REPORT_RECIPIENT: "admin@chellan.co.uk",
  WIDELOAD_REPORT_RECIPIENT: "david@chellan.co.uk",

  // Placeholder until real A66/WJ contacts are confirmed for this report —
  // same in both environments for now.
  A66_UPTIME_REPORT_RECIPIENT: "wayne@chellan.co.uk, david@chellan.co.uk",
};

// ─────────────────────────────────────────────────────────────────────────
// STAGING / TEST recipients — everything routes to rroduot@gmail.com.
// To use: comment out the PRODUCTION block above, uncomment this block.
// ─────────────────────────────────────────────────────────────────────────


// const RECIPIENTS = {
//   INCIDENT_ALERT_RECIPIENTS: {
//     "A417 Missing Link - Kier": ["rroduot@gmail.com"],
//     "M3 Jct 9 - Balfour Beatty": ["rroduot@gmail.com"],
//     "A47 Thickthorn - Core": ["rroduot@gmail.com"],
//     "A452 HS2 - Traffix": ["rroduot@gmail.com"],
//     "Gallows Corner - Costain": ["rroduot@gmail.com"],
//     "Simister Island - Costain": ["rroduot@gmail.com"],
//     "A66 - WJ Scheme 1": ["rroduot@gmail.com"],
//     "M48 - Seven Bridge": ["rroduot@gmail.com"],
//     default: ["rroduot@gmail.com"],
//   },
//   CCTV_FAULT_ALERT_RECIPIENTS: {
//     "A417 Missing Link - Kier": ["rroduot@gmail.com"],
//     "M3 Jct 9 - Balfour Beatty": ["rroduot@gmail.com"],
//     "A47 Thickthorn - Core": ["rroduot@gmail.com"],
//     "A452 HS2 - Traffix": ["rroduot@gmail.com"],
//     "Gallows Corner - Costain": ["rroduot@gmail.com"],
//     "Simister Island - Costain": ["rroduot@gmail.com"],
//     "A66 - WJ Scheme 1": ["rroduot@gmail.com"],
//     "M48 - Severn Bridge": ["rroduot@gmail.com"],
//     default: ["rroduot@gmail.com"],
//   },
//   AVERA_REPORT_RECIPIENT: "rroduot@gmail.com",
//   LENSEASSIST_REPORT_RECIPIENT: "rroduot@gmail.com",
//   WIDELOAD_REPORT_RECIPIENT: "rroduot@gmail.com",
//   A66_UPTIME_REPORT_RECIPIENT: "rroduot@gmail.com",
// };

const {
  INCIDENT_ALERT_RECIPIENTS,
  CCTV_FAULT_ALERT_RECIPIENTS,
  AVERA_REPORT_RECIPIENT,
  LENSEASSIST_REPORT_RECIPIENT,
  WIDELOAD_REPORT_RECIPIENT,
  A66_UPTIME_REPORT_RECIPIENT,
} = RECIPIENTS;

// Scheme lists below are not recipient addresses — same in both environments.

// Schemes where an "Avera"-reported incident triggers its own dedicated PDF
// email, independent of the incursion/asset-damage alert above.
const AVERA_REPORT_SCHEMES = ["Simister Island - Costain", "A66 - WJ Scheme 1"];

// Schemes where a WideLoad report triggers its own dedicated PDF email,
// independent of the incursion/asset-damage alert above.
const WIDELOAD_REPORT_SCHEMES = ["A66 - WJ Scheme 1"];

// SMTP sender address — same in both environments (staging just sends to a
// different recipient, not from a different account).
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
  A66_UPTIME_REPORT_RECIPIENT,
  SMTP_SENDER,
  SMTP_USER,
};
