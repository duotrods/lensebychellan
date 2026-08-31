import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { staffService } from "../../services/staffService";
import AdminSidebarLayout from "../../components/layout/AdminSidebarLayout";
import {
  THIRD_PARTY_SCHEMES,
  getThirdPartyCompanies,
  getAllThirdPartySchemeIds,
} from "../../utils/schemes";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
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
import { jsPDF } from 'jspdf';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { addDays } from 'date-fns';

// Chart Card Component
const ChartCard = ({ title, children, fullWidth = false, height = 300 }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${fullWidth ? 'col-span-full' : ''}`}>
    <h5 className="text-lg font-semibold text-gray-800 mb-4">{title}</h5>
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  </div>
);

const ThirdPartyChartsPage = () => {
  const [selectedScheme, setSelectedScheme] = useState(THIRD_PARTY_SCHEMES[0]?.fullName ?? "");
  const [isExporting, setIsExporting] = useState(false);
  const datePickerRef = useRef(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Third-party companies, used to group the scheme dropdown.
  const companies = getThirdPartyCompanies();

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

  // Only incident reports are loaded — all 12 charts are incident-based.
  // Scoped server-side to the selected date window, re-fetched whenever the
  // range changes, so we never read the whole collection. Shared query key
  // with ClientChartsPage — getIncidentReports() has no scheme filter, so
  // both pages fetch the identical dataset for a given date window and only
  // split it client-side. Switching between the two pages within the cache
  // window costs 0 extra reads.
  const rangeStart = dateRange[0].startDate;
  const rangeEnd = new Date(dateRange[0].endDate);
  rangeEnd.setHours(23, 59, 59, 999); // include the entire end day

  const reportsQuery = useQuery({
    queryKey: ["allIncidentReportsInRange", rangeStart.getTime(), rangeEnd.getTime()],
    queryFn: async () => {
      const incidentReports = await staffService.getIncidentReports(null, null, {
        startDate: rangeStart,
        endDate: rangeEnd,
      });
      return incidentReports.map((f) => ({ ...f, type: "Incident Report" }));
    },
    // Poll instead of a live listener — this query has no `limit()`, so a
    // real-time listener here would re-bill for every incident change in the
    // whole date window. A 90s interval keeps charts near-live cheaply, and
    // only runs while the tab is focused (React Query's default).
    refetchInterval: 90 * 1000,
  });

  useEffect(() => {
    if (reportsQuery.isError) {
      console.error("Failed to load data:", reportsQuery.error);
      toast.error("Failed to load chart data");
    }
  }, [reportsQuery.isError, reportsQuery.error]);

  const reports = reportsQuery.data ?? [];
  const loading = reportsQuery.isFetching;

  // Cards show a third-party-wide total across every TP scheme (excludes
  // internal staff + demo data), regardless of the selected scheme. No
  // date/scheme dependency, so this is fetched once and cached.
  const formCountsQuery = useQuery({
    queryKey: ["allFormsCountByType", "thirdparty"],
    queryFn: () => staffService.getAllFormsCountByType(getAllThirdPartySchemeIds()),
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

  // Convert date range to timestamps for filtering
  const startDate = dateRange[0].startDate;
  const endDate = new Date(dateRange[0].endDate);
  endDate.setHours(23, 59, 59, 999); // Include the entire end date

  // Filter reports by selected scheme and date range
  const getFilteredReports = () => {
    let filtered = reports;

    // Filter by scheme
    if (selectedScheme) {
      filtered = filtered.filter((r) => r.scheme === selectedScheme);
    }

    // Filter by date range
    filtered = filtered.filter((r) => {
      if (!r.createdAt) return false;
      const reportDate = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return reportDate >= startDate && reportDate <= endDate;
    });

    return filtered;
  };

  // Get incident reports only, excluding stood-down ones from every chart
  const getIncidentReports = () => {
    return getFilteredReports().filter(
      (r) => r.type === "Incident Report" && !r.standDown,
    );
  };

  // Chart data extraction functions
  const getFaultData = () => {
    const incidents = getIncidentReports();
    const faultCounts = {};
    incidents.forEach(report => {
      if (report.fault) {
        faultCounts[report.fault] = (faultCounts[report.fault] || 0) + 1;
      }
    });
    return Object.entries(faultCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getIncidentTypeData = () => {
    const incidents = getIncidentReports();
    const typeCounts = {};
    incidents.forEach(report => {
      if (report.incidentType) {
        typeCounts[report.incidentType] = (typeCounts[report.incidentType] || 0) + 1;
      }
    });
    return Object.entries(typeCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getVehiclesDispatchedData = () => {
    const incidents = getIncidentReports();
    const dispatchData = { Light: 0, Heavy: 0, IPV: 0, HETOS: 0 };
    incidents.forEach(report => {
      if (report.recoveryRequested) {
        dispatchData.Light += report.recoveryRequested.light || 0;
        dispatchData.Heavy += report.recoveryRequested.heavy || 0;
        dispatchData.IPV += report.recoveryRequested.ipv || 0;
        dispatchData.HETOS += report.recoveryRequested.hetos || 0;
      }
    });
    return Object.entries(dispatchData).map(([name, Number]) => ({ name, Number }));
  };

  const getSpottedByData = () => {
    const incidents = getIncidentReports();
    const spottedCounts = {};
    incidents.forEach(report => {
      if (report.reportedBy) {
        spottedCounts[report.reportedBy] = (spottedCounts[report.reportedBy] || 0) + 1;
      }
    });
    return Object.entries(spottedCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getLaneAffectedData = () => {
    const incidents = getIncidentReports();
    const laneCounts = {};
    incidents.forEach(report => {
      if (report.affectedLanes && Array.isArray(report.affectedLanes)) {
        report.affectedLanes.forEach(lane => {
          laneCounts[lane] = (laneCounts[lane] || 0) + 1;
        });
      }
    });
    return Object.entries(laneCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getTimeToRecoverData = () => {
    const incidents = getIncidentReports();
    const timeBuckets = { '0-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    incidents.forEach(report => {
      if (report.timeOnsiteToCleared) {
        const match = report.timeOnsiteToCleared.match(/(\d+)/);
        if (match) {
          const mins = parseInt(match[1]);
          if (mins <= 15) timeBuckets['0-15']++;
          else if (mins <= 30) timeBuckets['16-30']++;
          else if (mins <= 45) timeBuckets['31-45']++;
          else if (mins <= 60) timeBuckets['46-60']++;
          else timeBuckets['60+']++;
        }
      }
    });
    return Object.entries(timeBuckets).map(([name, Number]) => ({ name, Number }));
  };

  const getTrafficConditionsData = () => {
    const incidents = getIncidentReports();
    const trafficCounts = {};
    incidents.forEach(report => {
      if (report.trafficConditions) {
        trafficCounts[report.trafficConditions] = (trafficCounts[report.trafficConditions] || 0) + 1;
      }
    });
    return Object.entries(trafficCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getEmergencyServicesData = () => {
    const incidents = getIncidentReports();
    const serviceCounts = {};
    incidents.forEach(report => {
      if (report.emergencyServices && Array.isArray(report.emergencyServices)) {
        report.emergencyServices.forEach(service => {
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
      }
    });
    return Object.entries(serviceCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getTimeToSiteData = () => {
    const incidents = getIncidentReports();
    const timeBuckets = { '0-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21-30': 0, '30+': 0 };
    incidents.forEach(report => {
      if (report.timeSpottedToOn) {
        const match = report.timeSpottedToOn.match(/(\d+)/);
        if (match) {
          const mins = parseInt(match[1]);
          if (mins <= 5) timeBuckets['0-5']++;
          else if (mins <= 10) timeBuckets['6-10']++;
          else if (mins <= 15) timeBuckets['11-15']++;
          else if (mins <= 20) timeBuckets['16-20']++;
          else if (mins <= 30) timeBuckets['21-30']++;
          else timeBuckets['30+']++;
        }
      }
    });
    return Object.entries(timeBuckets).map(([name, Number]) => ({ name, Number }));
  };

  const getTrackData = () => {
    const incidents = getIncidentReports();
    const trackCounts = {};
    incidents.forEach(report => {
      if (report.track) {
        trackCounts[report.track] = (trackCounts[report.track] || 0) + 1;
      }
    });
    return Object.entries(trackCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getVehicleTypeData = () => {
    const incidents = getIncidentReports();
    const vehicleCounts = {};
    incidents.forEach(report => {
      if (report.vehicles && Array.isArray(report.vehicles)) {
        report.vehicles.forEach(vehicle => {
          if (vehicle.type) {
            vehicleCounts[vehicle.type] = (vehicleCounts[vehicle.type] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(vehicleCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getIncursionsData = () => {
    const incidents = getIncidentReports();
    const incursionCounts = { YES: 0, NO: 0 };
    incidents.forEach(report => {
      if (report.incursion) {
        incursionCounts[report.incursion] = (incursionCounts[report.incursion] || 0) + 1;
      }
    });
    return Object.entries(incursionCounts).map(([name, Number]) => ({ name, Number }));
  };

  const getIncursionToGainAdvantageData = () => {
    const incidents = getIncidentReports();
    const counts = { YES: 0, NO: 0 };
    incidents.forEach(report => {
      if (report.incursionToGainAdvantage) {
        counts[report.incursionToGainAdvantage] = (counts[report.incursionToGainAdvantage] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, Number]) => ({ name, Number }));
  };

  const getTimeSeriesData = () => {
    const incidents = getIncidentReports();
    const monthlyCounts = {};
    incidents.forEach(report => {
      if (report.createdAt) {
        const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      }
    });
    return Object.entries(monthlyCounts).map(([name, count]) => ({ name, count, Number: count }));
  };

  // Helper function to draw a bar chart in PDF
  const drawBarChart = (pdf, data, title, x, y, width, height) => {
    if (!data || data.length === 0) return;

    // Draw chart background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, width, height, 'F');
    pdf.setDrawColor(229, 231, 235);
    pdf.rect(x, y, width, height, 'S');

    // Draw title at the top with better positioning
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(title, x + width / 2, y + 6, { align: 'center' });

    // Adjusted margins - less bottom margin since labels are closer
    const margin = { top: 12, right: 10, bottom: 18, left: 10 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate max value
    const maxValue = Math.max(...data.map(d => d.Number));
    const barWidth = chartWidth / data.length * 0.7;
    const gap = chartWidth / data.length * 0.3;

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.Number / maxValue) * chartHeight;
      const barX = x + margin.left + (index * (barWidth + gap));
      const barY = y + margin.top + chartHeight - barHeight;

      // Draw bar
      pdf.setFillColor(23, 175, 147); // Teal color
      pdf.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');

      // Draw value on top of bar
      pdf.setFontSize(8);
      pdf.setTextColor(31, 41, 55);
      pdf.text(String(item.Number), barX + barWidth / 2, barY - 2, { align: 'center' });

      // Draw label below bar - much closer now
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      const label = item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name;
      const labelY = y + margin.top + chartHeight + 5; // Just 5mm below the chart area
      pdf.text(label, barX + barWidth / 2, labelY, { align: 'center', maxWidth: barWidth });
    });
  };

  // Export dashboard as PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    toast.loading('Generating PDF...', { id: 'export-pdf' });

    try {
      // Create PDF in landscape orientation with compression enabled
      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add header to the PDF
      const headerHeight = 25;
      pdf.setFillColor(23, 175, 147); // Teal color
      pdf.rect(0, 0, pdfWidth, headerHeight, 'F');

      // Header text - left side
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Third Party Charts & Analytics', 15, 12);

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Scheme: ${selectedScheme}`, 15, 19);

      // Stats - right side
      const statsText = `Total Incidents: ${stats.incident} | Total Reports: ${stats.total}`;
      pdf.text(statsText, pdfWidth - 15, 15, { align: 'right' });

      // Content area
      const contentStartY = headerHeight + 10;
      const chartWidth = (pdfWidth - 30) / 2; // 2 columns with margins
      const chartHeight = 60;
      const chartGap = 10;

      let currentY = contentStartY;
      let currentX = 15;
      let chartCount = 0;

      // Helper to add new page if needed
      const checkNewPage = () => {
        if (currentY + chartHeight > pdfHeight - 10) {
          pdf.addPage();

          // Add header to new page
          pdf.setFillColor(23, 175, 147);
          pdf.rect(0, 0, pdfWidth, headerHeight, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Third Party Charts & Analytics', 15, 12);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Scheme: ${selectedScheme}`, 15, 19);
          pdf.text(statsText, pdfWidth - 15, 15, { align: 'right' });

          currentY = contentStartY;
          currentX = 15;
          chartCount = 0;
        }
      };

      // Draw all charts in 2-column layout
      const charts = [
        { data: timeToSiteData, title: 'Time to Site (mins)' },
        { data: timeToRecoverData, title: 'Time to Recover (mins)' },
        { data: faultData, title: 'Fault' },
        { data: incidentTypeData, title: 'Incident Type' },
        { data: vehiclesDispatchedData, title: 'Vehicles Dispatched' },
        { data: spottedByData, title: 'Spotted By' },
        { data: laneAffectedData, title: 'Lane Affected' },
        { data: trafficConditionsData, title: 'Traffic Conditions' },
        { data: emergencyServicesData, title: 'Emergency Services Attended' },
        { data: trackData, title: 'Track of Incident' },
        { data: vehicleTypeData, title: 'Vehicle Type' },
        { data: incursionsData, title: 'Incursions' },
        { data: incursionToGainAdvantageData, title: 'Incursion to Gain Benifit' },
      ];

      charts.forEach((chart) => {
        if (chart.data && chart.data.length > 0) {
          checkNewPage();

          drawBarChart(pdf, chart.data, chart.title, currentX, currentY, chartWidth - 5, chartHeight);

          chartCount++;
          if (chartCount % 2 === 0) {
            // Move to next row
            currentY += chartHeight + chartGap;
            currentX = 15;
          } else {
            // Move to next column
            currentX = 15 + chartWidth + 5;
          }
        }
      });

      // Save the PDF
      const fileName = `third_party_charts_${selectedScheme.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

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

  // Extract chart data
  const faultData = getFaultData();
  const incidentTypeData = getIncidentTypeData();
  const vehiclesDispatchedData = getVehiclesDispatchedData();
  const spottedByData = getSpottedByData();
  const laneAffectedData = getLaneAffectedData();
  const timeToRecoverData = getTimeToRecoverData();
  const trafficConditionsData = getTrafficConditionsData();
  const emergencyServicesData = getEmergencyServicesData();
  const timeToSiteData = getTimeToSiteData();
  const trackData = getTrackData();
  const vehicleTypeData = getVehicleTypeData();
  const incursionsData = getIncursionsData();
  const incursionToGainAdvantageData = getIncursionToGainAdvantageData();
  const timeSeriesData = getTimeSeriesData();

  return (
    <AdminSidebarLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">Third Party Charts & Analytics</h3>
          <p className="text-gray-600">Visual analytics of third party reports per scheme of each company</p>
        </div>

        {/* Filter and Export */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value)}
                className="select bg-white border-gray-300 rounded-lg w-full max-w-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              >
                {companies.map((company) => (
                  <optgroup key={company} label={company}>
                    {THIRD_PARTY_SCHEMES.filter((s) => s.company === company).map((s) => (
                      <option key={s.id} value={s.fullName}>
                        {s.fullName}
                      </option>
                    ))}
                  </optgroup>
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
                  <Calendar className="w-5 h-5 text-teal-600" />
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
                onClick={handleExportPDF}
                disabled={isExporting || loading}
                className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-teal-600 hover:shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
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
                    <BarChart3 className="w-6 h-6 text-gray-600" />
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
                    <AlertTriangle className="w-6 h-6 text-teal-600" />
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
                    <Calendar className="w-6 h-6 text-orange-600" />
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
                    <Calendar className="w-6 h-6 text-green-600" />
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
                    <TrendingUp className="w-6 h-6 text-purple-600" />
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

export default ThirdPartyChartsPage;
