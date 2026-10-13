import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicApi } from '../../api/endpoints';
import { ClassRoom } from '../../types';
import Modal from '../../components/ui/Modal';
import { School, Plus, BookOpen, Users, Layers } from 'lucide-react';

export const ClassesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);

  // Add class form states
  const [className, setClassName] = useState('');
  const [classSection, setClassSection] = useState('A');
  const [classCapacity, setClassCapacity] = useState(40);
  const [academicYearId, setAcademicYearId] = useState('');

  // Assign subject state
  const [assignSubjectId, setAssignSubjectId] = useState('');

  // Fetch classes, years, subjects
  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: academicApi.getYears,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: academicApi.getSubjects,
  });

  const { data: classSubjects, refetch: refetchClassSubjects } = useQuery({
    queryKey: ['class-subjects', selectedClass?.id],
    queryFn: () => academicApi.getClassSubjects(selectedClass!.id),
    enabled: !!selectedClass,
  });

  const createClassMutation = useMutation({
    mutationFn: (data: any) => academicApi.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes-list'] });
      setIsAddClassModalOpen(false);
      setClassName('');
      alert('Class created successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to create class: ${err.message}`);
    },
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (data: { classId: string; subjectId: string }) =>
      academicApi.assignSubject(data.classId, data.subjectId),
    onSuccess: () => {
      refetchClassSubjects();
      setAssignSubjectId('');
      alert('Subject assigned to class!');
    },
    onError: (err: any) => {
      alert(`Assignment failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Classrooms & Academic Cohorts</h1>
          <p className="text-sm text-slate-500">
            Define institutional classes, sections, seat capacities, and subject curricula
          </p>
        </div>
        <button
          onClick={() => setIsAddClassModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Class
        </button>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading classrooms...</div>
        ) : classes && classes.length > 0 ? (
          classes.map((cls) => (
            <div
              key={cls.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <School className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{cls.fullName}</h3>
                      <p className="text-xs text-slate-500">{cls.academicYearName || '2026-2027 Session'}</p>
                    </div>
                  </div>
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    Sec {cls.section}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
                  <div>
                    <span className="text-slate-400">Enrolled:</span>
                    <p className="font-bold text-slate-800">{cls.studentCount} Students</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Capacity:</span>
                    <p className="font-bold text-slate-800">{cls.capacity} Seats</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setSelectedClass(cls)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Curriculum & Subjects
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">No classes found.</div>
        )}
      </div>

      {/* Add Class Modal */}
      <Modal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        title="Create New Classroom Cohort"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Class Name *</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Grade 11"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Section *</label>
              <input
                type="text"
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
                placeholder="A, B, or C"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Capacity *</label>
              <input
                type="number"
                value={classCapacity}
                onChange={(e) => setClassCapacity(Number(e.target.value))}
                min={10}
                max={100}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Academic Year *</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose Academic Session --</option>
              {years?.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsAddClassModalOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!className || !classSection || !academicYearId || createClassMutation.isPending}
              onClick={() =>
                createClassMutation.mutate({
                  name: className,
                  section: classSection,
                  capacity: classCapacity,
                  academicYearId,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Classroom
            </button>
          </div>
        </div>
      </Modal>

      {/* Class Curriculum Modal */}
      {selectedClass && (
        <Modal
          isOpen={!!selectedClass}
          onClose={() => setSelectedClass(null)}
          title={`Curriculum: ${selectedClass.fullName}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500">Assigned Curriculum Subjects</h4>
              <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {classSubjects && classSubjects.length > 0 ? (
                  classSubjects.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="ml-2 font-mono text-slate-500 font-semibold">({s.code})</span>
                      </div>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Active in Syllabus
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No subjects linked to this classroom yet.
                  </div>
                )}
              </div>
            </div>

            {/* Link another subject */}
            <div className="rounded-lg bg-slate-50 p-3">
              <label className="block text-xs font-semibold text-slate-700">Link Subject to this Classroom</label>
              <div className="mt-2 flex gap-2">
                <select
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Subject to Assign --</option>
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!assignSubjectId || assignSubjectMutation.isPending}
                  onClick={() =>
                    assignSubjectMutation.mutate({
                      classId: selectedClass.id,
                      subjectId: assignSubjectId,
                    })
                  }
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add Subject
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClassesPage;
