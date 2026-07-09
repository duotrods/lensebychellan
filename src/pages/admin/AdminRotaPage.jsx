import { useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarDays, Wallet, Users, CalendarPlus } from "lucide-react";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import RotaGrid from "../../components/rota/RotaGrid";
import ShiftModal from "../../components/rota/ShiftModal";
import HoursPayTally from "../../components/rota/HoursPayTally";
import RotaTeamManager from "../../components/admin/RotaTeamManager";
import RotaBankHolidaysManager from "../../components/admin/RotaBankHolidaysManager";
import { useAuth } from "../../hooks/useAuth";
import { useRotaStaff, useBankHolidays, useRotaShifts } from "../../hooks/useRota";
import { rotaService } from "../../services/rotaService";
import {
  addDays,
  buildRotaCsvRows,
  buildTallyCsvRows,
  downloadCsv,
  fmt,
  getPayPeriod,
} from "../../utils/rota";

const TABS = [
  { key: "rota", label: "Rota", icon: CalendarDays },
  { key: "tally", label: "Hours & Pay", icon: Wallet },
  { key: "team", label: "Team", icon: Users },
  { key: "holidays", label: "Bank Holidays", icon: CalendarPlus },
];

const AdminRotaPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("rota");
  const [periodAnchor, setPeriodAnchor] = useState(() => new Date());
  const [pendingCell, setPendingCell] = useState(null);
  const [customRange, setCustomRange] = useState(null);

  const period = getPayPeriod(periodAnchor);
  const { staff, loading: staffLoading } = useRotaStaff();
  const { bankHolidays, loading: bankHolidaysLoading } = useBankHolidays();
  const { shifts } = useRotaShifts(period.start, period.end);

  // Changing periods invalidates any sub-range filter from the previous period.
  const goPrevPeriod = () => {
    setCustomRange(null);
    setPeriodAnchor(addDays(period.start, -1));
  };
  const goNextPeriod = () => {
    setCustomRange(null);
    setPeriodAnchor(addDays(period.end, 1));
  };
  const goToday = () => {
    setCustomRange(null);
    setPeriodAnchor(new Date());
  };
  const handlePickDate = (date) => {
    setCustomRange(null);
    setPeriodAnchor(date);
  };

  const handleCellClick = (staffId, dateStr) => {
    const person = staff.find((p) => p.id === staffId);
    setPendingCell({
      staffId,
      staffName: person?.name ?? "Staff",
      dateStr,
      existing: shifts[`${staffId}__${dateStr}`] ?? null,
    });
  };

  const handleSaveShift = async (value) => {
    const { staffId, dateStr } = pendingCell;
    try {
      if (value.type === "off") {
        await rotaService.clearShift(staffId, dateStr);
      } else {
        await rotaService.setShift(staffId, dateStr, value, currentUser?.uid);
      }
    } catch (error) {
      toast.error(error.message || "Failed to save shift");
    } finally {
      setPendingCell(null);
    }
  };

  const handleDownloadRotaCsv = () => {
    downloadCsv(
      `rota_${fmt(period.start)}_to_${fmt(period.end)}.csv`,
      buildRotaCsvRows(staff, shifts, bankHolidays, period),
    );
  };

  const handleDownloadTallyCsv = () => {
    downloadCsv(
      `hours_and_pay_${fmt(period.start)}_to_${fmt(period.end)}.csv`,
      buildTallyCsvRows(staff, shifts, bankHolidays, period),
    );
  };

  return (
    <AdminSidebarLayout>
      <div className="border-b border-gray-200 bg-white px-6 pt-4">
        <nav className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === key
                  ? "border-teal-500 text-teal-600 bg-teal-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "rota" && (
          <>
            <RotaGrid
              staff={staff}
              shifts={shifts}
              bankHolidays={bankHolidays}
              period={period}
              periodAnchor={periodAnchor}
              onPrevPeriod={goPrevPeriod}
              onNextPeriod={goNextPeriod}
              onToday={goToday}
              onPickDate={handlePickDate}
              customRange={customRange}
              onRangeChange={setCustomRange}
              onClearRange={() => setCustomRange(null)}
              canEdit
              onCellClick={handleCellClick}
              onDownloadCsv={handleDownloadRotaCsv}
            />
            <ShiftModal
              pendingCell={pendingCell}
              onSave={handleSaveShift}
              onClose={() => setPendingCell(null)}
            />
          </>
        )}

        {activeTab === "tally" && (
          <HoursPayTally
            staff={staff}
            shifts={shifts}
            bankHolidays={bankHolidays}
            period={period}
            periodAnchor={periodAnchor}
            onPrevPeriod={goPrevPeriod}
            onNextPeriod={goNextPeriod}
            onToday={goToday}
            onPickDate={handlePickDate}
            customRange={customRange}
            onRangeChange={setCustomRange}
            onClearRange={() => setCustomRange(null)}
            onDownloadCsv={handleDownloadTallyCsv}
          />
        )}

        {activeTab === "team" && <RotaTeamManager staff={staff} loading={staffLoading} />}
        {activeTab === "holidays" && (
          <RotaBankHolidaysManager bankHolidays={bankHolidays} loading={bankHolidaysLoading} />
        )}
      </div>
    </AdminSidebarLayout>
  );
};

export default AdminRotaPage;
