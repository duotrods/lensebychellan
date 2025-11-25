import { useAuth } from '../../hooks/useAuth';
import { ChartNoAxesCombined, FileSpreadsheet, Video, ShieldCheck } from 'lucide-react';

const ClientDashboard = () => {
  const { userProfile } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h2>Client Portal</h2>
        <p className="text-gray-600">
          Welcome, {userProfile?.displayName} from {userProfile?.company}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Live Dashboard</h5>
            <ChartNoAxesCombined className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            Real-time scheme monitoring with live dashboards and performance insights.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Your Reports</h5>
            <FileSpreadsheet className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            Access automated KPI reports and performance data for your schemes.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Reports
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Scheme Status</h5>
            <ShieldCheck className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            View the current status and uptime of your highway monitoring schemes.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Status
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-bold text-gray-800">Recordings</h5>
            <Video className="text-brand-500 w-8 h-8" />
          </div>
          <p className="text-gray-600 mb-4">
            Access recorded footage and incident videos from your CCTV systems.
          </p>
          <button className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white">
            View Recordings
          </button>
        </div>
      </div>

      <div className="mt-8 bg-brand-50 rounded-xl p-6 border-2 border-brand-200">
        <h5 className="mb-2">Need Support?</h5>
        <p className="text-gray-600 mb-4">
          Our team is here to help with any questions about your monitoring services.
        </p>
        <button className="btn btn-sm btn-outline">Contact Support</button>
      </div>
    </div>
  );
};

export default ClientDashboard;
