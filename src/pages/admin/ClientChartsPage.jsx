import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { staffService } from "../../services/staffService";
import { clientDataService } from "../../services/clientDataService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import { SCHEMES, getInternalSchemeIds, extractSchemeId } from "../../utils/schemes";
import { transformDataForChart } from "../../utils/chartData";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faArrowTrendUp,
  faTriangleExclamation,
  faCalendar,
  faDownload,
  faFilter,
  faClockRotateLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { exportChartsToPDF } from "../../utils/pdfChartExport";
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { addDays, startOfDay, endOfDay } from 'date-fns';

// Chart Card Component
const ChartCard = ({ title, children, fullWidth = false, height = 300 }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${fullWidth ? 'col-span-full' : ''}`}>
    <h5 className="text-lg font-semibold text-gray-800 mb-4">{title}</h5>
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  </div>
);

// The set of active schemes for the dropdown — stable, independent of the
// selected date range, so changing the range never disturbs the selection.
const schemes = SCHEMES.map((s) => s.fullName).sort();

const ClientChartsPage = () => {
  const [selectedScheme, setSelectedScheme] = useState(schemes[0] ?? "");
  const [isExporting, setIsExporting] = useState(false);
  const datePickerRef = useRef(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Set default date range to last 30 days
  const [dateRange, setDateRange] = useState([
    {
      startDate: addDays(new Date(), -30),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const COLORS = {
    primary: "#17af93",
  };

  // Common chart props
  const commonChartProps = {
    cartesianGrid: { strokeDasharray: "3 3", stroke: "#17af93" },
    xAxis: { tick: { fontSize: 13 } },
    yAxis: { tick: { fontSize: 13 } },
    tooltip: {
      contentStyle: { backgroundColor: '#fff', border: '1px solid #17af93', borderRadius: '8px' },
      labelStyle: { fontWeight: 'bold' }
    },
    legend: { wrapperStyle: { paddingTop: '6px' } },
    bar: { fill: COLORS.primary, radius: [8, 8, 0, 0] }
  };

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chart data comes from the same cached, per-scheme aggregation the client
  // dashboard uses — one document read on a cache hit instead of scanning
  // every incident in the window, and the Firestore-side cache (15 min TTL)
  // is shared across every viewer of this scheme+date combination, admin or
  // client. Replaces the old unbounded raw-document fetch, which had no
  // limit() and polled every 90s.
  const schemeId = extractSchemeId(selectedScheme);

  const { data: earliestIncidentDate } = useQuery({
    queryKey: ["earliestIncidentDate", schemeId],
    queryFn: () => clientDataService.getEarliestIncidentDate(schemeId),
    enabled: !!schemeId,
    staleTime: 60 * 60 * 1000, // an hour — this date essentially never changes
  });

  const ALL_TIME_START = startOfDay(earliestIncidentDate || new Date("2020-01-01"));
  const isAllTimeRange = dateRange[0].startDate.getTime() === ALL_TIME_START.getTime();

  const startDateStr = dateRange[0].startDate.toISOString().split("T")[0];
  const endDateStr = dateRange[0].endDate.toISOString().split("T")[0];

  const statsQuery = useQuery({
    // Same key shape as the client dashboard's schemeStatsAndTimeSeries query
    // — a scheme+date combo already viewed there (or on another admin page)
    // is served from the shared server-side cache at no extra cost.
    queryKey: ["schemeStatsAndTimeSeries", schemeId, startDateStr, endDateStr],
    queryFn: () =>
      clientDataService.getSchemeStatsAndTimeSeriesByDateRange(
        schemeId,
        startDateStr,
        endDateStr,
      ),
    enabled: !!schemeId,
    staleTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    if (statsQuery.isError) {
      console.error("Failed to load data:", statsQuery.error);
      toast.error("Failed to load chart data");
    }
  }, [statsQuery.isError, statsQuery.error]);

  const chartStats = statsQuery.data?.stats;
  const chartTimeSeries = statsQuery.data?.timeSeriesData ?? [];
  const loading = statsQuery.isLoading;

  // Cards count internal schemes only — excludes third-party (and demo) data.
  // No date/scheme dependency, so this is fetched once and cached.
  const formCountsQuery = useQuery({
    queryKey: ["allFormsCountByType", "internal"],
    queryFn: () => staffService.getAllFormsCountByType(getInternalSchemeIds()),
  });

  useEffect(() => {
    if (formCountsQuery.isError) {
      console.warn('Could not load form counts:', formCountsQuery.error);
    }
  }, [formCountsQuery.isError, formCountsQuery.error]);

  const formCounts = formCountsQuery.data ?? {
    cctvCheckTotal: 0,
    incidentReportTotal: 0,
    assetDamageTotal: 0,
    dailyLogsTotal: 0,
  };

  // Export charts as PDF — layout/drawing lives in utils/pdfChartExport so
  // every "Export Charts" button in the app shares one design.
  const handleExportPDF = async () => {
    setIsExporting(true);
    toast.loading('Generating PDF...', { id: 'export-pdf' });

    try {
      const statsText = `Total Incidents: ${stats.incident} | Total Reports: ${stats.total}`;

      const charts = [
        { data: timeToSiteData, title: 'Time to Site (mins)', key: 'timeToSite' },
        { data: timeToRecoverData, title: 'Time to Recover (mins)', key: 'timeToRecover' },
        { data: faultData, title: 'Fault', key: 'fault' },
        { data: incidentTypeData, title: 'Incident Type', key: 'incidentType' },
        { data: vehiclesDispatchedData, title: 'Vehicles Dispatched', key: 'vehiclesDispatched' },
        { data: spottedByData, title: 'Spotted By', key: 'spottedBy' },
        { data: laneAffectedData, title: 'Lane Affected', key: 'laneAffected' },
        { data: trafficConditionsData, title: 'Traffic Conditions', key: 'trafficConditions' },
        { data: emergencyServicesData, title: 'Emergency Services Attended', key: 'emergencyServices' },
        { data: trackData, title: 'Track of Incident', key: 'track' },
        { data: vehicleTypeData, title: 'Vehicle Type', key: 'vehicleType' },
        { data: incursionsData, title: 'Incursions', key: 'incursions' },
        { data: incursionToGainAdvantageData, title: 'Incursion to Gain Benifit' },
      ];

      await exportChartsToPDF({
        reportTitle: 'Client Charts & Analytics',
        subtitle: `Scheme: ${selectedScheme}`,
        dateRangeText: `${dateRange[0].startDate.toLocaleDateString('en-GB')} - ${dateRange[0].endDate.toLocaleDateString('en-GB')}`,
        statsText,
        charts,
        fileName: `client_charts_${selectedScheme.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      });

      toast.success('Charts exported successfully!', { id: 'export-pdf' });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export charts', { id: 'export-pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  // Statistics - use aggregation counts for cards (consistent with other pages)
  const stats = {
    total: formCounts.cctvCheckTotal + formCounts.incidentReportTotal + formCounts.assetDamageTotal + formCounts.dailyLogsTotal,
    cctvCheck: formCounts.cctvCheckTotal,
    incident: formCounts.incidentReportTotal,
    assetDamage: formCounts.assetDamageTotal,
    dailyLogs: formCounts.dailyLogsTotal,
  };

  // Extract chart data — pre-aggregated server-side, just reshaped for recharts.
  const chartIncidents = chartStats?.incidents ?? [];
  const faultData = transformDataForChart(chartStats?.faultTypes);
  const incidentTypeData = transformDataForChart(chartStats?.incidentsByType);
  const vehiclesDispatchedData = transformDataForChart(chartStats?.vehicleTypesDispatched);
  const spottedByData = transformDataForChart(chartStats?.spottedBy);
  const laneAffectedData = transformDataForChart(chartStats?.incidentsByLane);
  const timeToRecoverData = transformDataForChart(chartStats?.timeToRecover, false);
  const trafficConditionsData = transformDataForChart(chartStats?.trafficConditions);
  const emergencyServicesData = transformDataForChart(chartStats?.emergencyServices);
  const timeToSiteData = transformDataForChart(chartStats?.timeToSite, false);
  const trackData = transformDataForChart(chartStats?.trackOfIncident);
  const vehicleTypeData = transformDataForChart(chartStats?.vehicleTypes);

  // Incursion / gain-benifit YES-vs-NO breakdown isn't part of the shared
  // stats shape (which only tracks the YES count) — derive it from the same
  // cached incidents array instead of a separate fetch.
  const incursionsData = (() => {
    const counts = { YES: 0, NO: 0 };
    chartIncidents.forEach((report) => {
      if (report.incursion) counts[report.incursion] = (counts[report.incursion] || 0) + 1;
    });
    return Object.entries(counts).map(([name, Number]) => ({ name, Number }));
  })();
  const incursionToGainAdvantageData = (() => {
    const counts = { YES: 0, NO: 0 };
    chartIncidents.forEach((report) => {
      if (report.incursionToGainAdvantage)
        counts[report.incursionToGainAdvantage] =
          (counts[report.incursionToGainAdvantage] || 0) + 1;
    });
    return Object.entries(counts).map(([name, Number]) => ({ name, Number }));
  })();

  const timeSeriesData = chartTimeSeries;

  return (
    <AdminSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">Client Charts & Analytics</h3>
          <p className="text-gray-600">Visual analytics of all reports and submissions per scheme</p>
        </div>

        {/* Filter and Export */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              <FontAwesomeIcon icon={faFilter} className="w-5 h-5 text-gray-400" />
              <select
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value)}
                className="select bg-white border-gray-300 rounded-lg w-full max-w-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              >
                {schemes.map((scheme) => (
                  <option key={scheme} value={scheme}>
                    {scheme}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Picker */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <FontAwesomeIcon icon={faCalendar} className="w-5 h-5 text-teal-600" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">
                      {dateRange[0].startDate.toLocaleDateString('en-GB')}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-700">
                      {dateRange[0].endDate.toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 z-50 shadow-xl rounded-lg overflow-hidden border border-gray-200">
                    <DateRangePicker
                      ranges={dateRange}
                      onChange={(item) => setDateRange([item.selection])}
                      moveRangeOnFirstSelection={false}
                      months={2}
                      direction="horizontal"
                      showDateDisplay={false}
                      rangeColors={['#17af93']}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setDateRange([
                    {
                      startDate: ALL_TIME_START,
                      endDate: endOfDay(new Date()),
                      key: 'selection',
                    },
                  ]);
                  setShowDatePicker(false);
                }}
                title="Loads full incident history"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  isAllTimeRange
                    ? "bg-teal-50 border-teal-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">All Time</span>
              </button>

              {isAllTimeRange && (
                <button
                  onClick={() => {
                    setDateRange([
                      {
                        startDate: addDays(new Date(), -30),
                        endDate: new Date(),
                        key: 'selection',
                      },
                    ]);
                  }}
                  title="Clear All Time — back to last 30 days"
                  className="flex items-center justify-center w-9 h-9 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:text-red-500 hover:border-red-200 text-gray-400 transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleExportPDF}
                disabled={isExporting || loading}
                className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-teal-600 hover:shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faDownload} className="w-5 h-5" />
                <span className="font-medium">Export Charts</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="loading loading-spinner loading-lg text-teal-500"></div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Reports</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <FontAwesomeIcon icon={faChartBar} className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Incidents</p>
                    <p className="text-3xl font-bold text-teal-600 mt-1">{stats.incident}</p>
                  </div>
                  <div className="bg-teal-100 p-3 rounded-lg">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Asset Damage</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.assetDamage}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <FontAwesomeIcon icon={faCalendar} className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Daily Logs</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.dailyLogs}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <FontAwesomeIcon icon={faCalendar} className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">CCTV Checks</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.cctvCheck}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Analytics Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Chart 9: Time to Site */}
              <ChartCard title="Time to Site (mins)">
                <BarChart data={timeToSiteData.length > 0 ? timeToSiteData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>
              
                {/* Chart 6: Time to Recover */}
              <ChartCard title="Time to recover (mins)">
                <BarChart data={timeToRecoverData.length > 0 ? timeToRecoverData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 1: Fault */}
              <ChartCard title="Fault">
                <BarChart data={faultData.length > 0 ? faultData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 2: Incident Type */}
              <ChartCard title="Incident Type">
                <BarChart data={incidentTypeData.length > 0 ? incidentTypeData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 3: Vehicles Dispatched */}
              <ChartCard title="Vehicles Dispatched">
                <BarChart data={vehiclesDispatchedData.length > 0 ? vehiclesDispatchedData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 4: Spotted By */}
              <ChartCard title="Spotted By">
                <BarChart data={spottedByData.length > 0 ? spottedByData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 5: Lane Affected */}
              <ChartCard title="Lane Affected">
                <BarChart data={laneAffectedData.length > 0 ? laneAffectedData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

             
              {/* Chart 7: Traffic Conditions */}
              <ChartCard title="Traffic Conditions">
                <BarChart data={trafficConditionsData.length > 0 ? trafficConditionsData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 8: Emergency Services Attended */}
              <ChartCard title="Emergency Services Attended">
                <BarChart data={emergencyServicesData.length > 0 ? emergencyServicesData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

        

              {/* Chart 10: Track of Incident */}
              <ChartCard title="Track of Incident">
                <BarChart data={trackData.length > 0 ? trackData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 11: Vehicle Type */}
              <ChartCard title="Vehicle Type">
                <BarChart data={vehicleTypeData.length > 0 ? vehicleTypeData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" {...commonChartProps.xAxis} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 12: Incursions */}
              <ChartCard title="Incursions">
                <BarChart data={incursionsData.length > 0 ? incursionsData : [{ name: "No Data", Number: 0 }]}>
                  <CartesianGrid {...commonChartProps.cartesianGrid} />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis {...commonChartProps.yAxis} />
                  <Tooltip {...commonChartProps.tooltip} />
                  <Legend {...commonChartProps.legend} />
                  <Bar dataKey="Number" {...commonChartProps.bar} />
                </BarChart>
              </ChartCard>

              {/* Chart 13: Incursion to Gain Advantage */}
              <ChartCard title="Incursion to Gain Benifit">
                <BarChart data={incursionToGainAdvantageData.length > 0 ? incursionToGainAdvantageData : [{ name: "No Data", Number: 0 }]}>
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
            <div className="mb-8">
              <ChartCard title="Incidents Over Time" fullWidth height={350}>
                <BarChart
                  data={
                    timeSeriesData.length > 0
                      ? timeSeriesData.map(d => ({ ...d, Number: d.count }))
                      : [{ name: "No Data", Number: 0 }]
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Number" fill="#17af93" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </AdminSidebarLayout>
  );
};

export default ClientChartsPage;
