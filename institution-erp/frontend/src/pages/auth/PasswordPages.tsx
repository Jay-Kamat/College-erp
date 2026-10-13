import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">
          <Link to="/login" className="flex items-center gap-1.5 text-xs text-primary-600 mb-4 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Reset Password</h2>
          <p className="text-xs text-slate-500 mb-6">Enter your registered email to receive a password reset token.</p>

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex flex-col gap-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Token Dispatched!
              </div>
              <p>
                If an account with that email exists, an email has been scheduled. Check your inbox or proceed to the reset page.
              </p>
              <Link
                to="/reset-password"
                className="mt-2 inline-block text-center py-2 px-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
              >
                Enter Reset Token
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSubmitting ? 'Sending Request...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await authApi.resetPassword({ email, token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Verify token.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">
          <Link to="/login" className="flex items-center gap-1.5 text-xs text-primary-600 mb-4 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Enter New Password</h2>
          <p className="text-xs text-slate-500 mb-5">Provide the reset code sent to your email.</p>

          {error && <div className="p-3 mb-4 text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200">{error}</div>}

          {success ? (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex flex-col gap-3">
              <p className="font-bold">Password Reset Successful!</p>
              <Link to="/login" className="text-center py-2 bg-emerald-600 text-white rounded-lg font-semibold">
                Proceed to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reset Token</label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from email"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-sm"
              >
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
