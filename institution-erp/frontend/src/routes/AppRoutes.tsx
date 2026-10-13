import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';

// Layouts
import { MainLayout } from '../layouts/MainLayout';
import { PublicLayout } from '../layouts/PublicLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/auth/PasswordPages';

// Public Admission Pages
import { ApplyAdmissionPage, CheckAdmissionStatusPage } from '../pages/public/AdmissionPublicPages';

// Dashboards
import { AdminDashboardPage } from '../pages/dashboards/AdminDashboardPage';
import { AccountantDashboardPage } from '../pages/dashboards/AccountantDashboardPage';
import { TeacherDashboardPage } from '../pages/dashboards/TeacherDashboardPage';
import { ParentDashboardPage } from '../pages/dashboards/ParentDashboardPage';

// Modules
import { AdmissionsQueuePage } from '../pages/admissions/AdmissionsQueuePage';
import { StudentsListPage } from '../pages/students/StudentsListPage';
import { TeachersListPage } from '../pages/teachers/TeachersListPage';
import { ClassesPage } from '../pages/academics/ClassesPage';
import { TimetablePage } from '../pages/academics/TimetablePage';
import { MarkAttendancePage } from '../pages/attendance/MarkAttendancePage';
import { ExamsListPage } from '../pages/exams/ExamsListPage';
import { MarksEntryPage } from '../pages/exams/MarksEntryPage';
import { ResultsViewPage } from '../pages/exams/ResultsViewPage';
import { FeeManagementPage } from '../pages/fees/FeeManagementPage';
import { FeeDefaultersPage } from '../pages/fees/FeeDefaultersPage';
import { NoticesPage } from '../pages/notices/NoticesPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';

// Smart Dashboard Dispatcher
const RoleDashboardDispatcher: React.FC = () => {
  const { user } = useAuth();

  if (!user || !user.roles || user.roles.length === 0) {
    return <AdminDashboardPage />;
  }

  if (user.roles.includes('SuperAdmin') || user.roles.includes('Admin')) {
    return <AdminDashboardPage />;
  }
  if (user.roles.includes('Accountant')) {
    return <AccountantDashboardPage />;
  }
  if (user.roles.includes('Teacher')) {
    return <TeacherDashboardPage />;
  }
  if (user.roles.includes('Parent') || user.roles.includes('Student')) {
    return <ParentDashboardPage />;
  }

  return <AdminDashboardPage />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes with Public Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/admissions/apply" element={<ApplyAdmissionPage />} />
        <Route path="/admissions/status" element={<CheckAdmissionStatusPage />} />
      </Route>

      {/* Standalone Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes with Main ERP Layout */}
      <Route element={<MainLayout />}>
        {/* Default route redirects to /dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RoleDashboardDispatcher />} />
        <Route path="/portal" element={<ParentDashboardPage />} />

        {/* Modules */}
        <Route path="/admissions" element={<AdmissionsQueuePage />} />
        <Route path="/students" element={<StudentsListPage />} />
        <Route path="/teachers" element={<TeachersListPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/attendance" element={<MarkAttendancePage />} />
        <Route path="/attendance/mark" element={<MarkAttendancePage />} />
        <Route path="/attendance/low" element={<MarkAttendancePage />} />

        {/* Exams & Results */}
        <Route path="/exams" element={<ExamsListPage />} />
        <Route path="/exams/marks" element={<MarksEntryPage />} />
        <Route path="/exams/results" element={<ResultsViewPage />} />

        {/* Fees */}
        <Route path="/fees" element={<FeeManagementPage />} />
        <Route path="/fees/defaulters" element={<FeeDefaultersPage />} />

        {/* Notices */}
        <Route path="/notices" element={<NoticesPage />} />

        {/* Admin Governance */}
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
