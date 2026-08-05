import { useEffect, useState } from "react";
import { X, Check, Ban, Clock, CopyPlus } from "lucide-react";
import { parseDateStr } from "../../utils/rota";

const OPTIONS = [
  { value: "day", label: "Day — starts 06:00", dot: "bg-yellow-400" },
  { value: "night", label: "Night — starts 18:00", dot: "bg-blue-500" },
  { value: "offsite-day", label: "Offsite Day — starts 06:00", dot: "bg-orange-400" },
  { value: "offsite-night", label: "Offsite Night — starts 18:00", dot: "bg-indigo-500" },
  { value: "holiday", label: "Holiday", dot: "bg-red-400" },
  { value: "sick", label: "Sick", dot: "bg-green-500" },
  { value: "off", label: "Off / clear", dot: "bg-gray-300" },
];

const HOURLY_TYPES = ["day", "night", "offsite-day", "offsite-night"];

const QUICK_HOURS = [4, 6, 8, 10, 12];

// pendingCell: { staffName, dateStr, existing: {type, hours, status} | null }
// duplicateDateOptions: [{ dateStr, label }] — other dates this period eligible to
// also receive the same shift (already excludes the edited date and any date that
// already has a shift for this staff member).
const ShiftModal = ({
  pendingCell,
  onSave,
  onClose,
  canApprove = false,
  onApprove,
  onReject,
  duplicateDateOptions = [],
}) => {
  const [type, setType] = useState(pendingCell?.existing?.type ?? null);
  const [hours, setHours] = useState(pendingCell?.existing?.hours ?? 12);
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);

  useEffect(() => {
    setType(pendingCell?.existing?.type ?? null);
    setHours(pendingCell?.existing?.hours ?? 12);
    setSelectedDuplicates([]);
  }, [pendingCell]);

  if (!pendingCell) return null;

  const dateObj = parseDateStr(pendingCell.dateStr);
  // Holiday shares the same hours input as the hourly types, but it means
  // something different: hours worked despite being on holiday (usually 0).
  const showHours = HOURLY_TYPES.includes(type) || type === "holiday";
  const isPendingHoliday =
    pendingCell.existing?.type === "holiday" && pendingCell.existing?.status === "pending";
  const showDuplicate =
    type && type !== "off" && duplicateDateOptions.length > 0;

  const toggleDuplicate = (dateStr) => {
    setSelectedDuplicates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr],
    );
  };

  // Selecting a type re-bases the hours field so a value entered for one
  // meaning doesn't leak into another — e.g. leaving hours at 12 (a full
  // shift default) shouldn't silently become "12 hours worked on holiday".
  // Only resets on an actual transition, so re-clicking the same option or
  // typing after selecting it doesn't wipe what was just entered.
  const handleTypeSelect = (value) => {
    if (value === "holiday" && type !== "holiday") {
      setHours(pendingCell?.existing?.type === "holiday" ? (pendingCell.existing.hours ?? 0) : 0);
    } else if (HOURLY_TYPES.includes(value) && (type === "holiday" || type === "sick")) {
      setHours(pendingCell?.existing?.hours ?? 12);
    }
    setType(value);
  };

  const handleSave = () => {
    if (!type) {
      onClose();
      return;
    }
    if (type === "off") {
      onSave({ type: "off" });
    } else if (type === "sick") {
      onSave({ type, hours: 0, duplicateDates: selectedDuplicates });
    } else if (type === "holiday") {
      // Hours worked while on holiday — 0 is the common case, unlike the
      // hourly shift types where a shift always has some minimum length.
      const worked = Math.max(0, Math.min(24, Number(hours) || 0));
      onSave({ type, hours: worked, duplicateDates: selectedDuplicates });
    } else {
      const clamped = Math.max(0.5, Math.min(24, Number(hours) || 12));
      onSave({ type, hours: clamped, duplicateDates: selectedDuplicates });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-5 w-[340px] shadow-2xl"
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

        {isPendingHoliday && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border-[1.5px] border-gray-200">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              Holiday requested — pending approval
            </p>
            {canApprove ? (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onApprove?.()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white font-semibold text-sm py-2 rounded-lg hover:bg-red-600"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => onReject?.()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white border-[1.5px] border-gray-300 text-gray-600 font-semibold text-sm py-2 rounded-lg hover:border-gray-400"
                >
                  <Ban className="w-4 h-4" /> Reject
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">
                Awaiting admin approval. You can clear this request below.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTypeSelect(opt.value)}
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
            <label className="text-xs font-semibold text-gray-500">
              {type === "holiday" ? "Hours worked (if any)" : "Hours worked"}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={type === "holiday" ? 0 : 0.5}
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

        {showDuplicate && (
          <div className="flex flex-col gap-2 mt-3 p-3 rounded-lg bg-gray-50 border-[1.5px] border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <CopyPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Also apply to other dates</span>
              </label>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDuplicates(duplicateDateOptions.map((o) => o.dateStr))
                  }
                  className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 whitespace-nowrap"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDuplicates([])}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1">
              {duplicateDateOptions.map((opt) => (
                <label
                  key={opt.dateStr}
                  className="flex items-center gap-2 text-xs text-gray-600 py-1 px-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDuplicates.includes(opt.dateStr)}
                    onChange={() => toggleDuplicate(opt.dateStr)}
                    className="accent-teal-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 justify-center bg-teal-500 text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-teal-600"
          >
            Save{selectedDuplicates.length > 0 ? ` (+${selectedDuplicates.length} dates)` : ""}
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
