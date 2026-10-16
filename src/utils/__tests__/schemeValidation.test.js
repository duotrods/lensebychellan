import { describe, it, expect } from "vitest";
import { validateNewScheme, validateSchemeUpdate, validateRecipients } from "../schemeValidation";

const existing = [
  { id: "A417", fullName: "A417 Missing Link - Kier" },
  { id: "Gallows", fullName: "Gallows Corner - Costain", legacyIds: ["Costain"], legacyNames: ["Costain - Gallows Corner"] },
];

describe("validateNewScheme", () => {
  it("accepts a valid internal scheme and trims input", () => {
    const r = validateNewScheme({ id: " N1 ", fullName: " N1 New - Acme ", cameras: ["CAM 1", "CAM 1", " "] }, existing);
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({ id: "N1", type: "internal", fullName: "N1 New - Acme", shortName: "N1 New - Acme", cameras: ["CAM 1"], active: true });
  });

  it("rejects bad ids and missing names", () => {
    expect(validateNewScheme({ id: "a b", fullName: "x" }, existing).ok).toBe(false);
    expect(validateNewScheme({ id: "A/B", fullName: "x" }, existing).ok).toBe(false);
    expect(validateNewScheme({ id: "N1", fullName: "" }, existing).ok).toBe(false);
  });

  it("requires a company for third-party schemes", () => {
    expect(validateNewScheme({ id: "TP9", type: "thirdparty", fullName: "TP9" }, existing).ok).toBe(false);
    expect(validateNewScheme({ id: "TP9", type: "thirdparty", fullName: "TP9", company: "Co" }, existing).ok).toBe(true);
  });

  it("rejects ids, names and legacy values already used by any scheme", () => {
    expect(validateNewScheme({ id: "A417", fullName: "New" }, existing).ok).toBe(false);
    expect(validateNewScheme({ id: "N2", fullName: "A417 Missing Link - Kier" }, existing).ok).toBe(false);
    expect(validateNewScheme({ id: "Costain", fullName: "New" }, existing).ok).toBe(false);
    expect(validateNewScheme({ id: "N3", fullName: "New", legacyIds: ["A417"] }, existing).ok).toBe(false);
  });
});

describe("validateSchemeUpdate", () => {
  const current = { id: "A417", fullName: "A417 Missing Link - Kier", type: "internal" };

  it("rejects changes to id, fullName and type", () => {
    expect(validateSchemeUpdate(current, { fullName: "Renamed" }).ok).toBe(false);
    expect(validateSchemeUpdate(current, { id: "X" }).ok).toBe(false);
    expect(validateSchemeUpdate(current, { type: "thirdparty" }).ok).toBe(false);
  });

  it("allows display fields and archiving, and ignores identical immutable values", () => {
    const r = validateSchemeUpdate(current, { fullName: current.fullName, shortName: "A417 ML", cameras: ["C1", "C1"], active: false });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ shortName: "A417 ML", cameras: ["C1"], active: false });
  });
});

describe("validateRecipients", () => {
  it("trims, de-duplicates and drops blanks", () => {
    expect(validateRecipients([" a@x.com ", "a@x.com", "", "b@y.co.uk"])).toEqual({
      ok: true,
      errors: [],
      value: ["a@x.com", "b@y.co.uk"],
    });
    expect(validateRecipients(undefined).value).toEqual([]);
  });

  it("flags invalid addresses, including several packed into one entry", () => {
    expect(validateRecipients(["not-an-email"]).ok).toBe(false);
    expect(validateRecipients(["a@x.com, b@y.com"]).ok).toBe(false);
    expect(validateRecipients(["a@x"]).ok).toBe(false);
  });
});

describe("validateSchemeUpdate reports flag", () => {
  it("normalises the report flags to booleans", () => {
    const r = validateSchemeUpdate({ id: "A", fullName: "A", type: "internal" }, { reports: { avera: 1 } });
    expect(r.value.reports).toEqual({ avera: true, wideload: false });
  });
});
