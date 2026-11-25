import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let env;

// A signed-in, email-verified, 2FA-passed user (the claims every data rule needs).
const as = (uid) =>
  env
    .authenticatedContext(uid, { email_verified: true, mfaAuthTime: 100, auth_time: 100 })
    .firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/staff1"), { role: "staff", schemeIds: ["M3"] });
    await setDoc(doc(db, "users/clientM3"), { role: "client", schemeIds: ["M3"] });
    await setDoc(doc(db, "users/clientA47"), { role: "client", schemeIds: ["A47"] });
    await setDoc(doc(db, "users/tpstaff"), { role: "thirdpartystaff", schemeIds: ["M3"] });
    await setDoc(doc(db, "incidentReports/r1"), { schemeIds: ["M3"] });
    await setDoc(doc(db, "clientOTPs/CODE1"), { isUsed: false });
    await setDoc(doc(db, "cctvUptimeCache/M3_30d"), { schemeId: "M3", totals: {} });
  });
});

describe("users", () => {
  it("a new account cannot create its own user doc (so it cannot pick a role)", async () => {
    await assertFails(setDoc(doc(as("newbie"), "users/newbie"), { role: "admin" }));
  });
  it("a user cannot change their own role", async () => {
    await assertFails(updateDoc(doc(as("clientM3"), "users/clientM3"), { role: "admin" }));
  });
});

describe("access codes", () => {
  it("are not readable by a signed-in non-admin, or by the public", async () => {
    await assertFails(getDoc(doc(as("clientM3"), "clientOTPs/CODE1")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "clientOTPs/CODE1")));
  });
});

describe("reports", () => {
  it("a client reads a report of their own scheme only", async () => {
    await assertSucceeds(getDoc(doc(as("clientM3"), "incidentReports/r1")));
    await assertFails(getDoc(doc(as("clientA47"), "incidentReports/r1")));
  });
  it("staff can create a report", async () => {
    await assertSucceeds(setDoc(doc(as("staff1"), "incidentReports/r2"), { schemeIds: ["M3"] }));
  });
});

describe("caches", () => {
  it("a client cannot read or write another scheme's cache doc", async () => {
    await assertFails(getDoc(doc(as("clientA47"), "cctvUptimeCache/M3_30d")));
    await assertFails(setDoc(doc(as("clientA47"), "cctvUptimeCache/M3_30d"), { schemeId: "M3" }));
    await assertSucceeds(getDoc(doc(as("clientM3"), "cctvUptimeCache/M3_30d")));
  });
  it("a client cannot touch the dashboard count cache", async () => {
    await assertFails(setDoc(doc(as("clientM3"), "collectionStatsCache/incidentReports"), { count: 1 }));
  });
});

describe("rota", () => {
  it("third-party staff have no access", async () => {
    await assertFails(getDoc(doc(as("tpstaff"), "rotaShifts/s1")));
  });
});
