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
});
