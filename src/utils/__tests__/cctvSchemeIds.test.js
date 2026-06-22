import { describe, it, expect } from "vitest";
import { deriveCCTVSchemeIds } from "../cctvSchemeIds";
import { getInternalSchemeIds } from "../schemes";

describe("deriveCCTVSchemeIds", () => {
  it("returns only the internal schemes that have camera or comment data", () => {
    expect(
      deriveCCTVSchemeIds({ a417Cameras: ["CAM 1"], m3Jct9Comments: "fault" }),
    ).toEqual(["A417", "M3"]);
  });

  it("maps each internal section to its scheme id", () => {
    expect(deriveCCTVSchemeIds({ kierCore: ["CAM 2"] })).toEqual(["A47"]);
    expect(deriveCCTVSchemeIds({ A452: ["CAM 3"] })).toEqual(["A452"]);
    expect(deriveCCTVSchemeIds({ Costain: ["CAM 4"] })).toEqual(["Gallows"]);
    expect(deriveCCTVSchemeIds({ csi: ["CAM 5"] })).toEqual(["SimisterIsland"]);
    expect(deriveCCTVSchemeIds({ demoCameras: ["CAM 6"] })).toEqual(["DMO1"]);
  });

  it("collects third-party schemes that have data", () => {
    expect(
      deriveCCTVSchemeIds({ "tp_A66-WJ_cameras": ["CAM 1"] }),
    ).toEqual(["A66-WJ"]);
    expect(
      deriveCCTVSchemeIds({ "tp_A66-WJ_comments": "lens dirty" }),
    ).toEqual(["A66-WJ"]);
  });

  it("does not duplicate a scheme that has both cameras and comments", () => {
    expect(
      deriveCCTVSchemeIds({
        "tp_A66-WJ_cameras": ["CAM 1"],
        "tp_A66-WJ_comments": "note",
      }),
    ).toEqual(["A66-WJ"]);
  });

  it("falls back to all internal schemes for an internal clean check", () => {
    expect(
      deriveCCTVSchemeIds({ a417Cameras: [], a417Comments: "" }),
    ).toEqual(getInternalSchemeIds());
  });

  it("scopes a third-party clean check to its rendered TP schemes only", () => {
    expect(
      deriveCCTVSchemeIds({
        "tp_A66-WJ_cameras": [],
        "tp_A66-WJ_comments": "",
        "tp_A66-WJ_blackspot": [],
        "tp_A66-WJ_tssInformed": false,
      }),
    ).toEqual(["A66-WJ"]);
  });
});
