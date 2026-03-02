import { useNavigate } from "react-router-dom";
import { CameraOff, Edit, CheckCircle2, Eye } from "lucide-react";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { useStaffCCTVFaultsContext } from "../../context/StaffCCTVFaultsContext";

const CCTVFaultsLivePageInner = () => {
  const navigate = useNavigate();
  const { faults, loading } = useStaffCCTVFaultsContext();

  const handleEdit = (fault) => {
    navigate(`/dashboard/staff/forms/cctv-faults?edit=${fault.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <CameraOff className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Live CCTV Faults</h3>
            <p className="text-sm text-gray-500">
              Real-time feed — faults waiting to be resolved
            </p>
          </div>
        </div>
        {!loading && (
          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-full text-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {faults.length} Active {faults.length === 1 ? "Fault" : "Faults"}
          </span>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <span className="loading loading-spinner loading-lg text-teal-500" />
          </div>
        ) : faults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <CheckCircle2 className="w-12 h-12 text-green-300 mb-3" />
            <p className="text-lg font-semibold text-gray-500">All clear</p>
            <p className="text-sm">No live CCTV faults at the moment</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">
                  Reference
                </th>
                <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">
                  Camera
                </th>
                <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">
                  Scheme
                </th>
                <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">
                  Date / Time
                </th>
                <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4 text-center">
                  Client
                </th>
                <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {faults.map((fault) => (
                <tr key={fault.id} className="hover:bg-gray-50 transition-colors">
                  {/* Reference */}
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-gray-800">
                      {fault.referenceId || fault.id.slice(0, 10)}
                    </span>
                    <div className="inline-flex items-center gap-1 ml-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </div>
                  </td>

                  {/* Camera */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-800 font-medium">
                      {fault.camera || "N/A"}
                    </span>
                  </td>

                  {/* Scheme */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{fault.scheme || "N/A"}</span>
                  </td>

                  {/* Date / Time */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-800">{fault.date || "N/A"}</div>
                    <div className="text-xs text-gray-400">{fault.time || ""}</div>
                  </td>

                  {/* Client acknowledged */}
                  <td className="px-6 py-4 text-center">
                    {fault.clientAcknowledged ? (
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                          <Eye className="w-3 h-3" />
                          Seen
                        </span>
                        {(() => {
                          const notesList = fault.clientNotes?.length
                            ? fault.clientNotes
                            : fault.clientNote
                            ? [{ text: fault.clientNote }]
                            : [];
                          if (!notesList.length) return null;
                          const latest = notesList[notesList.length - 1];
                          return (
                            <span className="text-xs text-gray-400 max-w-[120px] truncate" title={latest.text}>
                              {notesList.length > 1 && `(${notesList.length}) `}{latest.text}
                            </span>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleEdit(fault)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      title="View / Mark Complete"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      View / Complete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const CCTVFaultsLivePage = () => (
  <StaffSidebarLayout>
    <CCTVFaultsLivePageInner />
  </StaffSidebarLayout>
);

export default CCTVFaultsLivePage;
