import { useState, useEffect } from "react";
import { rotaService } from "../services/rotaService";
import { fmt } from "../utils/rota";

export function useRotaStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = rotaService.subscribeToStaff(
      (data) => {
        setStaff(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error in rota staff subscription:", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe?.();
  }, []);

  return { staff, loading, error };
}

export function useBankHolidays() {
  const [bankHolidays, setBankHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = rotaService.subscribeToBankHolidays(
      (data) => {
        setBankHolidays(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error in bank holidays subscription:", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe?.();
  }, []);

  return { bankHolidays, loading, error };
}

// periodStart/periodEnd are Date objects. Returns shifts keyed as `${staffId}__${date}`
// to match src/utils/rota.js's expected shape.
export function useRotaShifts(periodStart, periodEnd) {
  const [shifts, setShifts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const startKey = periodStart ? fmt(periodStart) : null;
  const endKey = periodEnd ? fmt(periodEnd) : null;

  useEffect(() => {
    if (!startKey || !endKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = rotaService.subscribeToShiftsInRange(
      startKey,
      endKey,
      (docs) => {
        const map = {};
        docs.forEach((s) => {
          map[`${s.staffId}__${s.date}`] = {
            type: s.type,
            hours: s.hours,
            // status only meaningful for holidays; missing => treat as approved (legacy).
            status: s.status ?? null,
            updatedBy: s.updatedBy ?? null,
          };
        });
        setShifts(map);
        setLoading(false);
      },
      (err) => {
        console.error("Error in rota shifts subscription:", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe?.();
  }, [startKey, endKey]);

  return { shifts, loading, error };
}

// Admin-facing: all holiday shifts still awaiting approval, across every period
// (not scoped to the visible range) so pending requests are never missed.
// Returns [{ staffId, date, ... }] sorted by date ascending.
export function usePendingHolidays() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = rotaService.subscribeToPendingHolidays(
      (docs) => {
        setPending([...docs].sort((a, b) => a.date.localeCompare(b.date)));
        setLoading(false);
      },
      (err) => {
        console.error("Error in pending holidays subscription:", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe?.();
  }, []);

  return { pending, loading, error };
}
