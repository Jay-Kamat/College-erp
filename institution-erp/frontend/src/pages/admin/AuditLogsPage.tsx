import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { AuditLog } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { ShieldAlert, Eye, Clock, User, Globe } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => adminApi.getAuditLogs({ page, pageSize: 12 }),
  });

  const columns = [
    {
      header: 'Timestamp (UTC)',
      accessor: (row: AuditLog) => (
        <span className="text-xs font-mono text-slate-500">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'User',
      accessor: (row: AuditLog) => (
        <div>
          <p className="font-semibold text-slate-900">{row.userEmail || 'System Process'}</p>
          <p className="text-[10px] text-slate-400 font-mono">{row.ipAddress || '127.0.0.1'}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: (row: AuditLog) => (
        <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      accessor: (row: AuditLog) => (
        <span className="text-xs font-medium text-slate-700">
          {row.entityName} {row.entityId && <span className="text-slate-400">({row.entityId.slice(0, 8)}...)</span>}
        </span>
      ),
    },
    {
      header: 'Audit Payload',
      accessor: (row: AuditLog) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          <Eye className="h-3 w-3" />
          Inspect
        </button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Immutable Audit Trail</h1>
          <p className="text-sm text-slate-500">
            Cryptographically logged transactional audit events, security actions and state changes
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          <ShieldAlert className="h-4 w-4 text-emerald-600" />
          Tamper-Evident Ledger Active
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      {/* Audit Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-400">Initiator:</span>
                <p className="font-semibold text-slate-800">{selectedLog.userEmail || 'System'}</p>
              </div>
              <div>
                <span className="text-slate-400">Entity:</span>
                <p className="font-semibold text-slate-800">{selectedLog.entityName} ({selectedLog.entityId})</p>
              </div>
              <div>
                <span className="text-slate-400">Recorded At:</span>
                <p className="font-semibold text-slate-800">{new Date(selectedLog.createdAt).toISOString()}</p>
              </div>
              <div>
                <span className="text-slate-400">Client IP:</span>
                <p className="font-semibold text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</p>
              </div>
            </div>

            {selectedLog.oldValuesJson && (
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500">Prior State Snapshot</h4>
                <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-rose-300">
                  {selectedLog.oldValuesJson}
                </pre>
              </div>
            )}

            {selectedLog.newValuesJson && (
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500">Committed Changes</h4>
                <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-emerald-300">
                  {selectedLog.newValuesJson}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogsPage;
