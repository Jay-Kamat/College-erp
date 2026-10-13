import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { examsApi, academicApi } from '../../api/endpoints';
import { Save, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const MarksEntryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const examIdParam = searchParams.get('examId') || '';
  const subjectIdParam = searchParams.get('subjectId') || '';

  const [selectedExamId, setSelectedExamId] = useState(examIdParam);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectIdParam);
  const [marksState, setMarksState] = useState<
    { studentId: string; rollNumber: string; studentName: string; marksObtained: number; isAbsent: boolean; remarks: string }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all exams
  const { data: exams } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => examsApi.getList(),
  });

  // Current exam details
  const activeExam = exams?.find((e) => e.id === selectedExamId);

  // Fetch marks for selected exam & subject
  const { data: marksData, isLoading } = useQuery({
    queryKey: ['exam-marks', selectedExamId, selectedSubjectId],
    queryFn: () => examsApi.getMarks(selectedExamId, selectedSubjectId),
    enabled: !!selectedExamId && !!selectedSubjectId,
  });

  useEffect(() => {
    if (marksData) {
      setMarksState(
        marksData.map((m: any) => ({
          studentId: m.studentId,
          rollNumber: m.rollNumber || 'N/A',
          studentName: m.studentName || 'Student',
          marksObtained: m.marksObtained ?? 0,
          isAbsent: m.isAbsent ?? false,
          remarks: m.remarks || '',
        }))
      );
    }
  }, [marksData]);

  const activeExamSubject = activeExam?.subjects?.find((s) => s.subjectId === selectedSubjectId);

  const saveMutation = useMutation({
    mutationFn: (data: any) => examsApi.saveMarks(selectedExamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-marks', selectedExamId, selectedSubjectId] });
      setSuccessMessage('Student marks submitted and saved successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      alert(`Failed to save marks: ${err.response?.data?.detail || err.message}`);
    },
  });

  const handleMarksChange = (studentId: string, val: number) => {
    setMarksState((prev) =>
      prev.map((m) => (m.studentId === studentId ? { ...m, marksObtained: val } : m))
    );
  };

  const handleAbsentChange = (studentId: string, isAbsent: boolean) => {
    setMarksState((prev) =>
      prev.map((m) => (m.studentId === studentId ? { ...m, isAbsent, marksObtained: isAbsent ? 0 : m.marksObtained } : m))
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setMarksState((prev) =>
      prev.map((m) => (m.studentId === studentId ? { ...m, remarks } : m))
    );
  };

  const handleSave = () => {
    if (!activeExamSubject) {
      alert('Exam subject definition missing.');
      return;
    }

    saveMutation.mutate({
      examSubjectId: activeExamSubject.id,
      marks: marksState.map((m) => ({
        studentId: m.studentId,
        marksObtained: m.marksObtained,
        isAbsent: m.isAbsent,
        remarks: m.remarks || undefined,
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/exams')}
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grading & Score Entry</h1>
            <p className="text-sm text-slate-500">Record academic performance scores for exam subjects</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || marksState.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : 'Submit & Save Marks'}
        </button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Selectors */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700">Select Examination</label>
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setSelectedSubjectId('');
              setSearchParams({ examId: e.target.value });
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">-- Choose Exam --</option>
            {exams?.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.className})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">Select Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSearchParams({ examId: selectedExamId, subjectId: e.target.value });
            }}
            disabled={!selectedExamId}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
          >
            <option value="">-- Choose Subject --</option>
            {activeExam?.subjects?.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.subjectName} (Max: {s.maxMarks} / Pass: {s.passMarks})
              </option>
            ))}
          </select>
        </div>

        {activeExamSubject && (
          <div className="flex items-center justify-around rounded-lg bg-slate-50 p-2 text-xs">
            <div>
              <span className="text-slate-400">Max Score:</span>
              <p className="text-base font-bold text-slate-800">{activeExamSubject.maxMarks} pts</p>
            </div>
            <div>
              <span className="text-slate-400">Passing Threshold:</span>
              <p className="text-base font-bold text-emerald-700">{activeExamSubject.passMarks} pts</p>
            </div>
          </div>
        )}
      </div>

      {/* Marks Table */}
      {selectedExamId && selectedSubjectId ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead>
              <tr className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5">Roll No</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Absent</th>
                <th className="px-4 py-3.5">Score (Max: {activeExamSubject?.maxMarks || 100})</th>
                <th className="px-4 py-3.5">Evaluation Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading student grade records...
                  </td>
                </tr>
              ) : marksState.length > 0 ? (
                marksState.map((rec) => (
                  <tr key={rec.studentId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{rec.rollNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{rec.studentName}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={rec.isAbsent}
                        onChange={(e) => handleAbsentChange(rec.studentId, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        disabled={rec.isAbsent}
                        value={rec.marksObtained}
                        onChange={(e) => handleMarksChange(rec.studentId, Number(e.target.value))}
                        min={0}
                        max={activeExamSubject?.maxMarks || 100}
                        className="w-24 rounded-md border border-slate-300 px-3 py-1 font-bold text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="e.g. Excellent grasp, good presentation..."
                        value={rec.remarks}
                        onChange={(e) => handleRemarksChange(rec.studentId, e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1 text-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students found for this exam cohort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          Please select both an Examination and a Subject above to enter grades.
        </div>
      )}
    </div>
  );
};

export default MarksEntryPage;
