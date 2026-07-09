import { useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarPlus } from "lucide-react";
import { rotaService } from "../../services/rotaService";

// bankHolidays/loading are lifted from the parent page's useBankHolidays()
// call so this component doesn't open a second, redundant onSnapshot listener.
const RotaBankHolidaysManager = ({ bankHolidays, loading }) => {
  const [form, setForm] = useState({ name: "", date: "", type: "standard" });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) return;
    setSubmitting(true);
    try {
      await rotaService.addBankHoliday({
        name: form.name.trim(),
        date: form.date,
        type: form.type,
      });
      setForm({ name: "", date: "", type: "standard" });
      toast.success("Bank holiday added");
    } catch (error) {
      toast.error(error.message || "Failed to add bank holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (date, name) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await rotaService.removeBankHoliday(date);
      toast.success("Bank holiday removed");
    } catch (error) {
      toast.error(error.message || "Failed to remove bank holiday");
    }
  };

  const sorted = [...bankHolidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden max-w-2xl">
      <div className="px-6 py-4 border-b">
        <h2 className="text-base font-semibold text-gray-800">Bank holidays</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Dates here trigger 1.5× pay automatically. Christmas Day is flagged separately at 2×.
        </p>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No bank holidays added.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((b) => (
              <div
                key={b.date}
                className="flex items-center justify-between px-3.5 py-2.5 border border-gray-100 rounded-xl bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                      b.type === "christmas"
                        ? "bg-rose-100 text-rose-600"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {b.type === "christmas" ? "2×" : "1.5×"}
                  </span>
                  <div>
                    <div className="font-medium text-sm text-gray-800">{b.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(b.date).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(b.date, b.name)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 px-5 py-4 border-t flex-wrap items-center">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Name, e.g. Boxing Day"
          required
          className="flex-1 min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="standard">Standard bank holiday (1.5×)</option>
          <option value="christmas">Christmas Day (2×)</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50"
        >
          <CalendarPlus className="w-4 h-4" />
          Add date
        </button>
      </form>
    </div>
  );
};

export default RotaBankHolidaysManager;
