import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Shared card shell + stat card — matches NewClientDashboard's StatCard so
// every stat card in the app shares one visual language: a tinted icon tile
// + title, a full-bleed rule, then a big value and caption.
const CARD_SHELL =
  "bg-white rounded-[10px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0px_2px_10px_0px_rgba(0,0,0,0.14)]";

export const StatCard = ({ title, value, text, icon, tint, iconColor }) => (
  <div className={CARD_SHELL}>
    <div className={`flex items-center gap-3 px-[22px] pt-4 pb-[15px] rounded-t-[10px] ${tint}`}>
      <div
        className={`grid place-items-center size-8 rounded-sm shrink-0 ${tint}`}
      >
        <FontAwesomeIcon icon={icon} className={`w-5 h-5 ${iconColor}`} />
      </div>
      <h5
        className="font-poppins font-medium! text-base text-[#191d23] leading-none truncate min-w-0"
        title={title}
      >
        {title}
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

export default StatCard;
