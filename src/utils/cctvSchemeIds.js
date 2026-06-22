import { getInternalSchemeIds } from "./schemes";

// Maps each internal CCTV-check form section to the scheme ID it represents.
// `cameras` = the not-working camera array field, `comments` = the free-text field.
const INTERNAL_SECTIONS = [
  { schemeId: "A417", cameras: "a417Cameras", comments: "a417Comments" },
  { schemeId: "A47", cameras: "kierCore", comments: "kierCoreComments" },
  { schemeId: "M3", cameras: "m3Jct9", comments: "m3Jct9Comments" },
  { schemeId: "A452", cameras: "A452", comments: "A452Comments" },
  { schemeId: "Gallows", cameras: "Costain", comments: "CostainComments" },
  { schemeId: "SimisterIsland", cameras: "csi", comments: "csiComments" },
  { schemeId: "DMO1", cameras: "demoCameras", comments: "demoComments" },
];

const hasArrayData = (v) => Array.isArray(v) && v.length > 0;
const hasTextData = (v) => typeof v === "string" && v.trim() !== "";

// Derives the scheme IDs a CCTV check form belongs to, from its data.
//
// A section "has data" when its camera array is non-empty or its comment is
// filled. Third-party sections use dynamic keys: `tp_{schemeId}_cameras` /
// `tp_{schemeId}_comments`.
//
// Clean check (no issues in any section): scope the fallback to whoever
// submitted it. Third-party forms always seed `tp_*` keys (even when empty),
// so their presence marks a third-party submission and the fallback uses only
// those schemes. Internal forms have no `tp_*` keys and fall back to all
// internal schemes so every internal client sees the clean check.
export function deriveCCTVSchemeIds(formData) {
  const schemeIds = [];

  for (const { schemeId, cameras, comments } of INTERNAL_SECTIONS) {
    if (hasArrayData(formData[cameras]) || hasTextData(formData[comments])) {
      schemeIds.push(schemeId);
    }
  }

  // Third-party dynamic sections that have data.
  for (const key of Object.keys(formData)) {
    if (key.startsWith("tp_") && key.endsWith("_cameras") && hasArrayData(formData[key])) {
      const id = key.replace(/^tp_/, "").replace(/_cameras$/, "");
      if (!schemeIds.includes(id)) schemeIds.push(id);
    }
    if (key.startsWith("tp_") && key.endsWith("_comments") && hasTextData(formData[key])) {
      const id = key.replace(/^tp_/, "").replace(/_comments$/, "");
      if (!schemeIds.includes(id)) schemeIds.push(id);
    }
  }

  if (schemeIds.length === 0) {
    // All third-party scheme sections rendered on this form (present even empty).
    const renderedTpSchemeIds = Object.keys(formData)
      .filter((k) => k.startsWith("tp_") && k.endsWith("_cameras"))
      .map((k) => k.replace(/^tp_/, "").replace(/_cameras$/, ""));

    if (renderedTpSchemeIds.length > 0) {
      schemeIds.push(...renderedTpSchemeIds); // third-party clean check
    } else {
      schemeIds.push(...getInternalSchemeIds()); // internal clean check
    }
  }

  return schemeIds;
}
