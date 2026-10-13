import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { attendanceApi, academicApi, studentsApi } from '../../api/endpoints';
import { CheckCircle2, XCircle, Clock, Calendar, CheckCheck, Save, Users, AlertCircle } from 'lucide-react';

export const MarkAttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState<
    { studentId: string; rollNumber: string; studentName: string; status: 'Present' | 'Absent' | 'Late' | 'Excused'; remarks: string }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Fetch students for selected class
  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students-class-att', selectedClassId],
    queryFn: () => studentsApi.getList({ classId: selectedClassId, pageSize: 100 }),
    enabled: !!selectedClassId,
  });

  // Fetch already marked attendance for date
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-existing', selectedClassId, selectedDate],
    queryFn: () => attendanceApi.getClass(selectedClassId, selectedDate),
    enabled: !!selectedClassId,
  });

  // Sync students and existing attendance into local state
  useEffect(() => {
    if (!studentsData?.items) return;

    const records = studentsData.items.map((s) => {
      const existing = existingAttendance?.records?.find((r) => r.studentId === s.id);
      return {
        studentId: s.id,
        rollNumber: s.rollNumber,
        studentName: s.fullName,
        status: (existing?.status as any) || 'Present',
        remarks: existing?.remarks || '',
      };
    });

    setAttendanceRecords(records);
  }, [studentsData, existingAttendance]);

  const markMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.mark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-existing', selectedClassId, selectedDate] });
      setSuccessMessage('Attendance successfully recorded! Notifications dispatched to parents of absent students.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      alert(`Failed to save attendance: ${err.response?.data?.detail || err.message}`);
    },
  });

  const handleMarkAllPresent = () => {
    setAttendanceRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'Present',
      }))
    );
  };

  const updateStudentStatus = (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const updateStudentRemarks = (studentId: string, remarks: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  const handleSave = () => {
    markMutation.mutate({
      classRoomId: selectedClassId,
      date: selectedDate,
      records: attendanceRecords.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks || undefined,
      })),
    });
  };

  const presentCount = attendanceRecords.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'Absent').length;
  const totalCount = attendanceRecords.length;
  const pct = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Attendance Roll</h1>
          <p className="text-sm text-slate-500">
            Record daily presence, excused leaves and trigger automated absence notices to parents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            Mark All Present
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={markMutation.isPending || attendanceRecords.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {markMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Row: Class & Date & Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700">Classroom Cohort</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">Attendance Date</label>
          <div className="mt-1 flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-around rounded-lg bg-slate-50 p-3">
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total</span>
            <p className="text-lg font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase text-emerald-600">Present</span>
            <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
          </div>
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase text-rose-600">Absent</span>
            <p className="text-lg font-bold text-rose-700">{absentCount}</p>
          </div>
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase text-indigo-600">Turnout</span>
            <p className="text-lg font-bold text-indigo-700">{pct}%</p>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead>
            <tr className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3.5">Roll No</th>
              <th className="px-4 py-3.5">Student Name</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Remarks / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isStudentsLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Loading class students...
                </td>
              </tr>
            ) : attendanceRecords.length > 0 ? (
              attendanceRecords.map((rec) => (
                <tr key={rec.studentId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-700">{rec.rollNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{rec.studentName}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(rec.studentId, 'Present')}
                        className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                          rec.status === 'Present'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(rec.studentId, 'Late')}
                        className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                          rec.status === 'Late'
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(rec.studentId, 'Excused')}
                        className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                          rec.status === 'Excused'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Excused
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(rec.studentId, 'Absent')}
                        className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                          rec.status === 'Absent'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="e.g. Doctor appointment, illness..."
                      value={rec.remarks}
                      onChange={(e) => updateStudentRemarks(rec.studentId, e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No students found in this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarkAttendancePage;
