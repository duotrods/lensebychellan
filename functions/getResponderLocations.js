/* eslint-disable no-undef */
// Admin-only proxy to K2's responder-locations endpoint (live operators en
// route to M3 incidents). The K2 API key lives here as a secret so it never
// reaches the browser.
//
// One-time setup:
//   firebase functions:secrets:set K2_API_KEY   (same value as K2's LENSE_API_KEY)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const k2ApiKey = defineSecret("K2_API_KEY");

const K2_API_URL = "https://k2recoveryapp.co.uk/api/responder-locations";

exports.getResponderLocations = onCall({ secrets: [k2ApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();
  const caller = callerDoc.data();
  if (!caller || caller.role !== "admin" || caller.isArchived) {
    throw new HttpsError("permission-denied", "Admins only");
  }

  let res;
  try {
    res = await fetch(K2_API_URL, {
      headers: { "x-api-key": k2ApiKey.value() },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("K2 responder-locations fetch failed:", err);
    throw new HttpsError("unavailable", "Could not reach K2");
  }
  if (!res.ok) {
    console.error("K2 responder-locations returned", res.status);
    throw new HttpsError("unavailable", `K2 responded ${res.status}`);
  }

  const { responders } = await res.json();
  return { responders: responders || [] };
});
