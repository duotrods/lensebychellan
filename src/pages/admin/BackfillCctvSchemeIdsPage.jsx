import { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { deriveCCTVSchemeIds } from "../../utils/cctvSchemeIds";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

// Firestore allows up to 500 writes per batch.
const BATCH_LIMIT = 500;

const arraysEqual = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((v, i) => v === b[i]);

const BackfillCctvSchemeIdsPage = () => {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const runBackfill = async () => {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const snapshot = await getDocs(collection(db, "cctvCheckForms"));

      let scanned = 0;
      let candidates = 0;
      let updated = 0;
      const changes = [];

      let batch = writeBatch(db);
      let opsInBatch = 0;

      for (const d of snapshot.docs) {
        scanned += 1;
        const data = d.data();

        // Only third-party-tagged forms could have been corrupted by the old
        // clean-check fallback. Genuine internal checks have no tp_* keys.
        const hasTpKeys = Object.keys(data).some((k) => k.startsWith("tp_"));
        if (!hasTpKeys) continue;
        candidates += 1;

        const newSchemeIds = deriveCCTVSchemeIds(data);

        // Idempotent: only write when the stored value is actually wrong.
        if (arraysEqual(data.schemeIds, newSchemeIds)) continue;

        changes.push({
          id: d.id,
          ref: data.referenceId || "(no ref)",
          from: data.schemeIds || [],
          to: newSchemeIds,
        });

        batch.update(doc(db, "cctvCheckForms", d.id), {
          schemeIds: newSchemeIds,
          schemeId: newSchemeIds[0],
        });
        updated += 1;
        opsInBatch += 1;

        if (opsInBatch === BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opsInBatch = 0;
        }
      }

      if (opsInBatch > 0) await batch.commit();

      setResult({ scanned, candidates, updated, changes });
    } catch (err) {
      console.error("CCTV schemeIds backfill failed:", err);
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Backfill CCTV Check Scheme IDs
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        One-time utility. Repairs CCTV check forms whose <code>schemeIds</code>{" "}
        were mislabeled by the old clean-check logic, which tagged third-party
        &ldquo;all working&rdquo; checks (e.g. A66-WJ) with internal scheme IDs
        and leaked them onto the internal dashboard. Only third-party checks are
        touched. Idempotent — safe to re-run; it only writes documents whose tags
        are wrong. Run once per environment (staging, then production).
      </p>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700">
          <div className="flex items-center gap-2 font-medium mb-1">
            <CheckCircle2 className="w-5 h-5" />
            Backfill complete.
          </div>
          <p className="text-sm">
            Scanned {result.scanned} checks · {result.candidates} third-party ·{" "}
            {result.updated} repaired.
          </p>
          {result.changes.length > 0 && (
            <ul className="text-xs mt-3 space-y-1 font-mono text-green-800">
              {result.changes.map((c) => (
                <li key={c.id}>
                  {c.ref}: [{c.from.join(", ")}] → [{c.to.join(", ")}]
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      <button
        onClick={runBackfill}
        disabled={running}
        className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
      >
        {running && <Loader2 className="w-4 h-4 animate-spin" />}
        {running ? "Running backfill..." : "Run Backfill"}
      </button>
    </div>
  );
};

export default BackfillCctvSchemeIdsPage;
