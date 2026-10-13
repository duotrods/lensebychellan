import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getStaticSchemeDocs } from "../utils/schemes";
import { validateNewScheme, validateSchemeUpdate } from "../utils/schemeValidation";
import { AppError } from "../utils/errorHandling";

const COLLECTION = "schemes";
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

  // Archive instead of delete: old reports and users still resolve the scheme's name.
  archiveScheme(schemeId) {
    return this.updateScheme(schemeId, { active: false });
  }

  restoreScheme(schemeId) {
    return this.updateScheme(schemeId, { active: true });
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
