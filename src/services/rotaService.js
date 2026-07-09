import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
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

  async setShift(staffId, dateStr, { type, hours }, updatedBy) {
    return setDoc(doc(db, "rotaShifts", `${staffId}_${dateStr}`), {
      staffId,
      date: dateStr,
      type,
      hours,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? null,
    });
  }

  async clearShift(staffId, dateStr) {
    return deleteDoc(doc(db, "rotaShifts", `${staffId}_${dateStr}`));
  }
}

export const rotaService = new RotaService();
