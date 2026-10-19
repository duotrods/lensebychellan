import { describe, it, expect } from "vitest";
import alertHelpers from "../../../functions/schemeAlerts.js";

const { normalizeEmails, findScheme, getRecipients, getReportRecipients, sendsReport, getUptimeSchemes } = alertHelpers;

const schemes = [
  { id: "M48", fullName: "M48 - Severn Bridge" },
  { id: "Gallows", fullName: "Gallows Corner - Costain", legacyIds: ["Costain"], legacyNames: ["Costain - Gallows Corner"] },
  { id: "A66-WJ", fullName: "A66 - WJ Scheme 1", reports: { avera: true, wideload: false } },
  { id: "NEW1", fullName: "NEW1 - Acme", reports: { avera: true } },
];
const staticRecipients = {
  "Gallows Corner - Costain": ["static-gallows@x.com"],
  "M48 - Severn Bridge": ["static-m48@x.com"],
  default: ["default@x.com"],
};

describe("normalizeEmails", () => {
  it("splits comma/space separated strings, dedupes and drops non-emails", () => {
    expect(normalizeEmails(["a@x.com, b@y.com", "a@x.com", "nope"])).toEqual(["a@x.com", "b@y.com"]);
    expect(normalizeEmails(null)).toEqual([]);
    expect(normalizeEmails("a@x.com;b@y.com")).toEqual(["a@x.com", "b@y.com"]);
  });
});

describe("findScheme", () => {
  it("matches id, full name, legacy id and legacy name", () => {
    expect(findScheme("A66-WJ", schemes).id).toBe("A66-WJ");
    expect(findScheme("A66 - WJ Scheme 1", schemes).id).toBe("A66-WJ");
    expect(findScheme("Costain", schemes).id).toBe("Gallows");
    expect(findScheme("Costain - Gallows Corner", schemes).id).toBe("Gallows");
    expect(findScheme("Unknown", schemes)).toBeNull();
    expect(findScheme(undefined, schemes)).toBeNull();
  });
});

describe("getRecipients", () => {
  const base = { schemes, staticRecipients };

  it("prefers recipients saved for the scheme", () => {
    const alerts = { Gallows: { incidentRecipients: ["saved@x.com"] } };
    expect(getRecipients({ ...base, kind: "incident", scheme: "Gallows Corner - Costain", alerts })).toEqual(["saved@x.com"]);
  });

  it("uses the right field per kind", () => {
    const alerts = { Gallows: { incidentRecipients: ["inc@x.com"], cctvFaultRecipients: ["fault@x.com"] } };
    expect(getRecipients({ ...base, kind: "cctvFault", scheme: "Gallows Corner - Costain", alerts })).toEqual(["fault@x.com"]);
  });

  it("falls back to static config when nothing is saved", () => {
    expect(getRecipients({ ...base, kind: "incident", scheme: "Gallows Corner - Costain", alerts: {} })).toEqual(["static-gallows@x.com"]);
  });

  it("resolves an old name or id to the current static entry", () => {
    expect(getRecipients({ ...base, kind: "incident", scheme: "Costain - Gallows Corner", alerts: {} })).toEqual(["static-gallows@x.com"]);
    expect(getRecipients({ ...base, kind: "incident", scheme: "x", schemeId: "Costain", alerts: {} })).toEqual(["static-gallows@x.com"]);
  });

  it("matches M48 by id even if the stored name was misspelled", () => {
    expect(getRecipients({ ...base, kind: "incident", scheme: "M48 - Seven Bridge", schemeId: "M48", alerts: {} })).toEqual(["static-m48@x.com"]);
  });

  it("ignores saved recipients that contain no valid emails", () => {
    const alerts = { M48: { incidentRecipients: ["", "not-an-email"] } };
    expect(getRecipients({ ...base, kind: "incident", scheme: "M48 - Severn Bridge", alerts })).toEqual(["static-m48@x.com"]);
  });

  it("falls back to default for unknown or brand-new schemes with no recipients", () => {
    expect(getRecipients({ ...base, kind: "incident", scheme: "NEW1 - Acme", alerts: {} })).toEqual(["default@x.com"]);
    expect(getRecipients({ ...base, kind: "incident", scheme: "Nobody", alerts: {} })).toEqual(["default@x.com"]);
  });
});

describe("sendsReport", () => {
  const staticSchemes = ["Simister Island - Costain", "A66 - WJ Scheme 1"];

  it("uses the flag on the scheme when it is set", () => {
    expect(sendsReport({ kind: "avera", scheme: "NEW1 - Acme", schemes, staticSchemes })).toBe(true);
    expect(sendsReport({ kind: "wideload", scheme: "A66 - WJ Scheme 1", schemes, staticSchemes })).toBe(false);
  });

  it("uses the static list when the scheme has no flag", () => {
    expect(sendsReport({ kind: "avera", scheme: "Simister Island - Costain", schemes, staticSchemes })).toBe(true);
    expect(sendsReport({ kind: "avera", scheme: "M48 - Severn Bridge", schemes, staticSchemes })).toBe(false);
  });
});

