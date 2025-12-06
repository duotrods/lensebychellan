import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';

const CCTVCheckView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      setLoading(true);
      // Pass null to get all forms, not just current user's
      const forms = await staffService.getCCTVCheckForms(null);
      const foundForm = forms.find(f => f.id === id);

      if (foundForm) {
        setForm(foundForm);
      } else {
        toast.error('Form not found');
        navigate('/dashboard/staff');
      }
    } catch (error) {
      console.error('Failed to load form:', error);
      toast.error('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/dashboard/staff/forms/cctv-check?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this CCTV Check Form? This action cannot be undone.`)) {
      return;
    }

    try {
      await staffService.deleteCCTVCheckForm(id, userProfile.uid, userProfile.displayName);
      toast.success('CCTV Check Form deleted successfully');
      navigate('/dashboard/staff');
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Failed to delete form');
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCameraSection = (title, cameras, comments) => {
    if (!cameras || cameras.length === 0) return null;

    const isAllWorking = cameras.includes('ALL WORKING CORRECT');

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
          {title}
        </h4>
        <div className="mb-3">
          {isAllWorking ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">All Working Correct</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">Issues Reported:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cameras.map((camera, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {camera}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {comments && (
          <div className="mt-3">
            <label className="text-sm font-semibold text-gray-600">Comments:</label>
            <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1 whitespace-pre-wrap">
              {comments}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <StaffSidebarLayout>
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-teal-500"></span>
        </div>
      </StaffSidebarLayout>
    );
  }

  if (!form) {
    return (
      <StaffSidebarLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Form not found</p>
        </div>
      </StaffSidebarLayout>
    );
  }

  return (
    <StaffSidebarLayout>
      <div className="max-w-5xl mx-auto">
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
              <h3 className="text-2xl font-bold text-gray-800">
                CCTV Check Form Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Reference: {form.referenceId || form.id.slice(0, 12)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Submitted By</label>
                <p className="text-gray-800">
                  {form.submittedBy?.name || `${form.firstName || ''} ${form.lastName || ''}`.trim() || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Date</label>
                <p className="text-gray-800">{form.date || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Time</label>
                <p className="text-gray-800">{form.time || 'N/A'}</p>
              </div>
              {form.lastEditedBy && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Last Edited By</label>
                  <p className="text-blue-600">{form.lastEditedBy.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Camera Sections */}
          <div className="space-y-6">
            {renderCameraSection('A417', form.a417Cameras, form.a417Comments)}
            {renderCameraSection('A1 Birtley to Coalhouse', form.birtleyToCoalhouse, form.birtleyComments)}
            {renderCameraSection('A11/A47 Kier/Core', form.kierCore, form.kierCoreComments)}
            {renderCameraSection('Gallows Corner', form.gallowsCorner, form.gallowsCornerComments)}
            {renderCameraSection('M3 Jct 9', form.m3Jct9, form.m3Jct9Comments)}
          </div>

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <label className="font-semibold">Created:</label> {formatDateTime(form.createdAt)}
              </div>
              {form.updatedAt && (
                <div>
                  <label className="font-semibold">Last Updated:</label> {formatDateTime(form.updatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVCheckView;
