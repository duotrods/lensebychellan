import { describe, it, expect } from "vitest";
import {
  formatDateToBritish,
  minutesBetween,
  calculateTimeDifferences,
  findImplausibleTimeGaps,
  MAX_PLAUSIBLE_GAP_MINUTES,
  formatDuration,
  formatTime12h,
} from "../incidentForm";

describe("formatDateToBritish", () => {
  it("formats as DD/MM/YYYY with zero padding", () => {
    expect(formatDateToBritish(new Date(2026, 0, 5))).toBe("05/01/2026");
    expect(formatDateToBritish(new Date(2026, 11, 25))).toBe("25/12/2026");
  });
});

describe("minutesBetween", () => {
  it("returns the minute difference within the same day", () => {
    expect(minutesBetween("10:00", "10:30")).toBe(30);
    expect(minutesBetween("09:15", "11:00")).toBe(105);
  });

  it("wraps past midnight", () => {
    expect(minutesBetween("23:30", "00:15")).toBe(45);
  });

  it("returns null when a time is missing", () => {
    expect(minutesBetween("", "10:00")).toBeNull();
    expect(minutesBetween("10:00", null)).toBeNull();
  });
});

describe("calculateTimeDifferences", () => {
  it("derives both duration fields", () => {
    const result = calculateTimeDifferences({
      timeSpotted: "10:00",
      timeOnSite: "10:20",
      timeCleared: "11:00",
    });
    expect(result.timeSpottedToOn).toBe("20 mins");
    expect(result.timeOnsiteToCleared).toBe("40 mins");
  });

  it("leaves duration fields unset when inputs are incomplete", () => {
    const result = calculateTimeDifferences({ timeSpotted: "10:00" });
    expect(result.timeSpottedToOn).toBeUndefined();
    expect(result.timeOnsiteToCleared).toBeUndefined();
  });

  it("preserves the original data", () => {
    const result = calculateTimeDifferences({ scheme: "M3", timeSpotted: "10:00", timeOnSite: "10:05" });
    expect(result.scheme).toBe("M3");
    expect(result.timeSpottedToOn).toBe("5 mins");
  });
});

describe("findImplausibleTimeGaps", () => {
  it("flags a typo that wraps to the next day (spotted 19:56, on site 05:55)", () => {
    const gaps = findImplausibleTimeGaps({ timeSpotted: "19:56", timeOnSite: "05:55" });
    expect(gaps).toEqual([
      {
        label: "Time Spotted → Time On Site",
        from: "19:56",
        to: "05:55",
        minutes: 599,
        wrapsPastMidnight: true,
      },
    ]);
  });

  it("flags a long gap on the same day, such as an AM/PM slip", () => {
    const gaps = findImplausibleTimeGaps({ timeSpotted: "07:56", timeOnSite: "17:55" });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].minutes).toBe(599);
    expect(gaps[0].wrapsPastMidnight).toBe(false);
  });

  it("does not flag a genuine overnight incident with a short gap", () => {
    expect(
      findImplausibleTimeGaps({ timeSpotted: "23:50", timeOnSite: "00:05", timeCleared: "00:40" }),
    ).toEqual([]);
  });

  it("flags only gaps strictly over the limit", () => {
    expect(MAX_PLAUSIBLE_GAP_MINUTES).toBe(180);
    expect(findImplausibleTimeGaps({ timeSpotted: "10:00", timeOnSite: "13:00" })).toEqual([]);
    expect(findImplausibleTimeGaps({ timeSpotted: "10:00", timeOnSite: "13:01" })).toHaveLength(1);
  });

  it("checks on site to cleared as well, and can flag both gaps", () => {
    const gaps = findImplausibleTimeGaps({
      timeSpotted: "08:00",
      timeOnSite: "14:00",
      timeCleared: "21:00",
    });
    expect(gaps.map((g) => g.label)).toEqual([
      "Time Spotted → Time On Site",
      "Time On Site → Time Cleared",
    ]);
  });

  it("ignores a pair when either time is missing", () => {
    expect(findImplausibleTimeGaps({ timeSpotted: "08:00" })).toEqual([]);
    expect(findImplausibleTimeGaps({ timeSpotted: "08:00", timeCleared: "20:00" })).toEqual([]);
    expect(findImplausibleTimeGaps({ timeSpotted: "08:00", timeOnSite: "" })).toEqual([]);
    expect(findImplausibleTimeGaps({})).toEqual([]);
  });
});

describe("formatDuration", () => {
  it("formats minutes as hours and minutes", () => {
    expect(formatDuration(599)).toBe("9h 59m");
    expect(formatDuration(180)).toBe("3h");
    expect(formatDuration(45)).toBe("45m");
  });
});

describe("formatTime12h", () => {
  it("converts a 24-hour time to the 12-hour form the browser shows", () => {
    expect(formatTime12h("19:56")).toBe("7:56 PM");
    expect(formatTime12h("05:55")).toBe("5:55 AM");
    expect(formatTime12h("00:05")).toBe("12:05 AM");
    expect(formatTime12h("12:30")).toBe("12:30 PM");
  });
});
