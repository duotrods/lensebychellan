const toSeconds = (ts) => ts?.seconds ?? (typeof ts?.toMillis === "function" ? ts.toMillis() / 1000 : 0);

/**
 * Resolved CCTV faults, most recently resolved first. A fault with no completedAt
 * falls back to its createdAt. Returns a new array.
 */
export const sortByLatestResolved = (faults) =>
  [...faults].sort(
    (a, b) =>
      (toSeconds(b.completedAt) || toSeconds(b.createdAt)) -
      (toSeconds(a.completedAt) || toSeconds(a.createdAt)),
  );
