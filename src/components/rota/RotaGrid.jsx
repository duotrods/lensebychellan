import { Download } from "lucide-react";
import RotaPeriodNav from "./RotaPeriodNav";
import RotaRangeFilter from "./RotaRangeFilter";
import {
  bankHolidayFor,
  dayLabel,
  eachDate,
  fmt,
  isSameDay,
  monthLabel,
} from "../../utils/rota";

const PILL_STYLES = {
  day: "bg-yellow-100 border-2 border-yellow-400 text-yellow-800",
  night: "bg-blue-100 border-2 border-blue-500 text-blue-800",
  holiday: "bg-red-100 border-2 border-red-400 text-red-800",
  sick: "bg-green-100 border-2 border-green-500 text-green-800",
  off: "border-2 border-dashed border-gray-200 text-gray-300",
};

const PILL_LABEL = { day: "D", night: "N", holiday: "Hol", sick: "Sick" };

const ShiftPill = ({ shift, canEdit, onClick }) => {
  const type = shift?.type && PILL_STYLES[shift.type] ? shift.type : "off";
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={onClick}
      className={`w-full min-h-[38px] rounded-lg flex flex-col items-center justify-center text-[11px] font-bold transition-colors ${PILL_STYLES[type]} ${
        canEdit ? "cursor-pointer hover:border-teal-400" : "cursor-default"
      }`}
    >
      {type === "off" ? "–" : PILL_LABEL[type]}
      {(type === "day" || type === "night") && (
        <span className="text-[10px] font-semibold opacity-75 mt-0.5">{shift.hours}h</span>
      )}
    </button>
  );
};

const StaffingBadges = ({ counts, expectedPerShift }) => (
  <div className="flex gap-1 mt-1">
    <span
      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
        counts.day === expectedPerShift ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {counts.day}D
    </span>
    <span
      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
        counts.night === expectedPerShift ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {counts.night}N
    </span>
  </div>
);

const RotaGrid = ({
  staff,
  shifts,
  bankHolidays,
  period,
  periodAnchor,
  onPrevPeriod,
  onNextPeriod,
  onToday,
  onPickDate,
  customRange,
  onRangeChange,
  onClearRange,
  canEdit,
  onCellClick,
  onDownloadCsv,
  expectedPerShift = 3,
}) => {
  const days = customRange
    ? eachDate(customRange.start, customRange.end)
    : eachDate(period.start, period.end);
  const today = new Date();

  const staffingCounts = (dateStr) => {
    let day = 0;
    let night = 0;
    staff.forEach((p) => {
      const s = shifts[`${p.id}__${dateStr}`];
      if (s?.type === "day") day++;
      if (s?.type === "night") night++;
    });
    return { day, night };
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Monthly rota</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Rota period runs 28th to 27th, matching the pay period. Expect {expectedPerShift} on Days and{" "}
            {expectedPerShift} on Nights — badges flag when a day is over or under.
            {customRange && (
              <span className="text-teal-700 font-medium">
                {" "}
                Showing {customRange.start.toLocaleDateString("en-GB")}–
                {customRange.end.toLocaleDateString("en-GB")} only.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RotaPeriodNav
            period={period}
            periodAnchor={periodAnchor}
            onPrevPeriod={onPrevPeriod}
            onNextPeriod={onNextPeriod}
            onToday={onToday}
            onPickDate={onPickDate}
          />
          <RotaRangeFilter
            period={period}
            range={customRange}
            onChange={onRangeChange}
            onClear={onClearRange}
          />
          <button
            type="button"
            onClick={onDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {staff.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No staff on the roster yet.
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2 font-semibold min-w-[150px]">
                  Date
                </th>
                {staff.map((p) => (
                  <th key={p.id} className="px-2 py-2 font-semibold text-center min-w-[76px]">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((d) => {
                const dStr = fmt(d);
                const bh = bankHolidayFor(bankHolidays, dStr);
                const counts = staffingCounts(dStr);
                const isToday = isSameDay(d, today);
                return (
                  <tr key={dStr} className={isToday ? "bg-teal-50/60" : ""}>
                    <td
                      className={`sticky left-0 z-10 px-4 py-2 whitespace-nowrap ${
                        isToday ? "bg-teal-50" : "bg-white"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${
                          bh ? (bh.type === "christmas" ? "text-rose-600" : "text-orange-500") : "text-gray-800"
                        }`}
                      >
                        {dayLabel(d)} {d.getDate()} {monthLabel(d)}
                      </div>
                      {bh && (
                        <div
                          className={`text-[9.5px] font-bold ${
                            bh.type === "christmas" ? "text-rose-600" : "text-orange-500"
                          }`}
                        >
                          {bh.type === "christmas" ? "Xmas" : "Bank hol."}
                        </div>
                      )}
                      <StaffingBadges counts={counts} expectedPerShift={expectedPerShift} />
                    </td>
                    {staff.map((p) => {
                      const shift = shifts[`${p.id}__${dStr}`];
                      return (
                        <td key={p.id} className="p-1 text-center align-middle">
                          <ShiftPill
                            shift={shift}
                            canEdit={canEdit}
                            onClick={() => onCellClick(p.id, dStr)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap gap-4 px-5 py-3 border-t text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-yellow-100 border-2 border-yellow-400" /> Day shift
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-100 border-2 border-blue-500" /> Night shift
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-red-100 border-2 border-red-400" /> Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-green-100 border-2 border-green-500" /> Sick
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-gray-200" /> Off / unassigned
        </span>
      </div>
    </div>
  );
};

export default RotaGrid;
