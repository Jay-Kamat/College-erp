import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, parentsApi, feesApi, examsApi } from '../../api/endpoints';
import StatCard from '../../components/ui/StatCard';
import { GraduationCap, CalendarCheck, DollarSign, Bell, Award, BookOpen, Clock, Download, ChevronDown } from 'lucide-react';
import { useAuth } from '../../store/authContext';

export const ParentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);

  // If user is Parent, fetch their children
  const isParent = user?.roles.includes('Parent');
  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentsApi.getMyChildren,
    enabled: isParent,
  });

  // Current active student id: selected or first child
  const effectiveStudentId = selectedStudentId || (children && children.length > 0 ? children[0].id : undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-dashboard', effectiveStudentId],
    queryFn: () => dashboardApi.getParent(effectiveStudentId),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-indigo-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="font-medium text-slate-700">Loading Student Portal...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="font-semibold">Failed to load student dashboard details.</p>
        <p className="text-sm text-rose-600">Please verify API connection or child profile links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Child Switcher for Parents */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.studentName}</h1>
            <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
              {data.className}
            </span>
          </div>
          <p className="text-sm text-slate-500">Roll Number: {data.rollNumber || 'N/A'} • Student Academic Profile</p>
        </div>

        {isParent && children && children.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Switch Ward:</label>
            <select
              value={effectiveStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.className})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Attendance Record"
          value={`${data.attendancePercentage.toFixed(1)}%`}
          icon={CalendarCheck}
          color={data.attendancePercentage < 75 ? 'rose' : 'emerald'}
          trend={{
            value: data.attendancePercentage < 75 ? 'Low Attendance Alert' : 'Good Standing',
            isPositive: data.attendancePercentage >= 75,
          }}
          description="Cumulative across term"
        />
        <StatCard
          title="Outstanding Fees"
          value={`$${data.feesDue.toLocaleString()}`}
          icon={DollarSign}
          color={data.feesDue > 0 ? 'rose' : 'emerald'}
          description={data.feesDue > 0 ? 'Payment required' : 'All clear for current term'}
        />
        <StatCard
          title="Academic Performance"
          value="Grade A"
          icon={Award}
          color="indigo"
          description={data.latestExamResultSummary || 'Regular evaluation in progress'}
        />
      </div>

      {/* Main Grid: Weekly Schedule & Notices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Timetable Schedule */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Class Timetable & Faculty</h2>
            <p className="text-xs text-slate-500">Daily subject periods and teacher assignments</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead>
                <tr className="bg-slate-50 font-semibold uppercase text-slate-500">
                  <th className="px-3 py-2.5">Period</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">Teacher</th>
                  <th className="px-3 py-2.5">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.timetable && data.timetable.length > 0 ? (
                  data.timetable.map((t, idx) => (
                    <tr key={t.id || idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-bold text-indigo-700">P{t.periodNumber}</td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {t.startTime} - {t.endTime}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{t.subjectName}</td>
                      <td className="px-3 py-2.5 text-slate-600">{t.teacherName || 'Faculty'}</td>
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Official Notices</h2>
              <p className="text-xs text-slate-500">Circulars for students & parents</p>
            </div>
            <Bell className="h-4 w-4 text-amber-500" />
          </div>

          <div className="space-y-3">
            {data.recentNotices && data.recentNotices.length > 0 ? (
              data.recentNotices.map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <h3 className="text-xs font-bold text-slate-800">{n.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-3">{n.content}</p>
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
