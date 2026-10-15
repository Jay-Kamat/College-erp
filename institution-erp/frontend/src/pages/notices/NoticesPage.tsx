import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi, academicApi } from '../../api/endpoints';
import { Notice } from '../../types';
import Modal from '../../components/ui/Modal';
import { Bell, Pin, Plus, Trash2, Calendar, Users, Filter } from 'lucide-react';
import { useAuth } from '../../store/authContext';

export const NoticesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isPrincipal = hasRole('Principal');
  const queryClient = useQueryClient();

  const [audienceFilter, setAudienceFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('All');
  const [isPinned, setIsPinned] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  const { data: notices, isLoading } = useQuery({
    queryKey: ['notices-list'],
    queryFn: noticesApi.getList,
  });

  const createNoticeMutation = useMutation({
    mutationFn: (data: any) => noticesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices-list'] });
      setIsCreateModalOpen(false);
      setTitle('');
      setContent('');
      setIsPinned(false);
      alert('Notice broadcasted successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to publish notice: ${err.message}`);
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (id: string) => noticesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices-list'] });
    },
  });

  const filteredNotices = notices?.filter((n) => {
    if (!audienceFilter) return true;
    return n.audience === audienceFilter || n.audience === 'All';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campus Noticeboard & Circulars</h1>
          <p className="text-sm text-slate-500">
            Institutional announcements, academic calendars, holiday notices and emergency alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPrincipal && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Publish Notice
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">Audience Filter:</span>
        <div className="flex gap-1.5">
          {['', 'All', 'Principal', 'Teacher', 'Student'].map((aud) => (
            <button
              key={aud}
              onClick={() => setAudienceFilter(aud)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                audienceFilter === aud
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {aud || 'Show Everything'}
            </button>
          ))}
        </div>
      </div>

      {/* Notices Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading notices...</div>
        ) : filteredNotices && filteredNotices.length > 0 ? (
          filteredNotices.map((n) => (
            <div
              key={n.id}
              className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all ${
                n.isPinned
                  ? 'border-indigo-200 bg-indigo-50/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {n.isPinned && (
                      <span className="flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Audience: {n.audience}
                    </span>
                  </div>
                  {isPrincipal && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this notice?')) {
                          deleteNoticeMutation.mutate(n.id);
                        }
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="mt-2 text-base font-bold text-slate-900">{n.title}</h3>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-600 leading-relaxed">{n.content}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <span>Posted by: {n.postedBy || 'Principal'}</span>
                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">No notices posted.</div>
        )}
      </div>

      {/* Publish Notice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Broadcast Campus Notice"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Sports Meet 2026 Schedule"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Audience Scope *</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="All">All Campus (Faculty & Students)</option>
              <option value="Principal">Principal Executive</option>
              <option value="Teacher">Faculty Only</option>
              <option value="Student">Students Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Notice Body *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Detailed announcement text..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinNotice"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="pinNotice" className="text-xs font-medium text-slate-700">
              Pin to top of noticeboard
            </label>
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
              disabled={!title || !content || createNoticeMutation.isPending}
              onClick={() =>
                createNoticeMutation.mutate({
                  title,
                  content,
                  audience,
                  isPinned,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Publish Circular
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NoticesPage;
