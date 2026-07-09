import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { CalendarDays, X } from "lucide-react";

// Approximate width of the 2-month horizontal picker; used to keep the popup on-screen.
const PICKER_WIDTH = 656;

// Lets the user narrow the currently-loaded pay period down to a sub-range
// (e.g. 10th-20th) for viewing/tallying. Purely a display filter — CSV
// exports and the underlying Firestore fetch always use the full period.
//
// The popup is rendered in a portal (fixed positioning) so it's never clipped
// by the rota card's `overflow-hidden`.
const RotaRangeFilter = ({ period, range, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const placePopup = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Right-align to the button, but clamp so it stays within the viewport.
    const left = Math.max(
      8,
      Math.min(r.right - PICKER_WIDTH, window.innerWidth - PICKER_WIDTH - 8),
    );
    setPos({ top: r.bottom + 8, left });
  };

  useLayoutEffect(() => {
    if (open) placePopup();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event) => {
      if (btnRef.current?.contains(event.target)) return;
      if (popRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    // A fixed popup would drift on scroll, so just close it instead of tracking.
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const selection = {
    startDate: range?.start ?? period.start,
    endDate: range?.end ?? period.end,
    key: "selection",
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Filter dates"
        className={`flex items-center gap-2 px-3 h-9 rounded-lg border text-sm font-medium transition-shadow ${
          range
            ? "bg-teal-50 border-teal-200 text-teal-700"
            : "bg-white border-gray-200 text-teal-600 hover:shadow-md"
        }`}
      >
        <CalendarDays className="w-4 h-4" />
        {range && (
          <span>
            {range.start.toLocaleDateString("en-GB")} – {range.end.toLocaleDateString("en-GB")}
          </span>
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

      {open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 60 }}
            className="shadow-xl rounded-lg overflow-hidden border border-gray-200 bg-white"
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
};

export default RotaRangeFilter;
