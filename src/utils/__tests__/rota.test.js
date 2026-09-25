import { describe, it, expect } from "vitest";
import {
  getPayPeriod,
  payPeriodLabel,
  splitShiftAcrossDates,
  rateForDate,
  tallyForPeriod,
  fmt,
  parseDateStr,
  datesAvailableForDuplicate,
  buildTallyCsvRows,
  shiftCellText,
  sumApprovedHolidayHoursByStaff,
  getStaffDueForHolidayReset,
  HOURS_PER_HOLIDAY_DAY,
} from "../rota";

// Regression coverage for a timezone bug: fmt() used to go through
// toISOString() (UTC), which shifts the calendar date back by a day for any
// timezone ahead of UTC (e.g. BST, or Asia/Manila). That made bank holidays
// and grid cells resolve to the wrong date depending on where the browser
// was running. Run `TZ=Asia/Manila npx vitest run` (or any UTC+ zone) to see
// these fail on the old implementation.
describe("fmt / parseDateStr", () => {
  it("round-trips a local date without shifting to a different calendar day", () => {
    const d = new Date(2026, 6, 10); // 10 Jul 2026, local midnight
    expect(fmt(d)).toBe("2026-07-10");
    expect(parseDateStr(fmt(d))).toEqual(d);
  });
});

describe("tallyForPeriod (timezone regression)", () => {
  const staff = [{ id: "s1", name: "Dave" }];
  const period = getPayPeriod(new Date(2026, 5, 30)); // 28 Jun - 27 Jul 2026
  const bankHolidays = [{ date: "2026-07-10", name: "Test BH", type: "standard" }];

  it("applies the bank holiday rate on the date it was actually saved as", () => {
    const shifts = { "s1__2026-07-10": { type: "day", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, bankHolidays, period);
    expect(row.bh).toBe(12);
    expect(row.standard).toBe(0);
  });

  it("includes shifts and holiday days on the last day of the pay period (27th)", () => {
    const shifts = {
      "s1__2026-07-27": { type: "day", hours: 12 },
      "s1__2026-07-26": { type: "holiday", hours: 0, status: "approved" },
    };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.totalHours).toBe(12);
    expect(row.holidayDays).toBe(1);
  });
});

describe("datesAvailableForDuplicate", () => {
  const period = getPayPeriod(new Date(2026, 2, 15)); // 28 Feb - 27 Mar 2026

  it("excludes the date being edited", () => {
    const options = datesAvailableForDuplicate(period, {}, "s1", "2026-03-05");
    expect(options.find((o) => o.dateStr === "2026-03-05")).toBeUndefined();
  });

  it("excludes dates that already have a shift for this staff member", () => {
    const shifts = { "s1__2026-03-06": { type: "day", hours: 12 } };
    const options = datesAvailableForDuplicate(period, shifts, "s1", "2026-03-05");
    expect(options.find((o) => o.dateStr === "2026-03-06")).toBeUndefined();
  });

  it("includes dates that have a shift for a different staff member", () => {
    const shifts = { "s2__2026-03-06": { type: "day", hours: 12 } };
    const options = datesAvailableForDuplicate(period, shifts, "s1", "2026-03-05");
    expect(options.find((o) => o.dateStr === "2026-03-06")).toBeDefined();
  });

  it("only returns dates within the period", () => {
    const options = datesAvailableForDuplicate(period, {}, "s1", "2026-03-05");
    expect(options.every((o) => o.dateStr >= "2026-02-28" && o.dateStr <= "2026-03-27")).toBe(true);
    expect(options.length).toBe(28 - 1); // full period minus the excluded date
  });

  it("labels each date with weekday, day, and month", () => {
    const options = datesAvailableForDuplicate(period, {}, "s1", "2026-03-05");
    const mar10 = options.find((o) => o.dateStr === "2026-03-10");
    expect(mar10.label).toBe("Tue 10 Mar");
  });
});

