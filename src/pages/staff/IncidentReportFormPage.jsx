import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../hooks/useAuth';
import { staffService } from '../../services/staffService';
import { storage } from '../../config/firebase';
import StaffSidebarLayout from '../../components/layout/StaffSidebarLayout';

const IncidentReportFormPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState([]);

  const [formData, setFormData] = useState({
    scheme: '',
    section: '',
    date: '',
    firstName: '',
    lastName: '',
    weatherConditions: '',
    nhLog: '',
    collarNumber: '',
    incursion: 'NO',
    reportedBy: '',
    cameraNumber: '',
    trafficConditions: '',
    markerPost: '',
    track: '',
    incidentType: '',
    affectedLanes: [],
    emergencyServices: [],
    recoveryRequested: { light: 0, heavy: 0, ipv: 0, hetos: 0 },
    timeSpottedToOn: '',
    timeOnsiteToCleared: '',
    closedLogCollar: '',
    fault: '',
    vehicles: [{ type: '', make: '', model: '', vin: '' }],
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const handleRecoveryChange = (type, count) => {
    setFormData(prev => ({
      ...prev,
      recoveryRequested: { ...prev.recoveryRequested, [type]: parseInt(count) || 0 }
    }));
  };

  const handleVehicleChange = (index, field, value) => {
    const updated = [...formData.vehicles];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, vehicles: updated }));
  };

  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { type: '', make: '', model: '', vin: '' }]
    }));
  };

  const removeVehicle = (index) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [];

    setUploadingFiles(true);
    const uploadPromises = files.map(async (file) => {
      const fileName = `incident-reports/${userProfile.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      return {
        fileName: file.name,
        fileUrl: fileName,
        downloadUrl: downloadURL,
        fileSize: file.size,
        fileType: file.type
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    setUploadingFiles(false);
    return uploadedFiles;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.scheme || !formData.date || !formData.firstName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Upload files first
      const uploadedFiles = await uploadFiles();

      // Submit form with file URLs
      await staffService.submitIncidentReport(
        {
          ...formData,
          files: uploadedFiles
        },
        userProfile.uid,
        userProfile.displayName
      );

      toast.success('Incident Report submitted successfully!');
      navigate('/dashboard/staff/forms');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-800">Incident Report Log</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {/* Scheme and Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Scheme <span className="text-red-500">*</span></span>
              </label>
              <select
                name="scheme"
                value={formData.scheme}
                onChange={handleChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="A417">A417</option>
                <option value="M3 Jct 9">M3 Jct 9</option>
                <option value="A1 Birtley">A1 Birtley</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Section <span className="text-red-500">*</span></span>
              </label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
              </select>
            </div>
          </div>

          {/* Date and Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Date <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">First Name <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
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
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>
          </div>

          {/* Weather and NH Log */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Weather Conditions <span className="text-red-500">*</span></span>
              </label>
              <select
                name="weatherConditions"
                value={formData.weatherConditions}
                onChange={handleChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">Please Select</option>
                <option value="Clear">Clear</option>
                <option value="Rain">Rain</option>
                <option value="Fog">Fog</option>
                <option value="Snow">Snow</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text font-semibold">NH Log <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  name="nhLog"
                  placeholder="National Highways Log"
                  value={formData.nhLog}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-semibold">Collar Number <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  name="collarNumber"
                  value={formData.collarNumber}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>

          {/* Incursion */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Incursion? <span className="text-red-500">*</span></span>
            </label>
            <div className="flex gap-6">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  name="incursion"
                  value="YES"
                  checked={formData.incursion === 'YES'}
                  onChange={handleChange}
                  className="radio radio-primary"
                />
                <span>YES</span>
              </label>
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  name="incursion"
                  value="NO"
                  checked={formData.incursion === 'NO'}
                  onChange={handleChange}
                  className="radio radio-primary"
                />
                <span>NO</span>
              </label>
            </div>
          </div>

          {/* Camera, Traffic, etc */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Reported By <span className="text-red-500">*</span></span>
              </label>
              <select
                name="reportedBy"
                value={formData.reportedBy}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="">Please Select</option>
                <option value="CCTV Operator">CCTV Operator</option>
                <option value="Traffic Officer">Traffic Officer</option>
                <option value="Public">Public</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Camera Number <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="cameraNumber"
                placeholder="e.g., 23"
                value={formData.cameraNumber}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Traffic Conditions <span className="text-red-500">*</span></span>
              </label>
              <select
                name="trafficConditions"
                value={formData.trafficConditions}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="">Please Select</option>
                <option value="Free Flow">Free Flow</option>
                <option value="Slow">Slow</option>
                <option value="Heavy">Heavy</option>
                <option value="Stationary">Stationary</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Track <span className="text-red-500">*</span></span>
              </label>
              <select
                name="track"
                value={formData.track}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="">Please Select</option>
                <option value="Northbound">Northbound</option>
                <option value="Southbound">Southbound</option>
                <option value="Eastbound">Eastbound</option>
                <option value="Westbound">Westbound</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Marker Post <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="markerPost"
                placeholder="e.g., 2.3"
                value={formData.markerPost}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Incident Type <span className="text-red-500">*</span></span>
              </label>
              <select
                name="incidentType"
                value={formData.incidentType}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="">Please Select</option>
                <option value="Breakdown">Breakdown</option>
                <option value="Collision">Collision</option>
                <option value="Debris">Debris</option>
                <option value="Animal">Animal</option>
              </select>
            </div>
          </div>

          {/* Affected Lanes */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Affected Lanes <span className="text-red-500">*</span></span>
            </label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {['HS', 'Lane 1', 'Lane 2', 'Lane 3', 'Lane 4', 'Works', 'Verge', 'Central Res'].map(lane => (
                <label key={lane} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.affectedLanes.includes(lane)}
                    onChange={() => handleCheckbox('affectedLanes', lane)}
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                  <span className="text-sm">{lane}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Emergency Services */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Emergency Services <span className="text-red-500">*</span></span>
            </label>
            <div className="flex gap-6">
              {['N/A', 'Police', 'Ambulance', 'Fire', "HETO'S"].map(service => (
                <label key={service} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emergencyServices.includes(service)}
                    onChange={() => handleCheckbox('emergencyServices', service)}
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Recovery Requested Matrix */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Recovery Requested <span className="text-red-500">*</span></span>
            </label>
            <div className="overflow-x-auto">
              <table className="table table-bordered w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center">LIGHT</th>
                    <th className="text-center">HEAVY</th>
                    <th className="text-center">IPV</th>
                    <th className="text-center">HETOS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {['light', 'heavy', 'ipv', 'hetos'].map(type => (
                      <td key={type}>
                        <div className="flex justify-center gap-2">
                          {[0, 1, 2, 3].map(num => (
                            <label key={num} className="cursor-pointer">
                              <input
                                type="radio"
                                name={`recovery_${type}`}
                                checked={formData.recoveryRequested[type] === num}
                                onChange={() => handleRecoveryChange(type, num)}
                                className="radio radio-sm"
                              />
                              <span className="ml-1 text-sm">{num}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Time Spotted to Time On Site <span className="text-red-500">*</span></span>
                <span className="label-text-alt">HH : MM</span>
              </label>
              <input
                type="text"
                name="timeSpottedToOn"
                placeholder="HH:MM"
                value={formData.timeSpottedToOn}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Time Onsite to Time Cleared <span className="text-red-500">*</span></span>
                <span className="label-text-alt">HH : MM</span>
              </label>
              <input
                type="text"
                name="timeOnsiteToCleared"
                placeholder="HH:MM"
                value={formData.timeOnsiteToCleared}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Closed Log and Fault */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Closed Log Collar Number <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="closedLogCollar"
                placeholder="e.g., 23"
                value={formData.closedLogCollar}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Fault <span className="text-red-500">*</span></span>
              </label>
              <select
                name="fault"
                value={formData.fault}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="">Please Select</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Puncture">Puncture</option>
                <option value="Out of Fuel">Out of Fuel</option>
                <option value="Collision">Collision</option>
              </select>
            </div>
          </div>

          {/* Vehicles Involved */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Vehicles Involved <span className="text-red-500">*</span></span>
            </label>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="table table-bordered w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th>Type</th>
                      <th>Make</th>
                      <th>Model</th>
                      <th>VIN</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.vehicles.map((vehicle, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={vehicle.type}
                            onChange={(e) => handleVehicleChange(index, 'type', e.target.value)}
                            className="select select-sm select-bordered w-full"
                          >
                            <option value="">Vehicle {index + 1}</option>
                            <option value="Car">Car</option>
                            <option value="Van">Van</option>
                            <option value="Truck">Truck</option>
                            <option value="Motorcycle">Motorcycle</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={vehicle.make}
                            onChange={(e) => handleVehicleChange(index, 'make', e.target.value)}
                            className="input input-sm input-bordered w-full"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={vehicle.model}
                            onChange={(e) => handleVehicleChange(index, 'model', e.target.value)}
                            className="input input-sm input-bordered w-full"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={vehicle.vin}
                            onChange={(e) => handleVehicleChange(index, 'vin', e.target.value)}
                            className="input input-sm input-bordered w-full"
                          />
                        </td>
                        <td>
                          {formData.vehicles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVehicle(index)}
                              className="btn btn-sm btn-ghost text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addVehicle}
                className="btn btn-sm btn-outline"
              >
                + Add Vehicle
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Description of Incident <span className="text-red-500">*</span></span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="textarea textarea-bordered w-full"
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">File Upload</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept="image/*,video/*,.pdf"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-teal-600 font-semibold mb-1">Browse Files</p>
                <p className="text-gray-500 text-sm">Drag and drop files here</p>
              </label>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
              disabled={loading || uploadingFiles}
              className="px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {loading ? 'Submitting...' : uploadingFiles ? 'Uploading Files...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </StaffSidebarLayout>
  );
};

export default IncidentReportFormPage;
