import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faChevronDown,
  faFileArrowDown,
  faBuilding,
  faTowerBroadcast,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-hot-toast";
import {
  SCHEMES,
  THIRD_PARTY_SCHEMES,
  getInternalSchemeIds,
  getAllThirdPartySchemeIds,
} from "../../utils/schemes";
import { clientDataService } from "../../services/clientDataService";
import { computeUptimeReport, getReportCameras } from "../../utils/cctvUptimeReport";
import CCTVUptimeDashboard from "../dashboard/CCTVUptimeDashboard";

const TABS = [
  { key: "internal", label: "Internal Schemes", icon: faTowerBroadcast, getIds: getInternalSchemeIds },
  { key: "thirdparty", label: "Third Party Schemes", icon: faBuilding, getIds: getAllThirdPartySchemeIds },
];

const schemeInfo = (id) => {
  const s = [...SCHEMES, ...THIRD_PARTY_SCHEMES].find((x) => x.id === id);
  return { id, name: s?.fullName || id, shortName: s?.shortName || s?.fullName || id };
};

// Top-right button: pick a scheme from the active tab, download its 24h uptime PDF.
const ExportMenu = ({ schemeIds }) => {
  const [open, setOpen] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const handleExport = async (schemeId) => {
    setExportingId(schemeId);
    setOpen(false);
    try {
      const [faults, { downloadCCTVUptimeReportPDF }] = await Promise.all([
        clientDataService.getCCTVFaultsForUptime(schemeId),
        import("../../utils/cctvUptimeReportPdf"),
      ]);
      const report = computeUptimeReport({ faults, cameras: getReportCameras(schemeId) });
      await downloadCCTVUptimeReportPDF({ schemeId, schemeName: schemeInfo(schemeId).name, report });
      toast.success(`${schemeInfo(schemeId).shortName} report downloaded`);
    } catch (err) {
      console.error("Uptime report export failed:", err);
      toast.error("Failed to export report. Please try again.");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!exportingId}
        className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
      >
        <FontAwesomeIcon
          icon={exportingId ? faSpinner : faFileArrowDown}
          className={`w-4 h-4 ${exportingId ? "animate-spin" : ""}`}
        />
        {exportingId ? "Exporting..." : "Export"}
        {!exportingId && <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-400">
              Daily uptime report (last 24h)
            </p>
            {schemeIds.map((id) => (
              <button
                key={id}
                onClick={() => handleExport(id)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-teal-50"
              >
                {schemeInfo(id).name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AdminCCTVFaults = () => {
  const [activeTab, setActiveTab] = useState("internal");
  const [selectedByTab, setSelectedByTab] = useState({});

  const tab = TABS.find((t) => t.key === activeTab);
  const schemeIds = useMemo(() => tab.getIds(), [tab]);
  const selected = selectedByTab[activeTab] || schemeIds[0];

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-6 pt-4 flex items-end justify-between gap-4">
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
            </button>
          ))}
        </nav>
        <div className="pb-2">
          <ExportMenu key={activeTab} schemeIds={schemeIds} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {schemeIds.length > 1 && (
          <div className="max-w-[1600px] mx-auto px-4 flex flex-wrap gap-2">
            {schemeIds.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedByTab((prev) => ({ ...prev, [activeTab]: id }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selected === id
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {schemeInfo(id).shortName}
              </button>
            ))}
          </div>
        )}
        <CCTVUptimeDashboard key={selected} schemeId={selected} />
      </div>
    </>
  );
};

export default AdminCCTVFaults;
