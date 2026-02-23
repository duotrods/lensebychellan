import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLiveCCTVFaults, usePaginatedCCTVFaults } from '../../hooks/useCCTVFaults';
import { Eye, CameraOff, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Clock } from 'lucide-react';
import { SCHEMES } from '../../utils/schemes';

const LiveCameraFaultsPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

  const getActiveSchemeName = () => {
    if (userProfile?.activeSchemeName) return userProfile.activeSchemeName;
    if (userProfile?.activeSchemeId) {
      const scheme = SCHEMES.find((s) => s.id === userProfile.activeSchemeId);
      if (scheme) return scheme.fullName;
    }
    return userProfile?.schemeName;
  };

  // Real-time subscription for recent faults (live feed)
  const { faults: recentFaults, loading: recentLoading } = useLiveCCTVFaults(schemeId);

  // Server-side paginated fault history
  const {
    faults: historyFaults,
    loading: historyLoading,
    currentPage,
    totalPages,
    totalCount,
    goToNextPage,
    goToPrevPage,
    pageSize,
  } = usePaginatedCCTVFaults(schemeId, 6);

  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
  };

  const handleViewFault = (fault) => {
    navigate(`/dashboard/client/cctv-fault/${fault.id}`);
  };

  return (
    <div>
      {/* Header with Back Button */}
      <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/dashboard/client')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h4 className="font-bold text-gray-800">
              Go Back to <span className="font-semibold text-brand-400">Dashboard</span>
            </h4>
          </div>
        </div>
      </div>

      {recentLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      ) : (
        <>
          <div className="mb-8 bg-white rounded-xl text-center p-6 shadow-sm">
            <h4 className="font-bold text-gray-800">
              <span className="font-semibold text-brand-400">
                {schemeId} ({getActiveSchemeName()})
              </span>{' '}
              Camera Fault Reports
            </h4>
            <p className="text-gray-500">
              Monitor camera faults reported for your scheme
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Faults Column — real-time feed */}
              <div className="flex flex-col">
                <div className="bg-linear-to-br from-red-500 to-red-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <CameraOff className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-white font-semibold text-2xl">Recent Faults</span>
                  <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {recentFaults.length} Reported
                  </span>
                </div>

                <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                  {recentFaults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No camera faults reported
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                      {recentFaults.map((fault) => (
                        <div
                          key={fault.id}
                          onClick={() => handleViewFault(fault)}
                          className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-red-400 font-mono font-semibold">
                                {fault.time || 'N/A'}
                              </span>
                              <span className="text-red-500 font-bold">|</span>
                              <span className="font-medium">
                                {fault.referenceId || `Fault #${fault.id.slice(0, 6)}`}
                              </span>
                              <span className="text-red-500 font-bold">|</span>
                              <span className="font-medium text-gray-700">
                                {fault.camera || 'N/A'}
                              </span>
                            </div>
                            <button
                              className="p-1.5 rounded text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-slate-400 text-sm">
                              Date: {fault.date || 'N/A'}
                            </p>
                            {fault.comments && (
                              <>
                                <span className="text-slate-300">•</span>
                                <p className="text-slate-400 text-sm truncate max-w-xs">
                                  {fault.comments}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fault History Column — paginated */}
              <div className="flex flex-col">
                <div className="bg-linear-to-br from-brand-500 to-brand-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-brand-500" />
                  </div>
                  <span className="text-white font-semibold text-2xl">Fault History</span>
                  <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {totalCount} Total
                  </span>
                </div>

                <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                  {historyLoading ? (
                    <div className="p-6 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                    </div>
                  ) : historyFaults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No fault reports yet
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-100 overflow-y-auto">
                        {historyFaults.map((fault) => (
                          <div
                            key={fault.id}
                            className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewFault(fault)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-black font-mono">
                                  {fault.date || 'N/A'}
                                </span>
                                <span className="text-brand-500 font-bold">|</span>
                                <span className="font-mono text-gray-700">
                                  {fault.time || 'N/A'}
                                </span>
                                <span className="text-brand-500 font-bold">|</span>
                                <span className="text-black font-medium">
                                  {fault.referenceId || `Fault #${fault.id.slice(0, 6)}`}
                                </span>
                              </div>
                              <button
                                className="p-1.5 hover:bg-gray-200 rounded text-blue-400 hover:text-blue-500"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-slate-400 text-sm">
                                Camera: <span className="font-medium text-gray-700">{fault.camera || 'N/A'}</span>
                              </p>
                              {fault.submittedBy?.name && (
                                <span className="text-slate-400 text-sm">
                                  By: <span className="text-black font-semibold">{fault.submittedBy.name}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                          <span className="text-sm text-gray-500">
                            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={goToPrevPage}
                              disabled={currentPage === 1}
                              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-medium px-2">
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              onClick={goToNextPage}
                              disabled={currentPage === totalPages}
                              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveCameraFaultsPage;
