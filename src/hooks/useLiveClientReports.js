import { useState, useEffect } from "react";
import { clientDataService } from "../services/clientDataService";

const TYPE_TO_COLLECTION = {
  incident: "incidentReports",
  "asset-damage": "assetDamageReports",
  "daily-occurrence": "dailyOccurrenceReports",
  "cctv-check": "cctvCheckForms",
  "cctv-faults": "cctvFaultsReports",
};
const ALL_TYPES = Object.keys(TYPE_TO_COLLECTION);

// Matches the field decoration clientDataService.getAllReportsPaginated /
// getReportsByTypePaginated apply, so live rows render identically to
// paginated ones in ReportsPage's table.
function decorate(reportType, doc) {
  switch (reportType) {
    case "incident":
      return { ...doc, reportType, type: doc.incidentType, timestamp: doc.createdAt };
    case "asset-damage":
      return { ...doc, reportType, type: doc.damageType, timestamp: doc.createdAt };
    case "daily-occurrence":
      return { ...doc, reportType, title: doc.title || "Daily Log", timestamp: doc.createdAt };
    case "cctv-check":
      return { ...doc, reportType, title: "CCTV Check", timestamp: doc.createdAt };
    case "cctv-faults":
      return { ...doc, reportType, title: "CCTV Fault", timestamp: doc.createdAt };
    default:
      return doc;
  }
}

// Bounded live view of the newest reports for one scheme, matching filterType.
// A small per-collection `limit()` keeps listener cost fixed regardless of
// total dataset size — meant to overlay page 1 of ReportsPage only, and only
// when no date range or sub-filter is active (the live query can't apply
// those, so it would otherwise show rows that don't belong on that page).
export function useLiveClientReports({ filterType, schemeId, enabled, limitPerCollection = 10 }) {
  const [byKey, setByKey] = useState({});

  const types =
    !filterType || filterType === "all"
      ? ALL_TYPES
      : [filterType].filter((t) => TYPE_TO_COLLECTION[t]);
  const typesKey = types.join(",");

  useEffect(() => {
    if (!enabled || !schemeId || types.length === 0) {
      setByKey({});
      return;
    }

    const unsubscribes = [];
    const watch = (reportType, collectionName, value, key) => {
      unsubscribes.push(
        clientDataService.subscribeToLatestReports(
          collectionName,
          limitPerCollection,
          value,
          (docs) => {
            const decorated = docs.map((d) => decorate(reportType, d));
            setByKey((prev) => ({ ...prev, [key]: decorated }));
          },
          (err) => {
            console.error(`Live client reports subscription failed for ${collectionName}:`, err);
          },
        ),
      );
    };

    types.forEach((reportType) => {
      const collectionName = TYPE_TO_COLLECTION[reportType];
      watch(reportType, collectionName, schemeId, `${reportType}:scheme`);
      // CCTV checks also include "all-schemes" tagged forms — mirrors the
      // dual-query getCCTVReportsPaginated uses for pagination.
      if (reportType === "cctv-check") {
        watch(reportType, collectionName, "all-schemes", `${reportType}:all`);
      }
    });

    return () => unsubscribes.forEach((unsub) => unsub?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, schemeId, typesKey, limitPerCollection]);

  return Object.values(byKey)
    .flat()
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
}
