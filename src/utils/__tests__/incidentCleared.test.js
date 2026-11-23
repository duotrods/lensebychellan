import { describe, it, expect } from "vitest";
import { getClearedMs, sortByLatestCleared } from "../incidentCleared";

const at = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi).getTime();
const ts = (ms) => ({ toMillis: () => ms });

describe("getClearedMs", () => {
  it("places HH:MM on the day the incident was created", () => {
    const i = { createdAt: ts(at(2026, 4, 10, 9, 0)), timeSpotted: "09:00", timeCleared: "11:30" };
    expect(getClearedMs(i)).toBe(at(2026, 4, 10, 11, 30));
  });

  it("rolls to the next day when cleared is earlier than spotted (past midnight)", () => {
    const i = { createdAt: ts(at(2026, 4, 10, 23, 0)), timeSpotted: "23:00", timeCleared: "01:15" };
    expect(getClearedMs(i)).toBe(at(2026, 4, 11, 1, 15));
  });

  it("falls back to createdAt when there is no usable cleared time", () => {
    const created = at(2026, 4, 10, 9, 0);
    expect(getClearedMs({ createdAt: ts(created), timeCleared: "" })).toBe(created);
    expect(getClearedMs({ createdAt: ts(created), timeCleared: "N/A" })).toBe(created);
  });
});

describe("sortByLatestCleared", () => {
  it("puts the most recently cleared incident first, not the most recently created", () => {
    const r = sortByLatestCleared([
      { id: "created-later-cleared-early", createdAt: ts(at(2026, 4, 10, 12, 0)), timeSpotted: "12:00", timeCleared: "12:20" },
      { id: "created-early-cleared-late", createdAt: ts(at(2026, 4, 10, 8, 0)), timeSpotted: "08:00", timeCleared: "15:00" },
    ]);
    expect(r.map((i) => i.id)).toEqual(["created-early-cleared-late", "created-later-cleared-early"]);
  });

  it("does not mutate the input", () => {
    const input = [
      { id: "a", createdAt: ts(1000) },
      { id: "b", createdAt: ts(2000) },
    ];
    sortByLatestCleared(input);
    expect(input.map((i) => i.id)).toEqual(["a", "b"]);
  });
});
