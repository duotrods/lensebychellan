import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Camera, Calendar, Clock, User, MessageSquare, CheckCircle2, Edit, Radio, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';
import { useAuth } from '../../hooks/useAuth';
import { getStaffBasePath } from '../../utils/constants';

const formatNoteTime = (addedAt) => {
  if (!addedAt) return '';
  const d = new Date(addedAt);
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

const NoteThread = ({ notes, legacyNote }) => {
  const allNotes = notes?.length
    ? notes
    : legacyNote
    ? [{ text: legacyNote, addedAt: null, authorRole: 'cctvfaultoperator', authorName: 'Operator' }]
    : [];

  if (!allNotes.length) return null;

  return (
    <div className="space-y-2 pt-2">
      {allNotes.map((note, idx) => {
        const isCCTV = note.authorRole === 'cctvfaultoperator';
        return (
          <div key={idx} className={`flex flex-col ${isCCTV ? 'items-end' : 'items-start'}`}>
            <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${
              isCCTV
                ? 'bg-teal-500 text-white rounded-tr-sm'
                : 'bg-blue-100 text-blue-900 rounded-tl-sm'
            }`}>
              {note.text}
            </div>
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

const CCTVFaultsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = getStaffBasePath(role);
  const [fault, setFault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    loadFault();
  }, [id]);

  const loadFault = async () => {
    try {
      setLoading(true);
      const reports = await staffService.getCCTVFaultsReports();
      const found = reports.find(r => r.id === id);
      if (found) {
        setFault(found);
      } else {
        toast.error('Fault report not found');
        navigate(basePath);
      }
    } catch (error) {
      console.error('Failed to load fault report:', error);
      toast.error('Failed to load fault report');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <StaffSidebarLayout basePath={basePath}>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      </StaffSidebarLayout>
    );
  }

  if (!fault) {
    return (
      <StaffSidebarLayout basePath={basePath}>
        <div className="text-center py-12">
          <p className="text-gray-500">Fault report not found</p>
        </div>
      </StaffSidebarLayout>
    );
  }

  return (
    <StaffSidebarLayout basePath={basePath}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">CCTV Fault Report</h3>
              <p className="text-sm text-gray-500 mt-1">
                Reference: {fault.referenceId || fault.id.slice(0, 12)}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`${basePath}/forms/cctv-faults?edit=${id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit / Complete
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Status Banner */}
          {fault.status === 'completed' ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-700">Fault Resolved</p>
                <p className="text-sm text-green-600">
                  Camera <span className="font-bold">{fault.camera || 'N/A'}</span> — {fault.scheme || 'N/A'}
                  {fault.completedBy?.name && (
                    <span className="ml-1">· Completed by <span className="font-bold">{fault.completedBy.name}</span></span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
              <Radio className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
              <div>
                <p className="font-semibold text-red-700">Camera Fault — Live</p>
                <p className="text-sm text-red-500">
                  Camera <span className="font-bold">{fault.camera || 'N/A'}</span> — {fault.scheme || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Client Acknowledgment + Note Thread */}
          {fault.clientAcknowledged ? (
            <div className="bg-teal-50 border border-teal-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setNotesOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-500 shrink-0" />
                  <p className="font-semibold text-teal-700 text-sm">Client Acknowledged</p>
                  {(() => {
                    const count = fault.clientNotes?.length || (fault.clientNote ? 1 : 0);
                    return count > 0 ? (
                      <span className="text-xs text-teal-500 bg-teal-100 px-2 py-0.5 rounded-full">
                        {count} {count === 1 ? 'note' : 'notes'}
                      </span>
                    ) : null;
                  })()}
                </div>
                {notesOpen
                  ? <ChevronUp className="w-4 h-4 text-teal-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-teal-400 shrink-0" />}
              </button>
              {notesOpen && (
                <div className="px-4 pb-4 border-t border-teal-100">
                  <NoteThread notes={fault.clientNotes} legacyNote={fault.clientNote} />
                  {!fault.clientNotes?.length && !fault.clientNote && (
                    <p className="text-xs text-teal-400 pt-3">No notes added.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-lg">
              <Eye className="w-5 h-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-500">Client has not yet acknowledged this fault.</p>
            </div>
          )}

          {/* Details Grid */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Report Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <label className="text-sm font-semibold text-gray-500">Date</label>
                  <p className="text-gray-800 mt-0.5">{fault.date || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <label className="text-sm font-semibold text-gray-500">Time</label>
                  <p className="text-gray-800 mt-0.5">{fault.time || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <label className="text-sm font-semibold text-gray-500">Camera</label>
                  <p className="text-gray-800 mt-0.5">{fault.camera || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <label className="text-sm font-semibold text-gray-500">Reported By</label>
                  <p className="text-gray-800 mt-0.5">
                    {fault.submittedBy?.name || fault.fullName || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fault Description */}
          {fault.comments && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Fault Description
              </h4>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                {fault.comments}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <label className="font-semibold">Submitted:</label>{' '}
                {formatDateTime(fault.createdAt)}
              </div>
              {fault.updatedAt && (
                <div>
                  <label className="font-semibold">Last Updated:</label>{' '}
                  {formatDateTime(fault.updatedAt)}
                </div>
              )}
              {fault.completedAt && (
                <div>
                  <label className="font-semibold">Completed:</label>{' '}
                  {formatDateTime(fault.completedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVFaultsView;
