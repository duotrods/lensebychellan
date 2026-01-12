import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
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
import { AlertTriangle, Car, Camera, Calendar } from "lucide-react";
import { SCHEMES } from "../../utils/schemes";
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { addDays } from 'date-fns';

const NewClientDashboard = () => {
  const { userProfile } = useAuth();
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

        {/* Date Range Filter */}
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

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      ) : (
        <>
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

            {/* Chart 1: Fault */}
            <ChartCard title="Fault">
              <BarChart data={faultData}>
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
              <BarChart data={incidentTypeData}>
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
        </>
      )}
    </div>
  );
};

export default NewClientDashboard;
