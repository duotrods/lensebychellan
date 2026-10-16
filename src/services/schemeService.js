import {
  collection,
  doc,
  getDocs,
  getDoc,
  getCountFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getStaticSchemeDocs, isStaticSchemeId } from "../utils/schemes";
import {
  validateNewScheme,
  validateSchemeUpdate,
  validateRecipients,
} from "../utils/schemeValidation";
import { AppError } from "../utils/errorHandling";

const COLLECTION = "schemes";
// Alert recipients live apart from `schemes` (readable by every signed-in user) so that
// email addresses are admin-only. Cloud Functions read it with the admin SDK.
const ALERTS_COLLECTION = "schemeAlerts";

// Where a scheme id can be stored. Report-like collections carry `schemeIds` (array)
// and the legacy `schemeId`; users carry both; access codes carry `schemeId`.
const REPORT_COLLECTIONS = [
  "incidentReports",
  "cctvCheckForms",
  "cctvFaultsReports",
  "dailyOccurrenceReports",
  "assetDamageReports",
  "cctvUploads",
  "bodyCamUploads",
  "dashCamUploads",
  "documents",
  "users",
];
const CODE_COLLECTIONS = [
  "otpCodes",
  "clientOTPs",
  "cctvOperatorOTPs",
  "staffInviteCodes",
  "thirdPartyOperatorCodes",
  "thirdPartyClientCodes",
  "thirdPartyLiveOperatorCodes",
  "thirdPartyCCTVOperatorCodes",
];
const CACHE_KEY = "lense.schemes.v1";

class SchemeService {
  // All scheme docs (active and archived). Small collection, one read per doc.
  async listSchemes() {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Last successful list, kept per browser so the app starts with the right schemes.
  // Convenience only: never trusted over Firestore, and safe to fail.
  readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  writeCache(docs) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(docs));
    } catch {
      // storage unavailable (private window, quota) — ignore
    }
  }

  async createScheme(input, userId) {
    const existing = await this.listSchemes();
    const { ok, errors, value } = validateNewScheme(input, existing);
    if (!ok) throw new AppError(errors.join(" "), "scheme/invalid");
    await setDoc(doc(db, COLLECTION, value.id), {
      ...value,
      createdAt: serverTimestamp(),
      createdBy: userId || null,
    });
    return value;
  }

  async updateScheme(schemeId, patch) {
    const ref = doc(db, COLLECTION, schemeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new AppError("Scheme not found.", "scheme/not-found");
    const { ok, errors, value } = validateSchemeUpdate({ id: snap.id, ...snap.data() }, patch);
    if (!ok) throw new AppError(errors.join(" "), "scheme/invalid");
    await updateDoc(ref, { ...value, updatedAt: serverTimestamp() });
  }

  // Saved alert recipients for a scheme: { incidentRecipients[], cctvFaultRecipients[] }.
  // Empty lists mean "use the default recipients configured in code".
  async getAlertConfig(schemeId) {
    const snap = await getDoc(doc(db, ALERTS_COLLECTION, schemeId));
    const data = snap.exists() ? snap.data() : {};
    return {
      incidentRecipients: data.incidentRecipients || [],
      cctvFaultRecipients: data.cctvFaultRecipients || [],
    };
  }

  async saveAlertConfig(schemeId, { incidentRecipients, cctvFaultRecipients }) {
    const incident = validateRecipients(incidentRecipients);
    const fault = validateRecipients(cctvFaultRecipients);
    const errors = [...incident.errors, ...fault.errors];
    if (errors.length > 0) throw new AppError(errors.join(" "), "scheme/invalid-recipients");
    await setDoc(
      doc(db, ALERTS_COLLECTION, schemeId),
      {
        incidentRecipients: incident.value,
        cctvFaultRecipients: fault.value,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  // Archive instead of delete: old reports and users still resolve the scheme's name.
  archiveScheme(schemeId) {
    return this.updateScheme(schemeId, { active: false });
  }

  restoreScheme(schemeId) {
    return this.updateScheme(schemeId, { active: true });
  }

  // Everything that still uses this scheme (its id or any old id). Returns
  // [{ collection, count }] for collections with at least one match. Throws if a
  // collection can't be checked, so a delete is never allowed on partial information.
  async findSchemeReferences(schemeId, legacyIds = []) {
    const ids = [schemeId, ...legacyIds];
    const checks = [];
    REPORT_COLLECTIONS.forEach((name) => {
      checks.push({ name, q: query(collection(db, name), where("schemeIds", "array-contains-any", ids)) });
      checks.push({ name, q: query(collection(db, name), where("schemeId", "in", ids)) });
    });
    CODE_COLLECTIONS.forEach((name) => {
      checks.push({ name, q: query(collection(db, name), where("schemeId", "in", ids)) });
    });

    const counts = await Promise.all(
      checks.map(async ({ name, q }) => ({
        name,
        count: (await getCountFromServer(q)).data().count,
      })),
    );
    const byCollection = {};
    counts.forEach(({ name, count }) => {
      byCollection[name] = Math.max(byCollection[name] || 0, count);
    });
    return Object.entries(byCollection)
      .filter(([, count]) => count > 0)
      .map(([collectionName, count]) => ({ collection: collectionName, count }));
  }

  // Permanently remove a scheme that nothing uses. Refuses schemes defined in code and
  // any scheme still referenced by reports, users or access codes (archive those instead).
  async deleteScheme(schemeId) {
    if (isStaticSchemeId(schemeId)) {
      throw new AppError(
        "This scheme is defined in code and can only be archived.",
        "scheme/static",
      );
    }
    const ref = doc(db, COLLECTION, schemeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new AppError("Scheme not found.", "scheme/not-found");

    let references;
    try {
      references = await this.findSchemeReferences(schemeId, snap.data().legacyIds || []);
    } catch (error) {
      throw new AppError(
        "Couldn't check whether this scheme is in use, so it was not deleted.",
        "scheme/check-failed",
        { cause: error?.message },
      );
    }
    if (references.length > 0) {
      const list = references.map((r) => `${r.collection} (${r.count})`).join(", ");
      throw new AppError(
        `Still in use by ${list}. Archive it instead.`,
        "scheme/in-use",
        { references },
      );
    }
    await deleteDoc(ref);
    // Remove its saved recipients too; harmless if there were none.
    await deleteDoc(doc(db, ALERTS_COLLECTION, schemeId)).catch(() => {});
  }

  // Copy the schemes defined in code into Firestore. Idempotent: existing docs are
  // never overwritten. Returns the ids that were created.
  async seedFromStatic(userId) {
    const existingIds = new Set((await this.listSchemes()).map((s) => s.id));
    const toCreate = getStaticSchemeDocs().filter((s) => !existingIds.has(s.id));
    if (toCreate.length === 0) return [];
    const batch = writeBatch(db);
    toCreate.forEach((s) => {
      batch.set(doc(db, COLLECTION, s.id), {
        ...s,
        createdAt: serverTimestamp(),
        createdBy: userId || null,
      });
    });
    await batch.commit();
    return toCreate.map((s) => s.id);
  }
}

export const schemeService = new SchemeService();
