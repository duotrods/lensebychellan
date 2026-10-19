import { describe, it, expect, afterEach } from "vitest";
import {
  extractSchemeId,
  isDemoUser,
  isDemoScheme,
  getThirdPartySchemeById,
  getSchemesForUser,
  getViewerSchemeScope,
  getViewerReadScope,
  getSchemeById,
  getSchemeByFullName,
  getInternalSchemeIds,
  setSchemes,
  resetSchemesToStatic,
  getStaticSchemeDocs,
  isStaticSchemeId,
  schemeSendsReport,
  SCHEMES,
  THIRD_PARTY_SCHEMES,
  CAMERA_OPTIONS_BY_SCHEME,
  DEMO_SCHEME_ID,
} from "../schemes";

describe("extractSchemeId", () => {
  it("maps a known full name to its scheme id", () => {
    expect(extractSchemeId("M3 Jct 9 - Balfour Beatty")).toBe("M3");
    expect(extractSchemeId("A417 Missing Link - Kier")).toBe("A417");
  });

  it("falls back to the first word for unknown names", () => {
    expect(extractSchemeId("UNKNOWN Some Scheme")).toBe("UNKNOWN");
  });

  it("returns null for empty input", () => {
    expect(extractSchemeId("")).toBeNull();
    expect(extractSchemeId(null)).toBeNull();
  });
});

describe("isDemoUser", () => {
  it("detects demo via schemeIds array", () => {
    expect(isDemoUser({ schemeIds: ["A417", DEMO_SCHEME_ID] })).toBe(true);
  });

  it("detects demo via legacy single schemeId", () => {
    expect(isDemoUser({ schemeId: DEMO_SCHEME_ID })).toBe(true);
  });

  it("is false for non-demo users and missing profile", () => {
    expect(isDemoUser({ schemeIds: ["A417"] })).toBe(false);
    expect(isDemoUser(null)).toBe(false);
  });
});

describe("isDemoScheme / getThirdPartySchemeById", () => {
  it("identifies the demo scheme id", () => {
    expect(isDemoScheme(DEMO_SCHEME_ID)).toBe(true);
    expect(isDemoScheme("A417")).toBe(false);
  });

  it("returns a third-party scheme object or null", () => {
    expect(getThirdPartySchemeById("A66-WJ")).toMatchObject({ id: "A66-WJ" });
    expect(getThirdPartySchemeById("A417")).toBeNull();
    expect(getThirdPartySchemeById(null)).toBeNull();
  });
});

describe("getSchemesForUser", () => {
  it("restricts a client to only their own assigned schemes", () => {
    const result = getSchemesForUser({
      role: "client",
      schemeIds: ["A417", "M3"],
    });
    expect(result.map((s) => s.id).sort()).toEqual(["A417", "M3"]);
  });

  it("falls back to legacy schemeId for a client with no schemeIds array", () => {
    const result = getSchemesForUser({ role: "client", schemeId: "A47" });
    expect(result.map((s) => s.id)).toEqual(["A47"]);
  });

  it("does not leak schemes a client isn't assigned to", () => {
    const result = getSchemesForUser({ role: "client", schemeIds: ["A417"] });
    expect(result.some((s) => s.id === "M3")).toBe(false);
  });
});

describe("getViewerReadScope", () => {
  it("adds the legacy Costain id for internal viewers, without changing the write scope", () => {
    const staff = { role: "liveoperator" };
    expect(getViewerReadScope(staff)).toEqual(
      expect.arrayContaining(["Gallows", "Costain"]),
    );
    expect(getViewerSchemeScope(staff)).not.toContain("Costain");
  });

  it("does not add legacy ids for demo or third-party viewers", () => {
    expect(getViewerReadScope({ schemeIds: [DEMO_SCHEME_ID] })).toEqual([DEMO_SCHEME_ID]);
    expect(getViewerReadScope({ role: "thirdpartyliveoperator", company: "WJ" })).not.toContain("Costain");
  });
});

