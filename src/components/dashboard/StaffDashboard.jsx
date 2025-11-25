import { useAuth } from '../../hooks/useAuth';
import { ChartNoAxesCombined, FileSpreadsheet, Camera, Video } from 'lucide-react';

const StaffDashboard = () => {
  const { userProfile } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h2>Staff Dashboard</h2>
        <p className="text-gray-600">Welcome back, {userProfile?.displayName}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Active Schemes</h5>
            <Camera className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            Manage your assigned highway monitoring schemes and view real-time CCTV feeds.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Schemes
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Reports</h5>
            <FileSpreadsheet className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            Generate and view KPI reports for your monitoring activities.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Reports
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Incident Logs</h5>
            <Video className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            Record and manage incident reports from monitoring operations.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Logs
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Analytics</h5>
            <ChartNoAxesCombined className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            View performance metrics and analytics for your schemes.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
