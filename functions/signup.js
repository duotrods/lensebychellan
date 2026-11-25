/* eslint-disable no-undef */
// Server-side sign-up. The browser used to write its own `users/{uid}` doc, role
// included, so anyone could make themselves admin. Now the only way a user doc is
// created is this callable: it checks the access code, writes the doc and marks the
// code used in one transaction. See firestore.rules (`users` create = false).
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { SIGNUP_ROLES, codeProblem, codeUpdate, buildUserDoc } = require("./signupLogic");

function createSignupFunction({ admin }) {
  const db = admin.firestore();

  const registerWithCode = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const { role, code, ...input } = request.data || {};
    const kind = Object.prototype.hasOwnProperty.call(SIGNUP_ROLES, role) ? SIGNUP_ROLES[role] : null;
    if (!kind) throw new HttpsError("invalid-argument", "Invalid role.");
    if (typeof code !== "string" || !code.trim() || code.includes("/")) {
      throw new HttpsError("invalid-argument", "An access code is required.");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email || null;
    const userRef = db.collection("users").doc(uid);
    const codeRef = db.collection(kind.collection).doc(code.trim());

    await db.runTransaction(async (tx) => {
      const [userSnap, codeSnap] = await Promise.all([tx.get(userRef), tx.get(codeRef)]);
      if (userSnap.exists) throw new HttpsError("already-exists", "This account is already set up.");
      const codeData = codeSnap.exists ? codeSnap.data() : null;
      const problem = codeProblem(codeData, kind);
      if (problem) throw new HttpsError("permission-denied", problem);

      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(userRef, buildUserDoc({ uid, email, role, input, codeData, kind, now }));
      tx.update(codeRef, codeUpdate(codeData, kind, uid, now));
    });
    return { success: true };
  });

  return { registerWithCode };
}

module.exports = createSignupFunction;
