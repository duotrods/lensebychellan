import { describe, it, expect } from "vitest";
import { normalizeSchemeIds } from "./schemes";

describe("normalizeSchemeIds", () => {
  it("returns the array as-is", () => expect(normalizeSchemeIds({ schemeIds: ["M3", "A47"] })).toEqual(["M3", "A47"]));
  it("wraps a string schemeIds", () => expect(normalizeSchemeIds({ schemeIds: "M3" })).toEqual(["M3"]));
  it("ignores a non-array object", () => expect(normalizeSchemeIds({ schemeIds: { 0: "M3" }, schemeId: "A47" })).toEqual(["A47"]));
  it("falls back to legacy schemeId", () => expect(normalizeSchemeIds({ schemeIds: [], schemeId: "A47" })).toEqual(["A47"]));
  it("handles missing data", () => { expect(normalizeSchemeIds({})).toEqual([]); expect(normalizeSchemeIds(null)).toEqual([]); });
});
