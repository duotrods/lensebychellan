import { useState } from "react";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { rotaService } from "../../services/rotaService";

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

// staff/loading are lifted from the parent page's useRotaStaff() call so this
// component doesn't open a second, redundant onSnapshot listener.
// holidayHoursUsedByStaff/onUpdateAllowance are likewise lifted — the used-hours
// map comes from AdminRotaPage's useAllHolidayShifts(), computed once and
// shared with the Hours & Pay tally rather than re-fetched here.
const RotaTeamManager = ({ staff, loading, holidayHoursUsedByStaff = {}, onUpdateAllowance }) => {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // In-progress allowance edits, keyed by staffId — only staff members with
  // an active edit have an entry here; everyone else reads straight from
  // the live `staff` prop.
  const [allowanceDrafts, setAllowanceDrafts] = useState({});

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await rotaService.addStaffMember(trimmed);
      setName("");
      toast.success(`${trimmed} added to the roster`);
    } catch (error) {
      toast.error(error.message || "Failed to add staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllowanceChange = (staffId, value) => {
    setAllowanceDrafts((prev) => ({ ...prev, [staffId]: value }));
  };

  const handleAllowanceBlur = (member) => {
    const draft = allowanceDrafts[member.id];
    if (draft === undefined) return; // field was never touched
    setAllowanceDrafts((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });

    const trimmed = draft.trim();
    const nextValue = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (Number.isNaN(nextValue) || nextValue < 0)) {
      toast.error("Holiday hours must be a positive number");
      return;
    }

    const currentValue = member.holidayHoursAllowance ?? null;
    if (nextValue === currentValue) return; // unchanged, nothing to save
    onUpdateAllowance?.(member.id, nextValue);
  };

  const handleRemove = async (member) => {
    if (
      !confirm(
        `Remove ${member.name} from the rota roster? Their shifts will also be cleared.`,
      )
    )
      return;
    try {
      await rotaService.removeStaffMember(member.id);
      toast.success(`${member.name} removed from the roster`);
    } catch (error) {
      toast.error(error.message || "Failed to remove staff member");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden max-w-3xl">
      <div className="px-6 py-4 border-b">
        <h2 className="text-base font-semibold text-gray-800">Team</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Add or remove staff from the rota roster. {staff.length} staff currently on the roster.
        </p>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            No staff on the roster yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {staff.map((p) => {
              const usedHours = holidayHoursUsedByStaff[p.id] ?? 0;
              const remaining =
                p.holidayHoursAllowance != null
                  ? p.holidayHoursAllowance - usedHours
                  : null;
              const draftValue =
                allowanceDrafts[p.id] ?? (p.holidayHoursAllowance ?? "");
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3.5 py-2.5 border border-gray-100 rounded-xl bg-gray-50 gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {initials(p.name)}
                    </div>
                    <span className="font-medium text-sm text-gray-800 truncate">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      Holiday hrs
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={draftValue}
                        onChange={(e) => handleAllowanceChange(p.id, e.target.value)}
                        onBlur={() => handleAllowanceBlur(p)}
                        placeholder="—"
                        className="w-16 text-center text-sm border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </label>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      Remaining:{" "}
                      <span className="font-semibold text-gray-700">
                        {remaining != null ? `${remaining}h` : "—"}
                      </span>
                    </span>
                    <button
                      onClick={() => handleRemove(p)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 px-5 py-4 border-t flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          className="flex-1 min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
          Add staff
        </button>
      </form>
    </div>
  );
};

export default RotaTeamManager;
