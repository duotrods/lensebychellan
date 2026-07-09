import { useEffect, useRef, useState } from "react";
import { Calendar } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { ChevronLeft, ChevronRight, CalendarDays as CalendarIcon } from "lucide-react";
import { payPeriodLabel } from "../../utils/rota";

const RotaPeriodNav = ({ period, periodAnchor, onPrevPeriod, onNextPeriod, onToday, onPickDate }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
        <button
          type="button"
          onClick={onPrevPeriod}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
          title="Previous period"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold px-2 min-w-[170px] text-center">
          {payPeriodLabel(period)}
        </span>
        <button
          type="button"
          onClick={onNextPeriod}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
          title="Next period"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 ml-1"
        >
          This period
        </button>
      </div>

      <div className="relative" ref={calendarRef}>
        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          title="Jump to date"
          className="flex items-center justify-center w-9 h-9 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <CalendarIcon className="w-4 h-4 text-teal-600" />
        </button>

        {showCalendar && (
          <div className="absolute right-0 top-full mt-2 z-50 shadow-xl rounded-lg overflow-hidden border border-gray-200">
            <Calendar
              date={periodAnchor}
              onChange={(date) => {
                onPickDate(date);
                setShowCalendar(false);
              }}
              color="#17af93"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RotaPeriodNav;
