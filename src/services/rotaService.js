import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

class RotaService {
  // ---- Staff roster ----
  subscribeToStaff(callback, onError) {
    const q = query(collection(db, "rotaStaff"), orderBy("sortOrder"));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => onError?.(error),
    );
  }

  async addStaffMember(name) {
    return addDoc(collection(db, "rotaStaff"), {
      name,
      sortOrder: Date.now(),
      createdAt: serverTimestamp(),
    });
  }

  // Admin-only: persist a new column order after a drag-to-reorder.
  // Writes sequential sortOrder values (spaced out for future headroom).
  async reorderStaff(orderedStaffIds) {
    const batch = writeBatch(db);
    orderedStaffIds.forEach((staffId, index) => {
      batch.update(doc(db, "rotaStaff", staffId), { sortOrder: index * 1000 });
    });
    return batch.commit();
  }

  // One-time, idempotent migration: any rotaStaff doc missing `sortOrder`
  // (pre-dating the reorder feature) gets one assigned, preserving today's
  // alphabetical order as the starting point. Firestore's orderBy silently
  // omits documents missing the ordered field, so this must run before
  // subscribeToStaff's orderBy("sortOrder") query is relied upon.
  async ensureStaffSortOrder() {
    const q = query(collection(db, "rotaStaff"), orderBy("name"));
    const snapshot = await getDocs(q);
    const missing = snapshot.docs.filter((d) => d.data().sortOrder === undefined);
    if (missing.length === 0) return;
    const batch = writeBatch(db);
    missing.forEach((d, index) => {
      batch.update(d.ref, { sortOrder: index * 1000 });
    });
    return batch.commit();
  }

  async removeStaffMember(staffId) {
    const shiftsQuery = query(
      collection(db, "rotaShifts"),
      where("staffId", "==", staffId),
    );
    const shiftDocs = await getDocs(shiftsQuery);
    const batch = writeBatch(db);
    shiftDocs.forEach((shiftDoc) => batch.delete(shiftDoc.ref));
    batch.delete(doc(db, "rotaStaff", staffId));
    return batch.commit();
  }

  // ---- Bank holidays ----
  subscribeToBankHolidays(callback, onError) {
    const q = query(collection(db, "rotaBankHolidays"), orderBy("date"));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map((d) => d.data()));
      },
      (error) => onError?.(error),
    );
  }

  async addBankHoliday({ date, name, type }) {
    return setDoc(doc(db, "rotaBankHolidays", date), { date, name, type });
  }

  async removeBankHoliday(date) {
    return deleteDoc(doc(db, "rotaBankHolidays", date));
  }

  // ---- Shifts ----
  subscribeToShiftsInRange(startDateStr, endDateStr, callback, onError) {
    const q = query(
      collection(db, "rotaShifts"),
      where("date", ">=", startDateStr),
      where("date", "<=", endDateStr),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map((d) => d.data()));
      },
      (error) => onError?.(error),
    );
  }

  async setShift(staffId, dateStr, { type, hours, status }, updatedBy) {
    return setDoc(doc(db, "rotaShifts", `${staffId}_${dateStr}`), {
      staffId,
      date: dateStr,
      type,
      hours,
      // status only carried for holidays (pending/approved); omitted otherwise.
      ...(status ? { status } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? null,
    });
  }

  // Duplicate the same shift value across multiple dates for one staff member
  // in a single atomic write (used by ShiftModal's "also apply to other dates").
  async setShiftBulk(staffId, dateStrs, { type, hours, status }, updatedBy) {
    const batch = writeBatch(db);
    dateStrs.forEach((dateStr) => {
      batch.set(doc(db, "rotaShifts", `${staffId}_${dateStr}`), {
        staffId,
        date: dateStr,
        type,
        hours,
        ...(status ? { status } : {}),
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy ?? null,
      });
    });
    return batch.commit();
  }

  // Admin action: approve a pending holiday so it renders as an approved (red) holiday.
  async approveHoliday(staffId, dateStr, approvedBy) {
    return updateDoc(doc(db, "rotaShifts", `${staffId}_${dateStr}`), {
      status: "approved",
      approvedBy: approvedBy ?? null,
      approvedAt: serverTimestamp(),
    });
  }

  // Admin-facing: live feed of holiday shifts still awaiting approval (all dates).
  subscribeToPendingHolidays(callback, onError) {
    const q = query(
      collection(db, "rotaShifts"),
      where("type", "==", "holiday"),
      where("status", "==", "pending"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map((d) => d.data()));
      },
      (error) => onError?.(error),
    );
  }

  async clearShift(staffId, dateStr) {
    return deleteDoc(doc(db, "rotaShifts", `${staffId}_${dateStr}`));
  }
}

export const rotaService = new RotaService();