describe("getPayPeriod", () => {
  it("returns 28th-of-this-month to 27th-of-next-month when anchor is on/after the 28th", () => {
    const period = getPayPeriod(new Date(2026, 0, 30)); // 30 Jan 2026
    expect(period.start).toEqual(new Date(2026, 0, 28));
    expect(period.end).toEqual(new Date(2026, 1, 27));
  });

  it("returns 28th-of-previous-month to 27th-of-this-month when anchor is before the 28th", () => {
    const period = getPayPeriod(new Date(2026, 1, 5)); // 5 Feb 2026
    expect(period.start).toEqual(new Date(2026, 0, 28));
    expect(period.end).toEqual(new Date(2026, 1, 27));
  });

  it("labels the period with both month names and the end year", () => {
    const period = getPayPeriod(new Date(2026, 1, 5));
    expect(payPeriodLabel(period)).toBe("28 Jan – 27 Feb 2026");
  });
});

describe("splitShiftAcrossDates", () => {
  it("keeps a day shift entirely on the same date", () => {
    expect(splitShiftAcrossDates("2026-03-10", { type: "day", hours: 12 })).toEqual([
      { date: "2026-03-10", hours: 12 },
    ]);
  });

  it("splits a 12h night shift 6h on the start date, 6h on the next date", () => {
    expect(splitShiftAcrossDates("2026-03-10", { type: "night", hours: 12 })).toEqual([
      { date: "2026-03-10", hours: 6 },
      { date: "2026-03-11", hours: 6 },
    ]);
  });

  it("keeps a short night shift entirely on the start date", () => {
    expect(splitShiftAcrossDates("2026-03-10", { type: "night", hours: 4 })).toEqual([
      { date: "2026-03-10", hours: 4 },
    ]);
  });

  it("returns no portions for holiday, sick, or off", () => {
    expect(splitShiftAcrossDates("2026-03-10", { type: "holiday", hours: 0 })).toEqual([]);
    expect(splitShiftAcrossDates("2026-03-10", { type: "sick", hours: 0 })).toEqual([]);
    expect(splitShiftAcrossDates("2026-03-10", { type: "off", hours: 0 })).toEqual([]);
  });

  it("keeps an offsite day shift entirely on the same date", () => {
    expect(splitShiftAcrossDates("2026-03-10", { type: "offsite-day", hours: 12 })).toEqual([
      { date: "2026-03-10", hours: 12 },
    ]);
  });

  it("splits a 12h offsite night shift 6h on the start date, 6h on the next date", () => {
    expect(splitShiftAcrossDates("2026-03-10", { type: "offsite-night", hours: 12 })).toEqual([
      { date: "2026-03-10", hours: 6 },
      { date: "2026-03-11", hours: 6 },
    ]);
  });
});

describe("rateForDate", () => {
  const bankHolidays = [
    { date: "2026-12-25", name: "Christmas Day", type: "christmas" },
    { date: "2026-01-01", name: "New Year's Day", type: "standard" },
  ];

  it("pays double time on Christmas Day", () => {
    expect(rateForDate(bankHolidays, "2026-12-25")).toEqual({ multiplier: 2, label: "christmas" });
  });

  it("pays time and a half on a standard bank holiday", () => {
    expect(rateForDate(bankHolidays, "2026-01-01")).toEqual({ multiplier: 1.5, label: "bank holiday" });
  });

  it("pays standard time on an ordinary date", () => {
    expect(rateForDate(bankHolidays, "2026-03-10")).toEqual({ multiplier: 1, label: "standard" });
  });
});

