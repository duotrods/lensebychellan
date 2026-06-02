import { describe, it, expect } from "vitest";
import { countVehicles, isPureIncident } from "../incidentStats";

describe("countVehicles", () => {
  it("returns 0 when recoveryRequested is missing", () => {
    expect(countVehicles({})).toBe(0);
    expect(countVehicles({ recoveryRequested: null })).toBe(0);
    expect(countVehicles(undefined)).toBe(0);
  });

  it("returns 0 when recoveryRequested is not an object", () => {
    expect(countVehicles({ recoveryRequested: "two" })).toBe(0);
  });

  it("sums all recovery vehicle types", () => {
    expect(
      countVehicles({ recoveryRequested: { light: 1, heavy: 2, ipv: 3, hetos: 4 } }),
    ).toBe(10);
  });

  it("treats missing vehicle fields as 0", () => {
    expect(countVehicles({ recoveryRequested: { light: 2 } })).toBe(2);
  });
});

describe("isPureIncident", () => {
  it("is true for an ordinary incident with no exclusions", () => {
    expect(
      isPureIncident({ incidentType: "Breakdown", incursion: "NO", propertyDamage: false }),
    ).toBe(true);
  });

  it("is false for Free Recovery and Drive Off", () => {
    expect(isPureIncident({ incidentType: "Free Recovery" })).toBe(false);
    expect(isPureIncident({ incidentType: "Drive Off" })).toBe(false);
  });

  it("is false when there is an incursion", () => {
    expect(isPureIncident({ incidentType: "Breakdown", incursion: "YES" })).toBe(false);
  });

  it("is false when there is property damage", () => {
    expect(
      isPureIncident({ incidentType: "Breakdown", propertyDamage: true }),
    ).toBe(false);
  });
});
