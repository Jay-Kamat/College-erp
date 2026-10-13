import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { dashboardApi, parentsApi, studentsApi, academicApi } from '../../api/endpoints';
import StatCard from '../../components/ui/StatCard';
import {
  GraduationCap,
  CalendarCheck,
  DollarSign,
  Bell,
  Award,
  Clock,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  User,
  Users,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  School,
  IdCard,
  Hash,
  Calendar,
  Layers,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { Student } from '../../types';

export const ParentDashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStudentId = searchParams.get('studentId') || '';
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(urlStudentId || null);

  // Synchronize state with URL param
  useEffect(() => {
    setSelectedStudentId(urlStudentId || null);
  }, [urlStudentId]);

  const isParent = hasRole('Parent');
  const isStudent = hasRole('Student');
  const isStaffOrAdmin = hasRole(['SuperAdmin', 'Admin', 'Teacher']);

  // Admin filter states for student directory selector
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Fetch Parent's Wards (or Student's own record)
  const { data: myChildren, isLoading: isChildrenLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentsApi.getMyChildren,
    enabled: isParent || isStudent,
  });

  // 2. Fetch Classes for Admin filter dropdown
  const { data: classesList } = useQuery({
    queryKey: ['classes-list-portal'],
    queryFn: () => academicApi.getClasses(),
    enabled: isStaffOrAdmin && !selectedStudentId,
  });

  // 3. Fetch Students directory for Admin selector
  const { data: pagedStudents, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['portal-students-list', currentPage, searchQuery, classFilter],
    queryFn: () =>
      studentsApi.getList({
        page: currentPage,
        pageSize: 12,
        search: searchQuery || undefined,
        classId: classFilter || undefined,
        status: 'Active',
      }),
    enabled: isStaffOrAdmin && !selectedStudentId,
  });

  // 4. Fetch Selected Student's Dashboard details (ONLY when student is selected)
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ['parent-dashboard', selectedStudentId],
    queryFn: () => dashboardApi.getParent(selectedStudentId || undefined),
    enabled: !!selectedStudentId,
  });

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setSearchParams({ studentId: id });
  };

  const handleClearSelection = () => {
    setSelectedStudentId(null);
    setSearchParams({});
  };

  // =========================================================================
  // VIEW 1: STUDENT SELECTION SCREEN (When no student is selected yet)
  // =========================================================================
  if (!selectedStudentId) {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-7 text-white shadow-xl border border-slate-800">
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30 backdrop-blur-sm mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                <span>Parent & Student Academic Portal</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Select Student Profile
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
                Choose a student profile below to review their live academic performance, daily attendance roll, weekly timetables, fee ledgers, and official report cards.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-md border border-white/10 text-xs text-slate-200">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>
                {isParent
                  ? 'Authenticated Parent Guardian Access'
                  : isStudent
                  ? 'Authenticated Student Access'
                  : 'Administrative Portal Inspection'}
              </span>
            </div>
          </div>

          {/* Decorative glowing gradient backdrop */}
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* --- PARENT VIEW: Ward Cards Grid --- */}
        {isParent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <span>Your Registered Wards</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a child to view their complete academic records and daily schedule
                </p>
              </div>
              {myChildren && (
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {myChildren.length} {myChildren.length === 1 ? 'Ward Enrolled' : 'Wards Enrolled'}
                </span>
              )}
            </div>

            {isChildrenLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-56 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                        <div className="h-3 w-20 rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="h-3 w-full rounded bg-slate-100" />
                      <div className="h-3 w-2/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myChildren && myChildren.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myChildren.map((child: Student) => (
                  <div
                    key={child.id}
                    onClick={() => handleSelectStudent(child.id)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Top card accent line */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80 group-hover:opacity-100" />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                          {child.firstName?.[0] || 'S'}
                          {child.lastName?.[0] || ''}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {child.fullName}
                          </h3>
                          <span className="inline-flex items-center gap-1 mt-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            <School className="h-3 w-3" />
                            {child.className || 'Assigned Class'}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {child.status || 'Active'}
                      </span>
                    </div>

                    {/* Metadata specs */}
                    <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Roll Number</span>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          {child.rollNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Registration</span>
                        <p className="font-bold text-slate-700 dark:text-slate-200 truncate">
                          {child.studentRegistrationNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Blood Group</span>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          {child.bloodGroup || 'O+'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Admitted</span>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          {child.admissionDate ? new Date(child.admissionDate).toLocaleDateString() : 'Active Term'}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                        View Academic Profile & Schedule
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No Linked Student Profiles Found</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your guardian account does not currently have any student enrollments linked. Please contact the administrative office.
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- STUDENT VIEW (When logged in as Student user) --- */}
        {isStudent && !isParent && !isStaffOrAdmin && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span>Your Student Account</span>
            </h2>

            {myChildren && myChildren.length > 0 ? (
              <div className="max-w-md">
                {myChildren.map((child: Student) => (
                  <div
                    key={child.id}
                    onClick={() => handleSelectStudent(child.id)}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-md hover:shadow-xl hover:border-indigo-500 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-600/30">
                        {child.firstName?.[0]}
                        {child.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                          {child.fullName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {child.className} • Roll #{child.rollNumber}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition"
                    >
                      <span>Enter Student Academic Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* --- ADMIN / STAFF VIEW: Comprehensive Student Directory Selector --- */}
        {isStaffOrAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <span>Institutional Student Directory</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select any enrolled student to preview and inspect their portal, marks, attendance, and dues
                </p>
              </div>

              {pagedStudents && (
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Showing {pagedStudents.items.length} of {pagedStudents.totalCount} Students
                </span>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by name, roll number, or registration code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="">All Grades & Classes</option>
                  {classesList?.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Grid */}
            {isStudentsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-44 rounded-xl border border-slate-200 bg-white p-4 animate-pulse space-y-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : pagedStudents?.items && pagedStudents.items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {pagedStudents.items.map((student: Student) => (
                    <div
                      key={student.id}
                      onClick={() => handleSelectStudent(student.id)}
                      className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-500 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-sm font-bold text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {student.firstName?.[0] || 'S'}
                            {student.lastName?.[0] || ''}
                          </div>
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                            {student.className || 'Unassigned'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">
                          {student.fullName}
                        </h4>

                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Roll No:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {student.rollNumber || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Reg ID:</span>
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[110px]">
                              {student.studentRegistrationNumber || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        <span>Select Student</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagedStudents.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
                    <p className="text-xs text-slate-500">
                      Page {pagedStudents.pageNumber} of {pagedStudents.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagedStudents.hasPreviousPage}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!pagedStudents.hasNextPage}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-400" />
                <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No Students Match Your Criteria</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Try adjusting your search keywords or clearing the class filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setClassFilter('');
                  }}
                  className="mt-3 inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: STUDENT DETAILS DASHBOARD (When student has been selected)
  // =========================================================================
  if (isDashboardLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Loading student academic profile...
        </p>
      </div>
    );
  }

  if (dashboardError || !dashboardData) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleClearSelection}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Student Selection</span>
        </button>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900">
          <p className="font-semibold">Failed to load student dashboard details.</p>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            Please verify API connection or student enrollment records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Navigation & Student Switcher Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearSelection}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Switch / Select Another Student</span>
          </button>

          <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Viewing:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {dashboardData.studentName}
            </span>
            <span>•</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {dashboardData.className}
            </span>
          </div>
        </div>

        {/* Quick Dropdown Ward Switcher for Parents with multiple children */}
        {isParent && myChildren && myChildren.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Quick Switch Ward:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              {myChildren.map((c: Student) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.className})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Dropdown for Admins */}
        {isStaffOrAdmin && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Search All Students</span>
          </button>
        )}
      </div>

      {/* Student Overview Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white shadow-inner backdrop-blur-md border border-white/20">
              {dashboardData.studentName?.[0] || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {dashboardData.studentName}
                </h1>
                <span className="rounded-md bg-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                  {dashboardData.className}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Roll Number: <strong className="text-white">{dashboardData.rollNumber || 'N/A'}</strong> • Enrolled Academic Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Good Academic Standing</span>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Attendance Record"
          value={`${dashboardData.attendancePercentage.toFixed(1)}%`}
          icon={CalendarCheck}
          color={dashboardData.attendancePercentage < 75 ? 'rose' : 'emerald'}
          trend={{
            value: dashboardData.attendancePercentage < 75 ? 'Low Attendance Alert (<75%)' : 'Regular Attendance',
            isPositive: dashboardData.attendancePercentage >= 75,
          }}
          description="Cumulative presence across term"
        />
        <StatCard
          title="Outstanding Fees"
          value={`$${dashboardData.feesDue.toLocaleString()}`}
          icon={DollarSign}
          color={dashboardData.feesDue > 0 ? 'rose' : 'emerald'}
          trend={{
            value: dashboardData.feesDue > 0 ? 'Payment Required' : 'All Cleared',
            isPositive: dashboardData.feesDue === 0,
          }}
          description={dashboardData.feesDue > 0 ? 'Pending dues for active term' : 'No outstanding institutional dues'}
        />
        <StatCard
          title="Academic Performance"
          value={
            dashboardData.latestExamResultSummary?.includes('Grade')
              ? dashboardData.latestExamResultSummary.split('Grade')[1].trim().split(' ')[0]
              : 'Evaluated'
          }
          icon={Award}
          color="indigo"
          description={dashboardData.latestExamResultSummary || 'Regular evaluation in progress'}
        />
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/exams/results"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <Award className="h-4 w-4 text-indigo-600" />
          <span>Full Report Cards & Marks</span>
        </Link>
        <Link
          to="/fees"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span>Fee Ledger & Receipts</span>
        </Link>
        <Link
          to="/timetable"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <Clock className="h-4 w-4 text-amber-600" />
          <span>Weekly Timetable Grid</span>
        </Link>
        <Link
          to="/notices"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <Bell className="h-4 w-4 text-indigo-600" />
          <span>School Announcements</span>
        </Link>
      </div>

      {/* Main Grid: Weekly Schedule & Notices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Timetable Schedule */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Class Timetable & Faculty</h2>
              <p className="text-xs text-slate-500">Daily subject periods and teacher assignments</p>
            </div>
            <Link to="/timetable" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Schedule &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold uppercase text-slate-500">
                  <th className="px-3 py-2.5">Period</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">Teacher</th>
                  <th className="px-3 py-2.5">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {dashboardData.timetable && dashboardData.timetable.length > 0 ? (
                  dashboardData.timetable.map((t, idx) => (
                    <tr key={t.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-bold text-indigo-700 dark:text-indigo-400">P{t.periodNumber}</td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {t.startTime} - {t.endTime}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{t.subjectName}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{t.teacherName || 'Faculty'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{t.roomNumber || 'Room 101'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      No schedule posted for this class yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Campus Notices */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Official Notices</h2>
              <p className="text-xs text-slate-500">Circulars for students & parents</p>
            </div>
            <Bell className="h-4 w-4 text-amber-500" />
          </div>

          <div className="space-y-3">
            {dashboardData.recentNotices && dashboardData.recentNotices.length > 0 ? (
              dashboardData.recentNotices.map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{n.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3">{n.content}</p>
                  <span className="mt-2 block text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No active notices.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardPage;
