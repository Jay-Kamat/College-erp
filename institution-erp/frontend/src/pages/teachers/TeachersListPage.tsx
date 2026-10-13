import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teachersApi, academicApi } from '../../api/endpoints';
import { Teacher } from '../../types';
import Modal from '../../components/ui/Modal';
import { Users, Plus, BookOpen, CheckCircle, Mail, Phone, Award, Calendar } from 'lucide-react';

export const TeachersListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Form states for allocation
  const [allocClassId, setAllocClassId] = useState('');
  const [allocSubjectId, setAllocSubjectId] = useState('');
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  // Form states for teacher creation
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');

  // Fetch teachers
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: teachersApi.getList,
  });

  // Fetch classes and subjects for allocation
  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: academicApi.getSubjects,
  });

  // Fetch teacher attendance
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: teacherAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['teacher-attendance', attDate],
    queryFn: () => teachersApi.getAttendance(attDate),
    enabled: activeTab === 'attendance',
  });

  const allocateMutation = useMutation({
    mutationFn: (data: { teacherId: string; classRoomId: string; subjectId: string; isClassTeacher: boolean }) =>
      teachersApi.allocate(data.teacherId, {
        classRoomId: data.classRoomId,
        subjectId: data.subjectId,
        isClassTeacher: data.isClassTeacher,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers-list'] });
      setIsAllocateModalOpen(false);
      setSelectedTeacher(null);
      alert('Teacher assigned successfully to classroom!');
    },
    onError: (err: any) => {
      alert(`Allocation failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  const createTeacherMutation = useMutation({
    mutationFn: (data: any) => teachersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers-list'] });
      setIsCreateModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
      setNewQualification('');
      setNewSpecialization('');
      alert('Teacher profile and login credentials created successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to add teacher: ${err.response?.data?.detail || err.message}`);
    },
  });

  const markTeacherAttMutation = useMutation({
    mutationFn: (data: any) => teachersApi.markAttendance(data),
    onSuccess: () => {
      refetchAttendance();
      alert('Faculty attendance recorded successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to mark attendance: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Faculty & Teachers</h1>
          <p className="text-sm text-slate-500">
            Teaching staff directory, classroom subject allocations, and daily staff attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              onClick={() => setActiveTab('directory')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'directory' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Faculty Directory
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'attendance' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff Attendance
            </button>
          </div>
          {activeTab === 'directory' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Teacher
            </button>
          )}
        </div>
      </div>

      {activeTab === 'directory' ? (
        /* Teachers Directory */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-slate-400">Loading faculty profiles...</div>
          ) : teachers && teachers.length > 0 ? (
            teachers.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{t.fullName}</h3>
                      <p className="font-mono text-xs text-indigo-600 font-semibold">{t.employeeCode}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t.qualification || 'M.Sc / B.Ed'} • {t.specialization}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{t.email}</span>
                    </p>
                    {t.phoneNumber && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t.phoneNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* Allocations */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Assigned Classrooms:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.allocations && t.allocations.length > 0 ? (
                        t.allocations.map((a) => (
                          <span
                            key={a.id}
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              a.isClassTeacher
                                ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-400'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                            title={a.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                          >
                            {a.className} ({a.subjectName}) {a.isClassTeacher && '★ CT'}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No classes allocated yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => {
                      setSelectedTeacher(t);
                      setIsAllocateModalOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Allocate Subject / Class
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400">No teachers found.</div>
          )}
        </div>
      ) : (
        /* Teacher Attendance */
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Faculty Daily Attendance</h2>
              <p className="text-xs text-slate-500">Mark or verify attendance for all teachers on date</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead>
                <tr className="bg-slate-50 uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Teacher Name</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Quick Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers?.map((t) => {
                  const existing = teacherAttendance?.find((a: any) => a.teacherId === t.id);
                  const currentStatus = existing?.status || 'Not Marked';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{t.employeeCode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{t.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{t.specialization}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 font-semibold text-[10px] ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : currentStatus === 'Absent'
                              ? 'bg-rose-100 text-rose-800'
                              : currentStatus === 'Late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() =>
                              markTeacherAttMutation.mutate({
                                teacherId: t.id,
                                date: attDate,
                                status: 'Present',
                              })
                            }
                            className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Present
                          </button>
                          <button
                            onClick={() =>
                              markTeacherAttMutation.mutate({
                                teacherId: t.id,
                                date: attDate,
                                status: 'Absent',
                              })
                            }
                            className="rounded bg-rose-50 px-2 py-1 font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() =>
                              markTeacherAttMutation.mutate({
                                teacherId: t.id,
                                date: attDate,
                                status: 'Late',
                              })
                            }
                            className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            Late
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {selectedTeacher && (
        <Modal
          isOpen={isAllocateModalOpen}
          onClose={() => setIsAllocateModalOpen(false)}
          title={`Allocate Classroom: ${selectedTeacher.fullName}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Select Classroom</label>
              <select
                value={allocClassId}
                onChange={(e) => setAllocClassId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Classroom --</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Select Subject</label>
              <select
                value={allocSubjectId}
                onChange={(e) => setAllocSubjectId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Subject --</option>
                {subjects?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isClassTeacher"
                checked={isClassTeacher}
                onChange={(e) => setIsClassTeacher(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isClassTeacher" className="text-xs font-medium text-slate-700">
                Designate as Class Teacher (Primary Guardian of Class)
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setIsAllocateModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!allocClassId || !allocSubjectId || allocateMutation.isPending}
                onClick={() =>
                  allocateMutation.mutate({
                    teacherId: selectedTeacher.id,
                    classRoomId: allocClassId,
                    subjectId: allocSubjectId,
                    isClassTeacher,
                  })
                }
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Save Allocation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Teacher Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Faculty Teacher"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">First Name *</label>
              <input
                type="text"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. Sarah"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Last Name *</label>
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. Jenkins"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="sjenkins@institution.edu"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="+1 555-0199"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Qualification *</label>
              <input
                type="text"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. M.Sc Mathematics, B.Ed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Specialization *</label>
              <input
                type="text"
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. Pure Mathematics"
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
              disabled={!newFirstName || !newLastName || !newEmail || createTeacherMutation.isPending}
              onClick={() =>
                createTeacherMutation.mutate({
                  firstName: newFirstName,
                  lastName: newLastName,
                  email: newEmail,
                  phoneNumber: newPhone,
                  qualification: newQualification || 'B.Ed',
                  specialization: newSpecialization || 'General',
                  joiningDate: new Date().toISOString(),
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Faculty Member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeachersListPage;
