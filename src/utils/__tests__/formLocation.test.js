import { describe, it, expect } from "vitest";
import { getFormLocation } from "../formLocation";

describe("getFormLocation", () => {
  it("shows the camera for CCTV faults", () => {
    expect(getFormLocation({ type: "CCTV Faults", camera: "CCTV 12" })).toBe("CCTV 12");
  });
  it("shows the section for incident reports", () => {
    expect(getFormLocation({ type: "Incident Report", section: "M3" })).toBe("M3");
  });
  it("falls back to location, then N/A", () => {
    expect(getFormLocation({ type: "Asset Damage", location: "Jct 9" })).toBe("Jct 9");
    expect(getFormLocation({ type: "CCTV Check" })).toBe("N/A");
    expect(getFormLocation({ type: "CCTV Faults" })).toBe("N/A");
  });
});
