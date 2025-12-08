import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { clientDataService } from '../../services/clientDataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Car, Camera } from 'lucide-react';

const NewClientDashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [cctvUptime, setCctvUptime] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.schemeId) {
      loadDashboardData();
    }
  }, [userProfile?.schemeId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [schemeStats, uptimeData, weeklyData] = await Promise.all([
        clientDataService.getSchemeStats(userProfile.schemeId),
        clientDataService.getCCTVUptime(userProfile.schemeId),
        clientDataService.getTimeSeriesData(userProfile.schemeId, 30)
      ]);

      setStats(schemeStats);
      setCctvUptime(uptimeData);
      setTimeSeriesData(weeklyData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform stats data for charts
  const incidentTypeData = stats?.incidentsByType
    ? Object.entries(stats.incidentsByType).map(([name, count]) => ({ name, count }))
    : [];

  const laneAffectedData = stats?.incidentsByLane
    ? Object.entries(stats.incidentsByLane).map(([name, count]) => ({ name, count }))
    : [];

  const spottedByData = stats?.spottedBy
    ? Object.entries(stats.spottedBy).map(([name, count]) => ({ name, count }))
    : [];

  const statsCards = [
    {
      title: 'Total Incidents',
      value: loading ? '...' : (stats?.totalIncidents || 0).toString(),
      change: '+12%',
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Vehicles Dispatched',
      value: loading ? '...' : (stats?.vehiclesDispatched || 0).toString(),
      change: '+8%',
      icon: Car,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'CCTV Uptime',
      value: loading ? '...' : `${cctvUptime?.uptime || 0}%`,
      change: '+2%',
      icon: Camera,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Response Time',
      value: '8.2 min',
      change: '-5%',
      icon: TrendingUp,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Welcome back, {userProfile?.displayName}!
        </h2>
        <p className="text-gray-600 mt-2">
          {userProfile?.schemeId} - {userProfile?.schemeName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lane Affected Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Lane Affected</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={laneAffectedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Incident Type Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Incident Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incidentTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Incidents Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeSeriesData.length > 0 ? timeSeriesData : [{ name: 'No Data', count: 0 }]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spotted By Chart */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Incidents Spotted By</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={spottedByData.length > 0 ? spottedByData : [{ name: 'No Data', count: 0 }]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Incidents</h3>
        {loading ? (
          <div className="p-8 text-center">
            <span className="loading loading-spinner text-teal-500"></span>
          </div>
        ) : stats?.recentIncidents && stats.recentIncidents.length > 0 ? (
          <div className="space-y-4">
            {stats.recentIncidents.map((incident, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-semibold text-gray-800">{incident.type}</p>
                    <p className="text-sm text-gray-500">
                      {incident.location} • {incident.time ? new Date(incident.time.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  incident.status === 'Resolved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {incident.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No recent incidents for this scheme</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewClientDashboard;
