import { describe, it, expect } from "vitest";
import { clientDataService } from "../clientDataService";
import { isDriveOff } from "../../utils/incidentStats";

// Mirrors the filtering clientDataService.getSchemeStatsAndTimeSeriesByDateRange
// does before computing timing stats: incidents.filter((i) => !isDriveOff(i)).
describe("clientDataService timing stats exclude Drive Off", () => {
  const incidents = [
    { timeSpottedToOn: "10 mins", timeOnsiteToCleared: "20 mins" },
    { timeSpottedToOn: "30 mins", timeOnsiteToCleared: "40 mins" },
    {
      incidentType: "Drive Off",
      timeSpottedToOn: "999 mins",
      timeOnsiteToCleared: "999 mins",
    },
    {
      incidentType: "Breakdown",
      fault: "Drive Off",
      timeSpottedToOn: "999 mins",
      timeOnsiteToCleared: "999 mins",
    },
  ];

  it("calcAverageTimes ignores Drive Off records once filtered out", () => {
    const timedIncidents = incidents.filter((i) => !isDriveOff(i));
    const result = clientDataService.calcAverageTimes(timedIncidents);

    expect(result.avgTimeToSite).toBe(20); // (10 + 30) / 2
    expect(result.avgTimeToRecover).toBe(30); // (20 + 40) / 2
  });

  it("calcAverageTimes would be skewed if Drive Off records were left in", () => {
    const result = clientDataService.calcAverageTimes(incidents);

    expect(result.avgTimeToSite).not.toBe(20);
    expect(result.avgTimeToRecover).not.toBe(30);
  });

  it("groupByCalculatedTime buckets ignore Drive Off records once filtered out", () => {
    const timedIncidents = incidents.filter((i) => !isDriveOff(i));
    const buckets = clientDataService.groupByCalculatedTime(
      timedIncidents,
      "timeSpottedToOn",
    );

    // Only the two non-Drive-Off records (10 mins, 30 mins) should be counted.
    const total = Object.values(buckets).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(2);
  });
});
