import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Line, Bar } from 'react-chartjs-2';
import '../../utils/chartSetup';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/ui/StatCard';
import { Users, GraduationCap, School, DollarSign, CalendarCheck, AlertTriangle, ArrowRight, Bell, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardApi.getAdmin,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-indigo-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="font-medium text-slate-700">Loading Executive Analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="font-semibold">Failed to load admin dashboard data.</p>
        <p className="text-sm text-rose-600">Please verify API connection on http://localhost:5050</p>
      </div>
    );
  }

  // Monthly fee collection trend
  const feeMonths = data.monthlyFeeCollectionTrend?.map((t) => t.label) || [];
  const feeValues = data.monthlyFeeCollectionTrend?.map((t) => t.value) || [];
  const feeChartData = {
    labels: feeMonths,
    datasets: [
      {
        label: 'Collected ($/₹)',
        data: feeValues,
        backgroundColor: '#4f46e5',
        borderRadius: 6,
      },
    ],
  };

  // 30 days attendance trend
  const attTrendDates = data.attendanceTrend30Days?.map((t) => t.label) || [];
  const attTrendPercents = data.attendanceTrend30Days?.map((t) => t.value) || [];
  const attTrendChartData = {
    labels: attTrendDates,
    datasets: [
      {
        label: 'Daily Attendance %',
        data: attTrendPercents,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };

  // Class wise strength bar chart
  const classLabels = data.classWiseStrength?.map((c) => c.className) || [];
  const classCounts = data.classWiseStrength?.map((c) => c.studentCount) || [];
  const classStrengthData = {
    labels: classLabels,
    datasets: [
      {
        label: 'Enrolled Students',
        data: classCounts,
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Institution Executive Dashboard</h1>
          <p className="text-sm text-slate-500">Live operational overview, academic metrics & financial health</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/attendance/mark"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Mark Daily Attendance
          </Link>
          <Link
            to="/fees"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Collect Fees
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Students"
          value={data.totalStudents}
          icon={GraduationCap}
          trend={{ value: `${data.totalClasses} Active Classes`, isPositive: true }}
          description="Total enrolled student body"
        />
        <StatCard
          title="Faculty Teachers"
          value={data.totalTeachers}
          icon={Users}
          color="emerald"
          description="Teaching staff across all depts"
        />
        <StatCard
          title="Month Fee Collection"
          value={`$${(data.monthlyFeeCollected || 0).toLocaleString()}`}
          icon={DollarSign}
          color="amber"
          trend={{ value: `$${(data.totalPendingFees || 0).toLocaleString()} pending`, isPositive: false }}
          description="Inflow this calendar month"
        />
        <StatCard
          title="Today's Attendance"
          value={`${(data.todayAttendancePercentage || 0).toFixed(1)}%`}
          icon={CalendarCheck}
          color={data.todayAttendancePercentage < 75 ? 'rose' : 'cyan'}
          description="Students reported today"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fee Collection Trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Fee Inflow Trend (Last 6 Months)</h2>
              <p className="text-xs text-slate-500">Collected tuition, admission & lab fees</p>
            </div>
            <Link to="/fees" className="text-xs font-semibold text-indigo-600 hover:underline">
              Ledger &rarr;
            </Link>
          </div>
          <div className="h-64">
            <Bar
              data={feeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        {/* Class-wise Strength */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Student Strength by Classroom</h2>
              <p className="text-xs text-slate-500">Capacity and cohort balance</p>
            </div>
            <Link to="/classes" className="text-xs font-semibold text-indigo-600 hover:underline">
              Manage Classes &rarr;
            </Link>
          </div>
          <div className="h-64">
            <Bar
              data={classStrengthData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Row: 30-day Trend & Recent Admissions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Trend Line */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">30-Day Attendance Health Curve</h2>
              <p className="text-xs text-slate-500">Institution-wide daily percentage fluctuations</p>
            </div>
            <Link to="/attendance/low" className="text-xs font-semibold text-indigo-600 hover:underline">
              Low Attendance Watchlist &rarr;
            </Link>
          </div>
          <div className="h-64">
            <Line
              data={attTrendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 40, max: 100 } },
              }}
            />
          </div>
        </div>

        {/* Recent Admissions Queue */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">New Admissions</h2>
                <p className="text-xs text-slate-500">Recent student applicants</p>
              </div>
              <Link to="/admissions" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {data.recentAdmissions && data.recentAdmissions.length > 0 ? (
                data.recentAdmissions.map((adm) => (
                  <div key={adm.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">{adm.fullName}</p>
                      <p className="text-[11px] text-slate-500">
                        {adm.desiredClassName} • Ref: {adm.referenceNumber}
                      </p>
                    </div>
                    <span
                      className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${
                        adm.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : adm.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : adm.status === 'Waitlisted'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {adm.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No recent applications submitted.</p>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <Link
              to="/admissions"
              className="flex items-center justify-between text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <span>Process Pending Applications</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
