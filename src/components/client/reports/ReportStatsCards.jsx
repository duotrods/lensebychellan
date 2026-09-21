import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faTriangleExclamation,
  faWrench,
  faShieldHalved,
  faVideoSlash,
  faCar,
  faHammer,
} from "@fortawesome/free-solid-svg-icons";

// Shared card shell — matches NewClientDashboard's StatCard shell so every
// stat/metric card in the client app shares one visual language: a flat
// white surface with a soft shadow that lifts slightly on hover.
const CARD_SHELL =
  "bg-white rounded-[10px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0px_2px_10px_0px_rgba(0,0,0,0.14)]";

// The two rows of clickable summary cards at the top of the Reports page.
// Each card drives a filter via onCardClick(type, sub?). Same
// tinted-icon-tile + rule + big value + caption layout as
// NewClientDashboard's StatCard.
const Card = ({ icon, tint, iconColor, label, value, text, onClick }) => (
  <div
    className={`${CARD_SHELL} ${onClick ? "cursor-pointer" : ""}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3 px-[22px] pt-4 pb-[15px]">
      <div
        className={`grid place-items-center size-8 rounded-sm shrink-0 ${tint}`}
      >
        <FontAwesomeIcon icon={icon} className={`w-5 h-5 ${iconColor}`} />
      </div>
      <h5
        className="font-poppins font-medium! text-base text-[#191d23] leading-none truncate min-w-0"
        title={label}
      >
        {label}
      </h5>
    </div>
    <div className="h-px bg-[#ededed]" />
    <div className="px-[22px] pt-2.5 pb-4">
      <p className="font-inter font-medium text-[32px] leading-[1.2] text-black/70">
        {value}
      </p>
      <p className="mt-3.5 text-xs leading-normal text-[#637381]">{text}</p>
    </div>
  </div>
);

const ReportStatsCards = ({ reportStats, onCardClick }) => (
  <>
    {/* Row 1: Report Type Counts */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
      <Card
        icon={faFileLines}
        tint="bg-brand-500/10"
        iconColor="text-brand-500"
        label="Total Reports"
        value={reportStats.total}
        text="Every report submitted for this scheme."
        onClick={() => onCardClick("all")}
      />
      <Card
        icon={faTriangleExclamation}
        tint="bg-amber-500/10"
        iconColor="text-amber-500"
        label="Incursion to Gain Benifit"
        value={reportStats.incursionToGainAdvantage}
        text="Incidents involving an incursion to gain benefit."
        onClick={() => onCardClick("incident", "gain-advantage")}
      />
      <Card
        icon={faTriangleExclamation}
        tint="bg-orange-500/10"
        iconColor="text-orange-500"
        label="Incidents"
        value={reportStats.pureIncident}
        text="Standard incident reports for this scheme."
        onClick={() => onCardClick("incident", "pure")}
      />
      <Card
        icon={faVideoSlash}
        tint="bg-purple-500/10"
        iconColor="text-purple-500"
        label="CCTV Faults"
        value={reportStats.cctvFaults}
        text="Camera fault reports submitted for this scheme."
        onClick={() => onCardClick("cctv-faults")}
      />
    </div>

    {/* Row 2: Incident Metrics */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
      <Card
        icon={faWrench}
        tint="bg-green-500/10"
        iconColor="text-green-500"
        label="Free Recovery"
        value={reportStats.freeRecovery}
        text="Free recovery and drive off incidents."
        onClick={() => onCardClick("incident", "free-recovery")}
      />
      <Card
        icon={faShieldHalved}
        tint="bg-red-500/10"
        iconColor="text-red-500"
        label="Incursions"
        value={reportStats.incursions}
        text="Total number of incursions recorded."
        onClick={() => onCardClick("incident", "incursion")}
      />
      <Card
        icon={faCar}
        tint="bg-blue-500/10"
        iconColor="text-blue-500"
        label="Vehicles Dispatched"
        value={reportStats.vehiclesDispatched}
        text="Recovery vehicles dispatched to incidents."
        onClick={() => onCardClick("incident")}
      />
      <Card
        icon={faHammer}
        tint="bg-yellow-500/10"
        iconColor="text-yellow-500"
        label="Asset Damage"
        value={reportStats.incidentAssetDamage}
        text="Incidents with reported asset or property damage."
        onClick={() => onCardClick("incident", "asset-damage")}
      />
    </div>
  </>
);

export default ReportStatsCards;
