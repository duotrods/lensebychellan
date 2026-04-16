import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CameraOff, Edit, CheckCircle2, Eye, MessageSquare, Send, Loader2 } from "lucide-react";
import StaffSidebarLayout from "../../components/layout/StaffSidebarLayout";
import { useStaffCCTVFaultsContext } from "../../context/StaffCCTVFaultsContext";
import { useAuth } from "../../hooks/useAuth";
import { getStaffBasePath } from "../../utils/constants";
import { clientDataService } from "../../services/clientDataService";
import { toast } from "react-hot-toast";

const formatNoteTime = (addedAt) => {
  if (!addedAt) return '';
  const d = new Date(addedAt);
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

const NoteThread = ({ notes, legacyNote, faultId, onNotesUpdated }) => {
  const allNotes = notes?.length
    ? notes
    : legacyNote
    ? [{ text: legacyNote, addedAt: null, authorRole: 'cctvfaultoperator', authorName: 'Operator' }]
    : [];

  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditText(allNotes[idx].text);
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditText('');
  };

  const saveEdit = async (idx) => {
    if (!editText.trim() || editText.trim() === allNotes[idx].text) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const updated = allNotes.map((n, i) =>
        i === idx ? { ...n, text: editText.trim() } : n
      );
      await clientDataService.updateCCTVFaultNotes(faultId, updated);
      onNotesUpdated?.();
      cancelEdit();
    } catch {
      toast.error('Failed to save edit.');
    } finally {
      setSaving(false);
    }
  };

  if (!allNotes.length) {
    return <p className="text-xs text-gray-400 text-center py-2">No notes yet — start the conversation</p>;
  }

  return (
    <div className="space-y-2 py-2">
      {allNotes.map((note, idx) => {
        const isCCTV = note.authorRole === 'cctvfaultoperator';
        return (
          <div key={idx} className={`flex flex-col ${isCCTV ? 'items-end' : 'items-start'}`}>
            {editingIdx === idx ? (
              <div className="flex items-center gap-2 w-full max-w-[75%]">
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(idx); }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  disabled={saving}
                  className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                />
                <button
                  onClick={() => saveEdit(idx)}
                  disabled={saving || !editText.trim()}
                  className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            ) : (
              <div
                className={`px-3 py-2 rounded-xl text-sm max-w-[75%] cursor-pointer group relative ${
                  isCCTV
                    ? 'bg-teal-500 text-white rounded-tr-sm'
                    : 'bg-blue-100 text-blue-900 rounded-tl-sm'
                }`}
                onClick={() => startEdit(idx)}
                title="Click to edit"
              >
                {note.text}
                <span className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-white border border-gray-200 rounded-full text-gray-500 text-xs shadow-sm">✎</span>
              </div>
            )}
            <span className="text-xs text-gray-400 mt-0.5">
              {note.authorName || (isCCTV ? 'Operator' : 'Staff')}
              {note.addedAt && ` · ${formatNoteTime(note.addedAt)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CCTVFaultsLivePageInner = () => {
  const navigate = useNavigate();
  const { faults, loading } = useStaffCCTVFaultsContext();
  const { userProfile, role } = useAuth();
  const basePath = getStaffBasePath(role);

  const [expandedNotes, setExpandedNotes] = useState({});
  const [staffNote, setStaffNote] = useState({});
  const [savingNote, setSavingNote] = useState({});

  const handleEdit = (fault) => {
    navigate(`${basePath}/forms/cctv-faults?edit=${fault.id}`);
  };

  const toggleNotes = (faultId) => {
    setExpandedNotes((prev) => ({ ...prev, [faultId]: !prev[faultId] }));
  };

  const handleStaffNote = async (faultId) => {
    const text = (staffNote[faultId] || '').trim();
    if (!text) return;
    setSavingNote((prev) => ({ ...prev, [faultId]: true }));
    try {
      await clientDataService.addClientNote(
        faultId,
        text,
        'staff',
        userProfile?.displayName || userProfile?.name || 'Staff'
      );
      setStaffNote((prev) => ({ ...prev, [faultId]: '' }));
    } catch {
      toast.error('Failed to add note.');
    } finally {
      setSavingNote((prev) => ({ ...prev, [faultId]: false }));
    }
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
              {faults.map((fault) => {
                const noteCount = fault.clientNotes?.length || (fault.clientNote ? 1 : 0);
                return (
                  <Fragment key={fault.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
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
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            onClick={() => handleEdit(fault)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition-colors"
                            title="View / Mark Complete"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            View / Complete
                          </button>
                          <button
                            onClick={() => toggleNotes(fault.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                              expandedNotes[fault.id]
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Notes {noteCount > 0 && `(${noteCount})`}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable notes panel — real-time via context onSnapshot */}
                    {expandedNotes[fault.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="max-w-lg mx-auto">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Note Thread
                            </p>
                            <NoteThread notes={fault.clientNotes} legacyNote={fault.clientNote} faultId={fault.id} />
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                              <input
                                type="text"
                                placeholder="Reply as staff..."
                                value={staffNote[fault.id] || ''}
                                onChange={(e) =>
                                  setStaffNote((prev) => ({ ...prev, [fault.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleStaffNote(fault.id);
                                  }
                                }}
                                disabled={savingNote[fault.id]}
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                              />
                              <button
                                onClick={() => handleStaffNote(fault.id)}
                                disabled={savingNote[fault.id] || !(staffNote[fault.id] || '').trim()}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {savingNote[fault.id]
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Send className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const CCTVFaultsLivePage = () => {
  const { role } = useAuth();
  const basePath = getStaffBasePath(role);
  return (
    <StaffSidebarLayout basePath={basePath}>
      <CCTVFaultsLivePageInner />
    </StaffSidebarLayout>
  );
};

export default CCTVFaultsLivePage;
