import { describe, it, expect } from "vitest";
import {
  getReferenceConfig,
  getCounterName,
  formatReferenceId,
} from "../referenceFormat";

describe("getReferenceConfig", () => {
  it("returns config for a known type", () => {
    expect(getReferenceConfig("incident")).toMatchObject({
      prefix: "IN",
      counterName: "incidentReports",
    });
  });

  it("throws for an unknown type", () => {
    expect(() => getReferenceConfig("nope")).toThrow("Unknown form type: nope");
  });
});

describe("getCounterName", () => {
  const config = getReferenceConfig("incident");

  it("uses the base counter by default", () => {
    expect(getCounterName(config)).toBe("incidentReports");
  });

  it("uses a demo counter for demo submissions", () => {
    expect(getCounterName(config, { isDemo: true })).toBe("incidentReports_demo");
  });
});

describe("formatReferenceId", () => {
  const config = getReferenceConfig("incident");

  it("zero-pads the number to the configured width", () => {
    expect(formatReferenceId(config, 1)).toBe("IN01");
    expect(formatReferenceId(config, 42)).toBe("IN42");
    expect(formatReferenceId(config, 100)).toBe("IN100");
  });

  it("appends -DEMO for demo submissions", () => {
    expect(formatReferenceId(config, 3, { isDemo: true })).toBe("IN03-DEMO");
  });
});
