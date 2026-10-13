import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, academicApi } from '../../api/endpoints';
import { Student } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Search, Download, Eye, Trash2 } from 'lucide-react';

export const StudentsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students-list', page, search, selectedClassId],
    queryFn: () =>
      studentsApi.getList({
        page,
        pageSize: 10,
        search: search || undefined,
        classId: selectedClassId || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSelectedStudent(null);
    },
    onError: (err: any) => {
      alert(`Failed to remove student: ${err.message}`);
    },
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await studentsApi.exportCsv(selectedClassId || undefined);
    } catch (err) {
      alert('Failed to export students CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Roll No',
      accessor: (row: Student) => (
        <span className="font-mono text-xs font-bold text-indigo-700">{row.rollNumber}</span>
      ),
    },
    {
      header: 'Student Name',
      accessor: (row: Student) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      header: 'Class / Section',
      accessor: (row: Student) => (
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {row.className}
        </span>
      ),
    },
    {
      header: 'Gender',
      accessor: (row: Student) => (
        <span className="text-xs text-slate-600">{row.gender}</span>
      ),
    },
    {
      header: 'Admission Date',
      accessor: (row: Student) => (
        <span className="text-xs text-slate-500">
          {new Date(row.admissionDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Student) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            row.status === 'Active'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Student) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedStudent(row)}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            <Eye className="h-3.5 w-3.5" />
            Profile
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to deactivate student ${row.fullName}?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Deactivate Student"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-sm text-slate-500">
            Comprehensive student roll, enrollment details, academic records and demographic profiles
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      {/* Student Profile Modal */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Student Profile: ${selectedStudent.fullName}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl bg-indigo-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                {selectedStudent.firstName[0]}
                {selectedStudent.lastName[0]}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedStudent.fullName}</h3>
                <p className="text-xs text-indigo-700">
                  Roll No: <span className="font-semibold">{selectedStudent.rollNumber}</span> • Class:{' '}
                  <span className="font-semibold">{selectedStudent.className}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Date of Birth:</span>
                <p className="font-medium text-slate-800">
                  {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Gender:</span>
                <p className="font-medium text-slate-800">{selectedStudent.gender}</p>
              </div>
              <div>
                <span className="text-slate-400">Emergency Phone:</span>
                <p className="font-medium text-slate-800">{selectedStudent.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400">Student Portal Email:</span>
                <p className="font-medium text-slate-800">{selectedStudent.email || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Address:</span>
                <p className="font-medium text-slate-800">{selectedStudent.address || 'N/A'}</p>
              </div>
            </div>

            {/* Guardian Info */}
            {selectedStudent.guardianName && (
              <div className="rounded-lg border border-slate-200 p-3">
                <h4 className="text-xs font-bold uppercase text-slate-500">Guardian / Parent Contact</h4>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{selectedStudent.guardianName}</span>
                  <span className="text-slate-600">{selectedStudent.guardianPhone || selectedStudent.guardianEmail}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentsListPage;
