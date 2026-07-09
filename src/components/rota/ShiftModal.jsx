import { useEffect, useState } from "react";
import { X } from "lucide-react";

const OPTIONS = [
  { value: "day", label: "Day — starts 06:00", dot: "bg-yellow-400" },
  { value: "night", label: "Night — starts 18:00", dot: "bg-blue-500" },
  { value: "holiday", label: "Holiday", dot: "bg-red-400" },
  { value: "sick", label: "Sick", dot: "bg-green-500" },
  { value: "off", label: "Off / clear", dot: "bg-gray-300" },
];

const QUICK_HOURS = [4, 6, 8, 10, 12];

// pendingCell: { staffName, dateStr, existing: {type, hours} | null }
const ShiftModal = ({ pendingCell, onSave, onClose }) => {
  const [type, setType] = useState(pendingCell?.existing?.type ?? null);
  const [hours, setHours] = useState(pendingCell?.existing?.hours || 12);

  useEffect(() => {
    setType(pendingCell?.existing?.type ?? null);
    setHours(pendingCell?.existing?.hours || 12);
  }, [pendingCell]);

  if (!pendingCell) return null;

  const dateObj = new Date(pendingCell.dateStr);
  const showHours = type === "day" || type === "night";

  const handleSave = () => {
    if (!type) {
      onClose();
      return;
    }
    if (type === "off") {
      onSave({ type: "off" });
    } else if (type === "holiday" || type === "sick") {
      onSave({ type, hours: 0 });
    } else {
      const clamped = Math.max(0.5, Math.min(24, Number(hours) || 12));
      onSave({ type, hours: clamped });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-5 w-[300px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{pendingCell.staffName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {dateObj.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] font-semibold text-sm text-left ${
                type === opt.value
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 bg-gray-50 hover:border-teal-300"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
        </div>

        <div
          className={`flex flex-col gap-2 mt-3 p-3 rounded-lg bg-gray-50 border-[1.5px] border-gray-200 transition-opacity ${
            showHours ? "opacity-100" : "opacity-40 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-gray-500">Hours worked</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-16 text-center text-sm border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <span className="text-xs text-gray-500">hrs</span>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  String(hours) === String(h)
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-600"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 justify-center bg-teal-500 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-teal-600"
          >
            Save
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-xs text-gray-400 mt-2 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ShiftModal;
