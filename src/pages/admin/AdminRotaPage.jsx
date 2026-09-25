import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faWallet,
  faUsers,
  faCalendarPlus,
  faClock,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import RotaGrid from "../../components/rota/RotaGrid";
import ShiftModal from "../../components/rota/ShiftModal";
import HoursPayTally from "../../components/rota/HoursPayTally";
import RotaTeamManager from "../../components/admin/RotaTeamManager";
import RotaBankHolidaysManager from "../../components/admin/RotaBankHolidaysManager";
import { useAuth } from "../../hooks/useAuth";
import {
  useRotaStaff,
  useBankHolidays,
  useRotaShifts,
  usePendingHolidays,
  useAllHolidayShifts,
} from "../../hooks/useRota";
import { rotaService } from "../../services/rotaService";
import {
  addDays,
  buildRotaCsvRows,
  buildTallyCsvRows,
  sumApprovedHolidayHoursByStaff,
  getStaffDueForHolidayReset,
  datesAvailableForDuplicate,
  downloadCsv,
  fmt,
  getPayPeriod,
} from "../../utils/rota";

const TABS = [
  { key: "rota", label: "Rota", icon: faCalendarDays },
  { key: "tally", label: "Hours & Pay", icon: faWallet },
  { key: "team", label: "Team", icon: faUsers },
  { key: "holidays", label: "Bank Holidays", icon: faCalendarPlus },
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
  const { pending: pendingHolidays } = usePendingHolidays();
  const { holidayShifts } = useAllHolidayShifts();

  // Holiday hours used, per staff member — feeds each row's "holiday hours
  // remaining" in the Hours & Pay tally and Team roster. Bounded by each
  // staff member's own holidayAllowanceStartDate when they have one set
  // (unset = all-time, same as before that field existed).
  const holidayHoursUsedByStaff = useMemo(
    () => sumApprovedHolidayHoursByStaff(holidayShifts, staff),
    [holidayShifts, staff],
  );

  // Staff members whose holiday allowance is due to reset (Since date + 1
  // year) within 7 days, or already overdue — surfaced as a banner + Team
  // tab badge so an admin notices before it quietly rolls over.
  const staffDueForReset = useMemo(() => getStaffDueForHolidayReset(staff), [staff]);

  // One-time, idempotent backfill so pre-existing staff (added before the
  // drag-to-reorder feature) get a sortOrder and don't disappear once
  // subscribeToStaff switches to orderBy("sortOrder"). Admin-only by design —
  // this write would be rejected by firestore.rules from a staff session.
  useEffect(() => {
    rotaService.ensureStaffSortOrder().catch((error) => {
      console.error("Failed to backfill staff sort order:", error);
    });
  }, []);

  const handleReorderStaff = async (orderedStaffIds) => {
    try {
      await rotaService.reorderStaff(orderedStaffIds);
    } catch (error) {
      toast.error(error.message || "Failed to save new staff order");
    }
  };

  const handleUpdateHolidayAllowance = async (staffId, hours) => {
    try {
      await rotaService.updateHolidayAllowance(staffId, hours);
      toast.success("Holiday hours allowance updated");
    } catch (error) {
      toast.error(error.message || "Failed to update holiday hours allowance");
    }
  };

  const handleUpdateHolidayAllowanceStartDate = async (staffId, dateStr) => {
    try {
      await rotaService.updateHolidayAllowanceStartDate(staffId, dateStr);
      toast.success(dateStr ? "Holiday allowance reset date updated" : "Holiday allowance reset date cleared");
    } catch (error) {
      toast.error(error.message || "Failed to update holiday allowance reset date");
    }
  };

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
    const { duplicateDates, ...shiftValue } = value;
    try {
      if (shiftValue.type === "off") {
        await rotaService.clearShift(staffId, dateStr);
      } else {
        // Admins are the approvers, so holidays they set are approved immediately.
        const valueWithStatus =
          shiftValue.type === "holiday" ? { ...shiftValue, status: "approved" } : shiftValue;
        await rotaService.setShift(staffId, dateStr, valueWithStatus, currentUser?.uid);
        if (duplicateDates?.length) {
          await rotaService.setShiftBulk(staffId, duplicateDates, valueWithStatus, currentUser?.uid);
          toast.success(`Shift saved to ${1 + duplicateDates.length} dates`);
        }
      }
    } catch (error) {
      toast.error(error.message || "Failed to save shift");
    } finally {
      setPendingCell(null);
    }
  };

  // Drag-to-duplicate: copy a shift onto another cell — sideways onto a
  // different staff member (same date) or up/down onto a different date (same
  // staff member). RotaGrid already validates locally (same-date-or-same-staff,
  // no conflict) before calling this — this only needs to persist it with the
  // right approval status.
  const handleDuplicateShift = async (sourceStaffId, targetStaffId, dateStr, shift) => {
    try {
      const value =
        shift.type === "holiday"
          ? {
              type: "holiday",
              hours: 0,
              status: "approved",
              holidayHours: shift.holidayHours ?? undefined,
            }
          : { type: shift.type, hours: shift.hours };
      await rotaService.setShift(targetStaffId, dateStr, value, currentUser?.uid);
      toast.success("Shift duplicated");
    } catch (error) {
      toast.error(error.message || "Failed to duplicate shift");
    }
  };

  const handleApproveHoliday = async () => {
    const { staffId, dateStr } = pendingCell;
    try {
      await rotaService.approveHoliday(staffId, dateStr, currentUser?.uid);
      toast.success("Holiday approved");
    } catch (error) {
      toast.error(error.message || "Failed to approve holiday");
    } finally {
      setPendingCell(null);
    }
  };

  const handleRejectHoliday = async () => {
    const { staffId, dateStr } = pendingCell;
    try {
      await rotaService.clearShift(staffId, dateStr);
      toast.success("Holiday request rejected");
    } catch (error) {
      toast.error(error.message || "Failed to reject holiday");
    } finally {
      setPendingCell(null);
    }
  };

  // Jump the grid to the earliest pending request so it's visible for approval.
  const goToEarliestPending = () => {
    if (pendingHolidays.length === 0) return;
    setCustomRange(null);
    setPeriodAnchor(new Date(pendingHolidays[0].date));
    setActiveTab("rota");
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
      buildTallyCsvRows(staff, shifts, bankHolidays, period, holidayHoursUsedByStaff),
    );
  };

  return (
    <AdminSidebarLayout>
      <div className="border-b border-gray-200 bg-white px-6 pt-4">
        <nav className="flex gap-1">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === key
                  ? "border-teal-500 text-teal-600 bg-teal-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FontAwesomeIcon icon={icon} className="w-4 h-4" />
              {label}
              {key === "rota" && pendingHolidays.length > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold">
                  {pendingHolidays.length}
                </span>
              )}
              {key === "team" && staffDueForReset.length > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-bold">
                  {staffDueForReset.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {staffDueForReset.length > 0 && activeTab !== "team" && (
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className="w-full mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium hover:bg-amber-100 text-left"
          >
            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 shrink-0" />
            <span>
              {staffDueForReset.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <strong>{r.name}</strong>
                  {r.daysUntil < 0
                    ? ` (holiday allowance reset overdue by ${-r.daysUntil} day${-r.daysUntil === 1 ? "" : "s"})`
                    : r.daysUntil === 0
                      ? " (holiday allowance resets today)"
                      : ` (holiday allowance resets in ${r.daysUntil} day${r.daysUntil === 1 ? "" : "s"}, ${r.nextResetDate})`}
                </span>
              ))}
              {" — click to review in Team."}
            </span>
          </button>
        )}
        {activeTab === "rota" && (
          <>
            {pendingHolidays.length > 0 && (
              <button
                type="button"
                onClick={goToEarliestPending}
                className="w-full mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100"
              >
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 shrink-0" />
                {pendingHolidays.length} holiday{" "}
                {pendingHolidays.length === 1 ? "request" : "requests"} awaiting approval — click to
                view the earliest.
              </button>
            )}
            <RotaGrid
              staff={staff}
              shifts={shifts}
              bankHolidays={bankHolidays}
              period={period}
              onPrevPeriod={goPrevPeriod}
              onNextPeriod={goNextPeriod}
              onToday={goToday}
              customRange={customRange}
              onRangeChange={setCustomRange}
              onClearRange={() => setCustomRange(null)}
              canEdit
              onCellClick={handleCellClick}
              onDownloadCsv={handleDownloadRotaCsv}
              canReorderStaff
              onReorderStaff={handleReorderStaff}
              onDuplicateShift={handleDuplicateShift}
            />
            <ShiftModal
              pendingCell={pendingCell}
              onSave={handleSaveShift}
              onClose={() => setPendingCell(null)}
              canApprove
              onApprove={handleApproveHoliday}
              onReject={handleRejectHoliday}
              duplicateDateOptions={
                pendingCell
                  ? datesAvailableForDuplicate(period, shifts, pendingCell.staffId, pendingCell.dateStr)
                  : []
              }
            />
          </>
        )}

        {activeTab === "tally" && (
          <HoursPayTally
            staff={staff}
            shifts={shifts}
            bankHolidays={bankHolidays}
            period={period}
            onPrevPeriod={goPrevPeriod}
            onNextPeriod={goNextPeriod}
            onToday={goToday}
            customRange={customRange}
            onRangeChange={setCustomRange}
            onClearRange={() => setCustomRange(null)}
            onDownloadCsv={handleDownloadTallyCsv}
            allTimeHolidayHoursUsedByStaff={holidayHoursUsedByStaff}
          />
        )}

        {activeTab === "team" && (
          <RotaTeamManager
            staff={staff}
            loading={staffLoading}
            holidayHoursUsedByStaff={holidayHoursUsedByStaff}
            onUpdateAllowance={handleUpdateHolidayAllowance}
            onUpdateAllowanceStartDate={handleUpdateHolidayAllowanceStartDate}
          />
        )}
        {activeTab === "holidays" && (
          <RotaBankHolidaysManager bankHolidays={bankHolidays} loading={bankHolidaysLoading} />
        )}
      </div>
    </AdminSidebarLayout>
  );
};

export default AdminRotaPage;
