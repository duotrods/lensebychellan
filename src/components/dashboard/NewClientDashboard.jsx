import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useLiveIncidents } from "../../hooks/useLiveIncidents";
import { useLiveCCTVFaults } from "../../hooks/useCCTVFaults";
import { clientDataService } from "../../services/clientDataService";
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
import { AlertTriangle, Car, Calendar, Download, Radio, Eye, CameraOff } from "lucide-react";
import { SCHEMES } from "../../utils/schemes";
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { addDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

const NewClientDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const datePickerRef = useRef(null);
  const dashboardRef = useRef(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Set default date range to last 30 days
  const [dateRange, setDateRange] = useState([
    {
      startDate: addDays(new Date(), -30),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

  // Convert date range to string format for queries
  const startDate = dateRange[0].startDate.toISOString().split('T')[0];
  const endDate = dateRange[0].endDate.toISOString().split('T')[0];

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

  // Get the active scheme name for display
  const getActiveSchemeName = () => {
    // If activeSchemeName is set, use it
    if (userProfile?.activeSchemeName) {
      return userProfile.activeSchemeName;
    }

    // If we have an activeSchemeId but no activeSchemeName, look it up
    if (userProfile?.activeSchemeId) {
      const activeSchemeObj = SCHEMES.find(s => s.id === userProfile.activeSchemeId);
      if (activeSchemeObj) {
        return activeSchemeObj.fullName;
      }
    }

    // Fall back to the default scheme name
    return userProfile?.schemeName;
  };

  const getActiveSchemeId = () => {
    return userProfile?.activeSchemeId || userProfile?.schemeId;
  };

  // Cached query for stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['schemeStats', schemeId, startDate, endDate],
    queryFn: () => clientDataService.getSchemeStatsByDateRange(schemeId, startDate, endDate),
    enabled: !!schemeId && !!startDate && !!endDate,
  });

  // Cached query for uptime
  const { data: cctvUptime, isLoading: uptimeLoading } = useQuery({
    queryKey: ['cctvUptime', schemeId],
    queryFn: () => clientDataService.getCCTVUptime(schemeId),
    enabled: !!schemeId,
  });

  // Cached query for time series
  const { data: timeSeriesData = [], isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['timeSeriesData', schemeId, startDate, endDate],
    queryFn: () => clientDataService.getTimeSeriesDataByDateRange(schemeId, startDate, endDate),
    enabled: !!schemeId && !!startDate && !!endDate,
  });

  // Real-time subscription for live incidents (no polling - only charges when data changes)
  const { liveIncidents, loading: liveIncidentsLoading } = useLiveIncidents(schemeId);

  // Real-time subscription for CCTV fault reports
  const { faults: liveCCTVFaults, loading: cctvFaultsLoading } = useLiveCCTVFaults(schemeId);

  const loading = statsLoading || uptimeLoading || timeSeriesLoading;

  // Transform stats data for charts - filter out Unknown and empty values
  const transformDataForChart = (dataObj, filterUnknown = true) => {
    if (!dataObj) return [];
    return Object.entries(dataObj)
      .filter(([name, count]) => {
        // Filter out Unknown and empty values if requested
        if (filterUnknown && (name === 'Unknown' || name === '' || name === 'undefined')) {
          return false;
        }
        // Only include entries with count > 0
        return count > 0;
      })
      .map(([name, count]) => ({
        name,
        Number: count,
      }))
      .sort((a, b) => b.Number - a.Number); // Sort by count descending
  };

  const faultData = transformDataForChart(stats?.faultTypes);
  const incidentTypeData = transformDataForChart(stats?.incidentsByType);
  const vehiclesDispatchedData = transformDataForChart(stats?.vehicleTypesDispatched);
  const spottedByData = transformDataForChart(stats?.spottedBy);
  const laneAffectedData = transformDataForChart(stats?.incidentsByLane);
  const timeToRecoverData = transformDataForChart(stats?.timeToRecover, false); // Keep all time ranges
  const trafficConditionsData = transformDataForChart(stats?.trafficConditions);
  const timeToSiteData = transformDataForChart(stats?.timeToSite, false); // Keep all time ranges
  const trackData = transformDataForChart(stats?.trackOfIncident);
  const emergencyServicesData = transformDataForChart(stats?.emergencyServices);
  const vehicleTypeData = transformDataForChart(stats?.vehicleTypes);
  const incursionsData = [{ name: "Incursions", Number: stats?.incursions || 0 }];

  const statsCards = [
    {
      title: "Total Incidents",
      value: loading ? "..." : (stats?.totalIncidents || 0).toString(),
      text: "Total number of incidents reported within the scheme.",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      title: "Vehicles Dispatched",
      value: loading ? "..." : (stats?.vehiclesDispatched || 0).toString(),
      text: "Total number of vehicles dispatched to incident locations.",
      icon: Car,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    
  ];

  // Chart component wrapper for consistent styling
  const ChartCard = ({ title, children, fullWidth = false, height = 380 }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow ${fullWidth ? 'col-span-full' : ''}`}>
      <h5 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">{title}</h5>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );

  // Common chart styling props
  const commonChartProps = {
    cartesianGrid: { strokeDasharray: "3 3", stroke: "#17af93" },
    xAxis: {  tick: { fontSize: 13 }},
    yAxis: { tick: { fontSize: 13 } },
    tooltip: {
      contentStyle: { backgroundColor: '#fff', border: '1px solid #17af93', borderRadius: '8px' },
      labelStyle: { fontWeight: 'bold' }
    },
    legend: { wrapperStyle: { paddingTop: '20px' } },
    bar: { fill: "#17af93", radius: [8, 8, 0, 0] }
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

    // Calculate max value - ensure it's at least 1 to avoid division by zero
    const maxValue = Math.max(...data.map(d => d.Number), 1);
    const barWidth = chartWidth / data.length * 0.7;
    const gap = chartWidth / data.length * 0.3;

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.Number / maxValue) * chartHeight;
      const barX = x + margin.left + (index * (barWidth + gap));
      const barY = y + margin.top + chartHeight - barHeight;

      // Only draw bar if height is valid and greater than 0
      if (barHeight > 0 && !isNaN(barHeight) && !isNaN(barX) && !isNaN(barY) && barWidth > 0) {
        // Draw bar - use regular rect if height is too small for rounded corners
        pdf.setFillColor(23, 175, 147); // Teal color
        if (barHeight >= 4) {
          pdf.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');
        } else {
          pdf.rect(barX, barY, barWidth, barHeight, 'F');
        }
      }

      // Draw value on top of bar
      pdf.setFontSize(8);
      pdf.setTextColor(31, 41, 55);
      const valueY = barHeight > 0 ? barY - 2 : y + margin.top + chartHeight - 2;
      pdf.text(String(item.Number), barX + barWidth / 2, valueY, { align: 'center' });

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
      pdf.text('Dashboard Report', 15, 12);

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${getActiveSchemeId()} - ${getActiveSchemeName()}`, 15, 19);

      // Date range and stats - right side
      const dateRangeText = `${dateRange[0].startDate.toLocaleDateString('en-GB')} - ${dateRange[0].endDate.toLocaleDateString('en-GB')}`;
      pdf.text(dateRangeText, pdfWidth - 15, 12, { align: 'right' });

      const statsText = `Total Incidents: ${stats?.totalIncidents || 0} | Vehicles Dispatched: ${stats?.vehiclesDispatched || 0}`;
      pdf.text(statsText, pdfWidth - 15, 19, { align: 'right' });

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
          pdf.text('Dashboard Report', 15, 12);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${getActiveSchemeId()} - ${getActiveSchemeName()}`, 15, 19);
          pdf.text(dateRangeText, pdfWidth - 15, 12, { align: 'right' });
          pdf.text(statsText, pdfWidth - 15, 19, { align: 'right' });

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
      const fileName = `dashboard_${getActiveSchemeId()}_${startDate}_to_${endDate}.pdf`;
      pdf.save(fileName);

      toast.success('Dashboard exported successfully!', { id: 'export-pdf' });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export dashboard', { id: 'export-pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4">
      {/* Header with Date Filter */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold text-gray-800">
            Welcome back, {userProfile?.displayName}!
          </h3>
          <p className="text-gray-600 mt-2">
            {getActiveSchemeId()} - {getActiveSchemeName()}
          </p>
        </div>

        {/* Date Range Filter and Export Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExporting || loading}
            className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-teal-600 hover:shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Export Charts</span>
          </button>

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
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      ) : (
        <div ref={dashboardRef}>
            {/* Live Incidents Link Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div
            onClick={() => navigate('/dashboard/client/live-incidents')}
            className=" bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className=" px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10rounded-full flex items-center justify-center">
                <Radio className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xl">Live Incidents</span>
                <p className=" text-sm">View and monitor live incidents for your scheme</p>
              </div>
              {liveIncidentsLoading ? (
                <span className="loading loading-spinner loading-sm text-white"></span>
              ) : (
                <span className="bg-red-500 text-white px-4 py-2 rounded-full text-lg font-bold">
                  {liveIncidents.length} Active
                </span>
              )}
              <Eye className="w-6 h-6 text-red-500" />
            </div>
            </div>
            
            <div
            onClick={() => navigate('/dashboard/client/cctv-faults')}
            className=" bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className=" px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10rounded-full flex items-center justify-center">
                  <CameraOff className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-xl">Live Camera Fault</span>
                <p className=" text-sm">View and monitor live camera fault for your scheme</p>
              </div>
              {cctvFaultsLoading ? (
                <span className="loading loading-spinner loading-sm text-white"></span>
              ) : (
                <span className="bg-red-500 text-white px-4 py-2 rounded-full text-lg font-bold">
                  {liveCCTVFaults.length} Fault
                </span>
              )}
              <Eye className="w-6 h-6 text-red-500" />
            </div>
              </div>
              </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <h5 className="font-semibold text-gray-500 mb-1">{stat.title}</h5>
                </div>
                <span className="text-4xl font-bold text-gray-800 pl-2">
                  {stat.value}
                </span>
                <p className="text-sm text-gray-500 mt-2">{stat.text}</p>
              </div>
            ))}
          </div>

          {/* All Charts in 2 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Chart 9: Time to Site */}
            <ChartCard title="Time to Site (mins)">
              <BarChart data={timeToSiteData}>
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
              <BarChart data={timeToRecoverData}>
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
                <BarChart data={faultData} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
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

            {/* Chart 2: Incident Type */}
            <ChartCard title="Incident Type">
                <BarChart data={incidentTypeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
              <BarChart data={vehiclesDispatchedData}>
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
              <BarChart data={spottedByData}>
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
              <BarChart data={laneAffectedData}>
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
              <BarChart data={trafficConditionsData}>
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
              <BarChart data={emergencyServicesData}>
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
              <BarChart data={trackData}>
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
              <BarChart data={vehicleTypeData}>
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
              <BarChart data={incursionsData}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#17af93" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #17af93', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Number" fill="#17af93" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewClientDashboard;
