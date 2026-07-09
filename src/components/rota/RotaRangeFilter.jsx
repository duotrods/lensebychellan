import { useEffect, useRef, useState } from "react";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { Filter, X } from "lucide-react";

// Lets the user narrow the currently-loaded pay period down to a sub-range
// (e.g. 10th-20th) for viewing/tallying. Purely a display filter — CSV
// exports and the underlying Firestore fetch always use the full period.
const RotaRangeFilter = ({ period, range, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selection = {
    startDate: range?.start ?? period.start,
    endDate: range?.end ?? period.end,
    key: "selection",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 h-9 rounded-lg border text-sm font-medium transition-shadow ${
          range
            ? "bg-teal-50 border-teal-200 text-teal-700"
            : "bg-white border-gray-200 text-gray-600 hover:shadow-md"
        }`}
      >
        <Filter className="w-4 h-4" />
        {range ? (
          <span>
            {range.start.toLocaleDateString("en-GB")} – {range.end.toLocaleDateString("en-GB")}
          </span>
        ) : (
          <span>Filter dates</span>
        )}
      </button>

      {range && (
        <button
          type="button"
          onClick={onClear}
          title="Clear date filter"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-400 hover:bg-gray-600 text-white flex items-center justify-center"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 shadow-xl rounded-lg overflow-hidden border border-gray-200">
          <DateRangePicker
            ranges={[selection]}
            onChange={(item) =>
              onChange({ start: item.selection.startDate, end: item.selection.endDate })
            }
            minDate={period.start}
            maxDate={period.end}
            moveRangeOnFirstSelection={false}
            months={2}
            direction="horizontal"
            showDateDisplay={false}
            rangeColors={["#17af93"]}
          />
        </div>
      )}
    </div>
  );
};

export default RotaRangeFilter;
