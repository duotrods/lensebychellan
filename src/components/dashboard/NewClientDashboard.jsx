  /* eslint-disable no-constant-binary-expression */
  import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
  import { useNavigate } from "react-router-dom";
  import { useQuery, useQueryClient } from "@tanstack/react-query";
  import { useAuth } from "../../hooks/useAuth";
  import { useLiveIncidents } from "../../hooks/useLiveIncidents";
  import { useLiveCCTVFaults } from "../../hooks/useCCTVFaults";
  import { clientDataService } from "../../services/clientDataService";
  import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } from "recharts";
  import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
  import {
    faTriangleExclamation,
    faCalendar,
    faDownload,
    faTowerBroadcast,
    faWrench,
    faShieldHalved,
    faClock,
    faStopwatch,
    faCarSide,
    faVideo,
    faCar,
    faChartBar,
    faChartPie,
    faRightFromBracket,
    faClockRotateLeft,
    faXmark,
  } from "@fortawesome/free-solid-svg-icons";
  import { getActiveSchemeName } from "../../utils/schemes";
  import { transformDataForChart } from "../../utils/chartData";
  import { isDriveOff } from "../../utils/incidentStats";
  import DrillDownSidebar from "./DrillDownSidebar";
  import {
    DateRangePicker,
    defaultStaticRanges,
    createStaticRanges,
  } from "react-date-range";
  import "react-date-range/dist/styles.css"; // main css file
  import "react-date-range/dist/theme/default.css"; // theme css file
  import { addDays, startOfYear, startOfDay, endOfDay } from "date-fns";
  import toast from "react-hot-toast";
  import { PIE_COLORS, exportChartsToPDF } from "../../utils/pdfChartExport";

  const commonChartProps = {
    cartesianGrid: { strokeDasharray: "3 3", stroke: "#17af93" },
    xAxis: { tick: { fontSize: 13 } },
    yAxis: { tick: { fontSize: 13 } },
    tooltip: {
      contentStyle: {
        backgroundColor: "#fff",
        border: "1px solid #17af93",
        borderRadius: "8px",
      },
      labelStyle: { fontWeight: "bold" },
    },
    legend: { wrapperStyle: { paddingTop: "20px" } },
    bar: { fill: "#17af93", radius: [8, 8, 0, 0] },
  };

  const ChartCard = memo(
    ({
      title,
      children,
      data,
      onSliceClick,
      fullWidth = false,
      height = 380,
      chartKey,
      chartTypesRef,
    }) => {
      const [type, setType] = useState("bar");
      const canTogglePie = Array.isArray(data);

      // Mirrors the toggle into a ref keyed by chartKey so handleExportPDF
      // (which lives outside this component and can't see its state) knows
      // whether to draw a bar or pie chart for this card in the PDF.
      const changeType = (t) => {
        setType(t);
        if (chartTypesRef && chartKey) chartTypesRef.current[chartKey] = t;
      };

      return (
        <div
          className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow ${fullWidth ? "col-span-full" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between mb-6 border-b pb-3">
            <h5 className="text-xl font-bold text-gray-800">{title}</h5>
            {canTogglePie && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => changeType("bar")}
                  title="Bar chart"
                  className={`p-1.5 rounded-md transition-colors ${
                    type === "bar"
                      ? "bg-teal-500 text-white"
                      : "bg-gray-100 text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <FontAwesomeIcon icon={faChartBar} className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => changeType("pie")}
                  title="Pie chart"
                  className={`p-1.5 rounded-md transition-colors ${
                    type === "pie"
                      ? "bg-teal-500 text-white"
                      : "bg-gray-100 text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <FontAwesomeIcon icon={faChartPie} className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={height}>
            {canTogglePie && type === "pie" ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="Number"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={Math.min(height, 380) / 2 - 40}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  onClick={(entry) => onSliceClick?.(entry.name)}
                  style={{ cursor: onSliceClick ? "pointer" : "default" }}
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...commonChartProps.tooltip} />
                <Legend {...commonChartProps.legend} />
              </PieChart>
            ) : (
              children
            )}
          </ResponsiveContainer>
        </div>
      );
    },
  );

  const buildStaticRanges = (earliestDate) =>
    createStaticRanges([
      ...defaultStaticRanges,
      {
        label: "Year",
        range: () => ({
          startDate: startOfYear(new Date()),
          endDate: endOfDay(new Date()),
        }),
      },
      {
        label: "All Time",
        range: () => ({
          startDate: startOfDay(earliestDate || new Date("2020-01-01")),
          endDate: endOfDay(new Date()),
        }),
      },
    ]);

  const fmtDowntime = (mins) => {
    if (!mins) return "0m";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Shared card shell for the dashboard's stat / metric / live-link cards.
  // Flat white surface with the design's 1px 4px 12%-black shadow, not the
  // Tailwind shadow scale — the design's is much softer than shadow-md.
  const CARD_SHELL =
    "bg-white rounded-[10px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0px_2px_10px_0px_rgba(0,0,0,0.14)]";

  // Stat/metric card: tinted icon tile + title, a full-bleed rule, then the
  // value and its caption. Header block is a fixed height so the rule lines up
  // across every card in a row regardless of how long the caption wraps.
  const StatCard = memo(
    ({ title, value, text, icon, tint, iconColor, onClick }) => {
      return (
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
            <p className="mt-3.5 text-xs leading-normal text-[#637381]">
              {text}
            </p>
          </div>
        </div>
      );
    },
  );

  // Meter gradients run worst → best, so the colour the fill *ends* on reads as
  // the health of the number. Uptime climbs red → green; downtime is reversed,
  // since a small downtime bar is the good case.
  const UPTIME_GRADIENT =
    "linear-gradient(to right, #ff8080 0%, #ffcf96 49%, #95e45d 100%)";
  const DOWNTIME_GRADIENT =
    "linear-gradient(to right, #95e45d 0%, #ffcf96 51%, #ff8080 100%)";

  // Segmented meter: the gradient always spans the full track and a grey block
  // masks the unfilled tail, so a 40% bar shows only the red/amber part of the
  // ramp rather than a squashed copy of the whole thing.
  const CameraMeter = ({ label, value, pct, gradient, caption, empty }) => {
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    return (
      <div>
        <p className="font-poppins font-light text-base uppercase text-[#191d23]">
          {label}
        </p>
        <p className="mt-2.5 font-inter font-medium text-[32px] leading-[1.2] text-black/70">
          {value}
        </p>
        <div className="mt-4 max-w-[248px]">
          <div className="relative h-[14px]">
            {!empty && (
              <span
                className="absolute top-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[8px] border-t-[#191d23]"
                style={{ left: `${clamped}%` }}
              />
            )}
          </div>
          {/* Track is grey by default; the gradient only paints over it when
              there's real data, so "no data" can't read as a full green bar. */}
          <div
            className="relative h-2.5 overflow-hidden bg-[#d9d9d9]"
            style={empty ? undefined : { backgroundImage: gradient }}
          >
            {!empty && (
              <div
                className="absolute inset-y-0 right-0 bg-[#d9d9d9]"
                style={{ width: `${100 - clamped}%` }}
              />
            )}
            <div className="absolute inset-y-0 left-1/4 w-px bg-white" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-white" />
            <div className="absolute inset-y-0 left-3/4 w-px bg-white" />
          </div>
        </div>
        <p className="mt-3.5 text-xs leading-normal text-[#637381]">{caption}</p>
      </div>
    );
  };

  // Wide panel pairing the two camera meters, split by a vertical rule.
  //
  // `hasData` is deliberately driven by the camera list, not by avgUptimePct:
  // the service returns "100.0" for a scheme with zero cameras, so keying off
  // the percentage alone would paint a full green bar for a scheme that has no
  // cameras to report on at all.
  const CameraOverviewCard = ({ uptimePct, hasData, loading }) => {
    const parsed = parseFloat(uptimePct);
    const uptime = Number.isFinite(parsed) ? parsed : 0;
    const downtime = 100 - uptime;
    const empty = !loading && !hasData;
    const show = (value) => (loading ? "..." : empty ? "—" : value);
    return (
      <div className={`${CARD_SHELL} p-8`}>
        <h5 className="font-poppins font-medium! text-2xl text-[#191d23]">
          Camera Overview
        </h5>
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <CameraMeter
            label="Average Camera Uptime"
            value={show(`${uptime.toFixed(1)}%`)}
            pct={loading || empty ? 0 : uptime}
            gradient={UPTIME_GRADIENT}
            empty={loading || empty}
            caption={
              empty
                ? "No camera uptime recorded for this scheme yet."
                : "Average camera uptime across the scheme (last 30 days)."
            }
          />
          <div className="sm:border-l sm:border-[#ededed] sm:pl-8">
            <CameraMeter
              label="Average Camera Downtime"
              value={show(`${downtime.toFixed(1)}%`)}
              pct={loading || empty ? 0 : downtime}
              gradient={DOWNTIME_GRADIENT}
              empty={loading || empty}
              caption={
                empty
                  ? "No camera downtime recorded for this scheme yet."
                  : "Average camera downtime across the scheme (last 30 days)."
              }
            />
          </div>
        </div>
      </div>
    );
  };

  // Live Incidents / Live CCTV Faults link card: status dot + title on the
  // left, a translucent-red count pill on the right.
  const LiveLinkCard = ({
    title,
    description,
    icon,
    countLabel,
    loading,
    onClick,
  }) => {
    return (
      <div
        onClick={onClick}
        className={`${CARD_SHELL} cursor-pointer flex items-center gap-4 px-8 py-7`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="size-2.5 rounded-full bg-red-600 shrink-0" />
            <span className="font-poppins font-medium text-xl text-[#191d23]">
              {title}
            </span>
          </div>
          <p className="mt-2 text-xs leading-normal text-[#637381]">
            {description}
          </p>
        </div>
        {loading ? (
          <span className="loading loading-spinner loading-sm text-red-500"></span>
        ) : (
          <span className="flex items-center gap-2 h-[38px] px-5 rounded-[80px] bg-[rgba(255,0,0,0.1)] text-red-600 font-poppins font-medium text-xs whitespace-nowrap shrink-0">
            <FontAwesomeIcon icon={icon} className="w-[18px] h-[18px] shrink-0" />
            {countLabel}
          </span>
        )}
      </div>
    );
  };


  const NewClientDashboard = ({ basePath = "/dashboard/client" }) => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const queryClient = useQueryClient();
    const datePickerRef = useRef(null);
    const dashboardRef = useRef(null);
    // Current bar/pie selection per chart, keyed by chartKey — written by
    // ChartCard, read by handleExportPDF so the download matches what's on
    // screen. A ref (not state) since it's write-only until export time.
    const chartTypesRef = useRef({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [drillDown, setDrillDown] = useState(null); // { title, incidents }
    // Drives the date-range calendar's month count — two side-by-side months
    // don't fit on a phone screen, so collapse to one below the sm breakpoint.
    const [isNarrowScreen, setIsNarrowScreen] = useState(
      () => typeof window !== "undefined" && window.innerWidth < 640,
    );

    useEffect(() => {
      const handleResize = () => setIsNarrowScreen(window.innerWidth < 640);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const openDrillDown = useCallback((data) => {
      const sorted = [...data.incidents].sort((a, b) => {
        const aTime =
          a.createdAt?.seconds ?? a.createdAt?.toMillis?.() / 1000 ?? 0;
        const bTime =
          b.createdAt?.seconds ?? b.createdAt?.toMillis?.() / 1000 ?? 0;
        return bTime - aTime;
      });
      setDrillDown({ ...data, incidents: sorted });
    }, []);
    const closeDrillDown = useCallback(() => setDrillDown(null), []);

    const getScroller = () => document.getElementById("client-main-scroll");

    const navigateToReport = (id) => {
      const scroller = getScroller();
      sessionStorage.setItem(
        "clientDashboardDrillDown",
        JSON.stringify(drillDown),
      );
      sessionStorage.setItem(
        "clientDashboardScroll",
        String(scroller ? scroller.scrollTop : 0),
      );
      setDrillDown(null);
      navigate(`${basePath}/reports/incident/${id}`);
    };

    // Set default date range to last 30 days
    const [dateRange, setDateRange] = useState([
      {
        startDate: addDays(new Date(), -30),
        endDate: new Date(),
        key: "selection",
      },
    ]);

    const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

    // Convert date range to string format for queries
    const startDate = dateRange[0].startDate.toISOString().split("T")[0];
    const endDate = dateRange[0].endDate.toISOString().split("T")[0];

    // Close date picker when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          datePickerRef.current &&
          !datePickerRef.current.contains(event.target)
        ) {
          setShowDatePicker(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getActiveSchemeId = () => {
      return userProfile?.activeSchemeId || userProfile?.schemeId;
    };

    // Cached query for the earliest incident date (drives the "All Time" static range)
    const { data: earliestIncidentDate } = useQuery({
      queryKey: ["earliestIncidentDate", schemeId],
      queryFn: () => clientDataService.getEarliestIncidentDate(schemeId),
      enabled: !!schemeId,
      staleTime: 60 * 60 * 1000, // an hour — this date essentially never changes
    });

    const staticRanges = useMemo(
      () => buildStaticRanges(earliestIncidentDate),
      [earliestIncidentDate],
    );

    // Cached query for stats + time series — one fetch instead of two, since
    // both used to independently scan the exact same incidentReports range.
    // Trend numbers don't need to be fresher than 15 min, so the staleTime is
    // bumped up from the 5-min default to cut repeat-visit reads further.
    const { data: statsAndTimeSeries, isLoading: statsLoading } = useQuery({
      queryKey: ["schemeStatsAndTimeSeries", schemeId, startDate, endDate],
      queryFn: () =>
        clientDataService.getSchemeStatsAndTimeSeriesByDateRange(schemeId, startDate, endDate),
      enabled: !!schemeId && !!startDate && !!endDate,
      staleTime: 15 * 60 * 1000,
    });
    const stats = statsAndTimeSeries?.stats;
    const timeSeriesData = statsAndTimeSeries?.timeSeriesData ?? [];
    const timeSeriesLoading = statsLoading;

    // Cached query for uptime — the underlying data already has its own
    // 15-min server-side cache (cctvUptimeCache), so matching that here
    // avoids re-fetching client-side before the server cache would even change.
    const { data: uptimeData, isLoading: uptimeLoading } = useQuery({
      queryKey: ["cctvUptime", schemeId],
      queryFn: () => clientDataService.getCCTVUptimeData(schemeId, 30),
      enabled: !!schemeId,
      staleTime: 15 * 60 * 1000,
    });

    // Real-time subscription for live incidents (no polling - only charges when data changes)
    const { liveIncidents, loading: liveIncidentsLoading } =
      useLiveIncidents(schemeId);

    // Real-time subscription for CCTV fault reports
    const { faults: liveCCTVFaults, loading: cctvFaultsLoading } =
      useLiveCCTVFaults(schemeId);

    // Bounded (limit 1) listener — watches only for a brand-new incident
    // arriving, not the stats themselves, so its cost is fixed regardless of
    // how much historical data exists. When one lands, wait a few seconds
    // (coalesces a burst of several incidents into one refresh instead of
    // one per incident) then force a fresh compute — a *normal* refetch
    // isn't enough here, since it would just re-read the shared 15-min
    // schemeStatsCache, which is still "fresh" by its own TTL but now stale
    // relative to the incident that just triggered this. The forced compute
    // also rewrites that shared cache, so other dashboards on this scheme
    // pick up the update on their own next normal read.
    const lastIncidentIdRef = useRef(null);
    const refreshTimeoutRef = useRef(null);
    useEffect(() => {
      if (!schemeId) return;
      const unsubscribe = clientDataService.subscribeToLatestReports(
        "incidentReports",
        1,
        schemeId,
        (docs) => {
          const latestId = docs[0]?.id ?? null;
          if (lastIncidentIdRef.current === null) {
            // First snapshot on mount — just record it, the dashboard's
            // queries already load fresh data on their own.
            lastIncidentIdRef.current = latestId;
            return;
          }
          if (latestId && latestId !== lastIncidentIdRef.current) {
            lastIncidentIdRef.current = latestId;
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = setTimeout(async () => {
              try {
                const fresh = await clientDataService.getSchemeStatsAndTimeSeriesByDateRange(
                  schemeId,
                  startDate,
                  endDate,
                  true, // force — bypass the shared cache, this data just changed
                );
                queryClient.setQueryData(
                  ["schemeStatsAndTimeSeries", schemeId, startDate, endDate],
                  fresh,
                );
              } catch (err) {
                console.error("Failed to refresh dashboard after new incident:", err);
              }
            }, 4000);
          }
        },
        (err) => {
          console.error("Live incident-watch subscription failed:", err);
        },
      );
      return () => {
        unsubscribe?.();
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        lastIncidentIdRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schemeId, startDate, endDate]);

    const loading = statsLoading || uptimeLoading || timeSeriesLoading;

    // Reopen sidebar and restore scroll when coming back from a report view
    useEffect(() => {
      const savedDrillDown = sessionStorage.getItem("clientDashboardDrillDown");
      const savedScroll = sessionStorage.getItem("clientDashboardScroll");
      if (!savedDrillDown) return;
      sessionStorage.removeItem("clientDashboardDrillDown");
      sessionStorage.removeItem("clientDashboardScroll");
      setDrillDown(JSON.parse(savedDrillDown));
      if (savedScroll) {
        const pos = parseInt(savedScroll, 10);
        const scroller = getScroller();
        if (!scroller) return;
        // Keep setting scrollTop on every scroll event until user scrolls manually
        const enforce = () => {
          scroller.scrollTop = pos;
        };
        scroller.addEventListener("scroll", enforce);
        scroller.scrollTop = pos;
        // Stop enforcing after 1s (enough for all re-renders to settle)
        const timer = setTimeout(
          () => scroller.removeEventListener("scroll", enforce),
          1000,
        );
        return () => {
          clearTimeout(timer);
          scroller.removeEventListener("scroll", enforce);
        };
      }
    }, []);

    const incidents = useMemo(() => stats?.incidents || [], [stats]);

    const {
      faultData,
      incidentTypeData,
      vehiclesDispatchedData,
      spottedByData,
      laneAffectedData,
      timeToRecoverData,
      trafficConditionsData,
      timeToSiteData,
      trackData,
      emergencyServicesData,
      vehicleTypeData,
      incursionsData,
      incursionToGainAdvantageData,
    } = useMemo(
      () => ({
        faultData: transformDataForChart(stats?.faultTypes),
        incidentTypeData: transformDataForChart(stats?.incidentsByType),
        vehiclesDispatchedData: transformDataForChart(
          stats?.vehicleTypesDispatched,
        ),
        spottedByData: transformDataForChart(stats?.spottedBy),
        laneAffectedData: transformDataForChart(stats?.incidentsByLane),
        timeToRecoverData: transformDataForChart(stats?.timeToRecover, false),
        trafficConditionsData: transformDataForChart(stats?.trafficConditions),
        timeToSiteData: transformDataForChart(stats?.timeToSite, false),
        trackData: transformDataForChart(stats?.trackOfIncident),
        emergencyServicesData: transformDataForChart(stats?.emergencyServices),
        vehicleTypeData: transformDataForChart(stats?.vehicleTypes),
        incursionsData: [
          { name: "Incursions", Number: stats?.incursions || 0 },
          { name: "Incursion to Gain Benifit", Number: (stats?.incursionToGainAdvantage || 0)},
        ],
        incursionToGainAdvantageData: [
          {
            name: "Incursion to Gain Benifit",
            Number: stats?.incursionToGainAdvantage || 0,
          },
        ],
      }),
      [stats],
    );

    const handleBarClick = useCallback(
      (chartType, label) => {
        if (!label || !incidents.length) return;
        let filtered = [];
        if (chartType === "incidentType")
          filtered = incidents.filter((i) => i.incidentType === label);
        else if (chartType === "fault")
          filtered = incidents.filter((i) => i.fault === label);
        else if (chartType === "reportedBy")
          filtered = incidents.filter((i) => i.reportedBy === label);
        else if (chartType === "affectedLanes")
          filtered = incidents.filter((i) => i.affectedLanes?.includes(label));
        else if (chartType === "trafficConditions")
          filtered = incidents.filter((i) => i.trafficConditions === label);
        else if (chartType === "track")
          filtered = incidents.filter((i) => i.track === label);
        else if (chartType === "emergencyServices")
          filtered = incidents.filter((i) =>
            i.emergencyServices?.includes(label),
          );
        else if (chartType === "vehicleTypes")
          filtered = incidents.filter((i) =>
            i.vehicles?.some((v) => v.type === label),
          );
        else if (chartType === "vehicleTypesDispatched") {
          const key = label.toLowerCase();
          filtered = incidents.filter((i) => i.recoveryRequested?.[key] > 0);
        } else if (chartType === "timeToRecover") {
          // Drive offs are left out of the timing stats, so they must be left
          // out here too — otherwise the drill-down lists incidents the bar
          // never counted.
          filtered = incidents.filter((i) => {
            if (isDriveOff(i)) return false;
            const m = parseInt(i.timeOnsiteToCleared?.match(/(\d+)/)?.[1]);
            if (isNaN(m)) return false;
            if (label === "0-15") return m <= 15;
            if (label === "16-30") return m >= 16 && m <= 30;
            if (label === "31-45") return m >= 31 && m <= 45;
            if (label === "46-60") return m >= 46 && m <= 60;
            if (label === "60+") return m > 60;
            return false;
          });
        } else if (chartType === "timeToSite") {
          filtered = incidents.filter((i) => {
            if (isDriveOff(i)) return false;
            const m = parseInt(i.timeSpottedToOn?.match(/(\d+)/)?.[1]);
            if (isNaN(m)) return false;
            if (label === "0-5") return m <= 5;
            if (label === "6-10") return m >= 6 && m <= 10;
            if (label === "11-15") return m >= 11 && m <= 15;
            if (label === "16-20") return m >= 16 && m <= 20;
            if (label === "21-30") return m >= 21 && m <= 30;
            if (label === "30+") return m > 30;
            return false;
          });
        } else if (chartType === "incursions")
          filtered = incidents.filter((i) => i.incursion === "YES");
        else if (chartType === "incursionToGainAdvantage")
          filtered = incidents.filter((i) => i.incursionToGainAdvantage === "YES");
        if (filtered.length) openDrillDown({ title: label, incidents: filtered });
      },
      [incidents, openDrillDown],
    );

    const statsCards = [
      {
        title: "Incidents",
        value: loading ? "..." : (stats?.totalIncidents || 0).toString(),
        text: "Excluding Free Recovery, Drive off and Incursions.",
        icon: faTriangleExclamation,
        tint: "bg-[rgba(242,96,118,0.1)]",
        iconColor: "text-[#f26076]",
        filter: () =>
          incidents.filter(
            (i) =>
              i.incidentType !== "Free Recovery" &&
              i.incidentType !== "Drive Off" &&
              i.incursion !== "YES" &&
              i.incursionToGainAdvantage !== "YES",
          ),
      },
      {
        title: "Asset Damage",
        value: loading ? "..." : (stats?.assetDamage || 0).toString(),
        text: "Incidents with reported asset or property damage.",
        icon: faShieldHalved,
        tint: "bg-[rgba(255,151,96,0.1)]",
        iconColor: "text-[#ff9760]",
        filter: () =>
          incidents.filter(
            (i) =>
              i.propertyDamage === true ||
              i.propertyDamage === "yes" ||
              i.propertyDamage === "Yes",
          ),
      },
      {
        title: "Free Recovery",
        value: loading
          ? "..."
          : (Number(stats?.incidentsByType?.["Free Recovery"]) || 0).toString(),
        text: "Total number of free recovery incidents.",
        icon: faWrench,
        tint: "bg-[rgba(112,59,59,0.1)]",
        iconColor: "text-[#703b3b]",
        filter: () =>
          incidents.filter((i) => i.incidentType === "Free Recovery"),
      },
      {
        title: "Incursions",
        value: loading
          ? "..."
          : (
              (stats?.incursions || 0) +
              (stats?.incidentsByType?.["Incursion"] || 0)
            ).toString(),
        text: "Total number of incursions recorded.",
        icon: faCarSide,
        tint: "bg-[rgba(116,69,119,0.1)]",
        iconColor: "text-[#744577]",
        filter: () =>
          incidents.filter(
            (i) => i.incursion === "YES" || i.incidentType === "Incursion",
          ),
      },
      {
        title: "Incursion (G.B)",
        value: loading ? "..." : (stats?.incursionToGainAdvantage || 0).toString(),
        text: "Total number of incursions to gain benifit.",
        icon: faCar,
        tint: "bg-[rgba(84,89,172,0.1)]",
        iconColor: "text-[#5459ac]",
        filter: () =>
          incidents.filter((i) => i.incursionToGainAdvantage === "YES"),
      },
      {
        title: "Drive Off",
        value: loading
          ? "..."
          : (stats?.incidentsByType?.["Drive Off"] || 0).toString(),
        text: "Total number of drive off incidents.",
        icon: faRightFromBracket,
        tint: "bg-[rgba(69,139,115,0.1)]",
        iconColor: "text-[#458b73]",
        filter: () => incidents.filter((i) => i.incidentType === "Drive Off"),
      },
      {
        title: "Avg Time to Site",
        value: loading ? "..." : `${stats?.avgTimeToSite ?? 0} mins`,
        text: "Average response time from incident spotted to unit on site.",
        icon: faClock,
        tint: "bg-[rgba(77,173,168,0.1)]",
        iconColor: "text-[#4dada8]",
      },
      {
        title: "Avg Time to Recover",
        value: loading ? "..." : `${stats?.avgTimeToRecover ?? 0} mins`,
        text: "Average time from unit on site to incident cleared.",
        icon: faStopwatch,
        tint: "bg-[rgba(54,116,181,0.15)]",
        iconColor: "text-[#3674b5]",
      },
    ];

    // Export dashboard as PDF — layout/drawing lives in utils/pdfChartExport
    // so every "Export Charts" button in the app shares one design.
    const handleExportPDF = async () => {
      setIsExporting(true);
      toast.loading("Generating PDF...", { id: "export-pdf" });

      try {
        const dateRangeText = `${dateRange[0].startDate.toLocaleDateString("en-GB")} - ${dateRange[0].endDate.toLocaleDateString("en-GB")}`;
        const statsText = `Total Incidents: ${stats?.totalIncidents || 0} | Vehicles Dispatched: ${stats?.vehiclesDispatched || 0} | Free Recovery: ${(Number(stats?.incidentsByType?.["Free Recovery"]) || 0)}`;

        const charts = [
          { data: timeToSiteData, title: "Time to Site (mins)", key: "timeToSite" },
          { data: timeToRecoverData, title: "Time to Recover (mins)", key: "timeToRecover" },
          { data: faultData, title: "Fault", key: "fault" },
          { data: incidentTypeData, title: "Incident Type", key: "incidentType" },
          { data: vehiclesDispatchedData, title: "Vehicles Dispatched", key: "vehiclesDispatched" },
          { data: spottedByData, title: "Spotted By", key: "spottedBy" },
          { data: laneAffectedData, title: "Lane Affected", key: "laneAffected" },
          { data: trafficConditionsData, title: "Traffic Conditions", key: "trafficConditions" },
          { data: emergencyServicesData, title: "Emergency Services Attended", key: "emergencyServices" },
          { data: trackData, title: "Track of Incident", key: "track" },
          { data: vehicleTypeData, title: "Vehicle Type", key: "vehicleType" },
          { data: incursionsData, title: "Incursions", key: "incursions" },
          { data: incursionToGainAdvantageData, title: "Incursion to Gain Benifit" },
        ];

        await exportChartsToPDF({
          reportTitle: "Dashboard Report",
          subtitle: `${getActiveSchemeId()} - ${getActiveSchemeName(userProfile)}`,
          dateRangeText,
          statsText,
          charts,
          chartTypesRef,
          fileName: `dashboard_${getActiveSchemeId()}_${startDate}_to_${endDate}.pdf`,
        });

        toast.success("Dashboard exported successfully!", { id: "export-pdf" });
      } catch (error) {
        console.error("Failed to export PDF:", error);
        toast.error("Failed to export dashboard", { id: "export-pdf" });
      } finally {
        setIsExporting(false);
      }
    };

    const isAllTimeRange =
      dateRange[0].startDate.getTime() ===
      startOfDay(earliestIncidentDate || new Date("2020-01-01")).getTime();

    return (
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Header with Date Filter */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Welcome back, {userProfile?.displayName}!
            </h1>
            <p className="text-sm mt-2">
            <span className="text-brand-500 font-semibold ">{getActiveSchemeName(userProfile)}</span> reports{" "}
            {isAllTimeRange
              ? "— All Time"
              : `from ${dateRange[0].startDate.toLocaleDateString("en-GB")} to ${dateRange[0].endDate.toLocaleDateString("en-GB")}`}
            </p>
          </div>

          {/* Date Range Filter and Export Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting || loading}
              className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-teal-600 hover:shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
              <span className="">Export Charts</span>
            </button>

            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-700">
                    {dateRange[0].startDate.toLocaleDateString("en-GB")}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-700">
                    {dateRange[0].endDate.toLocaleDateString("en-GB")}
                  </span>
                </div>
              </button>

              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 z-50 shadow-xl rounded-lg overflow-hidden border border-gray-200 max-w-[calc(100vw-2rem)] overflow-x-auto">
                  <DateRangePicker
                    ranges={dateRange}
                    onChange={(item) => setDateRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    months={isNarrowScreen ? 1 : 2}
                    direction="horizontal"
                    showDateDisplay={false}
                    rangeColors={["#17af93"]}
                    staticRanges={staticRanges}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDateRange([
                    {
                      startDate: startOfDay(
                        earliestIncidentDate || new Date("2020-01-01"),
                      ),
                      endDate: endOfDay(new Date()),
                      key: "selection",
                    },
                  ]);
                  setShowDatePicker(false);
                }}
                title="Loads full incident history — auto-updates when new incidents come in, no need to re-click"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  isAllTimeRange
                    ? "bg-teal-50 border-teal-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-sm font-medium text-gray-700">
                  All Time
                </span>
              </button>

              {isAllTimeRange && (
                <button
                  onClick={() => {
                    setDateRange([
                      {
                        startDate: addDays(new Date(), -30),
                        endDate: new Date(),
                        key: "selection",
                      },
                    ]);
                  }}
                  title="Clear All Time — back to last 30 days"
                  className="flex items-center justify-center w-9 h-9 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:text-red-500 hover:border-red-200 text-gray-400 transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {statsCards.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              text={stat.text}
              icon={stat.icon}
              tint={stat.tint}
              iconColor={stat.iconColor}
              onClick={
                stat.filter
                  ? () => {
                      const filtered = stat.filter();
                      if (filtered.length)
                        openDrillDown({ title: stat.title, incidents: filtered });
                    }
                  : undefined
              }
            />
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <span className="loading loading-spinner loading-lg text-teal-500"></span>
          </div>
        ) : (
          <div ref={dashboardRef}>
            {/* Camera Overview alongside the two live link cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 items-start">
              <CameraOverviewCard
                uptimePct={uptimeData?.totals?.avgUptimePct}
                hasData={uptimeData?.cameras?.length > 0}
                loading={uptimeLoading}
              />

              <div className="grid gap-6">
                <LiveLinkCard
                  title="Live CCTV Faults"
                  description="View and monitor live camera fault for your scheme"
                  icon={faVideo}
                  countLabel={`${liveCCTVFaults.length} CCTV Fault`}
                  loading={cctvFaultsLoading}
                  onClick={() => navigate(`${basePath}/cctv-faults`)}
                />

                <LiveLinkCard
                  title="Live Incidents"
                  description="View and monitor live incidents for your scheme"
                  icon={faTowerBroadcast}
                  countLabel={`${liveIncidents.length} Live Incidents`}
                  loading={liveIncidentsLoading}
                  onClick={() => navigate(`${basePath}/live-incidents`)}
                />
              </div>
            </div>

            {/* All Charts in 2 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <ChartCard
                title="Time to Site (mins)"
                data={timeToSiteData}
                chartKey="timeToSite"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("timeToSite", label)}
              >
                <BarChart
                  data={timeToSiteData}
                  onClick={(d) =>
                    d?.activeLabel && handleBarClick("timeToSite", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Time to recover (mins)"
                data={timeToRecoverData}
                chartKey="timeToRecover"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("timeToRecover", label)}
              >
                <BarChart
                  data={timeToRecoverData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("timeToRecover", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Fault"
                data={faultData}
                chartKey="fault"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("fault", label)}
              >
                <BarChart
                  data={faultData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 10 }}
                  onClick={(d) =>
                    d?.activeLabel && handleBarClick("fault", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis
                    dataKey="name"
                    {...commonChartProps.xAxis}
                    {...(faultData.length >= 7 && {
                      angle: -45,
                      textAnchor: "end",
                      interval: 0,
                      height: 60,
                    })}
                  />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Incident Type"
                data={incidentTypeData}
                chartKey="incidentType"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("incidentType", label)}
              >
                <BarChart
                  data={incidentTypeData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("incidentType", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Vehicles Dispatched"
                data={vehiclesDispatchedData}
                chartKey="vehiclesDispatched"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("vehicleTypesDispatched", label)}
              >
                <BarChart
                  data={vehiclesDispatchedData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("vehicleTypesDispatched", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Spotted By"
                data={spottedByData}
                chartKey="spottedBy"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("reportedBy", label)}
              >
                <BarChart
                  data={spottedByData}
                  onClick={(d) =>
                    d?.activeLabel && handleBarClick("reportedBy", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Lane Affected"
                data={laneAffectedData}
                chartKey="laneAffected"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("affectedLanes", label)}
              >
                <BarChart
                  data={laneAffectedData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("affectedLanes", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Traffic Conditions"
                data={trafficConditionsData}
                chartKey="trafficConditions"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("trafficConditions", label)}
              >
                <BarChart
                  data={trafficConditionsData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("trafficConditions", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Emergency Services Attended"
                data={emergencyServicesData}
                chartKey="emergencyServices"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("emergencyServices", label)}
              >
                <BarChart
                  data={emergencyServicesData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("emergencyServices", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Track of Incident"
                data={trackData}
                chartKey="track"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("track", label)}
              >
                <BarChart
                  data={trackData}
                  onClick={(d) =>
                    d?.activeLabel && handleBarClick("track", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Vehicle Type"
                data={vehicleTypeData}
                chartKey="vehicleType"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) => handleBarClick("vehicleTypes", label)}
              >
                <BarChart
                  data={vehicleTypeData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick("vehicleTypes", d.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="Incursions"
                data={incursionsData}
                chartKey="incursions"
                chartTypesRef={chartTypesRef}
                onSliceClick={(label) =>
                  handleBarClick(
                    label === "Incursion to Gain Benifit"
                      ? "incursionToGainAdvantage"
                      : "incursions",
                    label,
                  )
                }
              >
                <BarChart
                  data={incursionsData}
                  onClick={(d) =>
                    d?.activeLabel &&
                    handleBarClick(
                      d.activeLabel === "Incursion to Gain Benifit"
                        ? "incursionToGainAdvantage"
                        : "incursions",
                      d.activeLabel,
                    )
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              
            </div>

            {/* Full Width: Incidents Over Time */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
              <ChartCard title="Incidents Over Time" >
                <BarChart
                  data={
                    timeSeriesData.length > 0
                      ? timeSeriesData.map((d) => ({ ...d, Number: d.count }))
                      : [{ name: "No Data", Number: 0 }]
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#17af93" />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #17af93",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar dataKey="Number" fill="#17af93" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          </div>
        )}

        {/* Drill-down sidebar — rendered in a portal so it never affects page scroll */}
        <DrillDownSidebar
          drillDown={drillDown}
          onClose={closeDrillDown}
          onNavigate={navigateToReport}
        />
      </div>
    );
  };

  export default NewClientDashboard;
