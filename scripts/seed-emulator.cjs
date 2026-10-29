// Seeds the LOCAL Firebase emulators with test users. Refuses to run against anything else.
// Usage: npm run emulators   (in one terminal), then   npm run seed:emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
if (!/^(127\.0\.0\.1|localhost)/.test(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error("Refusing to seed: FIRESTORE_EMULATOR_HOST is not local");
}

const admin = require("../functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "demo-lensebychellan" });

const PASSWORD = "Passw0rd!test";
const USERS = [
  { email: "admin@test.local", displayName: "Test Admin", role: "admin" },
  { email: "staff@test.local", displayName: "Test Staff", role: "staff", schemeId: "DMO1", schemeName: "Demo" },
];

(async () => {
  for (const u of USERS) {
    const { email, displayName, role, schemeId, schemeName } = u;
    let record;
    try {
      record = await admin.auth().getUserByEmail(email);
    } catch {
      record = await admin.auth().createUser({ email, password: PASSWORD, displayName, emailVerified: true });
    }
    await admin.firestore().collection("users").doc(record.uid).set({
      uid: record.uid, email, displayName, role, emailVerified: true, isActive: true, canCreateAdmins: false,
      ...(schemeId ? { schemeId, schemeName, schemeIds: [schemeId], schemeNames: { [schemeId]: schemeName }, activeSchemeId: schemeId } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`seeded ${role}: ${email}  /  ${PASSWORD}  (uid ${record.uid})`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
