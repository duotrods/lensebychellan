import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Tab strip shared by the admin pages that split internal / third-party views.
// Sits flush with AdminSidebarLayout's own padding (same spacing as the admin
// dashboard). A tab may carry `badge: { count, color: "red" | "amber" }`.
// `actions` renders at the right edge.
const AdminTabBar = ({ tabs, activeKey, onChange, actions = null }) => (
  <div className="border-b border-gray-200 mb-8 flex items-end justify-between gap-4">
    <nav className="flex gap-1">
      {tabs.map(({ key, label, icon, badge }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
            activeKey === key
              ? "border-teal-500 text-teal-600 bg-teal-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FontAwesomeIcon icon={icon} className="w-4 h-4" />
          {label}
          {badge?.count > 0 && (
            <span
              className={`ml-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-white text-[11px] font-bold ${
                badge.color === "amber" ? "bg-amber-500" : "bg-red-500"
              }`}
            >
              {badge.count}
            </span>
          )}
        </button>
      ))}
    </nav>
    {actions && <div className="pb-2">{actions}</div>}
  </div>
);

export default AdminTabBar;
