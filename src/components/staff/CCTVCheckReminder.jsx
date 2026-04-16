import { useNavigate } from 'react-router-dom';
import { Video, X } from 'lucide-react';

const CCTVCheckReminder = ({ onDismiss, basePath = '/dashboard/staff' }) => {
  const navigate = useNavigate();

  const handleStartCheck = () => {
    onDismiss();
    navigate(`${basePath}/forms/cctv-check`);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in">
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
              <Video className="w-10 h-10 text-teal-600" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Time for Your Hourly CCTV Check!
            </h2>
            <p className="text-gray-600">
              It's been an hour since your last check. Please review all CCTV cameras and report any issues.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* <button
              onClick={handleStartCheck}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              Start CCTV Check
            </button> */}
            <button
              onClick={onDismiss}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default CCTVCheckReminder;
