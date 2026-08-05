// Pure staff-rota helpers: dates, pay-period math, and CSV building.
// No Firebase imports here — keep this unit-testable in isolation.

export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parses a "YYYY-MM-DD" string into a local-midnight Date, the inverse of fmt().
// Using `new Date(dateStr)` instead would parse as UTC, which silently shifts
// the calendar date by a day for anyone outside UTC — that's what caused bank
// holidays and pay-period boundaries to line up with the wrong day.
export function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a, b) {
  return fmt(a) === fmt(b);
}

export function dayLabel(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

export function monthLabel(date) {
  return date.toLocaleDateString("en-GB", { month: "short" });
}

export function bankHolidayFor(bankHolidays, dateStr) {
  return bankHolidays.find((b) => b.date === dateStr) || null;
}

// Pay period runs from the 28th of a month to the 27th of the next month.
export function getPayPeriod(anchorDate) {
  const d = new Date(anchorDate);
  let start;
  if (d.getDate() >= 28) {
    start = new Date(d.getFullYear(), d.getMonth(), 28);
  } else {
    start = new Date(d.getFullYear(), d.getMonth() - 1, 28);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 27);
  return { start, end };
}

export function payPeriodLabel(period) {
  const s = period.start;
  const e = period.end;
  return `${s.getDate()} ${monthLabel(s)} – ${e.getDate()} ${monthLabel(e)} ${e.getFullYear()}`;
}

export function eachDate(start, end) {
  const out = [];
  let d = new Date(start);
  while (d <= end) {
    out.push(new Date(d));
    d = addDays(d, 1);
  }
  return out;
}

// Dates in the period eligible for "duplicate this shift" — excludes the date
// being edited and any date that already has a shift for this staff member.
// shifts: { [`${staffId}__${date}`]: {...} }
export function datesAvailableForDuplicate(period, shifts, staffId, excludeDateStr) {
  return eachDate(period.start, period.end)
    .filter((d) => {
      const dateStr = fmt(d);
      return dateStr !== excludeDateStr && !shifts[`${staffId}__${dateStr}`];
    })
    .map((d) => ({
      dateStr: fmt(d),
      label: `${dayLabel(d)} ${d.getDate()} ${monthLabel(d)}`,
    }));
}

/*
 A shift's hours are split across calendar dates as actually worked:
 - Day shift: starts 06:00, all hours fall on the same date.
 - Night shift: starts 18:00. First 6 hours (18:00-00:00) fall on the start
   date. Any remaining hours (up to 12 total) fall on the following date.
*/
export function splitShiftAcrossDates(dateStr, shift) {
  const portions = [];
  if (shift.type === "holiday" || shift.type === "off" || shift.type === "sick") return portions;
  const hours = Number(shift.hours) || 0;
  if (shift.type === "day" || shift.type === "offsite-day") {
    portions.push({ date: dateStr, hours });
  } else if (shift.type === "night" || shift.type === "offsite-night") {
    const firstLeg = Math.min(hours, 6);
    const secondLeg = Math.max(0, hours - 6);
    if (firstLeg > 0) portions.push({ date: dateStr, hours: firstLeg });
    if (secondLeg > 0) {
      const nextDate = fmt(addDays(parseDateStr(dateStr), 1));
      portions.push({ date: nextDate, hours: secondLeg });
    }
  }
  return portions;
}

export function rateForDate(bankHolidays, dateStr) {
  const bh = bankHolidayFor(bankHolidays, dateStr);
  if (!bh) return { multiplier: 1, label: "standard" };
  if (bh.type === "christmas") return { multiplier: 2, label: "christmas" };
  return { multiplier: 1.5, label: "bank holiday" };
}

// staff: [{id, name}], shifts: { [`${staffId}__${date}`]: {type, hours, status} }
export function tallyForPeriod(staff, shifts, bankHolidays, period) {
  const rows = staff.map((p) => ({
    id: p.id,
    name: p.name,
    standard: 0,
    holidayWorked: 0,
    bh: 0,
    xmas: 0,
    holidayDays: 0,
    sickDays: 0,
    totalHours: 0,
    weightedHours: 0,
  }));
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  Object.keys(shifts).forEach((key) => {
    const [staffId, dateStr] = key.split("__");
    const row = byId[staffId];
    if (!row) return;
    const shift = shifts[key];

    // A shift belongs entirely to whichever pay period contains the date it
    // was scheduled on. A night shift's hours are still split by calendar
    // date (see splitShiftAcrossDates) so each portion is paid at the right
    // rate if it crosses into a bank holiday, but that split never moves
    // hours into a different pay period — e.g. a night shift booked on the
    // 27th (the last day of a period) counts in full there, even though its
    // last few hours are worked after midnight on the 28th.
    const d = parseDateStr(dateStr);
    if (d < period.start || d > period.end) return;

    if (shift.type === "holiday") {
      // Only approved holidays count toward the tally. Pending requests
      // (awaiting admin approval) are excluded; legacy holidays without a
      // status are treated as approved.
      if (shift.status !== "pending") {
        row.holidayDays += 1;
        // A holiday can still have a few hours actually worked on it. Paid
        // at the same flat rate as standard hours, but kept in its own
        // bucket rather than folded into `standard` so it's visible as an
        // exception, not ordinary scheduled work.
        const worked = Number(shift.hours) || 0;
        if (worked > 0) {
          row.holidayWorked += worked;
          row.totalHours += worked;
          row.weightedHours += worked;
        }
      }
      return;
    }
    if (shift.type === "sick") {
      row.sickDays += 1;
      return;
    }
    const portions = splitShiftAcrossDates(dateStr, shift);
    portions.forEach((p) => {
      const rate = rateForDate(bankHolidays, p.date);
      row.totalHours += p.hours;
      row.weightedHours += p.hours * rate.multiplier;
      if (rate.label === "christmas") row.xmas += p.hours;
      else if (rate.label === "bank holiday") row.bh += p.hours;
      else row.standard += p.hours;
    });
  });
  return rows;
}

export function shiftCellText(shift) {
  if (!shift || shift.type === "off") return "";
  if (shift.type === "day") return `Day ${shift.hours}h (from 06:00)`;
  if (shift.type === "night") return `Night ${shift.hours}h (from 18:00)`;
  if (shift.type === "offsite-day") return `Offsite Day ${shift.hours}h (from 06:00)`;
  if (shift.type === "offsite-night") return `Offsite Night ${shift.hours}h (from 18:00)`;
  if (shift.type === "holiday") {
    return shift.hours > 0 ? `Holiday (+${shift.hours}h worked)` : "Holiday";
  }
  if (shift.type === "sick") return "Sick";
  return "";
}

export function fmtNum(n) {
  return (Math.round(n * 100) / 100).toString();
}

export function sumRows(rows, key) {
  return rows.reduce((a, r) => a + r[key], 0);
}

export function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function rowsToCsv(rows) {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export function buildRotaCsvRows(staff, shifts, bankHolidays, period) {
  const days = eachDate(period.start, period.end);
  const header = ["Date", ...staff.map((p) => p.name)];
  const rows = [header];
  days.forEach((d) => {
    const dStr = fmt(d);
    const bh = bankHolidayFor(bankHolidays, dStr);
    const label = `${dayLabel(d)} ${d.getDate()} ${monthLabel(d)}${bh ? ` (${bh.name})` : ""}`;
    const row = [label];
    staff.forEach((p) => {
      const shift = shifts[`${p.id}__${dStr}`];
      row.push(shiftCellText(shift));
    });
    rows.push(row);
  });
  return rows;
}

export function buildTallyCsvRows(staff, shifts, bankHolidays, period) {
  const rows2 = tallyForPeriod(staff, shifts, bankHolidays, period);
  const header = [
    "Staff",
    "Standard hrs",
    "Holiday worked hrs",
    "Bank holiday hrs (x1.5)",
    "Christmas hrs (x2)",
    "Holiday days",
    "Sick days",
    "Total hrs worked",
    "Holiday premium (BH + Xmas)",
    "Weighted hrs (for pay)",
  ];
  return [
    [`Pay period: ${payPeriodLabel(period)}`],
    header,
    ...rows2.map((r) => [
      r.name,
      fmtNum(r.standard),
      fmtNum(r.holidayWorked),
      fmtNum(r.bh),
      fmtNum(r.xmas),
      r.holidayDays,
      r.sickDays,
      fmtNum(r.totalHours),
      fmtNum(r.weightedHours - r.totalHours),
      fmtNum(r.weightedHours),
    ]),
    [
      "All staff",
      fmtNum(sumRows(rows2, "standard")),
      fmtNum(sumRows(rows2, "holidayWorked")),
      fmtNum(sumRows(rows2, "bh")),
      fmtNum(sumRows(rows2, "xmas")),
      sumRows(rows2, "holidayDays"),
      sumRows(rows2, "sickDays"),
      fmtNum(sumRows(rows2, "totalHours")),
      fmtNum(sumRows(rows2, "weightedHours") - sumRows(rows2, "totalHours")),
      fmtNum(sumRows(rows2, "weightedHours")),
    ],
  ];
}

export function downloadCsv(filename, rows) {
  const csv = rowsToCsv(rows);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
