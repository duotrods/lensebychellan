import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  useLiveCCTVFaults,
  usePaginatedCCTVFaults,
} from "../../hooks/useCCTVFaults";
import {
  Eye,
  Camera,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { SCHEMES } from "../../utils/schemes";
import ClientSidebarLayout from "../../components/layout/ClientSidebarLayout";

const formatNoteTime = (addedAt) => {
  if (!addedAt) return "";
  const d = new Date(addedAt);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

const NoteThread = ({ notes, legacyNote }) => {
  const allNotes = notes?.length
    ? notes
    : legacyNote
      ? [{ text: legacyNote, addedAt: null, authorRole: "cctvfaultoperator", authorName: "Operator" }]
      : [];

  if (!allNotes.length) return null;

  return (
    <div className="space-y-2 pb-2">
      {allNotes.map((note, idx) => {
        const isCCTV = note.authorRole === "cctvfaultoperator";
        return (
          <div key={idx} className={`flex flex-col ${isCCTV ? "items-end" : "items-start"}`}>
            <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
              isCCTV
                ? "bg-teal-500 text-white rounded-tr-sm"
                : "bg-blue-100 text-blue-900 rounded-tl-sm"
            }`}>
              {note.text}
            </div>
            <span className="text-xs text-gray-400 mt-0.5">
              {note.authorName || (isCCTV ? "Operator" : "Staff")}
              {note.addedAt && ` · ${formatNoteTime(note.addedAt)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CCTVFaultsPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const basePath = "/dashboard/client";

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;

  const getActiveSchemeName = () => {
    if (userProfile?.activeSchemeName) return userProfile.activeSchemeName;
    if (userProfile?.activeSchemeId) {
      const found = SCHEMES.find((s) => s.id === userProfile.activeSchemeId);
      if (found) return found.fullName;
    }
    return userProfile?.schemeName;
  };

  const { faults: liveFaults, loading: liveLoading } =
    useLiveCCTVFaults(schemeId);

  const {
    faults: resolvedFaults,
    loading: resolvedLoading,
    currentPage,
    totalPages,
    totalCount,
    goToNextPage,
    goToPrevPage,
    refresh,
    pageSize,
  } = usePaginatedCCTVFaults(schemeId, 6);

  // When a live fault gets resolved, refresh the completed list
  const prevLiveCount = useRef(liveFaults.length);
  useEffect(() => {
    if (
      prevLiveCount.current > 0 &&
      liveFaults.length < prevLiveCount.current
    ) {
      refresh();
    }
    prevLiveCount.current = liveFaults.length;
  }, [liveFaults.length, refresh]);

  const [notesOpen, setNotesOpen] = useState({});
  const toggleNotes = (faultId, e) => {
    e.stopPropagation();
    setNotesOpen((prev) => ({ ...prev, [faultId]: !prev[faultId] }));
  };

  const handleView = (fault) => {
    navigate(`${basePath}/reports/cctv-faults/${fault.id}`);
  };

  return (
    <ClientSidebarLayout>
      <div>
        {/* Back button */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate(basePath)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h4 className="font-bold text-gray-800">
                Go Back to{" "}
                <span className="font-semibold text-brand-400">Dashboard</span>
              </h4>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8 bg-white rounded-xl text-center p-6 shadow-sm">
          <h4 className="font-bold text-gray-800">
            <span className="font-semibold text-brand-400">
              {schemeId} ({getActiveSchemeName()})
            </span>{" "}
            CCTV Faults
          </h4>
          <p className="text-gray-500">
            Monitor live and resolved camera faults for your scheme
          </p>
        </div>

        {/* Columns */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Faults */}
            <div className="flex flex-col">
              <div className="bg-linear-to-br from-red-500 to-red-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-red-500" />
                </div>
                <span className="text-white font-semibold text-2xl">
                  Live Faults
                </span>
                <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {liveLoading ? "..." : `${liveFaults.length} Active`}
                </span>
              </div>

              <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                {liveLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                  </div>
                ) : liveFaults.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No live camera faults at this time
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {liveFaults.map((fault) => {
                      const noteCount = fault.clientNotes?.length || (fault.clientNote ? 1 : 0);
                      const isOpen = notesOpen[fault.id];
                      return (
                        <div
                          key={fault.id}
                          className="px-4 py-4"
                        >
                          {/* Top row */}
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => handleView(fault)}
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-red-400 font-mono font-semibold">
                                {fault.time || "N/A"}
                              </span>
                              <span className="text-green-500 font-bold">|</span>
                              <span className="text-black font-mono">
                                {fault.date || "N/A"}
                              </span>
                              <span className="text-red-500 font-bold">|</span>
                              <span className="font-medium">
                                {fault.referenceId || fault.id.slice(0, 6)}
                              </span>
                              <span className="text-red-500 font-bold">|</span>
                              <span className="font-medium">
                                Camera: {fault.camera || "N/A"}
                              </span>
                            </div>
                            <button
                              className="p-1.5 rounded text-blue-400 hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Comment */}
                          {fault.comments && (
                            <p className="text-slate-400 text-sm mt-1 truncate">
                              {fault.comments}
                            </p>
                          )}

                          {/* Notes thread */}
                          {noteCount > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={(e) => toggleNotes(fault.id, e)}
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 rounded px-1.5 py-0.5 transition-colors mb-2"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{noteCount} {noteCount === 1 ? "note" : "notes"}</span>
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              {isOpen && (
                                <NoteThread
                                  notes={fault.clientNotes}
                                  legacyNote={fault.clientNote}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Resolved Faults */}
            <div className="flex flex-col">
              <div className="bg-linear-to-br from-brand-500 to-brand-600 rounded-t-lg px-4 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-white font-semibold text-2xl">
                  Resolved Faults
                </span>
                <span className="ml-auto bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {resolvedLoading ? "..." : `${totalCount} Total`}
                </span>
              </div>

              <div className="bg-white shadow-xs rounded-b-lg flex-1 overflow-hidden border border-t-0 border-gray-100">
                {resolvedLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                  </div>
                ) : resolvedFaults.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No resolved faults yet
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100 overflow-y-auto">
                      {resolvedFaults.map((fault) => {
                        const noteCount = fault.clientNotes?.length || (fault.clientNote ? 1 : 0);
                        const isOpen = notesOpen[fault.id];
                        return (
                          <div
                            key={fault.id}
                            className="px-4 py-4"
                          >
                            {/* Top row */}
                            <div
                              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                              onClick={() => handleView(fault)}
                            >
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-black font-mono">
                                  {fault.time || "N/A"}
                                </span>
                                <span className="text-green-500 font-bold">|</span>
                                <span className="text-black font-mono">
                                  {fault.date || "N/A"}
                                </span>
                                <span className="text-green-500 font-bold">|</span>
                                <span className="font-medium">
                                  {fault.referenceId || fault.id.slice(0, 6)}
                                </span>
                                <span className="text-green-500 font-bold">|</span>
                                <span className="text-black font-medium">
                                  Camera: {fault.camera || "N/A"}
                                </span>
                              </div>
                              <button
                                className="p-1.5 hover:bg-gray-200 rounded text-blue-400 hover:text-blue-500"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Comment */}
                            {fault.comments && (
                              <p className="text-slate-400 text-sm mt-1 truncate">
                                {fault.comments}
                              </p>
                            )}

                            {/* Notes thread */}
                            {noteCount > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <button
                                  onClick={(e) => toggleNotes(fault.id, e)}
                                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 rounded px-1.5 py-0.5 transition-colors mb-2"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{noteCount} {noteCount === 1 ? "note" : "notes"}</span>
                                  {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {isOpen && (
                                  <NoteThread
                                    notes={fault.clientNotes}
                                    legacyNote={fault.clientNote}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <span className="text-sm text-gray-500">
                          Showing {(currentPage - 1) * pageSize + 1}–
                          {Math.min(currentPage * pageSize, totalCount)} of{" "}
                          {totalCount}
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
                            disabled={currentPage >= totalPages}
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
      </div>
    </ClientSidebarLayout>
  );
};

export default CCTVFaultsPage;
