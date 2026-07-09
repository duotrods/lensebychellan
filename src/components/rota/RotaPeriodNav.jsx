import { ChevronLeft, ChevronRight } from "lucide-react";
import { payPeriodLabel } from "../../utils/rota";

const RotaPeriodNav = ({ period, onPrevPeriod, onNextPeriod, onToday }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
        <button
          type="button"
          onClick={onPrevPeriod}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
          title="Previous period"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold px-2 min-w-[170px] text-center">
          {payPeriodLabel(period)}
        </span>
        <button
          type="button"
          onClick={onNextPeriod}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
          title="Next period"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 ml-1"
        >
          This period
        </button>
      </div>
    </div>
  );
};

export default RotaPeriodNav;
