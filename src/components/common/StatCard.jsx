import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// The one stat/metric card shared by the client, staff and admin dashboards:
// an outlined coloured icon tile + dark title, a full-bleed rule, then the
// value and its caption. `color` is a hex string; pass `onClick` to make the
// card clickable.
const CARD_SHELL =
  "bg-white rounded-[10px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0px_2px_10px_0px_rgba(0,0,0,0.14)]";

const StatCard = memo(({ title, value, text, icon, color, onClick }) => (
  <div
    className={`${CARD_SHELL} ${onClick ? "cursor-pointer" : ""}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3 px-[22px] pt-3 pb-3 rounded-t-[10px]">
      <div
        className="grid place-items-center size-9 shrink-0 rounded-lg bg-white border"
        style={{ borderColor: color }}
      >
        <FontAwesomeIcon icon={icon} className="w-4 h-4" style={{ color }} />
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
));

export default StatCard;
