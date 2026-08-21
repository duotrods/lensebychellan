import { ExternalLink, X } from "lucide-react";
import warningIcon from "../../assets/warning.svg";

const ExternalLinkConfirmModal = ({ siteName, url, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-10">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <img src={warningIcon} alt="" className="w-40 h-40" />
        </div>

        {/* Text */}
        <h2 className="text-gray-800 text-center text-xl mb-2">
          Leave this site?
        </h2>
        <p className="text-base text-gray-500 text-center mb-8">
          You're about to open {siteName} in a new tab.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={() => {
              window.open(url, "_blank", "noopener,noreferrer");
              onConfirm();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalLinkConfirmModal;
