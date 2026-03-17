import { useState } from "react";
import { LogOut, X } from "lucide-react";

const LogoutConfirmModal = ({ onConfirm, onCancel, noteEnabled = false }) => {
  const [note, setNote] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirm = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await onConfirm(note.trim());
  };

  return (
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
        <p className="text-sm text-gray-500 text-center mb-4">
          Are you sure you want to log out of your account?
        </p>

        {/* Optional handover note (staff only) */}
        {noteEnabled && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Handover note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Leave a note for your team on the noticeboard..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/300</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loggingOut}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loggingOut}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:bg-red-700 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
