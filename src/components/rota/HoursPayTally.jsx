import { Download } from "lucide-react";
import RotaPeriodNav from "./RotaPeriodNav";
import RotaRangeFilter from "./RotaRangeFilter";
import { fmtNum, sumRows, tallyForPeriod } from "../../utils/rota";

const HoursPayTally = ({
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
  onDownloadCsv,
}) => {
  const rows = tallyForPeriod(staff, shifts, bankHolidays, customRange ?? period);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Hours &amp; pay tally</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pay period runs 28th to 27th. Bank holiday hours pay 1.5×, Christmas Day pays 2× — only
            for hours actually worked on that date, including the tail end of a night shift that
            crosses into it.
            {customRange && (
              <span className="text-teal-700 font-medium">
                {" "}
                Showing {customRange.start.toLocaleDateString("en-GB")}–
                {customRange.end.toLocaleDateString("en-GB")} only — CSV still exports the full period.
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-5 py-3 font-medium">Staff</th>
                <th className="text-right px-4 py-3 font-medium">Standard hrs</th>
                <th className="text-right px-4 py-3 font-medium">Bank hol. hrs (×1.5)</th>
                <th className="text-right px-4 py-3 font-medium">Xmas hrs (×2)</th>
                <th className="text-right px-4 py-3 font-medium">Holiday days</th>
                <th className="text-right px-4 py-3 font-medium">Sick days</th>
                <th className="text-right px-4 py-3 font-medium">Total hrs worked</th>
                <th className="text-right px-5 py-3 font-medium">Weighted hrs (pay)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.standard)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.bh)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.xmas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.holidayDays}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.sickDays}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtNum(r.totalHours)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold text-teal-700">
                    {fmtNum(r.weightedHours)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 font-bold">
                <td className="px-5 py-3">All staff</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtNum(sumRows(rows, "standard"))}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtNum(sumRows(rows, "bh"))}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtNum(sumRows(rows, "xmas"))}</td>
                <td className="px-4 py-3 text-right tabular-nums">{sumRows(rows, "holidayDays")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{sumRows(rows, "sickDays")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtNum(sumRows(rows, "totalHours"))}</td>
                <td className="px-5 py-3 text-right tabular-nums text-teal-700">
                  {fmtNum(sumRows(rows, "weightedHours"))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default HoursPayTally;
