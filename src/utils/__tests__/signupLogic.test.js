import { describe, it, expect } from "vitest";
import { createRequire } from "module";

// registerWithCode's rules live in functions/ (CommonJS), shared with the Cloud Function.
const require = createRequire(import.meta.url);
const { SIGNUP_ROLES, codeProblem, codeUpdate, buildUserDoc } = require("../../../functions/signupLogic.js");
const { uploadKey } = require("../../../functions/r2Logic.js");

const NOW = new Date("2026-01-10T00:00:00Z");
const future = new Date("2026-02-01T00:00:00Z");
const past = new Date("2025-12-01T00:00:00Z");

describe("SIGNUP_ROLES", () => {
  it("has no admin entry, so a code can never grant admin", () => {
    expect(SIGNUP_ROLES.admin).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(SIGNUP_ROLES, "__proto__")).toBe(false);
  });
});

describe("codeProblem", () => {
  const single = SIGNUP_ROLES.client;
  const multi = SIGNUP_ROLES.staff;
  it("accepts a fresh single-use code", () => {
    expect(codeProblem({ isUsed: false, expiresAt: future }, single, NOW)).toBeNull();
  });
  it("refuses a missing, used or expired code", () => {
    expect(codeProblem(null, single, NOW)).toMatch(/Invalid/);
    expect(codeProblem({ isUsed: true, expiresAt: future }, single, NOW)).toMatch(/used/);
    expect(codeProblem({ isUsed: false, expiresAt: past }, single, NOW)).toMatch(/expired/);
  });
  it("uses usesRemaining for multi-use invite codes", () => {
    expect(codeProblem({ usesRemaining: 2, expiresAt: future }, multi, NOW)).toBeNull();
    expect(codeProblem({ usesRemaining: 0, expiresAt: future }, multi, NOW)).toMatch(/used/);
  });
});

describe("codeUpdate", () => {
  it("marks a single-use code used", () => {
    expect(codeUpdate({}, SIGNUP_ROLES.client, "u1", "T")).toEqual({ isUsed: true, usedBy: "u1", usedAt: "T" });
  });
  it("counts down a multi-use code and flags it used on the last use", () => {
    const u = codeUpdate({ usesRemaining: 1, usedBy: ["a"] }, SIGNUP_ROLES.staff, "b", "T");
    expect(u).toMatchObject({ usesRemaining: 0, isUsed: true, usedBy: ["a", "b"] });
  });
});

describe("buildUserDoc", () => {
  it("takes role and scheme from the code, never from the input", () => {
    const d = buildUserDoc({
      uid: "u1", email: "a@b.c", role: "client",
      input: { displayName: " Ann ", role: "admin", schemeIds: ["X"], canCreateAdmins: true },
      codeData: { schemeId: "M3", schemeName: "M3 Jct 9" }, kind: SIGNUP_ROLES.client, now: "T",
    });
    expect(d.role).toBe("client");
    expect(d.displayName).toBe("Ann");
    expect(d.schemeIds).toEqual(["M3"]);
    expect(d.activeSchemeId).toBe("M3");
    expect(d.canCreateAdmins).toBe(false);
  });
  it("takes company from a third-party code", () => {
    const d = buildUserDoc({
      uid: "u1", email: "a@b.c", role: "thirdpartystaff", input: { company: "Evil Ltd" },
      codeData: { company: "Acme" }, kind: SIGNUP_ROLES.thirdpartystaff, now: "T",
    });
    expect(d.company).toBe("Acme");
  });
});

describe("uploadKey", () => {
  it("puts the caller's uid in the key and cleans the file name", () => {
    expect(uploadKey("staff", "cctv-uploads", "u1", "../a b?.mp4", 5)).toBe("cctv-uploads/u1/5_.._a b_.mp4");
  });
  it("refuses a role that may not upload there, and unknown prefixes", () => {
    expect(uploadKey("client", "cctv-uploads", "u1", "a.mp4")).toBeNull();
    expect(uploadKey("staff", "../etc", "u1", "a.mp4")).toBeNull();
    expect(uploadKey("staff", "__proto__", "u1", "a.mp4")).toBeNull();
  });
});
