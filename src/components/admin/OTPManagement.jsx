import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { otpService } from "../../services/otpService";
import { useAuth } from "../../hooks/useAuth";
import { SCHEMES } from "../../utils/schemes";
import { Copy, Plus, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const OTPManagement = () => {
  const { userProfile } = useAuth();
  const [otps, setOtps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    schemeId: "",
    schemeName: "",
  });

  useEffect(() => {
    loadOTPs();
  }, []);

  const loadOTPs = async () => {
    setLoading(true);
    try {
      const allOTPs = await otpService.getAllOTPs();
      setOtps(allOTPs);
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Failed to load OTP codes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOTP = async (e) => {
    e.preventDefault();

    if (!formData.schemeId || !formData.schemeName) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const otpCode = await otpService.createOTP(
        formData.schemeId.toUpperCase(),
        formData.schemeName,
        userProfile.uid
      );

      toast.success(`OTP created: ${otpCode}`);
      setFormData({ schemeId: "", schemeName: "" });
      setShowCreateModal(false);
      loadOTPs();
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Failed to create OTP code");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Client Access Codes
          </h2>
          <p className="text-gray-600 mt-1">
            Generate and manage OTP codes for client registration
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadOTPs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate New Code
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Total Codes</p>
          <p className="text-2xl font-bold text-gray-800">{otps.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Available</p>
          <p className="text-2xl font-bold text-green-600">
            {otps.filter((otp) => !otp.isUsed).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Used</p>
          <p className="text-2xl font-bold text-gray-400">
            {otps.filter((otp) => otp.isUsed).length}
          </p>
        </div>
      </div>

      {/* OTP Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OTP Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Used At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {otps.map((otp) => (
                <tr key={otp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {otp.otpCode}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {otp.schemeId}
                      </p>
                      <p className="text-xs text-gray-500">{otp.schemeName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {otp.isUsed ? (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <XCircle className="w-4 h-4" />
                        Used
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Available
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(otp.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {otp.usedAt ? formatDate(otp.usedAt) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => copyToClipboard(otp.otpCode)}
                      className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {otps.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No OTP codes generated yet</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h5 className="text-xl font-bold text-gray-800 mb-4">
              Generate New Access Code
            </h5>
            <form onSubmit={handleCreateOTP} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    Select Scheme
                  </span>
                </label>
                <select
                  value={formData.schemeId}
                  onChange={(e) => {
                    const selectedScheme = SCHEMES.find(
                      (s) => s.id === e.target.value
                    );
                    setFormData({
                      schemeId: selectedScheme.id,
                      schemeName: selectedScheme.fullName,
                    });
                  }}
                  className="select select-md mt-2 w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                  required
                >
                  <option value="">Please Select a Scheme</option>
                  {SCHEMES.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.fullName}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-gray-500">
                    {formData.schemeId &&
                      `Code will be generated for: ${formData.schemeId}`}
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                >
                  {loading ? "Generating..." : "Generate Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OTPManagement;
