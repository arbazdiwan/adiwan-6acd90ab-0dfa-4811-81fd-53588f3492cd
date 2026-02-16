import { useEffect, useState } from 'react';
import { auditApi } from '../api/client';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; role: string };
}

interface PaginatedResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await auditApi.getLogs(page, limit);
        const result: PaginatedResponse = response.data;
        setLogs(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [page, limit]);

  // Reset to page 1 when limit changes
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const actionColors: Record<string, string> = {
    CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    READ: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    LOGIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    LOGIN_FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const roleColors: Record<string, string> = {
    owner: 'text-purple-600 dark:text-purple-400',
    admin: 'text-blue-600 dark:text-blue-400',
    viewer: 'text-gray-500 dark:text-gray-400',
  };

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Audit Log
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} total entries
            </p>
          </div>
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="input-field text-xs h-7 py-0 w-[70px]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-16">
          <ScrollText className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No audit logs found
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Actions within your scope will appear here
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2.5 px-4 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.user ? (
                        <div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">
                            {log.user.firstName} {log.user.lastName}
                          </span>
                          <span
                            className={`ml-1.5 text-[10px] font-medium uppercase ${
                              roleColors[log.user.role] || 'text-gray-400'
                            }`}
                          >
                            {log.user.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">
                          {log.userId.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          actionColors[log.action] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.resource}
                      {log.resourceId && (
                        <span className="text-[10px] text-gray-400 ml-1 font-mono">
                          ({log.resourceId.slice(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400 max-w-[260px] truncate">
                      {log.details || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-gray-400 font-mono whitespace-nowrap">
                      {log.ipAddress || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {startRecord}–{endRecord} of {total}
            </span>

            <div className="flex items-center gap-1">
              {/* First page */}
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Previous */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page indicator */}
              <span className="text-xs text-gray-600 dark:text-gray-300 px-2 font-medium min-w-[60px] text-center">
                {page} / {totalPages}
              </span>

              {/* Next */}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last page */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || totalPages === 0}
                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
