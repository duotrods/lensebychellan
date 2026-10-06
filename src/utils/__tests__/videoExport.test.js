import { describe, it, expect } from "vitest";
import { filterUploadsByScheme, collectVideoFiles, totalBytes, formatBytes } from "../videoExport";

const up = (o) => ({ id: "u1", schemeId: "M3", date: "2026-01-02", cameraNumber: "C1", ...o });
const vid = (fileName, fileSize = 100) => ({ fileName, fileSize, fileType: "video/mp4", downloadUrl: `https://r2/${fileName}` });

describe("videoExport", () => {
  it("filters deleted and other-scheme uploads, honouring legacy schemeId", () => {
    const list = [up({}), up({ deleted: true }), up({ schemeId: "A47" }), up({ schemeId: undefined, schemeIds: ["M3"] })];
    expect(filterUploadsByScheme(list, "M3")).toHaveLength(2);
    expect(filterUploadsByScheme(list, null)).toHaveLength(3);
  });
  it("collects only videos and de-duplicates paths", () => {
    const files = collectVideoFiles([
      up({ files: [vid("a.mp4"), vid("a.mp4"), { fileName: "p.jpg", fileType: "image/jpeg", downloadUrl: "x" }] }),
    ]);
    expect(files.map((f) => f.path)).toEqual(["M3/2026-01-02_C1/a.mp4", "M3/2026-01-02_C1/a (2).mp4"]);
    expect(totalBytes(files)).toBe(200);
  });
  it("formats bytes", () => {
    expect(formatBytes(10 * 1024 ** 3)).toBe("10.00 GB");
  });
});

describe("videoExport cross-platform names", () => {
  const path = (fileName, extra = {}) =>
    collectVideoFiles([up({ files: [vid(fileName)], ...extra })])[0].path;
  it("strips Windows-illegal chars, trailing dots and reserved names", () => {
    expect(path('a:b*c?"d<e>f|g.mp4')).toBe("M3/2026-01-02_C1/a_b_c_d_e_f_g.mp4");
    expect(path("clip .mp4 ")).toBe("M3/2026-01-02_C1/clip .mp4");
    expect(path("CON.mp4")).toBe("M3/2026-01-02_C1/_CON.mp4");
    expect(path("a.mp4", { cameraNumber: "Cam/1", date: "01/02/2026" })).toBe("M3/01_02_2026_Cam_1/a.mp4");
  });
  it("caps long names but keeps the extension", () => {
    const p = path(`${"x".repeat(300)}.mp4`).split("/").pop();
    expect(p.length).toBeLessThanOrEqual(80);
    expect(p.endsWith(".mp4")).toBe(true);
  });
  it("dedupes case-insensitively and normalises unicode to NFC", () => {
    const files = collectVideoFiles([up({ files: [vid("A.mp4"), vid("a.MP4")] })]);
    expect(new Set(files.map((f) => f.path.toLowerCase())).size).toBe(2);
    expect(path("café.mp4")).toContain("café.mp4");
  });
});
