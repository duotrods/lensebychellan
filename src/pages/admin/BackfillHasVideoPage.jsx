import { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { isVideoFile } from "../../utils/fileType";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

// Firestore allows up to 500 writes per batch.
const BATCH_LIMIT = 500;

const BackfillHasVideoPage = () => {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const runBackfill = async () => {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const snapshot = await getDocs(collection(db, "incidentReports"));

      let scanned = 0;
      let withVideo = 0;
      let updated = 0;

      let batch = writeBatch(db);
      let opsInBatch = 0;

      for (const d of snapshot.docs) {
        scanned += 1;
        const data = d.data();
        const computed = (data.files || []).some(isVideoFile);
        if (computed) withVideo += 1;

        // Only write when the stored value is missing or wrong — keeps the
        // backfill idempotent and minimises billed writes on re-runs.
        if (data.hasVideo !== computed) {
          batch.update(doc(db, "incidentReports", d.id), { hasVideo: computed });
          updated += 1;
          opsInBatch += 1;

          if (opsInBatch === BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(db);
            opsInBatch = 0;
          }
        }
      }

      if (opsInBatch > 0) await batch.commit();

      setResult({ scanned, withVideo, updated });
    } catch (err) {
      console.error("hasVideo backfill failed:", err);
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Backfill hasVideo
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        One-time utility. Scans every incident report and sets the{" "}
        <code>hasVideo</code> flag so the CCTV Recordings page can query video
        reports directly. Idempotent — safe to re-run; it only writes documents
        whose flag is missing or wrong. Run once per environment (staging, then
        production).
      </p>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700">
          <div className="flex items-center gap-2 font-medium mb-1">
            <CheckCircle2 className="w-5 h-5" />
            Backfill complete.
          </div>
          <p className="text-sm">
            Scanned {result.scanned} reports · {result.withVideo} have video ·{" "}
            {result.updated} updated.
          </p>
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

export default BackfillHasVideoPage;
