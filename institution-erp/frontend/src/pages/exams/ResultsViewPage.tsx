import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { examsApi, studentsApi } from '../../api/endpoints';
import { Award, Download, FileText, CheckCircle, XCircle } from 'lucide-react';

export const ResultsViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialExamId = searchParams.get('examId') || '';

  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch exams
  const { data: exams } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => examsApi.getList(),
  });

  React.useEffect(() => {
    if (exams && exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const activeExam = exams?.find((e) => e.id === selectedExamId);

  // Fetch students for active exam class
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students-exam-results', activeExam?.classRoomId],
    queryFn: () => studentsApi.getList({ classId: activeExam!.classRoomId, pageSize: 100 }),
    enabled: !!activeExam?.classRoomId,
  });

  const handleDownloadReportCard = async (studentId: string, studentName: string) => {
    try {
      setDownloadingId(studentId);
      await examsApi.downloadReportCard(selectedExamId, studentId, studentName);
    } catch (err) {
      alert('Failed to generate QuestPDF report card. Please ensure marks are entered.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Report Cards & Results</h1>
          <p className="text-sm text-slate-500">
            Publish evaluation results and download branded QuestPDF student report cards
          </p>
        </div>
      </div>

      {/* Select Exam */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-semibold text-slate-700">Select Examination:</label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">-- Choose Examination --</option>
          {exams?.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} ({ex.className}) {ex.isPublished ? '✓ Published' : '• Draft'}
            </option>
          ))}
        </select>
      </div>

      {/* Results Table */}
      {selectedExamId ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead>
              <tr className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5">Roll No</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Class</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Official Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading cohort student cards...
                  </td>
                </tr>
              ) : studentsData?.items && studentsData.items.length > 0 ? (
                studentsData.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{s.rollNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.className}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <CheckCircle className="h-3 w-3" />
                        Evaluated
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownloadReportCard(s.id, s.fullName)}
                        disabled={downloadingId === s.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === s.id ? 'Generating...' : 'QuestPDF Report Card'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students found in this exam cohort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          Please select an examination to view results and generate report cards.
        </div>
      )}
    </div>
  );
};

export default ResultsViewPage;
