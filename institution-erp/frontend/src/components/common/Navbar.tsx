import React from 'react';
import { useAuth } from '../../store/authContext';
import { NotificationDropdown } from './NotificationDropdown';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              CampusCore ERP
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 leading-none">
              Educational Institution Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationDropdown />

          {/* User profile capsule */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.firstName?.[0] ?? <UserIcon className="w-4 h-4" />}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.fullName}
              </p>
              <div className="flex gap-1 mt-0.5">
                {user?.roles?.map((r) => (
                  <span
                    key={r}
                    className="inline-block px-1.5 py-0.2 text-[9px] font-semibold tracking-wide uppercase bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 rounded"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
