import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';

const CCTVCheckFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    date: '',
    time: '',

    // A417 Section
    a417Cameras: [],
    a417Comments: '',

    // A1 Birtley to Coalhouse Section
    birtleyToCoalhouse: [],
    birtleyComments: '',

    // A11/A47 Kier/Core Section
    kierCore: [],
    kierCoreComments: '',

    // Gallows Corner Section
    gallowsCorner: [],
    gallowsCornerComments: '',

    // M3 Jct 9 Section
    m3Jct9: [],
    m3Jct9Comments: ''
  });

  // Camera options for each section
  const cameraOptions = {
    a417: [
      'ALL WORKING CORRECT', 'CCTV 1', 'CCTV 2', 'CCTV 3', 'CCTV 4', 'CCTV 5', 'CCTV 6',
      'CCTV 7', 'CCTV 8', 'CCTV 9', 'CCTV 10', 'CCTV 11', 'CCTV 12', 'CCTV 13', 'CCTV 14',
      'CCTV 21', 'CCTV 22', 'CCTV 23', 'CCTV 24', 'CCTV 25', 'CCTV 26', 'CCTV 27', 'CCTV 28',
      'CCTV 29', 'CCTV 30', 'CCTV 31', 'CCTV 32'
    ],
    birtley: [
      'ALL WORKING CORRECT', 'CCTV 1', 'CCTV 2', 'CCTV 3'
    ],
    kierCore: [
      'ALL WORKING CORRECT', '1100', '1101', '1102', '1103', '1104', '1105', '1106', '1107',
      '1108', '1109', '1110', '1111'
    ],
    gallows: [
      'ALL WORKING CORRECT', 'T1-CCTV 1', 'T1-CCTV 2', 'T1-CCTV 3', 'T1-CCTV 4',
      'T2-CCTV 1', 'T2-CCTV 2', 'T2-CCTV 3', 'T2-CCTV 4'
    ],
    m3: [
      'ALL WORKING CORRECT', 'CCTV 1', 'CCTV 2', 'CCTV 3', 'CCTV 4', 'CCTV 5', 'CCTV 6',
      'CCTV 7', 'CCTV 8', 'CCTV 9', 'CCTV 10', 'CCTV 11', 'CCTV 12', 'CCTV 13', 'CCTV 14',
      'CCTV 15', 'CCTV 16', 'CCTV 17', 'CCTV 18', 'CCTV 19', 'CCTV20', 'CCTV 21', 'CCTV 22',
      'CCTV 23', 'CCTV 24', 'CCTV 25', 'CCTV 26', 'CCTV 27', 'CCTV 28', '3301', '3302',
      '3303', '3304', '3305', '3306', '3401', '3402', '3403', '3404', '3407', '3408', '3409', '3410'
    ]
  };

  const handleCheckboxChange = (section, value) => {
    setFormData(prev => {
      const currentValues = prev[section];

      if (value === 'ALL WORKING CORRECT') {
        // If "All Working" is selected, clear all others
        return { ...prev, [section]: currentValues.includes(value) ? [] : [value] };
      } else {
        // Remove "All Working" if individual camera is selected
        const filtered = currentValues.filter(v => v !== 'ALL WORKING CORRECT');

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

    if (!formData.firstName || !formData.lastName || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      await staffService.submitCCTVCheckForm(
        formData,
        userProfile.uid,
        userProfile.displayName
      );

      toast.success('CCTV Check Form submitted successfully!');
      navigate('/dashboard/staff/forms');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckboxSection = (title, section, options) => (
    <div className="mb-8">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {title} <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={formData[section].includes(option)}
              onChange={() => handleCheckboxChange(section, option)}
              className="checkbox checkbox-sm checkbox-primary"
            />
            <span className="text-sm text-gray-700 group-hover:text-teal-600">
              {option}
            </span>
          </label>
        ))}
      </div>

      {/* Comments */}
      <div className="mt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Comments {title.split(' ')[0]}
        </label>
        <textarea
          value={formData[`${section}Comments`]}
          onChange={(e) => setFormData({ ...formData, [`${section}Comments`]: e.target.value })}
          placeholder="Please list actions taken e.g informed p&d of faults along with type of fault"
          rows={3}
          className="textarea textarea-bordered w-full"
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
          <h1 className="text-2xl font-bold text-gray-800">CCTV Check Form</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">First Name <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold">Last Name <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input input-bordered w-full"
                required
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Date <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold">Time <span className="text-red-500">*</span></span>
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="input input-bordered w-full"
                required
              />
            </div>
          </div>

          <div className="divider"></div>

          {/* Camera Sections */}
          {renderCheckboxSection(
            'A417 (only tick cameras that are not working correctly)',
            'a417Cameras',
            cameraOptions.a417
          )}

          {renderCheckboxSection(
            'A1 Birtley to Coalhouse (only tick cameras that are not working correctly)',
            'birtleyToCoalhouse',
            cameraOptions.birtley
          )}

          {renderCheckboxSection(
            'A11/A47 Kier/Core (only tick cameras that are not working correctly)',
            'kierCore',
            cameraOptions.kierCore
          )}

          {renderCheckboxSection(
            'Gallows Corner (only tick cameras that are not working correctly)',
            'gallowsCorner',
            cameraOptions.gallows
          )}

          {renderCheckboxSection(
            'M3 Jct 9 (only tick cameras that are not working correctly)',
            'm3Jct9',
            cameraOptions.m3
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Save
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </StaffSidebarLayout>
  );
};

export default CCTVCheckFormPage;