describe("tallyForPeriod", () => {
  const staff = [{ id: "s1", name: "Dave" }];
  const period = getPayPeriod(new Date(2026, 2, 15)); // 28 Feb - 27 Mar 2026
  const bankHolidays = [{ date: "2026-03-10", name: "Test BH", type: "standard" }];

  it("counts standard hours worked outside any bank holiday", () => {
    const shifts = { "s1__2026-03-05": { type: "day", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.standard).toBe(12);
    expect(row.bh).toBe(0);
    expect(row.totalHours).toBe(12);
    expect(row.weightedHours).toBe(12);
  });

  it("applies the 1.5x bank holiday rate to hours worked on that date", () => {
    const shifts = { "s1__2026-03-10": { type: "day", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, bankHolidays, period);
    expect(row.bh).toBe(12);
    expect(row.standard).toBe(0);
    expect(row.weightedHours).toBe(18);
  });

  it("splits a night shift's weighting when it crosses into a bank holiday", () => {
    // Night shift starting the day before the bank holiday: 6h standard, 6h at 1.5x.
    const shifts = { "s1__2026-03-09": { type: "night", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, bankHolidays, period);
    expect(row.standard).toBe(6);
    expect(row.bh).toBe(6);
    expect(row.totalHours).toBe(12);
    expect(row.weightedHours).toBe(15); // 6*1 + 6*1.5
  });

  it("counts holiday and sick days without adding hours", () => {
    const shifts = {
      "s1__2026-03-05": { type: "holiday", hours: 0 },
      "s1__2026-03-06": { type: "sick", hours: 0 },
    };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.holidayDays).toBe(1);
    expect(row.sickDays).toBe(1);
    expect(row.totalHours).toBe(0);
  });

  it("counts approved and legacy holidays but excludes pending requests", () => {
    const shifts = {
      "s1__2026-03-05": { type: "holiday", hours: 0, status: "approved" },
      "s1__2026-03-06": { type: "holiday", hours: 0 }, // legacy: no status => approved
      "s1__2026-03-07": { type: "holiday", hours: 0, status: "pending" }, // awaiting approval
    };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.holidayDays).toBe(2);
  });

  it("ignores shift portions that fall outside the requested pay period", () => {
    const shifts = { "s1__2026-01-15": { type: "day", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.totalHours).toBe(0);
  });

  it("counts a night shift booked on the last day of the period in full, even though its tail leg is worked past midnight", () => {
    // 2026-03-27 is the last day of this pay period. The shift's second leg
    // (00:00-06:00) falls on 2026-03-28, the first day of the *next* period,
    // but the whole 12h shift is booked on and paid within this period.
    const shifts = { "s1__2026-03-27": { type: "night", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.totalHours).toBe(12);
    expect(row.standard).toBe(12);
  });

  it("excludes a night shift booked on the last day of the previous period entirely", () => {
    // 2026-02-27 is the last day of the *previous* pay period. Even though its
    // tail leg lands on 2026-02-28 (the first day of this period), the shift
    // was booked in the previous period and is paid there in full, not here.
    const shifts = { "s1__2026-02-27": { type: "night", hours: 12 } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.totalHours).toBe(0);
  });

  it("counts hours worked on an approved holiday separately from standard, at a flat 1x rate", () => {
    const shifts = { "s1__2026-03-05": { type: "holiday", hours: 2, status: "approved" } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.holidayDays).toBe(1);
    expect(row.holidayWorked).toBe(2);
    expect(row.standard).toBe(0);
    expect(row.totalHours).toBe(2);
    expect(row.weightedHours).toBe(2);
  });

  it("does not count hours worked on a still-pending holiday request", () => {
    const shifts = { "s1__2026-03-05": { type: "holiday", hours: 2, status: "pending" } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.holidayDays).toBe(0);
    expect(row.holidayWorked).toBe(0);
    expect(row.totalHours).toBe(0);
  });

  it("treats a legacy holiday (no status) with worked hours as approved", () => {
    const shifts = { "s1__2026-03-05": { type: "holiday", hours: 3 } };
    const [row] = tallyForPeriod(staff, shifts, [], period);
    expect(row.holidayWorked).toBe(3);
    expect(row.totalHours).toBe(3);
  });
});

describe("buildTallyCsvRows", () => {
  const staff = [{ id: "s1", name: "Dave" }];
  const period = getPayPeriod(new Date(2026, 2, 15)); // 28 Feb - 27 Mar 2026
  const bankHolidays = [{ date: "2026-03-10", name: "Test BH", type: "standard" }];

  it("includes a holiday premium column (weighted extra minus base hrs) before the weighted hrs column, so total + premium = weighted", () => {
    // 12h worked on a bank holiday (×1.5): weighted = 18, base total = 12,
    // so the premium — the extra paid on top of base hours — is 6.
    const shifts = { "s1__2026-03-10": { type: "day", hours: 12 } };
    const rows = buildTallyCsvRows(staff, shifts, bankHolidays, period);
    const header = rows[1];
    const dataRow = rows[2];
    const totalIdx = header.indexOf("Total hrs worked");
    const premiumIdx = header.indexOf("Holiday premium (BH + Xmas)");
    const weightedIdx = header.indexOf("Weighted hrs (for pay)");
    expect(premiumIdx).toBeGreaterThan(-1);
    expect(premiumIdx).toBe(weightedIdx - 1);
    expect(dataRow[premiumIdx]).toBe("6");
    expect(Number(dataRow[totalIdx]) + Number(dataRow[premiumIdx])).toBe(Number(dataRow[weightedIdx]));
  });

  it("includes a holiday worked hrs column right after standard hrs", () => {
    const shifts = { "s1__2026-03-05": { type: "holiday", hours: 2, status: "approved" } };
    const rows = buildTallyCsvRows(staff, shifts, [], period);
    const header = rows[1];
    const dataRow = rows[2];
    const standardIdx = header.indexOf("Standard hrs");
    const holidayWorkedIdx = header.indexOf("Holiday worked hrs");
    expect(holidayWorkedIdx).toBeGreaterThan(-1);
    expect(holidayWorkedIdx).toBe(standardIdx + 1);
    expect(dataRow[holidayWorkedIdx]).toBe("2");
  });
});

describe("shiftCellText", () => {
  it("shows a plain 'Holiday' label when no hours were worked", () => {
    expect(shiftCellText({ type: "holiday", hours: 0 })).toBe("Holiday");
  });

  it("notes worked hours on a holiday", () => {
    expect(shiftCellText({ type: "holiday", hours: 2 })).toBe("Holiday (+2h worked)");
  });
});

describe("sumApprovedHolidayHoursByStaff", () => {
  it("sums each shift's own holidayHours, excludes pending ones", () => {
    const holidayShifts = [
      { staffId: "s1", date: "2026-03-05", status: "approved", holidayHours: 6 },
      { staffId: "s1", date: "2026-03-06", holidayHours: 12 }, // legacy: no status => approved
      { staffId: "s1", date: "2026-03-07", status: "pending", holidayHours: 12 }, // excluded
    ];
    expect(sumApprovedHolidayHoursByStaff(holidayShifts)).toEqual({ s1: 18 });
  });

  it("falls back to HOURS_PER_HOLIDAY_DAY for legacy docs with no holidayHours field", () => {
    const holidayShifts = [
      { staffId: "s1", date: "2026-03-05", status: "approved" },
      { staffId: "s1", date: "2026-03-06", status: "approved" },
    ];
    expect(sumApprovedHolidayHoursByStaff(holidayShifts)).toEqual({
      s1: 2 * HOURS_PER_HOLIDAY_DAY,
    });
  });

  it("groups totals by staff member independently", () => {
    const holidayShifts = [
      { staffId: "s1", date: "2026-03-05", status: "approved", holidayHours: 4 },
      { staffId: "s2", date: "2026-03-05", status: "approved", holidayHours: 8 },
      { staffId: "s2", date: "2026-03-06", status: "approved", holidayHours: 12 },
    ];
    expect(sumApprovedHolidayHoursByStaff(holidayShifts)).toEqual({ s1: 4, s2: 20 });
  });

  it("returns an empty object for no holiday shifts", () => {
    expect(sumApprovedHolidayHoursByStaff([])).toEqual({});
  });

  it("excludes holidays dated before a staff member's holidayAllowanceStartDate", () => {
    const holidayShifts = [
      { staffId: "s1", date: "2026-01-10", status: "approved", holidayHours: 12 }, // before reset
      { staffId: "s1", date: "2026-03-05", status: "approved", holidayHours: 6 }, // on the reset date
      { staffId: "s1", date: "2026-03-06", status: "approved", holidayHours: 12 }, // after
    ];
    const staff = [{ id: "s1", holidayAllowanceStartDate: "2026-03-05" }];
    expect(sumApprovedHolidayHoursByStaff(holidayShifts, staff)).toEqual({ s1: 18 });
  });

  it("counts all-time when a staff member has no reset date set", () => {
    const holidayShifts = [
      { staffId: "s1", date: "2025-01-01", status: "approved", holidayHours: 12 },
      { staffId: "s1", date: "2026-03-06", status: "approved", holidayHours: 12 },
    ];
    const staff = [{ id: "s1" }];
    expect(sumApprovedHolidayHoursByStaff(holidayShifts, staff)).toEqual({ s1: 24 });
  });

  it("applies each staff member's own reset date independently", () => {
    const holidayShifts = [
      { staffId: "s1", date: "2026-01-10", status: "approved", holidayHours: 12 },
      { staffId: "s2", date: "2026-01-10", status: "approved", holidayHours: 12 },
    ];
    const staff = [
      { id: "s1", holidayAllowanceStartDate: "2026-02-01" }, // excludes s1's Jan holiday
      { id: "s2" }, // no reset date — s2's Jan holiday still counts
    ];
    expect(sumApprovedHolidayHoursByStaff(holidayShifts, staff)).toEqual({ s2: 12 });
  });
});

describe("tallyForPeriod holiday hours allowance", () => {
  const staff = [{ id: "s1", name: "Dave", holidayHoursAllowance: 80 }];
  const period = getPayPeriod(new Date(2026, 2, 15)); // 28 Feb - 27 Mar 2026

  it("is null when the staff member has no allowance set", () => {
    const noAllowanceStaff = [{ id: "s1", name: "Dave" }];
    const [row] = tallyForPeriod(noAllowanceStaff, {}, [], period, { s1: 36 });
    expect(row.holidayHoursAllowance).toBeNull();
    expect(row.holidayHoursRemaining).toBeNull();
  });

  it("subtracts the all-time used-hours total from the allowance", () => {
    const [row] = tallyForPeriod(staff, {}, [], period, { s1: 36 });
    expect(row.holidayHoursAllowance).toBe(80);
    expect(row.holidayHoursRemaining).toBe(80 - 36);
  });

  it("is unaffected by the visible pay period — used hours come from the all-time map, not `shifts`", () => {
    // No shifts in this period's `shifts` map at all, but the all-time map
    // still shows 60 hours used elsewhere — remaining reflects that, not 0.
    const [row] = tallyForPeriod(staff, {}, [], period, { s1: 60 });
    expect(row.holidayHoursRemaining).toBe(80 - 60);
  });

  it("defaults used hours to 0 when the staff member has no entry in the map", () => {
    const [row] = tallyForPeriod(staff, {}, [], period, {});
    expect(row.holidayHoursRemaining).toBe(80);
  });
});

describe("getStaffDueForHolidayReset", () => {
  const today = new Date(2026, 2, 15); // 15 Mar 2026

  it("skips staff with no holidayAllowanceStartDate set", () => {
    const staff = [{ id: "s1", name: "Dave" }];
    expect(getStaffDueForHolidayReset(staff, today)).toEqual([]);
  });

  it("includes a staff member whose reset falls within the next 7 days", () => {
    // 365 days after 2025-03-15 lands exactly on `today` (2026-03-15).
    const staff = [{ id: "s1", name: "Dave", holidayAllowanceStartDate: "2025-03-15" }];
    const [row] = getStaffDueForHolidayReset(staff, today);
    expect(row.id).toBe("s1");
    expect(row.daysUntil).toBe(0);
  });

  it("excludes a staff member whose reset is more than 7 days away", () => {
    const staff = [{ id: "s1", name: "Dave", holidayAllowanceStartDate: "2025-06-01" }];
    expect(getStaffDueForHolidayReset(staff, today)).toEqual([]);
  });

  it("includes a staff member whose reset date has already passed (overdue)", () => {
    const staff = [{ id: "s1", name: "Dave", holidayAllowanceStartDate: "2025-01-01" }];
    const [row] = getStaffDueForHolidayReset(staff, today);
    expect(row.daysUntil).toBeLessThan(0);
  });

  it("sorts most-overdue-first, then soonest-upcoming", () => {
    const staff = [
      { id: "s1", name: "Dave", holidayAllowanceStartDate: "2025-06-01" }, // far out — excluded
      { id: "s2", name: "Wayne", holidayAllowanceStartDate: "2025-01-01" }, // well overdue
      { id: "s3", name: "Rod", holidayAllowanceStartDate: "2025-03-18" }, // due in 3 days
    ];
    const due = getStaffDueForHolidayReset(staff, today);
    expect(due.map((r) => r.id)).toEqual(["s2", "s3"]);
    expect(due[0].daysUntil).toBeLessThan(due[1].daysUntil);
  });
});
