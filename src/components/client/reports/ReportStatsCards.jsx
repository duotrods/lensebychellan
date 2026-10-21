import {
  faFileLines,
  faTriangleExclamation,
  faWrench,
  faShieldHalved,
  faVideoSlash,
  faCar,
  faHammer,
} from "@fortawesome/free-solid-svg-icons";
import StatCard from "../../common/StatCard";

// The two rows of clickable summary cards at the top of the Reports page.
// Each card drives a filter via onCardClick(type, sub?). Uses the shared
// StatCard so it matches the dashboards.
const ReportStatsCards = ({ reportStats, onCardClick }) => (
  <>
    {/* Row 1: Report Type Counts */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
      <StatCard
        icon={faFileLines}
        color="#00BBA7"
        title="Total Reports"
        value={reportStats.total}
        text="Every report submitted for this scheme."
        onClick={() => onCardClick("all")}
      />
      <StatCard
        icon={faTriangleExclamation}
        color="#f59e0b"
        title="Incursion to Gain Benifit"
        value={reportStats.incursionToGainAdvantage}
        text="Incidents involving an incursion to gain benefit."
        onClick={() => onCardClick("incident", "gain-advantage")}
      />
      <StatCard
        icon={faTriangleExclamation}
        color="#f97316"
        title="Incidents"
        value={reportStats.pureIncident}
        text="Standard incident reports for this scheme."
        onClick={() => onCardClick("incident", "pure")}
      />
      <StatCard
        icon={faVideoSlash}
        color="#a855f7"
        title="CCTV Faults"
        value={reportStats.cctvFaults}
        text="Camera fault reports submitted for this scheme."
        onClick={() => onCardClick("cctv-faults")}
      />
    </div>

    {/* Row 2: Incident Metrics */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
      <StatCard
        icon={faWrench}
        color="#22c55e"
        title="Free Recovery"
        value={reportStats.freeRecovery}
        text="Free recovery and drive off incidents."
        onClick={() => onCardClick("incident", "free-recovery")}
      />
      <StatCard
        icon={faShieldHalved}
        color="#ef4444"
        title="Incursions"
        value={reportStats.incursions}
        text="Total number of incursions recorded."
        onClick={() => onCardClick("incident", "incursion")}
      />
      <StatCard
        icon={faCar}
        color="#3b82f6"
        title="Vehicles Dispatched"
        value={reportStats.vehiclesDispatched}
        text="Recovery vehicles dispatched to incidents."
        onClick={() => onCardClick("incident")}
      />
      <StatCard
        icon={faHammer}
        color="#eab308"
        title="Asset Damage"
        value={reportStats.incidentAssetDamage}
        text="Incidents with reported asset or property damage."
        onClick={() => onCardClick("incident", "asset-damage")}
      />
    </div>
  </>
);

export default ReportStatsCards;
