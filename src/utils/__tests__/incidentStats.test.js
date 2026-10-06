import { describe, it, expect } from "vitest";
import { countVehicles, isPureIncident, isDriveOff, isUntimedIncident } from "../incidentStats";

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

  it("is false when there is an incursion to gain advantage", () => {
    expect(
      isPureIncident({ incidentType: "Breakdown", incursionToGainAdvantage: "YES" }),
    ).toBe(false);
  });
});

describe("isDriveOff", () => {
  it("is true when the incident type is Drive Off", () => {
    expect(isDriveOff({ incidentType: "Drive Off" })).toBe(true);
  });

  it("is true when the fault is Drive Off", () => {
    expect(isDriveOff({ incidentType: "Breakdown", fault: "Drive Off" })).toBe(true);
  });

  it("is false for any other incident", () => {
    expect(isDriveOff({ incidentType: "Breakdown", fault: "Tyre" })).toBe(false);
    expect(isDriveOff({ incidentType: "Free Recovery" })).toBe(false);
  });

  it("is false for empty or missing records", () => {
    expect(isDriveOff({})).toBe(false);
    expect(isDriveOff(null)).toBe(false);
    expect(isDriveOff(undefined)).toBe(false);
  });
});

describe("isUntimedIncident", () => {
  it("is true for a drive off, whether logged as the incident type or the fault", () => {
    expect(isUntimedIncident({ incidentType: "Drive Off" })).toBe(true);
    expect(isUntimedIncident({ incidentType: "Breakdown", fault: "Drive Off" })).toBe(true);
  });

  it("is true for a Third Party Recovery", () => {
    expect(isUntimedIncident({ incidentType: "Third Party Recovery" })).toBe(true);
  });

  it("is false for an ordinary incident, including a Free Recovery", () => {
    expect(isUntimedIncident({ incidentType: "RTC", fault: "Puncture" })).toBe(false);
    expect(isUntimedIncident({ incidentType: "Free Recovery" })).toBe(false);
  });

  it("is false for empty or missing records", () => {
    expect(isUntimedIncident({})).toBe(false);
    expect(isUntimedIncident(null)).toBe(false);
    expect(isUntimedIncident(undefined)).toBe(false);
  });
});
