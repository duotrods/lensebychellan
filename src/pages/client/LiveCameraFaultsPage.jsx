import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLiveCCTVFaults, usePaginatedCCTVFaults } from '../../hooks/useCCTVFaults';
import { Eye, CameraOff, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Clock, CheckCircle2, Pencil, X } from 'lucide-react';
import { SCHEMES } from '../../utils/schemes';
import { clientDataService } from '../../services/clientDataService';
import { toast } from 'react-hot-toast';

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

  // Real-time subscription for live faults
  const { faults: recentFaults, loading: recentLoading } = useLiveCCTVFaults(schemeId);

  // Server-side paginated completed fault history
  const {
    faults: historyFaults,
    loading: historyLoading,
    currentPage,
    totalPages,
    totalCount,
    goToNextPage,
    goToPrevPage,
    refresh: refreshHistory,
    pageSize,
  } = usePaginatedCCTVFaults(schemeId, 6);

  // When a live fault gets completed, recentFaults.length decreases.
  // Auto-refresh the history so it appears immediately without manual reload.
  const prevLiveFaultCount = useRef(recentFaults.length);
  useEffect(() => {
    if (prevLiveFaultCount.current > 0 && recentFaults.length < prevLiveFaultCount.current) {
      refreshHistory();
    }
    prevLiveFaultCount.current = recentFaults.length;
  }, [recentFaults.length, refreshHistory]);

  // Per-fault note state (faultId -> note text) for first-time acknowledgment
  const [notes, setNotes] = useState({});
  // Track which faults are being acknowledged
  const [acknowledging, setAcknowledging] = useState({});
  // Track which already-acknowledged faults have the "add note" form open
  const [addingNote, setAddingNote] = useState({});
  // New note text per fault
  const [newNotes, setNewNotes] = useState({});
  // Track which notes are being saved
  const [savingNote, setSavingNote] = useState({});

  const handleAcknowledge = async (fault) => {
    if (fault.clientAcknowledged) return;
    setAcknowledging((prev) => ({ ...prev, [fault.id]: true }));
    try {
      await clientDataService.acknowledgeCCTVFault(fault.id, notes[fault.id] || '');
      toast.success('Fault acknowledged — staff have been notified.');
    } catch {
      toast.error('Failed to acknowledge fault. Please try again.');
    } finally {
      setAcknowledging((prev) => ({ ...prev, [fault.id]: false }));
    }
  };

  const startAddNote = (faultId) => {
    setNewNotes((prev) => ({ ...prev, [faultId]: '' }));
    setAddingNote((prev) => ({ ...prev, [faultId]: true }));
  };

  const cancelAddNote = (faultId) => {
    setAddingNote((prev) => ({ ...prev, [faultId]: false }));
  };

  const handleSaveNote = async (fault) => {
    const text = (newNotes[fault.id] || '').trim();
    if (!text) return;
    setSavingNote((prev) => ({ ...prev, [fault.id]: true }));
    try {
      await clientDataService.addClientNote(fault.id, text);
      toast.success('Note added.');
      setAddingNote((prev) => ({ ...prev, [fault.id]: false }));
      setNewNotes((prev) => ({ ...prev, [fault.id]: '' }));
    } catch {
      toast.error('Failed to add note. Please try again.');
    } finally {
      setSavingNote((prev) => ({ ...prev, [fault.id]: false }));
    }
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
              {/* Live Faults Column — real-time feed */}
              <div className="flex flex-col">
                <div className="bg-linear-to-br from-red-500 to-red-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <CameraOff className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-white font-semibold text-2xl">Live Faults</span>
                  <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {recentFaults.length} Active
                  </span>
                </div>

                <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                  {recentFaults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No active camera faults
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                      {recentFaults.map((fault) => (
                        <div key={fault.id} className="px-4 py-4">
                          {/* Top row */}
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-3 flex-wrap cursor-pointer"
                              onClick={() => handleViewFault(fault)}
                            >
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
                              onClick={() => handleViewFault(fault)}
                              className="p-1.5 rounded text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Date + comment */}
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

                          {/* Acknowledgment section */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {fault.clientAcknowledged ? (
                              <div className="space-y-2">
                                {/* Stacked notes — show clientNotes array, fall back to legacy clientNote */}
                                {(() => {
                                  const notesList = fault.clientNotes?.length
                                    ? fault.clientNotes
                                    : fault.clientNote
                                    ? [{ text: fault.clientNote, addedAt: null }]
                                    : [];
                                  return notesList.length > 0 ? (
                                    <div className="space-y-1">
                                      {notesList.map((note, idx) => (
                                        <div key={idx} className="flex items-start gap-1.5 text-sm bg-gray-50 rounded-lg px-2.5 py-1.5">
                                          <span className="text-gray-700 flex-1">{note.text}</span>
                                          {note.addedAt && (
                                            <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                                              {new Date(note.addedAt).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null;
                                })()}

                                {/* Acknowledged badge + Add note button */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Acknowledged</span>
                                  </div>
                                  {!addingNote[fault.id] && (
                                    <button
                                      onClick={() => startAddNote(fault.id)}
                                      className="shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition-colors"
                                      title="Add a note"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Add note
                                    </button>
                                  )}
                                </div>

                                {/* Add note form */}
                                {addingNote[fault.id] && (
                                  <div className="space-y-2">
                                    <textarea
                                      rows={2}
                                      placeholder="Add a note..."
                                      value={newNotes[fault.id] || ''}
                                      onChange={(e) =>
                                        setNewNotes((prev) => ({ ...prev, [fault.id]: e.target.value }))
                                      }
                                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleSaveNote(fault)}
                                        disabled={savingNote[fault.id] || !(newNotes[fault.id] || '').trim()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-60"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {savingNote[fault.id] ? 'Saving...' : 'Save Note'}
                                      </button>
                                      <button
                                        onClick={() => cancelAddNote(fault.id)}
                                        disabled={savingNote[fault.id]}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  rows={2}
                                  placeholder="Add a note (e.g. will fix on Tuesday)..."
                                  value={notes[fault.id] || ''}
                                  onChange={(e) =>
                                    setNotes((prev) => ({ ...prev, [fault.id]: e.target.value }))
                                  }
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400"
                                />
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm checkbox-success"
                                    disabled={acknowledging[fault.id]}
                                    onChange={(e) => {
                                      if (e.target.checked) handleAcknowledge(fault);
                                    }}
                                  />
                                  <span className="text-sm text-gray-600">
                                    {acknowledging[fault.id]
                                      ? 'Sending acknowledgment...'
                                      : 'Mark as received / acknowledged'}
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fault History Column — paginated completed faults */}
              <div className="flex flex-col">
                <div className="bg-linear-to-br from-brand-500 to-brand-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-brand-500" />
                  </div>
                  <span className="text-white font-semibold text-2xl">Fault History</span>
                  <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {totalCount} Completed
                  </span>
                </div>

                <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                  {historyLoading ? (
                    <div className="p-6 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                    </div>
                  ) : historyFaults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No completed fault reports yet
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
                              <div className="flex items-center gap-2">
                                {fault.clientAcknowledged && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" title="Client acknowledged" />
                                )}
                                {fault.completedBy?.name && (
                                  <span className="text-slate-400 text-sm">
                                    By: <span className="text-black font-semibold">{fault.completedBy.name}</span>
                                  </span>
                                )}
                              </div>
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
