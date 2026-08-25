import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { firestoreService } from "../../services/firestoreService";
import { RefreshCw, LogIn, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { MdPerson } from "react-icons/md";
import { ROLE_BADGE, ROLE_ICON } from "../../utils/roleBadge";

const formatDateTime = (ts) => {
  if (!ts) return "—";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const LOGS_PER_PAGE = 10;

const LoginLogs = () => {
  const [currentPage, setCurrentPage] = useState(1);

  // Cursor for each page: cursorsRef.current[i] is the lastDoc needed to
  // fetch page i + 1. cursorsRef.current[0] is always null (start of list).
  const cursorsRef = useRef([null]);

  const logsQuery = useQuery({
    queryKey: ["loginLogs", currentPage],
    queryFn: () => {
      const cursor = cursorsRef.current[currentPage - 1] ?? null;
      return firestoreService.getLoginLogsPaginated(LOGS_PER_PAGE, cursor);
    },
  });

  const countQuery = useQuery({
    queryKey: ["loginLogsCount"],
    queryFn: () => firestoreService.getLoginLogsCount(),
  });

  useEffect(() => {
    if (logsQuery.data?.lastDoc) {
      cursorsRef.current[currentPage] = logsQuery.data.lastDoc;
    }
  }, [logsQuery.data, currentPage]);

  useEffect(() => {
    if (logsQuery.isError) {
      console.error("Failed to load login logs:", logsQuery.error);
    }
  }, [logsQuery.isError, logsQuery.error]);

  const logs = logsQuery.data?.logs ?? [];
  const hasMore = logsQuery.data?.hasMore ?? false;
  const loading = logsQuery.isFetching || countQuery.isFetching;
  const totalCount = countQuery.data ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LOGS_PER_PAGE));

  const handleNextPage = () => {
    if (hasMore) setCurrentPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleRefresh = () => {
    logsQuery.refetch();
    countQuery.refetch();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Login Audit Logs</h3>
          <p className="text-gray-600 mt-1">
            Who signed in and when — auto-deleted after 3 days
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-500">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Logged In At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading logs…</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <LogIn className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No login records yet</p>
                    <p className="text-gray-400 text-sm mt-1">Entries appear here after users sign in</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const RoleIcon = ROLE_ICON[log.role] || MdPerson;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{log.displayName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[log.role] || "bg-gray-100 text-gray-700"}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {log.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDateTime(log.loginAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.expireAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({totalCount} total entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loading}
                className="btn btn-sm btn-outline"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!hasMore || currentPage === totalPages || loading}
                className="btn btn-sm btn-outline"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginLogs;
