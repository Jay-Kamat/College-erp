import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { User } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Shield, Plus, Search, CheckCircle, XCircle, Key } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [role, setRole] = useState('Admin');

  const { data, isLoading } = useQuery({
    queryKey: ['users-list', page, search],
    queryFn: () => adminApi.getUsers({ page, pageSize: 10, search: search || undefined }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      alert(`Status update failed: ${err.message}`);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsAddUserModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      alert('System user account created successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to create user: ${err.response?.data?.detail || err.message}`);
    },
  });

  const columns = [
    {
      header: 'Full Name',
      accessor: (row: User) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Assigned Roles',
      accessor: (row: User) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map((r) => (
            <span
              key={r}
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                r === 'SuperAdmin'
                  ? 'bg-purple-100 text-purple-800'
                  : r === 'Admin'
                  ? 'bg-indigo-100 text-indigo-800'
                  : r === 'Accountant'
                  ? 'bg-amber-100 text-amber-800'
                  : r === 'Teacher'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Account Status',
      accessor: (row: User) => (
        <button
          onClick={() => toggleStatusMutation.mutate({ id: row.id, isActive: !row.isActive })}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            row.isActive
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
          }`}
        >
          {row.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {row.isActive ? 'Active' : 'Deactivated'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Identity & Access Management</h1>
          <p className="text-sm text-slate-500">
            System accounts, multi-role security governance, password resets and account activity
          </p>
        </div>
        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create System User
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      {/* Create User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Create System User Account"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Assign Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="Admin">Admin</option>
                <option value="Accountant">Accountant</option>
                <option value="Teacher">Teacher</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Initial Password *</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!firstName || !lastName || !email || !password || createUserMutation.isPending}
              onClick={() =>
                createUserMutation.mutate({
                  firstName,
                  lastName,
                  email,
                  password,
                  roles: [role],
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Account
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
