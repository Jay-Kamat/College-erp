import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { examsApi, academicApi } from '../../api/endpoints';
import { useAuth } from '../../store/authContext';
import { Exam } from '../../types';
import Modal from '../../components/ui/Modal';
import { Award, Plus, Calendar, CheckCircle2, Lock, ArrowRight, Eye, BookOpen, BarChart3 } from 'lucide-react';

export const ExamsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['SuperAdmin', 'Admin']);
  const isTeacher = hasRole('Teacher');

  const [selectedClassId, setSelectedClassId] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState('MidTerm');
  const [formClassId, setFormClassId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Fetch exams and classes
  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams-list', selectedClassId],
    queryFn: () => examsApi.getList(selectedClassId || undefined),
  });

  const publishMutation = useMutation({
    mutationFn: (examId: string) => examsApi.publish(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams-list'] });
      alert('Examination published! Final report cards are now accessible to students & parents.');
    },
    onError: (err: any) => {
      alert(`Publish failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Examinations & Grading</h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Schedule examinations, monitor faculty grading progress, and generate class-wide performance reports'
              : 'View examination rosters and input student marks for your allocated subjects'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/exams/results"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Class Reports & Analytics
          </Link>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              New Examination
            </button>
          )}
        </div>
      </div>

      {/* Class filter */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-xs font-semibold text-slate-600">Filter by Cohort:</span>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Cohorts</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
      </div>

      {/* Exams Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading examinations...</div>
        ) : exams && exams.length > 0 ? (
          exams.map((ex) => (
            <div
              key={ex.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{ex.name}</h3>
                    <p className="text-xs text-indigo-700 font-medium">{ex.className}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      ex.isPublished
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ex.isPublished ? 'Published' : 'Draft / Grading'}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {new Date(ex.startDate).toLocaleDateString()} -{' '}
                      {new Date(ex.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ex.subjects?.length || 0} Evaluated Subjects</span>
                  </div>
                </div>

                {/* Subjects breakdown */}
                <div className="mt-3 divide-y divide-slate-100 rounded-lg bg-slate-50 p-2.5 text-xs">
                  {ex.subjects?.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1">
                      <span className="font-medium text-slate-800">{s.subjectName}</span>
                      {isTeacher && !isAdmin && !ex.isLocked ? (
                        <Link
                          to={`/exams/marks?examId=${ex.id}&subjectId=${s.subjectId}`}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          Enter Marks &rarr;
                        </Link>
                      ) : (
                        <Link
                          to={`/exams/marks?examId=${ex.id}&subjectId=${s.subjectId}`}
                          className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:underline"
                        >
                          View Marks &rarr;
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <Link
                  to={`/exams/results?examId=${ex.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Class Report & Analytics
                </Link>

                {isAdmin && !ex.isPublished && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Publish ${ex.name} results? This will lock marks and make report cards downloadable.`)) {
                        publishMutation.mutate(ex.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Publish Results
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">No exams configured yet.</div>
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Examination"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Exam Title *</label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. Annual Final Examination 2026"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Exam Type *</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="MidTerm">Mid-Term Assessment</option>
                <option value="Final">Final Examination</option>
                <option value="Unit">Unit Test</option>
                <option value="Practical">Practical Lab</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Classroom Cohort *</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Class --</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!examName || !formClassId}
              onClick={async () => {
                try {
                  const selClass = classes?.find((c) => c.id === formClassId);
                  await examsApi.create({
                    name: examName,
                    examType,
                    classRoomId: formClassId,
                    academicYearId: selClass?.academicYearId,
                    startDate,
                    endDate,
                  });
                  queryClient.invalidateQueries({ queryKey: ['exams-list'] });
                  setIsCreateModalOpen(false);
                  alert('Exam created successfully! You may now enter marks for class subjects.');
                } catch (err: any) {
                  alert(`Failed to create exam: ${err.message}`);
                }
              }}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Exam
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamsListPage;
