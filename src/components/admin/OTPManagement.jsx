import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { otpService } from "../../services/otpService";
import { useAuth } from "../../hooks/useAuth";
import { SCHEMES, THIRD_PARTY_SCHEMES } from "../../utils/schemes";
import {
  Copy,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

// 'byCompany: true' = OTP is tied to a company (Staff, LiveOp, CCTVOp)
// 'byCompany: false' = OTP is tied to a scheme (Client only)
const TP_TABS = [
  { key: 'tpoperator',    label: 'Staff',         byCompany: true,  collection: 'thirdPartyOperatorCodes',     create: (company, uid) => otpService.createThirdPartyOperatorCode(company, uid) },
  { key: 'tpclient',      label: 'Client',        byCompany: false, collection: 'thirdPartyClientCodes',       create: (sid, sn, uid) => otpService.createThirdPartyClientCode(sid, sn, uid) },
  { key: 'tpliveoperator', label: 'Live Operator', byCompany: true, collection: 'thirdPartyLiveOperatorCodes', create: (company, uid) => otpService.createThirdPartyLiveOperatorCode(company, uid) },
  { key: 'tpcctvoperator', label: 'CCTV Operator', byCompany: false, collection: 'thirdPartyCCTVOperatorCodes', create: (sid, sn, uid) => otpService.createThirdPartyCCTVOperatorCode(sid, sn, uid) },
];

const OTPManagement = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("client"); // "client", "staff", "cctv", or "thirdparty"
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    schemeId: "",
    schemeName: "",
    expiresInDays: 30,
    maxUses: 1,
  });

  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const [cctvCurrentPage, setCctvCurrentPage] = useState(1);

  // Third Party tab state
  const [tpSubTab, setTpSubTab] = useState('tpoperator');
  const [tpFormData, setTpFormData] = useState({ company: '', schemeId: '', schemeName: '' });
  const [tpLoading, setTpLoading] = useState(false);
  const [tpPage, setTpPage] = useState(0); // 0-based current page index

  const codesPerPage = 10;

  // Cursor for each page, per list: cursorsRef.current[key][i] is the lastDoc
  // needed to fetch page i + 1. cursorsRef.current[key][0] is always null.
  const cursorsRef = useRef({ client: [null], staff: [null], cctv: [null] });
  const tpCursorsRef = useRef({}); // keyed by tpSubTab

  const clientOTPsQuery = useQuery({
    queryKey: ["clientOTPs", clientCurrentPage],
    queryFn: () => {
      const cursor = cursorsRef.current.client[clientCurrentPage - 1] ?? null;
      return otpService.getAllOTPsPaginated(codesPerPage, cursor).catch((err) => {
        console.error("Error loading client OTPs:", err);
        return { otps: [], lastDoc: null, hasMore: false };
      });
    },
  });
  useEffect(() => {
    if (clientOTPsQuery.data?.lastDoc) {
      cursorsRef.current.client[clientCurrentPage] = clientOTPsQuery.data.lastDoc;
    }
  }, [clientOTPsQuery.data, clientCurrentPage]);
  const clientOTPs = clientOTPsQuery.data?.otps ?? [];
  const clientHasMore = clientOTPsQuery.data?.hasMore ?? false;

  const staffInviteCodesQuery = useQuery({
    queryKey: ["staffInviteCodes", staffCurrentPage],
    queryFn: () => {
      const cursor = cursorsRef.current.staff[staffCurrentPage - 1] ?? null;
      return otpService.getAllStaffInviteCodesPaginated(codesPerPage, cursor).catch((err) => {
        console.error("Error loading staff invite codes:", err);
        return { codes: [], lastDoc: null, hasMore: false };
      });
    },
  });
  useEffect(() => {
    if (staffInviteCodesQuery.data?.lastDoc) {
      cursorsRef.current.staff[staffCurrentPage] = staffInviteCodesQuery.data.lastDoc;
    }
  }, [staffInviteCodesQuery.data, staffCurrentPage]);
  const staffInviteCodes = staffInviteCodesQuery.data?.codes ?? [];
  const staffHasMore = staffInviteCodesQuery.data?.hasMore ?? false;

  const cctvCodesQuery = useQuery({
    queryKey: ["cctvOperatorCodes", cctvCurrentPage],
    queryFn: () => {
      const cursor = cursorsRef.current.cctv[cctvCurrentPage - 1] ?? null;
      return otpService.getCCTVOperatorCodesPaginated(codesPerPage, cursor).catch((err) => {
        console.error("Error loading CCTV operator codes:", err);
        return { codes: [], lastDoc: null, hasMore: false };
      });
    },
  });
  useEffect(() => {
    if (cctvCodesQuery.data?.lastDoc) {
      cursorsRef.current.cctv[cctvCurrentPage] = cctvCodesQuery.data.lastDoc;
    }
  }, [cctvCodesQuery.data, cctvCurrentPage]);
  const cctvCodes = cctvCodesQuery.data?.codes ?? [];
  const cctvHasMore = cctvCodesQuery.data?.hasMore ?? false;

  const loading = clientOTPsQuery.isFetching || staffInviteCodesQuery.isFetching || cctvCodesQuery.isFetching;

  // Aggregation counts — 3 reads regardless of how many codes exist, cached once.
  const otpCountsQuery = useQuery({
    queryKey: ["otpCounts"],
    queryFn: () => otpService.getOTPCounts(),
  });
  const clientTotalCount = otpCountsQuery.data?.clientTotal ?? 0;
  const staffTotalCount = otpCountsQuery.data?.staffTotal ?? 0;
  const cctvTotalCount = otpCountsQuery.data?.cctvTotal ?? 0;

  // Third-party codes for the active sub-tab — page cache lives in React
  // Query itself now, keyed by sub-tab + page, instead of a hand-rolled array.
  const tpTabConfig = TP_TABS.find((t) => t.key === tpSubTab);

  const tpCodesQuery = useQuery({
    queryKey: ["thirdPartyCodes", tpSubTab, tpPage],
    queryFn: () => {
      tpCursorsRef.current[tpSubTab] ??= [null];
      const cursor = tpCursorsRef.current[tpSubTab][tpPage] ?? null;
      return otpService.getThirdPartyCodesPaginated(tpTabConfig.collection, codesPerPage, cursor);
    },
    enabled: activeTab === "thirdparty" && !!tpTabConfig,
  });
  useEffect(() => {
    if (tpCodesQuery.isError) {
      console.error("Failed to load third party codes:", tpCodesQuery.error);
      toast.error("Failed to load codes");
    }
  }, [tpCodesQuery.isError, tpCodesQuery.error]);
  useEffect(() => {
    if (tpCodesQuery.data?.lastDoc) {
      tpCursorsRef.current[tpSubTab] ??= [null];
      tpCursorsRef.current[tpSubTab][tpPage + 1] = tpCodesQuery.data.lastDoc;
    }
  }, [tpCodesQuery.data, tpSubTab, tpPage]);
  const tpCurrentCodes = tpCodesQuery.data?.codes ?? [];
  const tpHasMore = tpCodesQuery.data?.hasMore ?? false;
  const tpCodesLoading = tpCodesQuery.isFetching;

  const goNextTpPage = () => {
    if (tpHasMore) setTpPage((p) => p + 1);
  };
  const goPrevTpPage = () => setTpPage((p) => Math.max(0, p - 1));

  const handleDeleteTpCode = async (code) => {
    if (!tpTabConfig) return;
    if (!window.confirm(`Delete code ${code}? This cannot be undone.`)) return;
    try {
      await otpService.deleteThirdPartyCode(tpTabConfig.collection, code);
      toast.success("Code deleted");
      // A deletion can shift every cursor after it — drop the chain and
      // reset to page 0, same as the original's full reload.
      tpCursorsRef.current[tpSubTab] = [null];
      setTpPage(0);
      queryClient.invalidateQueries({ queryKey: ["thirdPartyCodes", tpSubTab] });
    } catch (error) {
      console.error("Failed to delete third party code:", error);
      toast.error("Failed to delete code");
    }
  };

  // Creating a code always affects page 1 of its list — reset to page 1,
  // drop the stale cursor chain, and force a fresh read there.
  const refreshAllCodeLists = () => {
    setClientCurrentPage(1);
    setStaffCurrentPage(1);
    setCctvCurrentPage(1);
    cursorsRef.current = { client: [null], staff: [null], cctv: [null] };
    queryClient.invalidateQueries({ queryKey: ["clientOTPs"] });
    queryClient.invalidateQueries({ queryKey: ["staffInviteCodes"] });
    queryClient.invalidateQueries({ queryKey: ["cctvOperatorCodes"] });
    queryClient.invalidateQueries({ queryKey: ["otpCounts"] });
  };

  const handleCreateClientOTP = async (e) => {
    e.preventDefault();

    if (!formData.schemeId || !formData.schemeName) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const otpCode = await otpService.createOTP(
        formData.schemeId.toUpperCase(),
        formData.schemeName,
        userProfile.uid,
      );

      toast.success(`Client Access Code created: ${otpCode}`);
      setFormData({
        schemeId: "",
        schemeName: "",
        expiresInDays: 30,
        maxUses: 1,
      });
      setShowCreateModal(false);
      refreshAllCodeLists();
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Failed to create access code");
    }
  };

  const handleCreateCCTVCode = async (e) => {
    e.preventDefault();

    if (!formData.schemeId || !formData.schemeName) {
      toast.error("Please select a scheme");
      return;
    }

    try {
      const code = await otpService.createCCTVOperatorCode(
        formData.schemeId.toUpperCase(),
        formData.schemeName,
        userProfile.uid,
        formData.expiresInDays,
      );

      toast.success(`CCTV Operator Access Code created: ${code}`);
      setFormData({
        schemeId: "",
        schemeName: "",
        expiresInDays: 30,
        maxUses: 1,
      });
      setShowCreateModal(false);
      refreshAllCodeLists();
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Failed to create CCTV operator access code");
    }
  };

  const handleCreateStaffInvite = async (e) => {
    e.preventDefault();

    try {
      const inviteCode = await otpService.createStaffInviteCode(
        userProfile.uid,
        userProfile.displayName,
        formData.expiresInDays,
        formData.maxUses,
      );

      toast.success(`Staff Invite Code created: ${inviteCode}`);
      setFormData({
        schemeId: "",
        schemeName: "",
        expiresInDays: 30,
        maxUses: 1,
      });
      setShowCreateModal(false);
      refreshAllCodeLists();
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("Failed to create staff invite code");
    }
  };

  const handleCreateTPCode = async (e) => {
    e.preventDefault();
    const tabConfig = TP_TABS.find(t => t.key === tpSubTab);
    if (tabConfig.byCompany && !tpFormData.company) {
      toast.error('Please select a company');
      return;
    }
    if (!tabConfig.byCompany && (!tpFormData.schemeId || !tpFormData.schemeName)) {
      toast.error('Please select a scheme');
      return;
    }
    setTpLoading(true);
    try {
      const code = tabConfig.byCompany
        ? await tabConfig.create(tpFormData.company, userProfile.uid)
        : await tabConfig.create(tpFormData.schemeId.toUpperCase(), tpFormData.schemeName, userProfile.uid);
      toast.success(`Third Party ${tabConfig.label} code created: ${code}`);
      setTpFormData({ company: '', schemeId: '', schemeName: '' });
      tpCursorsRef.current[tpSubTab] = [null];
      setTpPage(0);
      queryClient.invalidateQueries({ queryKey: ["thirdPartyCodes", tpSubTab] });
    } catch {
      toast.error('Failed to create third party code');
    } finally {
      setTpLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    const date = expiresAt.seconds
      ? new Date(expiresAt.seconds * 1000)
      : new Date(expiresAt);
    return date < new Date();
  };

  // Shared three-state status for every access code. "Used" takes precedence
  // over "Expired" — a consumed code reads Used even if its date later passes.
  const getCodeStatus = (code) => {
    if (code.isUsed) return "used";
    if (isExpired(code.expiresAt)) return "expired";
    return "available";
  };

  const renderStatus = (code) => {
    const status = getCodeStatus(code);
    if (status === "used") {
      return (
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <XCircle className="w-4 h-4" />
          Used
        </span>
      );
    }
    if (status === "expired") {
      return (
        <span className="flex items-center gap-1 text-sm text-red-500">
          <XCircle className="w-4 h-4" />
          Expired
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        Available
      </span>
    );
  };

  const displayCodes =
    activeTab === "client"
      ? clientOTPs
      : activeTab === "cctv"
        ? cctvCodes
        : staffInviteCodes;
  const availableCount = displayCodes.filter(
    (code) => getCodeStatus(code) === "available",
  ).length;

  // Pagination handlers for client codes
  const clientTotalPages = Math.ceil(clientTotalCount / codesPerPage);

  const handleClientNextPage = () => {
    if (clientHasMore) setClientCurrentPage((p) => p + 1);
  };

  const handleClientPrevPage = () => {
    if (clientCurrentPage > 1) setClientCurrentPage((p) => p - 1);
  };

  // Pagination handlers for staff codes
  const staffTotalPages = Math.ceil(staffTotalCount / codesPerPage);

  const handleStaffNextPage = () => {
    if (staffHasMore) setStaffCurrentPage((p) => p + 1);
  };

  const handleStaffPrevPage = () => {
    if (staffCurrentPage > 1) setStaffCurrentPage((p) => p - 1);
  };

  // Pagination handlers for CCTV operator codes
  const cctvTotalPages = Math.ceil(cctvTotalCount / codesPerPage);

  const handleCctvNextPage = () => {
    if (cctvHasMore) setCctvCurrentPage((p) => p + 1);
  };

  const handleCctvPrevPage = () => {
    if (cctvCurrentPage > 1) setCctvCurrentPage((p) => p - 1);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Access Code Management
          </h2>
          <p className="text-gray-600 mt-1">
            Generate and manage codes for client and staff registration
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshAllCodeLists}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={activeTab === "thirdparty"}
            title={
              activeTab === "thirdparty"
                ? "Use the Generate Code button below for third party codes"
                : undefined
            }
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
          >
            <Plus className="w-4 h-4" />
            Generate New Code
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("client")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === "client"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Building2 className="w-5 h-5" />
          Client Access Codes
        </button>
        <button
          onClick={() => setActiveTab("cctv")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === "cctv"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Camera className="w-5 h-5" />
          CCTV Operator Codes
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === "staff"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-5 h-5" />
          Staff/Live Operator Invite Codes
        </button>
        <button
          onClick={() => setActiveTab("thirdparty")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === "thirdparty"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Building2 className="w-5 h-5" />
          Third Party Codes
        </button>
      </div>

      {/* Stats — not shown for third party tab (it has its own UI) */}
      {activeTab !== "thirdparty" && <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Total Codes</p>
          <p className="text-2xl font-bold text-gray-800">
            {activeTab === "client"
              ? clientTotalCount
              : activeTab === "cctv"
                ? cctvTotalCount
                : staffTotalCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Available (Current Page)</p>
          <p className="text-2xl font-bold text-green-600">{availableCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Used (Current Page)</p>
          <p className="text-2xl font-bold text-gray-400">
            {displayCodes.filter((code) => code.isUsed).length}
          </p>
        </div>
      </div>}

      {/* Table — not shown for third party tab */}
      {activeTab !== "thirdparty" && <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                {activeTab === "client" ? (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheme
                  </th>
                ) : activeTab === "staff" ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uses
                    </th>
                  </>
                ) : null}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === "client"
                ? clientOTPs.map((otp) => (
                    <tr key={otp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {otp.otpCode}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {otp.schemeId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {otp.schemeName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatus(otp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(otp.createdAt)}
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
                  ))
                : activeTab === "cctv"
                  ? cctvCodes.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {c.code}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStatus(c)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => copyToClipboard(c.code)}
                            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))
                  : staffInviteCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {code.inviteCode}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-800">
                            {code.createdByName || "Admin"}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p
                            className={`text-sm ${isExpired(code.expiresAt) ? "text-red-500" : "text-gray-500"}`}
                          >
                            {formatDate(code.expiresAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-800">
                            {code.usesRemaining}/{code.maxUses}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStatus(code)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(code.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => copyToClipboard(code.inviteCode)}
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

        {displayCodes.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No codes generated yet</p>
          </div>
        )}

        {/* Pagination */}
        {activeTab === "client" && clientTotalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Showing page {clientCurrentPage} of {clientTotalPages} (
              {clientTotalCount} total codes)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClientPrevPage}
                disabled={clientCurrentPage === 1}
                className="btn btn-sm btn-outline"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                Page {clientCurrentPage} of {clientTotalPages}
              </span>
              <button
                onClick={handleClientNextPage}
                disabled={
                  !clientHasMore || clientCurrentPage === clientTotalPages
                }
                className="btn btn-sm btn-outline"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "staff" && staffTotalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Showing page {staffCurrentPage} of {staffTotalPages} (
              {staffTotalCount} total codes)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStaffPrevPage}
                disabled={staffCurrentPage === 1}
                className="btn btn-sm btn-outline"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                Page {staffCurrentPage} of {staffTotalPages}
              </span>
              <button
                onClick={handleStaffNextPage}
                disabled={!staffHasMore || staffCurrentPage === staffTotalPages}
                className="btn btn-sm btn-outline"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "cctv" && cctvTotalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Showing page {cctvCurrentPage} of {cctvTotalPages} (
              {cctvTotalCount} total codes)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCctvPrevPage}
                disabled={cctvCurrentPage === 1}
                className="btn btn-sm btn-outline"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                Page {cctvCurrentPage} of {cctvTotalPages}
              </span>
              <button
                onClick={handleCctvNextPage}
                disabled={!cctvHasMore || cctvCurrentPage === cctvTotalPages}
                className="btn btn-sm btn-outline"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      </>}

      {/* Third Party Codes Panel */}
      {activeTab === "thirdparty" && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 border-b">
            {TP_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTpSubTab(key); setTpPage(0); setTpFormData({ company: '', schemeId: '', schemeName: '' }); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tpSubTab === key
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateTPCode} className="bg-white rounded-lg shadow p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Generate {TP_TABS.find(t => t.key === tpSubTab)?.label} Access Code
            </h4>
            <div className="mb-4">
              {TP_TABS.find(t => t.key === tpSubTab)?.byCompany ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={tpFormData.company}
                    onChange={(e) => setTpFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="select select-bordered w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                    required
                  >
                    <option value="">Select a company</option>
                    {[...new Set(THIRD_PARTY_SCHEMES.map(s => s.company))].map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    This user will automatically see all schemes belonging to this company.
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheme</label>
                  <select
                    value={tpFormData.schemeId}
                    onChange={(e) => {
                      const selected = THIRD_PARTY_SCHEMES.find(s => s.id === e.target.value);
                      setTpFormData(prev => ({
                        ...prev,
                        schemeId: selected ? selected.id : "",
                        schemeName: selected ? selected.fullName : "",
                      }));
                    }}
                    className="select select-bordered w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                    required
                  >
                    <option value="">Select a scheme</option>
                    {Object.entries(
                      THIRD_PARTY_SCHEMES.reduce((groups, s) => {
                        const key = s.company || "Other";
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(s);
                        return groups;
                      }, {})
                    ).map(([company, schemes]) => (
                      <optgroup key={company} label={company}>
                        {schemes.map(s => (
                          <option key={s.id} value={s.id}>{s.fullName} ({s.id})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Admin will assign additional schemes after signup via Scheme Assignment.
                  </p>
                </>
              )}
            </div>
            <button
              type="submit"
              disabled={tpLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {tpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate Code
            </button>
          </form>

          {/* Persistent list of generated codes for this sub-tab */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h4 className="text-lg font-semibold text-gray-800">
                Generated {TP_TABS.find((t) => t.key === tpSubTab)?.label} Codes
              </h4>
            </div>
            {tpCodesLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-500 mx-auto" />
              </div>
            ) : tpCurrentCodes.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No codes generated yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Scheme
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tpCurrentCodes.map((c) => {
                      const byCompany = TP_TABS.find(
                        (t) => t.key === tpSubTab,
                      )?.byCompany;
                      const expired = isExpired(c.expiresAt);
                      // Company-based codes carry `company`; scheme-based codes
                      // carry a schemeId whose company we look up from the scheme list.
                      const company = byCompany
                        ? c.company
                        : THIRD_PARTY_SCHEMES.find((s) => s.id === c.schemeId)
                            ?.company || "—";
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {c.code}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {company}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {byCompany ? "All schemes" : c.schemeName || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatus(c)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(c.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`text-sm ${expired ? "text-red-500" : "text-gray-500"}`}
                            >
                              {formatDate(c.expiresAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => copyToClipboard(c.code)}
                                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                              >
                                <Copy className="w-4 h-4" />
                                Copy
                              </button>
                              <button
                                onClick={() => handleDeleteTpCode(c.code)}
                                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {tpCurrentCodes.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <span className="text-sm text-gray-600">Page {tpPage + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrevTpPage}
                    disabled={tpPage === 0}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={goNextTpPage}
                    disabled={!tpHasMore}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h5 className="text-xl font-bold text-gray-800 mb-4">
              {activeTab === "client"
                ? "Generate Client Access Code"
                : activeTab === "cctv"
                  ? "Generate CCTV Operator Access Code"
                  : "Generate Staff Invite Code"}
            </h5>
            <form
              onSubmit={
                activeTab === "client"
                  ? handleCreateClientOTP
                  : activeTab === "cctv"
                    ? handleCreateCCTVCode
                    : handleCreateStaffInvite
              }
              className="space-y-4"
            >
              {(activeTab === "client" || activeTab === "cctv") && (
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
                        (s) => s.id === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        schemeId: selectedScheme ? selectedScheme.id : "",
                        schemeName: selectedScheme ? selectedScheme.fullName : "",
                      });
                    }}
                    className="select select-bordered select-md mt-2 w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
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
              )}
              {activeTab !== "client" && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">
                      Expires In (Days)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expiresInDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expiresInDays: parseInt(e.target.value),
                      })
                    }
                    className="input input-bordered w-full bg-white border-gray-300 rounded-lg hover:bg-gray-100"
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">
                      Code will expire in {formData.expiresInDays} days. Each
                      code is single-use only.
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      schemeId: "",
                      schemeName: "",
                      expiresInDays: 30,
                      maxUses: 1,
                    });
                  }}
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
