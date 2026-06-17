/**
 * CREATE ADMIN ACCOUNT
 *
 * Creates a Firebase Auth user (already email-verified) and a matching
 * /users/{uid} Firestore doc with role "admin", so the account can log in
 * straight away. The app has no admin signup flow — admins are created here.
 *
 * Targets whichever project `service-account-new.json` belongs to. Use the NEW
 * (third-party) project's key here — NOT lensebychellan's key — so this never
 * writes to the wrong database.
 *
 * Setup:
 *   1. npm install firebase-admin
 *   2. Put the new project's service-account key at the repo root as
 *      `service-account-new.json`
 *      (Firebase console → Project settings → Service accounts → Generate new private key)
 *
 * Run:
 *   node create-admin.js <email> <password> "<Display Name>"
 *   e.g. node create-admin.js admin@example.com 'ChangeMe123!' "Site Admin"
 *
 * ⚠️ Delete service-account-new.json when done — it grants full project access.
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const [email, password, displayName] = process.argv.slice(2);

if (!email || !password || !displayName) {
  console.error(
    'Usage: node create-admin.js <email> <password> "<Display Name>"',
  );
  process.exit(1);
}
if (password.length < 6) {
  console.error("❌ Password must be at least 6 characters.");
  process.exit(1);
}

// Load the NEW project's service account key
let serviceAccount;
try {
  serviceAccount = JSON.parse(
    readFileSync(join(__dirname, "service-account-new.json"), "utf8"),
  );
} catch {
  console.error(
    "❌ Could not load service-account-new.json (the NEW project's key) from the repo root.",
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const run = async () => {
  console.log(`Target project: ${serviceAccount.project_id}`);

  // Create the Auth user, or reuse it if the email already exists.
  let user;
  try {
    user = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true, // lets the admin log in without the verification email
    });
    console.log(`✅ Created auth user ${user.uid}`);
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, {
        emailVerified: true,
        password,
        displayName,
      });
      console.log(`ℹ️  Auth user already existed — updated ${user.uid}`);
    } else {
      throw error;
    }
  }

  // Create / merge the Firestore profile (doc id MUST equal the auth uid).
  await admin
    .firestore()
    .collection("users")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        email,
        displayName,
        role: "admin",
        emailVerified: true,
        isActive: true,
        isArchived: false,
        canCreateAdmins: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  console.log(`✅ Admin profile written: users/${user.uid}`);
  console.log(`\nLog in with: ${email}`);
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Failed:", err.message || err);
  process.exit(1);
});
