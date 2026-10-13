import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi, academicApi, teachersApi } from '../../api/endpoints';
import { TimetableEntry } from '../../types';
import Modal from '../../components/ui/Modal';
import { Calendar, Plus, Trash2, Clock, MapPin, User, BookOpen } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6];

export const TimetablePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday default
  const [periodNumber, setPeriodNumber] = useState(1);
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:50');
  const [roomNumber, setRoomNumber] = useState('Room 101');

  // Load classes, teachers, subjects
  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  React.useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const { data: teachers } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: teachersApi.getList,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: academicApi.getSubjects,
  });

  // Load timetable for active class
  const { data: timetable, isLoading } = useQuery({
    queryKey: ['timetable-class', selectedClassId],
    queryFn: () => timetableApi.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const createSlotMutation = useMutation({
    mutationFn: (data: any) => timetableApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-class', selectedClassId] });
      setIsAddModalOpen(false);
      alert('Timetable period scheduled successfully!');
    },
    onError: (err: any) => {
      alert(`Clash / Scheduling Error: ${err.response?.data?.detail || err.message}`);
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => timetableApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-class', selectedClassId] });
    },
    onError: (err: any) => {
      alert(`Failed to delete period: ${err.message}`);
    },
  });

  // Find slot for day & period
  const getSlot = (dayIdx: number, period: number) => {
    return timetable?.find((t) => {
      const dayMatches =
        typeof t.dayOfWeek === 'number'
          ? t.dayOfWeek === dayIdx
          : String(t.dayOfWeek).toLowerCase() === DAYS[dayIdx]?.toLowerCase();
      return dayMatches && t.periodNumber === period;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Institutional Timetable</h1>
          <p className="text-sm text-slate-500">
            Interactive weekly schedule matrix, teacher allocations and lecture period distribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={!selectedClassId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Period
          </button>
        </div>
      </div>

      {/* Weekly Matrix Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3.5">Day</th>
              {PERIODS.map((p) => (
                <th key={p} className="px-4 py-3.5 text-center">
                  Period {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {[1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <tr key={dayIdx} className="hover:bg-slate-50/50">
                <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-900">
                  {DAYS[dayIdx]}
                </td>
                {PERIODS.map((periodIdx) => {
                  const slot = getSlot(dayIdx, periodIdx);

                  return (
                    <td key={periodIdx} className="min-w-[150px] p-2 align-top">
                      {slot ? (
                        <div className="group relative rounded-lg border border-indigo-100 bg-indigo-50/60 p-2.5 transition-all hover:border-indigo-300 hover:bg-indigo-50">
                          <p className="font-bold text-slate-900 text-xs">{slot.subjectName}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-indigo-700 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {slot.teacherName}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {slot.startTime} - {slot.endTime}
                            </span>
                            {slot.roomNumber && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {slot.roomNumber}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              if (window.confirm(`Remove Period ${periodIdx} (${slot.subjectName})?`)) {
                                deleteSlotMutation.mutate(slot.id);
                              }
                            }}
                            className="absolute right-1 top-1 hidden rounded p-1 text-rose-500 hover:bg-rose-100 group-hover:block"
                            title="Remove Period"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setDayOfWeek(dayIdx);
                            setPeriodNumber(periodIdx);
                            setIsAddModalOpen(true);
                          }}
                          className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 hover:text-indigo-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Slot Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Classroom Period"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Day of Week *</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {DAYS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Period Number *</label>
              <select
                value={periodNumber}
                onChange={(e) => setPeriodNumber(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    Period {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Subject *</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Subject --</option>
                {subjects?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Teacher *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Teacher --</option>
                {teachers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">End Time</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="09:50"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Room</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="Room 101"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!subjectId || !teacherId || createSlotMutation.isPending}
              onClick={() =>
                createSlotMutation.mutate({
                  classRoomId: selectedClassId,
                  subjectId,
                  teacherId,
                  dayOfWeek,
                  periodNumber,
                  startTime,
                  endTime,
                  roomNumber,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Period
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimetablePage;
