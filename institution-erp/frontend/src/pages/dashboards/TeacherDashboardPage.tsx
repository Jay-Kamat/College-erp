import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/ui/StatCard';
import { BookOpen, Calendar, Clock, CheckSquare, Award, ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TeacherDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: dashboardApi.getTeacher,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-indigo-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="font-medium text-slate-700">Loading Faculty Workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="font-semibold">Failed to load teacher dashboard data.</p>
        <p className="text-sm text-rose-600">Please verify API connection on http://localhost:5050</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome, {data.teacherName}
          </h1>
          <p className="text-sm text-slate-500">Your daily teaching schedule, class rosters and grading queue</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/attendance/mark"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <CheckSquare className="mr-1.5 h-4 w-4" />
            Mark Today's Attendance
          </Link>
          <Link
            to="/exams"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Award className="mr-1.5 h-4 w-4 text-indigo-600" />
            Marks & Grading
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Periods Scheduled Today"
          value={data.todayClassesCount}
          icon={Clock}
          color="indigo"
          description="Lectures on your timetable today"
        />
        <StatCard
          title="Allocated Classes"
          value={data.totalAllocatedClasses}
          icon={BookOpen}
          color="emerald"
          description="Assigned classroom cohorts"
        />
        <StatCard
          title="Pending Exam Grading"
          value={data.pendingMarksEntryExams?.length || 0}
          icon={Award}
          color="amber"
          description="Exams awaiting score entry"
        />
      </div>

      {/* Grid: Schedule & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Timetable */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Today's Lecture Schedule</h2>
              <p className="text-xs text-slate-500">Chronological timetable for your active periods</p>
            </div>
            <Link to="/timetable" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Weekly Schedule &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {data.todaySchedule && data.todaySchedule.length > 0 ? (
              data.todaySchedule.map((slot, idx) => (
                <div
                  key={slot.id || idx}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/30"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-indigo-100 font-mono text-indigo-700">
                      <span className="text-[10px] uppercase font-bold">Slot</span>
                      <span className="text-sm font-bold">{slot.periodNumber}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{slot.subjectName}</h3>
                      <p className="text-xs font-medium text-indigo-600">{slot.className}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {slot.roomNumber && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Room {slot.roomNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/attendance/mark?classId=${slot.classRoomId}`}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                  >
                    Attendance
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                <Calendar className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-700">No classes scheduled for today!</p>
                <p className="text-xs text-slate-400">Enjoy your preparation time or check weekly schedule.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Classes for Attendance & Pending Grading */}
        <div className="space-y-6">
          {/* Quick Attendance Mark */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Your Assigned Classes</h2>
            <p className="mb-3 text-xs text-slate-500">Click to record or review attendance</p>

            <div className="space-y-2">
              {data.classesToMarkAttendance && data.classesToMarkAttendance.length > 0 ? (
                data.classesToMarkAttendance.map((cls) => (
                  <Link
                    key={cls.id}
                    to={`/attendance/mark?classId=${cls.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 hover:border-indigo-300 hover:bg-slate-50"
                  >
                    <span className="text-xs font-semibold text-slate-800">{cls.fullName}</span>
                    <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                      Mark &rarr;
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-slate-400">No classes assigned.</p>
              )}
            </div>
          </div>

          {/* Pending Marks Entry */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Pending Exam Grading</h2>
            <p className="mb-3 text-xs text-slate-500">Exams requiring your score inputs</p>

            <div className="space-y-2.5">
              {data.pendingMarksEntryExams && data.pendingMarksEntryExams.length > 0 ? (
                data.pendingMarksEntryExams.map((es) => (
                  <div key={es.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
                    <p className="text-xs font-semibold text-slate-800">{es.subjectName}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                      <span>Max: {es.maxMarks} pts</span>
                      <Link
                        to={`/exams/marks?examId=${es.examId}&subjectId=${es.subjectId}`}
                        className="font-semibold text-amber-800 hover:underline"
                      >
                        Enter Marks &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckSquare className="h-4 w-4" />
                  <span>All exam grades are up to date!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
