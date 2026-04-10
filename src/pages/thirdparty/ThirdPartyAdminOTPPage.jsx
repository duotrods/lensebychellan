import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { otpService } from '../../services/otpService';
import { USER_ROLES, ROLE_LABELS } from '../../utils/constants';
import ThirdPartyAdminSidebarLayout from '../../components/layout/ThirdPartyAdminSidebarLayout';
import { KeyRound, Plus, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TP_CODE_ROLES = [
  { role: USER_ROLES.THIRDPARTYOPERATOR, label: 'Operator', create: (sid, sn, uid) => otpService.createThirdPartyOperatorCode(sid, sn, uid) },
  { role: USER_ROLES.THIRDPARTYCLIENT, label: 'Client', create: (sid, sn, uid) => otpService.createThirdPartyClientCode(sid, sn, uid) },
  { role: USER_ROLES.THIRDPARTYLIVEOPERATOR, label: 'Live Operator', create: (sid, sn, uid) => otpService.createThirdPartyLiveOperatorCode(sid, sn, uid) },
  { role: USER_ROLES.THIRDPARTYCCTVOPERATOR, label: 'CCTV Operator', create: (sid, sn, uid) => otpService.createThirdPartyCCTVOperatorCode(sid, sn, uid) },
];

const ThirdPartyAdminOTPPage = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState(USER_ROLES.THIRDPARTYOPERATOR);
  const [generating, setGenerating] = useState(false);
  const [lastCode, setLastCode] = useState(null);

  const schemeId = userProfile?.activeSchemeId || userProfile?.schemeId;
  const schemeName = userProfile?.schemeNames?.[schemeId] || userProfile?.schemeName || schemeId;

  const handleGenerate = async () => {
    const tabConfig = TP_CODE_ROLES.find(r => r.role === activeTab);
    if (!tabConfig || !schemeId) return;
    setGenerating(true);
    try {
      const code = await tabConfig.create(schemeId, schemeName, userProfile.uid);
      setLastCode(code);
      toast.success('Access code generated');
    } catch (err) {
      toast.error(err.message || 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <ThirdPartyAdminSidebarLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-teal-500" />
            Access Codes
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Generate invite codes for your team members. Each code is single-use and expires in 30 days.
          </p>
        </div>

        {/* Role tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {TP_CODE_ROLES.map(({ role, label }) => (
            <button
              key={role}
              onClick={() => { setActiveTab(role); setLastCode(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === role
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-4">
            Generating a code for <span className="font-medium">{ROLE_LABELS[activeTab]}</span> on scheme{' '}
            <span className="font-medium text-teal-600">{schemeName}</span>.
          </p>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate Code
          </button>

          {lastCode && (
            <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-xs text-teal-700 font-medium mb-2">Your new access code:</p>
              <div className="flex items-center gap-3">
                <code className="text-lg font-mono font-bold text-teal-800">{lastCode}</code>
                <button
                  onClick={() => copyToClipboard(lastCode)}
                  className="flex items-center gap-1 px-3 py-1 bg-teal-500 text-white rounded text-sm hover:bg-teal-600"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <p className="text-xs text-teal-600 mt-2">Share this code with the team member. It expires in 30 days.</p>
            </div>
          )}
        </div>
      </div>
    </ThirdPartyAdminSidebarLayout>
  );
};

export default ThirdPartyAdminOTPPage;
