import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admissionsApi, academicApi } from '../../api/endpoints';
import { Admission } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { CheckCircle2, XCircle, Clock, FileText, Search, Filter, Eye, Check, X, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdmissionsQueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await admissionsApi.exportCsv(statusFilter || undefined);
    } catch (err) {
      alert('Failed to export admissions CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admissions-list', page, search, statusFilter],
    queryFn: () =>
      admissionsApi.getList({
        page,
        pageSize: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, newStatus, remarks }: { id: string; newStatus: string; remarks?: string }) =>
      admissionsApi.updateStatus(id, { newStatus, remarks }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admissions-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setActionSuccess(`Application successfully marked as ${variables.newStatus}! If Approved, student & parent login credentials have been generated.`);
      setSelectedAdmission(null);
      setRemarks('');
      setTimeout(() => setActionSuccess(null), 6000);
    },
    onError: (err: any) => {
      alert(`Status update failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800"><XCircle className="h-3 w-3" /> Rejected</span>;
      case 'Waitlisted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"><Clock className="h-3 w-3" /> Waitlisted</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800"><FileText className="h-3 w-3" /> {status}</span>;
    }
  };

  const columns = [
    {
      header: 'Ref Number',
      accessor: (row: Admission) => (
        <span className="font-mono text-xs font-bold text-indigo-700">{row.referenceNumber}</span>
      ),
    },
    {
      header: 'Applicant Name',
      accessor: (row: Admission) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      header: 'Applied Class',
      accessor: (row: Admission) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {row.desiredClassName}
        </span>
      ),
    },
    {
      header: 'Submission Date',
      accessor: (row: Admission) => (
        <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Admission) => getStatusBadge(row.status),
    },
    {
      header: 'Actions',
      accessor: (row: Admission) => (
        <button
          onClick={() => setSelectedAdmission(row)}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Eye className="h-3.5 w-3.5" />
          Review
        </button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admissions Application Review</h1>
          <p className="text-sm text-slate-500">
            Verify submitted admission applications, review credentials, and enroll approved candidates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admissions/apply"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <ExternalLink className="h-4 w-4 text-indigo-600" />
            <span>Public Application Portal</span>
          </Link>
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {actionSuccess}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or reference number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="UnderReview">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
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

      {/* Application Review Modal */}
      {selectedAdmission && (
        <Modal
          isOpen={!!selectedAdmission}
          onClose={() => setSelectedAdmission(null)}
          title={`Admission Application: ${selectedAdmission.referenceNumber}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedAdmission.fullName}</h3>
                <p className="text-xs text-slate-500">
                  Applied for Class: <span className="font-semibold text-slate-800">{selectedAdmission.desiredClassName}</span>
                </p>
              </div>
              <div>{getStatusBadge(selectedAdmission.status)}</div>
            </div>

            {/* Grid Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Date of Birth:</span>
                <p className="font-medium text-slate-800">{new Date(selectedAdmission.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Gender:</span>
                <p className="font-medium text-slate-800">{selectedAdmission.gender}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Email:</span>
                <p className="font-medium text-slate-800">{selectedAdmission.email || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Phone Number:</span>
                <p className="font-medium text-slate-800">{selectedAdmission.phoneNumber || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-500">Residential Address:</span>
                <p className="font-medium text-slate-800">{selectedAdmission.address || 'N/A'}</p>
              </div>
            </div>

            {/* Parent Details */}
            <div className="rounded-lg border border-slate-200 p-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Parent / Guardian Details</h4>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Name:</span>
                  <p className="font-medium text-slate-800">{selectedAdmission.guardianName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>
                  <p className="font-medium text-slate-800">{selectedAdmission.guardianPhone}</p>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <p className="font-medium text-slate-800">{selectedAdmission.guardianEmail}</p>
                </div>
              </div>
            </div>

            {/* Uploaded Supporting Documents */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Supporting Documents ({selectedAdmission.documents?.length || 0})
              </h4>
              {selectedAdmission.documents && selectedAdmission.documents.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {selectedAdmission.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{doc.fileName}</span>
                        <span className="text-[10px] text-slate-400">({doc.documentType})</span>
                      </div>
                      <a
                        href={`http://localhost:5050${doc.downloadUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-400">No documents uploaded for this applicant.</p>
              )}
            </div>

            {/* Review Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">Review Remarks / Notes</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter evaluation notes, entrance exam scores, or enrollment instructions..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Decision Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: selectedAdmission.id,
                    newStatus: 'Rejected',
                    remarks,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: selectedAdmission.id,
                    newStatus: 'Waitlisted',
                    remarks,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <Clock className="h-3.5 w-3.5" />
                Waitlist
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: selectedAdmission.id,
                    newStatus: 'Approved',
                    remarks,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Approve & Enroll Student
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdmissionsQueuePage;
