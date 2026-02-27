import { LogOut, X } from "lucide-react";

const LogoutConfirmModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
          <LogOut className="w-7 h-7 text-red-500" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-lg font-bold text-gray-800 text-center mb-1">
        Sign out?
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Are you sure you want to log out of your account?
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  </div>
);

export default LogoutConfirmModal;
