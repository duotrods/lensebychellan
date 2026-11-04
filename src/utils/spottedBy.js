// TSCO is the old name for TSS, so the two are counted together.
const SPOTTED_BY_ALIASES = { TSCO: "TSS" };

// The current name for a spotted-by value (TSCO -> TSS); other values pass through.
export function canonicalSpottedBy(name) {
  return SPOTTED_BY_ALIASES[String(name).trim().toUpperCase()] || name;
}

// Merges the old spotted-by names into their current ones in a { name: count } map.
export function mergeSpottedByAliases(counts) {
  const merged = {};
  Object.entries(counts || {}).forEach(([name, count]) => {
    const key = canonicalSpottedBy(name);
    merged[key] = (merged[key] || 0) + count;
  });
  return merged;
}
