import { useState, useEffect } from "react";
import { staffService } from "../services/staffService";
import { decorateForm, excludeDemoScheme, COLLECTION_TO_RAW_TYPE } from "../utils/reportMapping";

const TYPE_TO_COLLECTION = {
  "CCTV Check": "cctvCheckForms",
  "Incident Report": "incidentReports",
  "Asset Damage": "assetDamageReports",
  "Daily Logs": "dailyOccurrenceReports",
};
const ALL_COLLECTIONS = Object.keys(COLLECTION_TO_RAW_TYPE);

// Bounded live view of the newest reports matching filterType/schemeScope.
// A small per-collection `limit()` keeps listener cost fixed regardless of
// total dataset size — meant to overlay page 1 of a reports list only;
// pagination beyond that stays on the existing cached cursor-based fetch.
export function useLiveReports({ filterType, schemeScope, enabled, limitPerCollection = 10 }) {
  const [byCollection, setByCollection] = useState({});

  const collections =
    !filterType || filterType === "all"
      ? ALL_COLLECTIONS
      : [TYPE_TO_COLLECTION[filterType]].filter(Boolean);
  const collectionsKey = collections.join(",");
  const schemeKey = schemeScope ? schemeScope.join(",") : "";

  useEffect(() => {
    if (!enabled || collections.length === 0) {
      setByCollection({});
      return;
    }

    // Drop stale entries from a previous filterType/collection set before
    // resubscribing — otherwise unsubscribed collections' last-known docs
    // linger in state and keep showing up after a filter switch, since
    // setByCollection below only ever merges keys in.
    setByCollection({});

    const unsubscribes = collections.map((collectionName) =>
      staffService.subscribeToLatestForms(
        collectionName,
        limitPerCollection,
        schemeScope,
        (docs) => {
          const decorated = docs.map((d) =>
            decorateForm({ ...d, type: COLLECTION_TO_RAW_TYPE[collectionName] }),
          );
          setByCollection((prev) => ({ ...prev, [collectionName]: decorated }));
        },
        (err) => {
          console.error(`Live reports subscription failed for ${collectionName}:`, err);
        },
      ),
    );

    return () => unsubscribes.forEach((unsub) => unsub?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, collectionsKey, schemeKey, limitPerCollection]);

  return excludeDemoScheme(Object.values(byCollection).flat()).sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );
}