describe("getUptimeSchemes", () => {
  const fallbacks = [
    { id: "A66-WJ", fullName: "A66 - WJ Scheme 1", cameras: ["CAM 1", "CAM 2"], recipients: "static@x.com" },
  ];

  it("keeps A66 on with its static recipient when nothing has been edited", () => {
    const docs = [{ id: "A66-WJ", fullName: "A66 - WJ Scheme 1", cameras: ["All Working Correctly", "CAM 1"] }];
    expect(getUptimeSchemes({ schemes: docs, alerts: {}, fallbacks })).toEqual([
      { id: "A66-WJ", fullName: "A66 - WJ Scheme 1", cameras: ["CAM 1"], recipients: ["static@x.com"] },
    ]);
  });

  it("uses saved recipients over the static one", () => {
    const docs = [{ id: "A66-WJ", fullName: "A66 - WJ Scheme 1", cameras: ["CAM 1"] }];
    const alerts = { "A66-WJ": { uptimeRecipients: ["new@x.com"] } };
    expect(getUptimeSchemes({ schemes: docs, alerts, fallbacks })[0].recipients).toEqual(["new@x.com"]);
  });

  it("turns a scheme off when the admin flag is false", () => {
    const docs = [{ id: "A66-WJ", fullName: "A66 - WJ Scheme 1", cameras: ["CAM 1"], reports: { uptime: false } }];
    expect(getUptimeSchemes({ schemes: docs, alerts: {}, fallbacks })).toEqual([]);
  });

  it("enables a new scheme only with cameras and recipients", () => {
    const docs = [
      { id: "NEW1", fullName: "NEW1 - Acme", cameras: ["C1"], reports: { uptime: true } },
      { id: "NEW2", fullName: "NEW2 - Acme", cameras: ["C1"], reports: { uptime: true } },
      { id: "NEW3", fullName: "NEW3 - Acme", cameras: [], reports: { uptime: true } },
    ];
    const alerts = { NEW1: { uptimeRecipients: ["a@x.com"] }, NEW3: { uptimeRecipients: ["a@x.com"] } };
    const out = getUptimeSchemes({ schemes: docs, alerts, fallbacks: [] });
    expect(out.map((s) => s.id)).toEqual(["NEW1"]);
  });

  it("skips archived schemes", () => {
    const docs = [{ id: "A66-WJ", fullName: "A66 - WJ Scheme 1", cameras: ["CAM 1"], active: false }];
    expect(getUptimeSchemes({ schemes: docs, alerts: {}, fallbacks })).toEqual([]);
  });

  it("falls back to the static scheme when schemes could not be read", () => {
    const out = getUptimeSchemes({ schemes: [], alerts: {}, fallbacks });
    expect(out.map((s) => s.id)).toEqual(["A66-WJ"]);
  });
});

describe("getReportRecipients", () => {
  const docs = [{ id: "A66-WJ", fullName: "A66 - WJ Scheme 1" }];

  it("uses the recipients saved for the scheme", () => {
    const alerts = { "A66-WJ": { averaRecipients: ["a@x.com", "b@x.com"] } };
    expect(
      getReportRecipients({ kind: "avera", scheme: "A66 - WJ Scheme 1", schemes: docs, alerts, fallback: "def@x.com" }),
    ).toEqual(["a@x.com", "b@x.com"]);
  });

  it("falls back to the single address from code (split if it holds several)", () => {
    expect(
      getReportRecipients({ kind: "wideload", scheme: "A66 - WJ Scheme 1", schemes: docs, alerts: {}, fallback: "a@x.com, b@x.com" }),
    ).toEqual(["a@x.com", "b@x.com"]);
  });

  it("keeps avera and wideload lists separate", () => {
    const alerts = { "A66-WJ": { averaRecipients: ["a@x.com"] } };
    expect(
      getReportRecipients({ kind: "wideload", scheme: "A66", schemeId: "A66-WJ", schemes: docs, alerts, fallback: "w@x.com" }),
    ).toEqual(["w@x.com"]);
  });
});

describe("sendsReport defaultOn (Lense Assist)", () => {
  const docs = [
    { id: "A", fullName: "A - X", reports: { lenseAssist: false } },
    { id: "B", fullName: "B - X" },
  ];
  it("is on unless the scheme turns it off", () => {
    const args = { kind: "lenseAssist", schemes: docs, defaultOn: true };
    expect(sendsReport({ ...args, scheme: "A - X" })).toBe(false);
    expect(sendsReport({ ...args, scheme: "B - X" })).toBe(true);
    expect(sendsReport({ ...args, scheme: "Unknown" })).toBe(true);
  });
});
