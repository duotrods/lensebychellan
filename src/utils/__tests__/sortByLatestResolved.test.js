import { describe, it, expect } from "vitest";
import { sortByLatestResolved } from "../sortByLatestResolved";

const ts = (seconds) => ({ seconds });

describe("sortByLatestResolved", () => {
  it("puts the most recently resolved fault first, whatever its created date", () => {
    const r = sortByLatestResolved([
      { id: "old-created-late-resolved", createdAt: ts(100), completedAt: ts(900) },
      { id: "new-created-early-resolved", createdAt: ts(800), completedAt: ts(850) },
      { id: "mid", createdAt: ts(300), completedAt: ts(400) },
    ]);
    expect(r.map((f) => f.id)).toEqual(["old-created-late-resolved", "new-created-early-resolved", "mid"]);
  });

  it("falls back to createdAt when completedAt is missing", () => {
    const r = sortByLatestResolved([
      { id: "a", createdAt: ts(500) },
      { id: "b", createdAt: ts(100), completedAt: ts(600) },
    ]);
    expect(r.map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("accepts Timestamp-like objects with toMillis and does not mutate the input", () => {
    const input = [
      { id: "a", completedAt: { toMillis: () => 1000 * 1000 } },
      { id: "b", completedAt: { toMillis: () => 2000 * 1000 } },
    ];
    expect(sortByLatestResolved(input).map((f) => f.id)).toEqual(["b", "a"]);
    expect(input.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
