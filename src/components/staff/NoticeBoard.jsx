import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { staffService } from '../../services/staffService';
import { useAuth } from '../../hooks/useAuth';

const NoticeBoard = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (isOpen && userProfile) {
      loadActivities();
    }
  }, [isOpen, userProfile]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      // Get activities since last logout
      const lastLogout = userProfile?.lastLogoutAt?.toDate() || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
      const recentActivities = await staffService.getRecentActivities(currentUser.uid, lastLogout);
      setActivities(recentActivities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-teal-500 to-teal-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Important Notice!</h2>
              <p className="text-teal-100">Here are some updates while you were away!</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg text-teal-500"></span>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No new updates since your last visit.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">{activity.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticeBoard;
