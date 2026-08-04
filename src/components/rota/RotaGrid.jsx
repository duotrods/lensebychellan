import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Download, GripHorizontal } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  "offsite-day": "bg-orange-100 border-2 border-orange-400 text-orange-800",
  "offsite-night": "bg-indigo-100 border-2 border-indigo-500 text-indigo-800",
  holiday: "bg-red-100 border-2 border-red-400 text-red-800",
  // Holiday requested by staff, awaiting admin approval.
  holidayPending: "bg-gray-100 border-2 border-gray-400 text-gray-500",
  sick: "bg-green-100 border-2 border-green-500 text-green-800",
  off: "border-2 border-dashed border-gray-200 text-gray-300",
};

const PILL_LABEL = {
  day: "D",
  night: "N",
  "offsite-day": "OD",
  "offsite-night": "ON",
  holiday: "Hol",
  holidayPending: "Hol*",
  sick: "Sick",
};

const HOURLY_TYPES = ["day", "night", "offsite-day", "offsite-night"];

// A holiday with an explicit "pending" status is awaiting approval; anything else
// (approved, or legacy holidays without a status) renders as an approved red holiday.
const isPendingHoliday = (shift) =>
  shift?.type === "holiday" && shift?.status === "pending";

const ShiftPill = ({ shift, canEdit, onClick }) => {
  let styleKey = shift?.type && PILL_STYLES[shift.type] ? shift.type : "off";
  if (isPendingHoliday(shift)) styleKey = "holidayPending";
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={onClick}
      title={styleKey === "holidayPending" ? "Holiday — pending approval" : undefined}
      className={`w-full min-h-[38px] rounded-lg flex flex-col items-center justify-center text-[11px] font-bold transition-colors ${PILL_STYLES[styleKey]} ${
        canEdit ? "cursor-pointer hover:border-teal-400" : "cursor-default"
      }`}
    >
      {styleKey === "off" ? "–" : PILL_LABEL[styleKey]}
      {HOURLY_TYPES.includes(styleKey) && (
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

// A staff column header. Draggable (with a grip handle) only when canReorder is true —
// useSortable is always called (Rules of Hooks) but its listeners/attributes are only
// applied when dragging is actually enabled, so it renders as a plain header otherwise.
const StaffColumnHeader = ({ staffMember, canReorder }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: staffMember.id,
    disabled: !canReorder,
    data: { type: "header" },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`sticky top-0 z-10 px-2 py-2 font-semibold text-center min-w-[76px] ${
        isDragging ? "opacity-50 bg-teal-50" : "bg-gray-50"
      } ${canReorder ? "cursor-grab active:cursor-grabbing select-none" : ""}`}
      {...(canReorder ? attributes : {})}
      {...(canReorder ? listeners : {})}
    >
      <span className="inline-flex items-center justify-center gap-1">
        {canReorder && <GripHorizontal className="w-3 h-3 text-gray-300 shrink-0" />}
        {staffMember.name}
      </span>
    </th>
  );
};

// Merges multiple refs (e.g. a draggable ref and a droppable ref) onto one DOM node —
// the standard dnd-kit pattern for a node that's both a drag source and a drop target.
function useCombinedRefs(...refs) {
  return useCallback(
    (node) => {
      refs.forEach((ref) => {
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  );
}

// A shift cell that's both a drag source (if it holds a real shift) and a drop
// target — dragging a shift onto another staff member's cell on the same date
// duplicates it there. canDuplicate mirrors canEdit; disabled otherwise so the
// cell behaves exactly as it does today (click to open ShiftModal only).
const DraggableShiftCell = ({ staffId, dateStr, shift, canEdit, canDuplicate, onClick }) => {
  const hasShift = Boolean(shift?.type) && shift.type !== "off";
  const dragDropId = `${staffId}__${dateStr}`;
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: dragDropId,
    data: { type: "shift", staffId, dateStr, shift },
    disabled: !canDuplicate || !hasShift,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dragDropId,
    data: { staffId, dateStr },
    disabled: !canDuplicate,
  });
  const setRefs = useCombinedRefs(setDragRef, setDropRef);
  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <td
      ref={setRefs}
      style={style}
      className={`p-1 text-center align-middle relative ${
        isOver ? "bg-teal-50 ring-2 ring-inset ring-teal-300 rounded-lg" : ""
      } ${isDragging ? "opacity-40" : ""}`}
      {...(canDuplicate && hasShift ? attributes : {})}
      {...(canDuplicate && hasShift ? listeners : {})}
    >
      <ShiftPill shift={shift} canEdit={canEdit} onClick={onClick} />
    </td>
  );
};

const RotaGrid = ({
  staff,
  shifts,
  bankHolidays,
  period,
  onPrevPeriod,
  onNextPeriod,
  onToday,
  customRange,
  onRangeChange,
  onClearRange,
  canEdit,
  onCellClick,
  onDownloadCsv,
  expectedPerShift = 3,
  canReorderStaff = false,
  onReorderStaff,
  onDuplicateShift,
}) => {
  const days = customRange
    ? eachDate(customRange.start, customRange.end)
    : eachDate(period.start, period.end);
  const today = new Date();

  // Local, optimistic column order — updated instantly on drop, ahead of the
  // Firestore round-trip. Resynced whenever the staff prop changes (e.g. someone
  // adds/removes a staff member elsewhere), preserving the current local order
  // for ids that still exist and appending any new ones.
  const [orderedStaff, setOrderedStaff] = useState(staff);
  useEffect(() => {
    setOrderedStaff((prev) => {
      const prevIds = new Set(prev.map((p) => p.id));
      const staffIds = new Set(staff.map((p) => p.id));
      const kept = prev.filter((p) => staffIds.has(p.id)).map((p) => staff.find((s) => s.id === p.id));
      const added = staff.filter((p) => !prevIds.has(p.id));
      return [...kept, ...added];
    });
  }, [staff]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedStaff.findIndex((p) => p.id === active.id);
    const newIndex = orderedStaff.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(orderedStaff, oldIndex, newIndex);
    setOrderedStaff(newOrder);
    onReorderStaff?.(newOrder.map((p) => p.id));
  };

  // Dragging a shift onto another cell duplicates it there — either sideways onto
  // another staff member (same date) or up/down onto a different date (same staff
  // member). A diagonal drop (different staff AND different date) is rejected, as
  // is dropping back onto the cell it came from. Validation is local (no network
  // round-trip), so it's checked and toasted here; only a valid drop calls up to
  // the page to persist it.
  const handleShiftDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const source = active.data.current;
    const target = over.data.current;
    if (!source?.shift || !target) return;
    const sameStaff = source.staffId === target.staffId;
    const sameDate = source.dateStr === target.dateStr;
    if (sameStaff && sameDate) return; // dropped back onto itself
    if (!sameStaff && !sameDate) {
      toast.error("Drag onto the same date (another staff member) or the same staff member (another date)");
      return;
    }
    if (shifts[`${target.staffId}__${target.dateStr}`]) {
      if (sameStaff) {
        toast.error("That date already has a shift");
      } else {
        const targetName = orderedStaff.find((p) => p.id === target.staffId)?.name ?? "This staff member";
        toast.error(`${targetName} already has a shift on this date`);
      }
      return;
    }
    onDuplicateShift?.(source.staffId, target.staffId, target.dateStr, source.shift);
  };

  // A single DndContext handles both drag types (column reorder and shift
  // duplicate) — DndContext must live outside the <table> entirely, since it
  // renders its own hidden accessibility <div>, which is invalid HTML directly
  // inside <tr>/<tbody> and causes the browser to silently restructure the DOM
  // (breaking sticky positioning along with it). One context, dispatched by
  // the dragged item's tagged data.type, avoids needing a second one.
  const handleCombinedDragEnd = (event) => {
    if (event.active.data.current?.type === "shift") {
      handleShiftDragEnd(event);
    } else {
      handleDragEnd(event);
    }
  };

  const staffingCounts = (dateStr) => {
    let day = 0;
    let night = 0;
    orderedStaff.forEach((p) => {
      const s = shifts[`${p.id}__${dateStr}`];
      if (s?.type === "day" || s?.type === "offsite-day") day++;
      if (s?.type === "night" || s?.type === "offsite-night") night++;
    });
    return { day, night };
  };

  return (
    <div className="bg-white rounded-xl shadow">
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
            onPrevPeriod={onPrevPeriod}
            onNextPeriod={onNextPeriod}
            onToday={onToday}
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
        {orderedStaff.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No staff on the roster yet.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCombinedDragEnd}
          >
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="sticky top-0 left-0 z-20 bg-gray-50 text-left px-4 py-2 font-semibold min-w-[150px]">
                  Date
                </th>
                {canReorderStaff ? (
                  <SortableContext
                    items={orderedStaff.map((p) => p.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {orderedStaff.map((p) => (
                      <StaffColumnHeader key={p.id} staffMember={p} canReorder />
                    ))}
                  </SortableContext>
                ) : (
                  orderedStaff.map((p) => (
                    <StaffColumnHeader key={p.id} staffMember={p} canReorder={false} />
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {days.map((d) => {
                const dStr = fmt(d);
                const bh = bankHolidayFor(bankHolidays, dStr);
                const counts = staffingCounts(dStr);
                const isToday = isSameDay(d, today);
                // Subtle full-row tint so a bank holiday / Christmas day is
                // obvious at a glance, not just the small orange/rose label text.
                const rowBgClass = isToday
                  ? "bg-teal-50/60"
                  : bh
                    ? bh.type === "christmas"
                      ? "bg-rose-50/70"
                      : "bg-orange-50/70"
                    : "";
                const stickyBgClass = isToday
                  ? "bg-teal-50"
                  : bh
                    ? bh.type === "christmas"
                      ? "bg-rose-50"
                      : "bg-orange-50"
                    : "bg-white";
                return (
                  <tr key={dStr} className={rowBgClass}>
                    <td className={`sticky left-0 z-10 px-4 py-2 whitespace-nowrap ${stickyBgClass}`}>
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
                    {orderedStaff.map((p) => {
                      const shift = shifts[`${p.id}__${dStr}`];
                      return (
                        <DraggableShiftCell
                          key={p.id}
                          staffId={p.id}
                          dateStr={dStr}
                          shift={shift}
                          canEdit={canEdit}
                          canDuplicate={canEdit}
                          onClick={() => onCellClick(p.id, dStr)}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </DndContext>
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
          <span className="w-3.5 h-3.5 rounded bg-orange-100 border-2 border-orange-400" /> Offsite day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-indigo-100 border-2 border-indigo-500" /> Offsite night
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-red-100 border-2 border-red-400" /> Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-gray-100 border-2 border-gray-400" /> Holiday (pending)
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
