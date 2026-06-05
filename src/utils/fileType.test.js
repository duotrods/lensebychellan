import { describe, it, expect } from "vitest";
import { isVideoFile, isImageFile } from "./fileType";

describe("isVideoFile", () => {
  it("matches a proper video MIME type", () => {
    expect(isVideoFile({ fileType: "video/mp4", fileName: "a.mp4" })).toBe(true);
  });

  it("matches by extension when fileType is blank (the IN537 case)", () => {
    expect(isVideoFile({ fileType: "", fileName: "clip.mp4" })).toBe(true);
  });

  it("matches by extension when fileType is a generic binary type", () => {
    expect(
      isVideoFile({ fileType: "application/octet-stream", fileName: "x.mp4" }),
    ).toBe(true);
  });

  it("is case-insensitive on the extension", () => {
    expect(isVideoFile({ fileType: "", fileName: "REC.MOV" })).toBe(true);
    expect(isVideoFile({ fileName: "movie.MKV" })).toBe(true);
  });

  it("uses the legacy `name` field when `fileName` is absent", () => {
    expect(isVideoFile({ name: "footage.webm" })).toBe(true);
  });

  it("rejects images", () => {
    expect(isVideoFile({ fileType: "image/jpeg", fileName: "p.jpg" })).toBe(
      false,
    );
  });

  it("rejects unknown / extensionless files", () => {
    expect(isVideoFile({ fileType: "", fileName: "noext" })).toBe(false);
    expect(isVideoFile({})).toBe(false);
    expect(isVideoFile(null)).toBe(false);
  });
});

describe("isImageFile", () => {
  it("matches a proper image MIME type", () => {
    expect(isImageFile({ fileType: "image/png", fileName: "p.png" })).toBe(true);
  });

  it("matches by extension when fileType is blank", () => {
    expect(isImageFile({ fileType: "", fileName: "photo.jpeg" })).toBe(true);
  });

  it("never treats a video as an image", () => {
    expect(isImageFile({ fileType: "", fileName: "clip.mp4" })).toBe(false);
    expect(isImageFile({ fileType: "video/mp4", fileName: "clip.mp4" })).toBe(
      false,
    );
  });

  it("rejects unknown files", () => {
    expect(isImageFile({ fileType: "", fileName: "noext" })).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });
});
