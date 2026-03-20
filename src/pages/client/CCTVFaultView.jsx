import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Camera, Calendar, Clock, User, MessageSquare, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { clientDataService } from '../../services/clientDataService';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import ClientSidebarLayout from '../../components/layout/ClientSidebarLayout';
import CCTVOperatorSidebarLayout from '../../components/layout/CCTVOperatorSidebarLayout';

const CCTVFaultView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, userProfile } = useAuth();
  const Layout = role === USER_ROLES.CCTVOPERATOR ? CCTVOperatorSidebarLayout : ClientSidebarLayout;
  const [fault, setFault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    loadFault();
  }, [id]);

  const loadFault = async () => {
    try {
      setLoading(true);
      const data = await clientDataService.getCCTVFaultById(id);
      if (data) {
        // For clients, verify the fault belongs to their active scheme
        if (role === USER_ROLES.CLIENT) {
          const activeScheme = userProfile?.activeSchemeId;
          const faultSchemes = data.schemeIds || [];
          if (activeScheme && !faultSchemes.includes(activeScheme)) {
            navigate(-1);
            return;
          }
        }
        setFault(data);
      } else {
        toast.error('Fault report not found');
        navigate(-1);
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
      <Layout>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-brand-500"></span>
        </div>
      </Layout>
    );
  }

  if (!fault) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Fault report not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              CCTV Fault Report
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Reference: {fault.referenceId || fault.id.slice(0, 12)}
            </p>
          </div>
        </div>

        {/* Fault Details Card */}
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
              <Camera className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-700">Camera Fault — Live</p>
                <p className="text-sm text-red-500">
                  Camera <span className="font-bold">{fault.camera || 'N/A'}</span> — {fault.scheme || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Client Acknowledgment */}
          {fault.clientAcknowledged && (
            <div className="bg-teal-50 border border-teal-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setNotesOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                  <p className="font-semibold text-teal-700 text-sm">Acknowledged</p>
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

              {notesOpen && (() => {
                const notesList = fault.clientNotes?.length
                  ? fault.clientNotes
                  : fault.clientNote
                  ? [{ text: fault.clientNote, addedAt: null }]
                  : [];
                return notesList.length > 0 ? (
                  <div className="px-4 pb-4 space-y-1 border-t border-teal-100 pt-3">
                    {notesList.map((note, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-teal-600 flex-1">{note.text}</span>
                        {note.addedAt && (
                          <span className="text-xs text-teal-400 shrink-0 mt-0.5">
                            {new Date(note.addedAt).toLocaleDateString('en-GB')} {new Date(note.addedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 pb-4 text-xs text-teal-400">No notes added.</p>
                );
              })()}
            </div>
          )}

          {/* Details Grid */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Report Details
            </h4>
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

              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <label className="text-sm font-semibold text-gray-500">Scheme</label>
                  <p className="text-gray-800 mt-0.5">{fault.scheme || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CCTVFaultView;
