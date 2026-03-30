import { useState } from "react";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { SCHEMES } from "../../utils/schemes";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

const countVehicles = (recoveryRequested) => {
  if (!recoveryRequested || typeof recoveryRequested !== "object") return 0;
  return (
    (recoveryRequested.light || 0) +
    (recoveryRequested.heavy || 0) +
    (recoveryRequested.ipv || 0) +
    (recoveryRequested.hetos || 0)
  );
};

const BackfillVehicleStatsPage = () => {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runBackfill = async () => {
    setRunning(true);
    setResults({});

    for (const scheme of SCHEMES) {
      setResults((prev) => ({ ...prev, [scheme.id]: { status: "running" } }));

      try {
        const q = query(
          collection(db, "incidentReports"),
          where("schemeIds", "array-contains", scheme.id)
        );
        const snapshot = await getDocs(q);

        let total = 0;
        snapshot.forEach((d) => {
          total += countVehicles(d.data().recoveryRequested);
        });

        const statsRef = doc(db, "schemeStats", scheme.id);
        await setDoc(statsRef, { totalVehiclesDispatched: total }, { merge: true });

        setResults((prev) => ({
          ...prev,
          [scheme.id]: { status: "done", total, docs: snapshot.size },
        }));
      } catch (error) {
        setResults((prev) => ({
          ...prev,
          [scheme.id]: { status: "error", error: error.message },
        }));
      }
    }

    setRunning(false);
  };

  const allDone = Object.keys(results).length === SCHEMES.length &&
    Object.values(results).every((r) => r.status === "done");

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Backfill Vehicle Stats</h1>
      <p className="text-gray-500 text-sm mb-6">
        One-time utility. Reads all existing incident reports per scheme and writes the
        total vehicles dispatched to <code>schemeStats/&#123;schemeId&#125;</code>. Run once, then ignore.
      </p>

      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-green-700 font-medium">
          <CheckCircle2 className="w-5 h-5" />
          Backfill complete. This page is no longer needed.
        </div>
      )}

      <div className="space-y-3 mb-6">
        {SCHEMES.map((scheme) => {
          const result = results[scheme.id];
          return (
            <div key={scheme.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{scheme.id}</p>
                <p className="text-sm text-gray-500">{scheme.fullName}</p>
              </div>
              <div className="text-sm text-right">
                {!result && <span className="text-gray-400">Pending</span>}
                {result?.status === "running" && (
                  <span className="flex items-center gap-1 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Running...
                  </span>
                )}
                {result?.status === "done" && (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {result.total} vehicles ({result.docs} incidents)
                  </span>
                )}
                {result?.status === "error" && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertTriangle className="w-4 h-4" /> {result.error}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={runBackfill}
        disabled={running || allDone}
        className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
      >
        {running && <Loader2 className="w-4 h-4 animate-spin" />}
        {running ? "Running backfill..." : allDone ? "Backfill complete" : "Run Backfill"}
      </button>
    </div>
  );
};

export default BackfillVehicleStatsPage;
