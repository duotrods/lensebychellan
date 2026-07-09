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
    const q = query(collection(db, "rotaStaff"), orderBy("name"));
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
      createdAt: serverTimestamp(),
    });
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