describe("scheme registry", () => {
  afterEach(() => resetSchemesToStatic());

  it("seeded docs reproduce the static lists exactly (parity)", () => {
    const snapshot = () =>
      JSON.parse(JSON.stringify({ SCHEMES, THIRD_PARTY_SCHEMES, CAMERA_OPTIONS_BY_SCHEME }));
    const before = snapshot();
    expect(setSchemes(getStaticSchemeDocs())).toBe(true);
    expect(snapshot()).toEqual(before);
  });

  it("empty or invalid input keeps the static schemes", () => {
    expect(setSchemes([])).toBe(false);
    expect(setSchemes(null)).toBe(false);
    expect(setSchemes([{ id: "X" }])).toBe(false);
    expect(SCHEMES.map((s) => s.id)).toContain("A417");
  });

  it("a partial collection never removes static schemes", () => {
    setSchemes([{ id: "A417", type: "internal", fullName: "A417 Missing Link - Kier", shortName: "A417 ML", contractor: "Kier" }]);
    expect(SCHEMES.map((s) => s.id)).toEqual(expect.arrayContaining(["A417", "M3", "Gallows"]));
    expect(getSchemeById("A417").shortName).toBe("A417 ML");
  });

  it("adds new internal and third-party schemes", () => {
    setSchemes([
      { id: "N1", type: "internal", fullName: "N1 New - Acme", shortName: "N1", contractor: "Acme", cameras: ["CAM 1"] },
      { id: "TP2", type: "thirdparty", fullName: "TP2 - Co", company: "Co", cameras: ["CAM 1"] },
    ]);
    expect(getSchemeById("N1").fullName).toBe("N1 New - Acme");
    expect(CAMERA_OPTIONS_BY_SCHEME.N1).toEqual(["CAM 1"]);
    expect(getThirdPartySchemeById("TP2")).toMatchObject({ company: "Co" });
    expect(extractSchemeId("N1 New - Acme")).toBe("N1");
    expect(getSchemesForUser({ role: "thirdpartystaff", company: "Co" }).map((s) => s.id)).toEqual(["TP2"]);
  });

  it("archived schemes leave dropdowns but still resolve names and ids", () => {
    setSchemes([{ id: "M48", type: "internal", fullName: "M48 - Severn Bridge", active: false }]);
    expect(getSchemesForUser({ role: "staff" }).map((s) => s.id)).not.toContain("M48");
    expect(getSchemeById("M48").fullName).toBe("M48 - Severn Bridge");
    expect(extractSchemeId("M48 - Severn Bridge")).toBe("M48");
    expect(getInternalSchemeIds()).not.toContain("M48");
  });

  it("archived internal schemes stay in the read scope for internal viewers only", () => {
    setSchemes([{ id: "M48", type: "internal", fullName: "M48 - Severn Bridge", active: false }]);
    expect(getViewerReadScope({ role: "liveoperator" })).toContain("M48");
    expect(getViewerSchemeScope({ role: "liveoperator" })).not.toContain("M48");
    expect(getViewerReadScope({ schemeIds: [DEMO_SCHEME_ID] })).toEqual([DEMO_SCHEME_ID]);
  });

  it("legacy ids come from scheme data and survive a seeded reload", () => {
    setSchemes(getStaticSchemeDocs());
    expect(getViewerReadScope({ role: "liveoperator" })).toContain("Costain");
    expect(getSchemeByFullName("Gallows Corner - Costain").id).toBe("Gallows");
  });
});

describe("schemeSendsReport", () => {
  afterEach(() => resetSchemesToStatic());

  it("reads the static Avera/Wideload flags by id, name or old name", () => {
    expect(schemeSendsReport("avera", "Simister Island - Costain")).toBe(true);
    expect(schemeSendsReport("avera", "x", "A66-WJ")).toBe(true);
    expect(schemeSendsReport("wideload", "A66 - WJ Scheme 1")).toBe(true);
    expect(schemeSendsReport("wideload", "Simister Island - Costain")).toBe(false);
    expect(schemeSendsReport("avera", "M3 Jct 9 - Balfour Beatty")).toBe(false);
    expect(schemeSendsReport("avera", undefined)).toBe(false);
  });

  it("follows flags set in the admin page", () => {
    setSchemes([{ id: "N1", type: "internal", fullName: "N1 New - Acme", reports: { avera: true } }]);
    expect(schemeSendsReport("avera", "N1 New - Acme")).toBe(true);
    expect(schemeSendsReport("wideload", "N1 New - Acme")).toBe(false);
    setSchemes([{ id: "A66-WJ", type: "thirdparty", fullName: "A66 - WJ Scheme 1", company: "WJ", reports: { avera: false, wideload: false } }]);
    expect(schemeSendsReport("avera", "A66 - WJ Scheme 1")).toBe(false);
  });
});

describe("isStaticSchemeId", () => {
  afterEach(() => resetSchemesToStatic());

  it("is true for schemes defined in code, false for admin-added ones", () => {
    expect(isStaticSchemeId("A417")).toBe(true);
    expect(isStaticSchemeId("A66-WJ")).toBe(true);
    setSchemes([{ id: "N1", type: "internal", fullName: "N1 New - Acme" }]);
    expect(isStaticSchemeId("N1")).toBe(false);
  });
});
