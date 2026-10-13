import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/authContext';
import { Lock, Mail, GraduationCap, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          CampusCore Institution ERP
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Sign in to access your role-based academic portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50 shadow-md shadow-primary-500/20 transition-all"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-150 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Demo Logins (Click to Autofill)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('superadmin@institution.edu')}
                className="p-2 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">SuperAdmin</div>
                <div className="text-[10px] text-slate-400">Principal</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('admin@institution.edu')}
                className="p-2 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">Admin</div>
                <div className="text-[10px] text-slate-400">Admissions / Academic</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('accountant@institution.edu')}
                className="p-2 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">Accountant</div>
                <div className="text-[10px] text-slate-400">Fees & Collections</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('teacher1@institution.edu')}
                className="p-2 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">Teacher</div>
                <div className="text-[10px] text-slate-400">Attendance / Marks</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('student1@institution.edu')}
                className="p-2 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">Student</div>
                <div className="text-[10px] text-slate-400">Results / Fees</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('parent1@family.com')}
                className="p-2 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">Parent</div>
                <div className="text-[10px] text-slate-400">Child Portal Switcher</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/admissions/apply"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Apply for new student admission &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
