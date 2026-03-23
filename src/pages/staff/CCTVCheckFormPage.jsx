import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';
import { isDemoUser } from '../../utils/schemes';

import chellanlogo from "../../assets/chellanpng.png"

const CCTVCheckFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);

  // Helper function to format date as DD/MM/YYYY
  const formatDateToBritish = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isDemo = isDemoUser(userProfile);

  const [formData, setFormData] = useState({
    firstName: userProfile?.displayName || '', // Auto-fill full name
    date: formatDateToBritish(new Date()), // Auto-fill current date in DD/MM/YYYY
    time: new Date().toTimeString().slice(0, 5), // Auto-fill current time

    // A417 Section
    a417Cameras: [],
    a417Comments: '',

    // A11/A47 Kier/Core Section
    kierCore: [],
    kierCoreComments: '',

    // M3 Jct 9 Section
    m3Jct9: [],
    m3Jct9Comments: '',

    A452: [],
    A452Comments: '',


    // Demo Section
    demoCameras: [],
    demoComments: ''
  });

  // Camera options for each section
  const cameraOptions = {
    a417: [
      'All Working Correctly', 'CCTV 1', 'CCTV 2', 'CCTV 3', 'CCTV 4', 'CCTV 5', 'CCTV 6',
      'CCTV 7', 'CCTV 8', 'CCTV 9', 'CCTV 10', 'CCTV 11', 'CCTV 12', 'CCTV 13', 'CCTV 14',
      'CCTV 21', 'CCTV 22', 'CCTV 23', 'CCTV 24', 'CCTV 25', 'CCTV 26', 'CCTV 27', 'CCTV 28',
      'CCTV 29', 'CCTV 30', 'CCTV 31', 'CCTV 32', 'CCTV 33', 'CCTV 34','CCTV 35'
    ],
    kierCore: [
      'All Working Correctly', '1100','1101', '1102', '1103', '1104', '1105', '1106', '1107',
      '1108', '1109', '1110', '1111', '1112', '1114', '4701', '4702', '4703', '4704',
      '4705', '4706', '4707', '4708', '4709', '4711', '4712', '4713', '4714', '4715',
      '4716', '4717', '4718', '4719'
    ],
    m3: [
      'All Working Correctly', 'CCTV 1', 'CCTV 2', 'CCTV 3', 'CCTV 4', 'CCTV 5', 'CCTV 6',
      'CCTV 7', 'CCTV 8', 'CCTV 9', 'CCTV 10', 'CCTV 11', 'CCTV 12', 'CCTV 13', 'CCTV 14',
      'CCTV 15', 'CCTV 16', 'CCTV 17', 'CCTV 18', 'CCTV 19', 'CCTV 20', 'CCTV 21', 'CCTV 22',
      'CCTV 23', 'CCTV 24', 'CCTV 25', 'CCTV 26', 'CCTV 27', 'CCTV 28', 'CCTV 29', 'CCTV 30',
      '3301', '3302', '3303', '3304', '3305', '3306', '3401', '3402', '3403', '3404', '3407',
      '3408', '3409', '3410'
    ],
    A452: [
      'All Working Correctly', 'CAM 15', 'CAM 16', 'CAM 17', 'CAM 18', 'CAM 19', 'CAM 20',
      'CAM 21'
    ],
    demo: [
      'All Working Correctly', 'DEMO-CAM-1', 'DEMO-CAM-2', 'DEMO-CAM-3', 'DEMO-CAM-4',
      'DEMO-CAM-5', 'DEMO-CAM-6', 'DEMO-CAM-7', 'DEMO-CAM-8'
    ]
  };

  useEffect(() => {
    if (editId) {
      loadFormData();
    }
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      // Pass null to get all forms, not just current user's
      const forms = await staffService.getCCTVCheckForms(null);
      const form = forms.find(f => f.id === editId);

      if (form) {
        setFormData({
          firstName: form.firstName ? (form.lastName ? `${form.firstName} ${form.lastName}` : form.firstName) : '',
          date: form.date || '',
          time: form.time || '',
          a417Cameras: form.a417Cameras || [],
          a417Comments: form.a417Comments || '',
          kierCore: form.kierCore || [],
          kierCoreComments: form.kierCoreComments || '',
          m3Jct9: form.m3Jct9 || [],
          m3Jct9Comments: form.m3Jct9Comments || '',
          A452: form.A452 || [],
          A452Comments: form.A452Comments || '',
          demoCameras: form.demoCameras || [],
          demoComments: form.demoComments || '',
        });
      } else {
        toast.error('Form not found');
        navigate('/dashboard/staff');
      }
    } catch (error) {
      console.error('Failed to load form:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (section, value) => {
    setFormData(prev => {
      const currentValues = prev[section];

      if (value === 'All Working Correctly') {
        // If "All Working Correctly" is selected, clear all others
        return { ...prev, [section]: currentValues.includes(value) ? [] : [value] };
      } else {
        // Remove "All Working Correctly" if individual camera is selected
        const filtered = currentValues.filter(v => v !== 'All Working Correctly');

        if (currentValues.includes(value)) {
          return { ...prev, [section]: filtered.filter(v => v !== value) };
        } else {
          return { ...prev, [section]: [...filtered, value] };
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Debug: Log what we're submitting
    console.log('Submitting CCTV form with data:', formData);

    setLoading(true);

    try {
      const trimmedData = {
        ...formData,
        firstName: formData.firstName.trim(),
        a417Comments: formData.a417Comments.trim(),
        kierCoreComments: formData.kierCoreComments.trim(),
        m3Jct9Comments: formData.m3Jct9Comments.trim(),
        A452Comments: formData.A452Comments.trim(),
        demoComments: formData.demoComments.trim(),
      };

      if (editId) {
        // Update existing form
        await staffService.updateCCTVCheckForm(
          editId,
          trimmedData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success('CCTV Check Form updated successfully!');
        navigate('/dashboard/staff');
      } else {
        // Submit new form
        await staffService.submitCCTVCheckForm(
          trimmedData,
          userProfile.uid,
          userProfile.displayName
        );
        toast.success('CCTV Check Form submitted successfully!');

        // Reset form with fresh auto-filled values
        setFormData({
          firstName: userProfile?.displayName || '',
          date: formatDateToBritish(new Date()),
          time: new Date().toTimeString().slice(0, 5),
          a417Cameras: [],
          a417Comments: '',
          kierCore: [],
          kierCoreComments: '',
          m3Jct9: [],
          m3Jct9Comments: '',
          A452: [],
          A452Comments: '',
          demoCameras: [],
          demoComments: ''
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckboxSection = (title, cameraSection, commentSection, options) => (
    <div className="mb-8">
      <label className="block text-sm font-semibold text-gray-700 mb-4">
        {title} <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={formData[cameraSection].includes(option)}
              onChange={() => handleCheckboxChange(cameraSection, option)}
              className="checkbox checkbox-sm checkbox-neutral"
            />
            <span className="text-sm text-gray-700">
              {option}
            </span>
          </label>
        ))}
      </div>

      {/* Comments */}
      <div className="mt-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Comments for {title.split(' ')[0]}
        </label>
        <textarea
          value={formData[commentSection]}
          onChange={(e) => setFormData({ ...formData, [commentSection]: e.target.value })}
          placeholder="Please list actions taken e.g informed p&d of faults along with type of fault"
          rows={3}
          className="textarea w-full textarea-accent bg-white border-gray-300 rounded-lg hover:bg-gray-100"
          maxLength={2000}
        />
      </div>
    </div>
  );

  return (
    <StaffSidebarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h3 className="text-2xl font-bold text-gray-800">{editId ? 'Edit CCTV Check Form' : 'CCTV Check Form'}</h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 ">
          {/* Scheme Selector */}

          <div className="flex justify-center items-center space-x-2 mb-8">
            <img src={chellanlogo} alt="MyApp Logo" className="h-25 w-auto" />
          </div>

          {/* Name, Date, and Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">Full Name <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input input-accent w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">Date (DD/MM/YYYY) <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                placeholder="DD/MM/YYYY"
                pattern="\d{2}/\d{2}/\d{4}"
                className="input input-accent bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold mb-2">Time <span className="text-red-500">*</span></span>
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="input input-accent bg-white border-gray-300 rounded-lg hover:bg-gray-100 w-full"
                required
              />
            </div>
          </div>

          <div className="divider before:h-px after:h-px  before:bg-gray-500 after:bg-gray-500 text-gray-500"></div>

          {/* Camera Sections - Show demo section for demo users, regular sections for regular staff */}
          {isDemo ? (
            <>
              {renderCheckboxSection(
                'DMO1 Demo Scheme (only tick cameras that are not working correctly)',
                'demoCameras',
                'demoComments',
                cameraOptions.demo
              )}
            </>
          ) : (
            <>
              {renderCheckboxSection(
                'A417 (only tick cameras that are not working correctly)',
                'a417Cameras',
                'a417Comments',
                cameraOptions.a417
              )}

              {renderCheckboxSection(
                'A11/A47 Kier/Core (only tick cameras that are not working correctly)',
                'kierCore',
                'kierCoreComments',
                cameraOptions.kierCore
              )}

              {renderCheckboxSection(
                'M3 Jct 9 (only tick cameras that are not working correctly)',
                'm3Jct9',
                'm3Jct9Comments',
                cameraOptions.m3
                )}
                
                {renderCheckboxSection(
                  'A452 HS2 (only tick cameras that are not working correctly)',
                  'A452',
                  'A452Comments',
                  cameraOptions.A452
                )}
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-300">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading ? (editId ? 'Updating...' : 'Submitting...') : (editId ? 'Update' : 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVCheckFormPage;
