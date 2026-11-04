import { describe, it, expect } from "vitest";
import { hasLenseAssist, lenseAssistIneligibleReason } from "../lenseAssist";

describe("lenseAssistIneligibleReason", () => {
  it("is null for internal staff and clients", () => {
    expect(lenseAssistIneligibleReason({ role: "staff", schemeIds: ["A417"] })).toBeNull();
    expect(lenseAssistIneligibleReason({ role: "client", schemeIds: ["M3"] })).toBeNull();
  });

  it("flags third-party roles", () => {
    expect(lenseAssistIneligibleReason({ role: "thirdpartystaff" })).toBe("Third-party account");
    expect(lenseAssistIneligibleReason({ role: "thirdpartyclient" })).toBe("Third-party account");
  });

  it("flags demo-scheme users", () => {
    expect(lenseAssistIneligibleReason({ role: "staff", schemeIds: ["DMO1"] })).toBe("Demo scheme");
  });
});

describe("hasLenseAssist", () => {
  it("treats a missing field as on", () => {
    expect(hasLenseAssist({ role: "staff", schemeIds: ["A417"] })).toBe(true);
  });

  it("respects an explicit false and true", () => {
    expect(hasLenseAssist({ role: "staff", schemeIds: ["A417"], lenseAssist: false })).toBe(false);
    expect(hasLenseAssist({ role: "staff", schemeIds: ["A417"], lenseAssist: true })).toBe(true);
  });

  it("never grants ineligible users, even with the flag on", () => {
    expect(hasLenseAssist({ role: "thirdpartystaff", lenseAssist: true })).toBe(false);
    expect(hasLenseAssist({ role: "client", schemeIds: ["DMO1"], lenseAssist: true })).toBe(false);
  });

  it("is false without a profile", () => {
    expect(hasLenseAssist(null)).toBe(false);
  });
});
