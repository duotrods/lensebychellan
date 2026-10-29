/* eslint-disable no-undef */
// Two-factor callables (emailed code + backup codes). All secret state lives in
// the server-only `mfa/{uid}` collection; `users/{uid}` only gets non-secret mirror
// flags (mfaEnrolled, mfaLockedUntil) so the UI can react live.
//
// Every rule (lock, rate limit, trust, hashing) comes from mfaLogic.js.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");
const mfaLogic = require("./mfaLogic");

module.exports = function createMfaFunctions({ admin, smtpPass, SMTP_USER, SMTP_SENDER }) {
  const db = admin.firestore();
  const mfaRef = (uid) => db.collection("mfa").doc(uid);
  const userRef = (uid) => db.collection("users").doc(uid);
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  // Accounts enrolled before the switch from SMS to email carry phoneVerified instead.
  const isEnrolled = (data) => data.enrolled === true || data.phoneVerified === true;

  function requireVerifiedEmailUser(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError("failed-precondition", "Verify your email first.");
    }
    return request.auth.uid;
  }

  async function requireAdmin(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const caller = await userRef(request.auth.uid).get();
    if (!caller.exists || caller.data().role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can do this.");
    }
    return request.auth.uid;
  }

  const lockedError = (lockedUntil) =>
    new HttpsError("resource-exhausted", "Too many wrong codes. This account is locked.", {
      lockedUntil: mfaLogic.toMillis(lockedUntil),
    });

  // Mirror the lock onto users/{uid} so the admin list and the sign-in gate see it live.
  const lockMirror = (lockedUntil) => ({
    mfaLockedUntil: lockedUntil > Date.now() ? new Date(lockedUntil) : null,
  });

  // The claim is what firestore/storage rules check. It is only valid for the
  // sign-in it was issued on (auth_time changes on every fresh password sign-in).
  async function setMfaClaim(uid, authTime) {
    const record = await admin.auth().getUser(uid);
    await admin.auth().setCustomUserClaims(uid, { ...(record.customClaims || {}), mfaAuthTime: authTime });
  }

  async function clearMfaClaim(uid) {
    const record = await admin.auth().getUser(uid);
    const { mfaAuthTime, ...rest } = record.customClaims || {}; // eslint-disable-line no-unused-vars
    await admin.auth().setCustomUserClaims(uid, rest);
  }

  async function emailBackupCodes(to, codes) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: smtpPass.value() },
    });
    const list = codes.map((c) => `<li style="font-family:monospace;font-size:16px">${c}</li>`).join("");
    await transporter.sendMail({
      from: SMTP_SENDER,
      to,
      subject: "Your LENSE by Chellan 2FA backup codes",
      html:
        `<p>Two-factor authentication is now on for your account.</p>` +
        `<p>These backup codes let you sign in if you cannot get an emailed code. Each code works <strong>once</strong>.</p>` +
        `<ul>${list}</ul>` +
        `<p>Keep them somewhere safe and delete this email once you have stored them. ` +
        `We will not send them again. If you lose them, ask an administrator to reset your 2FA.</p>`,
    });
  }

  async function emailCode(to, purpose, code) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: smtpPass.value() },
    });
    try {
      await transporter.sendMail({
        from: SMTP_SENDER,
        to,
        subject: `Your LENSE by Chellan ${purpose} code`,
        html:
          `<p>Your ${purpose} code is:</p>` +
          `<p style="font-family:monospace;font-size:28px;letter-spacing:6px"><strong>${code}</strong></p>` +
          `<p>It expires in 10 minutes. If you did not request it, ignore this email.</p>`,
      });
    } catch (err) {
      console.error("2FA code email failed:", err);
      throw new HttpsError("unavailable", "Could not send the code. Please try again.");
    }
  }

  // ---- Enrolment -------------------------------------------------------------

  const mfaSendEnrolCode = onCall({ secrets: [smtpPass] }, async (request) => {
    const uid = requireVerifiedEmailUser(request);
    const email = request.auth.token.email;

    const code = mfaLogic.generateSmsCode();
    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(mfaRef(uid));
      const data = snap.exists ? snap.data() : {};
      if (isEnrolled(data)) return { error: "already" };
      const now = Date.now();
      if (mfaLogic.isLocked(data, now)) return { error: "locked", lockedUntil: data.lockedUntil };
      const send = mfaLogic.registerSmsSend(data.smsSend, now);
      if (!send) return { error: "rate" };
      tx.set(
        mfaRef(uid),
        { pendingMethod: "email", smsChallenge: mfaLogic.createSmsChallenge(code, now), smsSend: send },
        { merge: true },
      );
      return { ok: true };
    });

    if (outcome.error === "already") {
      throw new HttpsError("failed-precondition", "2FA is already set up. Ask an administrator to reset it.");
    }
    if (outcome.error === "locked") throw lockedError(outcome.lockedUntil);
    if (outcome.error === "rate") {
      throw new HttpsError("resource-exhausted", "Too many codes requested. Try again in 15 minutes.");
    }

    await emailCode(email, "verification", code);
    return { success: true, emailHint: mfaLogic.maskEmail(email) };
  });

  const mfaConfirmEnrol = onCall({ secrets: [smtpPass] }, async (request) => {
    const uid = requireVerifiedEmailUser(request);
    const code = request.data && request.data.code;
    const backupCodes = mfaLogic.generateBackupCodes();

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(mfaRef(uid));
      const data = snap.exists ? snap.data() : {};
      const now = Date.now();
      if (isEnrolled(data)) return { error: "already" };
      if (!data.pendingMethod) return { error: "nocode" };
      if (mfaLogic.isLocked(data, now)) return { error: "locked", lockedUntil: data.lockedUntil };

      if (!mfaLogic.verifySmsCode(data.smsChallenge, code, now)) {
        const state = mfaLogic.registerFailure(data, now);
        tx.set(mfaRef(uid), state, { merge: true });
        tx.set(userRef(uid), lockMirror(state.lockedUntil), { merge: true });
        return { error: "wrong", attemptsRemaining: mfaLogic.attemptsRemaining(state, now), lockedUntil: state.lockedUntil };
      }

      tx.set(
        mfaRef(uid),
        {
          enrolled: true,
          method: "email",
          enrolledAt: serverTs(),
          backupCodeHashes: backupCodes.map((c) => mfaLogic.hashBackupCode(c)),
          pendingMethod: admin.firestore.FieldValue.delete(),
          smsChallenge: admin.firestore.FieldValue.delete(),
          ...mfaLogic.registerSuccess(),
        },
        { merge: true },
      );
      tx.set(userRef(uid), { mfaEnrolled: true, ...lockMirror(0) }, { merge: true });
      return { ok: true };
    });

    if (outcome.error === "already") throw new HttpsError("failed-precondition", "2FA is already set up.");
    if (outcome.error === "nocode") throw new HttpsError("failed-precondition", "Request a code first.");
    if (outcome.error === "locked") throw lockedError(outcome.lockedUntil);
    if (outcome.error === "wrong") {
      if (outcome.lockedUntil > Date.now()) throw lockedError(outcome.lockedUntil);
      throw new HttpsError("permission-denied", "That code is not right.", { attemptsRemaining: outcome.attemptsRemaining });
    }

    await setMfaClaim(uid, request.auth.token.auth_time);

    let emailed = true;
    try {
      await emailBackupCodes(request.auth.token.email, backupCodes);
    } catch (err) {
      emailed = false;
      console.error("Backup code email failed:", err);
    }
    return { success: true, backupCodes, emailed };
  });

  // ---- Login -----------------------------------------------------------------

  const mfaSendLoginCode = onCall({ secrets: [smtpPass] }, async (request) => {
    const uid = requireVerifiedEmailUser(request);
    const email = request.auth.token.email;
    const code = mfaLogic.generateSmsCode();

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(mfaRef(uid));
      const data = snap.exists ? snap.data() : {};
      if (!isEnrolled(data)) return { error: "notenrolled" };
      const now = Date.now();
      if (mfaLogic.isLocked(data, now)) return { error: "locked", lockedUntil: data.lockedUntil };
      const send = mfaLogic.registerSmsSend(data.smsSend, now);
      if (!send) return { error: "rate" };
      tx.set(mfaRef(uid), { smsChallenge: mfaLogic.createSmsChallenge(code, now), smsSend: send }, { merge: true });
      return { ok: true };
    });

    if (outcome.error === "notenrolled") throw new HttpsError("failed-precondition", "2FA is not set up yet.");
    if (outcome.error === "locked") throw lockedError(outcome.lockedUntil);
    if (outcome.error === "rate") {
      throw new HttpsError("resource-exhausted", "Too many codes requested. Try again in 15 minutes.");
    }

    await emailCode(email, "sign-in", code);
    // Masked, so the UI can say where the code went.
    return { success: true, emailHint: mfaLogic.maskEmail(email) };
  });

  // data: { code?, backupCode?, deviceToken?, trustDevice? }
  // With only a deviceToken it answers { status: "code_required" } when that browser
  // is not trusted (not counted as a failure).
  const mfaVerify = onCall(async (request) => {
    const uid = requireVerifiedEmailUser(request);
    const { code, backupCode, deviceToken, trustDevice } = request.data || {};
    const deviceHash = deviceToken ? mfaLogic.hashDeviceToken(deviceToken) : null;
    const triedCredential = Boolean(code || backupCode);

    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(mfaRef(uid));
      const data = snap.exists ? snap.data() : {};
      if (!isEnrolled(data)) return { error: "notenrolled" };
      const now = Date.now();
      if (mfaLogic.isLocked(data, now)) return { error: "locked", lockedUntil: data.lockedUntil };

      let ok = false;
      let usedBackup = false;
      const update = {};

      if (!triedCredential) {
        if (!mfaLogic.isDeviceTrusted(data.trustedDevices, deviceHash, now)) return { status: "code_required" };
        ok = true;
      } else if (backupCode) {
        const remaining = mfaLogic.consumeBackupCode(data.backupCodeHashes, backupCode);
        if (remaining) {
          ok = true;
          usedBackup = true;
          update.backupCodeHashes = remaining;
        }
      } else if (mfaLogic.verifySmsCode(data.smsChallenge, code, now)) {
        ok = true;
        update.smsChallenge = admin.firestore.FieldValue.delete(); // single use
      }

      if (!ok) {
        const state = mfaLogic.registerFailure(data, now);
        tx.set(mfaRef(uid), state, { merge: true });
        tx.set(userRef(uid), lockMirror(state.lockedUntil), { merge: true });
        return { error: "wrong", attemptsRemaining: mfaLogic.attemptsRemaining(state, now), lockedUntil: state.lockedUntil };
      }

      Object.assign(update, mfaLogic.registerSuccess());
      if (trustDevice && deviceHash && triedCredential) {
        update.trustedDevices = mfaLogic.addTrustedDevice(data.trustedDevices, deviceHash, now);
      } else if (data.trustedDevices) {
        update.trustedDevices = mfaLogic.pruneTrustedDevices(data.trustedDevices, now);
      }
      tx.set(mfaRef(uid), update, { merge: true });
      tx.set(userRef(uid), lockMirror(0), { merge: true });
      const left = usedBackup ? update.backupCodeHashes.length : (data.backupCodeHashes || []).length;
      return { ok: true, backupCodesRemaining: left };
    });

    if (outcome.status === "code_required") return { success: false, status: "code_required" };
    if (outcome.error === "notenrolled") throw new HttpsError("failed-precondition", "2FA is not set up yet.");
    if (outcome.error === "locked") throw lockedError(outcome.lockedUntil);
    if (outcome.error === "wrong") {
      if (outcome.lockedUntil > Date.now()) throw lockedError(outcome.lockedUntil);
      throw new HttpsError("permission-denied", "That code is not right.", { attemptsRemaining: outcome.attemptsRemaining });
    }

    await setMfaClaim(uid, request.auth.token.auth_time);
    return { success: true, backupCodesRemaining: outcome.backupCodesRemaining };
  });

  // ---- Admin -----------------------------------------------------------------

  const mfaAdminUnlock = onCall(async (request) => {
    const callerUid = await requireAdmin(request);
    const targetUid = request.data && request.data.targetUid;
    if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required.");
    await mfaRef(targetUid).set(mfaLogic.registerSuccess(), { merge: true });
    await userRef(targetUid).set(lockMirror(0), { merge: true });
    await db.collection("auditLogs").add({
      action: "mfa_unlocked",
      performedBy: callerUid,
      targetUser: targetUid,
      timestamp: serverTs(),
    });
    return { success: true };
  });

  const mfaAdminReset = onCall(async (request) => {
    const callerUid = await requireAdmin(request);
    const targetUid = request.data && request.data.targetUid;
    if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required.");
    await mfaRef(targetUid).delete();
    await userRef(targetUid).set({ mfaEnrolled: false, mfaLockedUntil: null }, { merge: true });
    await clearMfaClaim(targetUid);
    await db.collection("auditLogs").add({
      action: "mfa_reset",
      performedBy: callerUid,
      targetUser: targetUid,
      timestamp: serverTs(),
    });
    return { success: true };
  });

  return { mfaSendEnrolCode, mfaConfirmEnrol, mfaSendLoginCode, mfaVerify, mfaAdminUnlock, mfaAdminReset };
};
