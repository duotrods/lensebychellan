import { describe, it, expect } from "vitest";
import { mergeSpottedByAliases, canonicalSpottedBy } from "../spottedBy";

describe("mergeSpottedByAliases", () => {
  it("adds TSCO counts into TSS", () => {
    expect(mergeSpottedByAliases({ CCTV: 5, TSCO: 3, TSS: 2 })).toEqual({ CCTV: 5, TSS: 5 });
  });
  it("renames TSCO when there is no TSS yet", () => {
    expect(mergeSpottedByAliases({ TSCO: 4 })).toEqual({ TSS: 4 });
  });
  it("leaves other names alone and tolerates empty input", () => {
    expect(mergeSpottedByAliases({ ROC: 1 })).toEqual({ ROC: 1 });
    expect(mergeSpottedByAliases(undefined)).toEqual({});
  });
});

describe("canonicalSpottedBy", () => {
  it("maps TSCO to TSS and passes other values through", () => {
    expect(canonicalSpottedBy("TSCO")).toBe("TSS");
    expect(canonicalSpottedBy("TSS")).toBe("TSS");
    expect(canonicalSpottedBy("ROC")).toBe("ROC");
  });
});
