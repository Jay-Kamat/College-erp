import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { feesApi, studentsApi, academicApi } from '../../api/endpoints';
import { Student, StudentFee } from '../../types';
import Modal from '../../components/ui/Modal';
import { Search, CreditCard, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export const FeeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'collection' | 'structures'>('collection');

  // Student search state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('Cash');
  const [payRef, setPayRef] = useState<string>('');
  const [payRemarks, setPayRemarks] = useState<string>('');
  const [lastPaymentResult, setLastPaymentResult] = useState<{ id: string; receiptNumber?: string } | null>(null);

  // Search students
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => studentsApi.getList({ search: studentSearch, pageSize: 6 }),
    enabled: studentSearch.length >= 2,
  });

  // Recent students for quick selection
  const { data: recentStudents } = useQuery({
    queryKey: ['recent-students-fee-picker'],
    queryFn: () => studentsApi.getList({ pageSize: 5 }),
  });

  // Fetch fees for selected student
  const { data: studentFees, isLoading: isFeesLoading, refetch: refetchStudentFees } = useQuery({
    queryKey: ['student-fees', selectedStudent?.id],
    queryFn: () => feesApi.getStudentFees(selectedStudent!.id),
    enabled: !!selectedStudent,
  });

  // Fetch fee structures
  const { data: feeStructures } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => feesApi.getStructures(),
    enabled: activeTab === 'structures',
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: any) => feesApi.recordPayment(data),
    onSuccess: (res) => {
      refetchStudentFees();
      queryClient.invalidateQueries({ queryKey: ['accountant-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setIsPaymentModalOpen(false);
      setLastPaymentResult({ id: res.id, receiptNumber: (res as any).receiptNumber || 'REC' });
      alert('Fee payment recorded successfully! Click Download PDF to save official receipt.');
    },
    onError: (err: any) => {
      alert(`Payment failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  const handleDownloadReceipt = async (paymentId: string, receiptNo: string) => {
    try {
      await feesApi.downloadReceipt(paymentId, receiptNo);
    } catch (err) {
      alert('Failed to download receipt PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Institutional Fee Management</h1>
          <p className="text-sm text-slate-500">
            Accept counter payments, issue QuestPDF receipts, configure fee schedules & monitor defaulters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/fees/defaulters"
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
          >
            <AlertCircle className="h-4 w-4" />
            Defaulters Ledger
          </Link>

          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              onClick={() => setActiveTab('collection')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'collection' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Collect Fees
            </button>
            <button
              onClick={() => setActiveTab('structures')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeTab === 'structures' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fee Structures
            </button>
          </div>
        </div>
      </div>

      {lastPaymentResult && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Payment received! Official receipt #{lastPaymentResult.receiptNumber} generated.</span>
          </div>
          <button
            onClick={() => handleDownloadReceipt(lastPaymentResult.id, lastPaymentResult.receiptNumber || 'Receipt')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Download QuestPDF Receipt
          </button>
        </div>
      )}

      {activeTab === 'collection' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Student Search & Profile */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">1. Locate Student</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student name or roll #..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Search Results Dropdown */}
            {studentSearch.length >= 2 && (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
                {isSearching ? (
                  <p className="p-3 text-xs text-slate-400">Searching directory...</p>
                ) : searchResults?.items && searchResults.items.length > 0 ? (
                  searchResults.items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentSearch('');
                      }}
                      className="flex w-full items-center justify-between p-2.5 text-left text-xs hover:bg-indigo-50"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{s.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Roll: {s.rollNumber}</p>
                      </div>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                        {s.className}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-xs text-slate-400">No students matched.</p>
                )}
              </div>
            )}

            {/* Selected Student Card */}
            {selectedStudent ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Selected Candidate</span>
                <h3 className="mt-1 text-base font-bold text-slate-900">{selectedStudent.fullName}</h3>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>Roll No: <span className="font-semibold text-slate-800">{selectedStudent.rollNumber}</span></p>
                  <p>Class: <span className="font-semibold text-slate-800">{selectedStudent.className}</span></p>
                  <p>Status: <span className="font-semibold text-emerald-700">{selectedStudent.status}</span></p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Select Student:</p>
                <div className="flex flex-col gap-1.5">
                  {recentStudents?.items && recentStudents.items.length > 0 ? (
                    recentStudents.items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-left text-xs transition-all hover:border-indigo-300 hover:bg-indigo-50/60"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{s.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Roll: {s.rollNumber} • {s.className}</p>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600">Inspect →</span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      Search and select a student above to inspect fee ledger.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pending & Paid Fees */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold text-slate-900">2. Student Fee Ledger & Invoices</h2>
            <p className="text-xs text-slate-500">Scheduled fee heads, late penalties, collected sums and dues</p>

            {selectedStudent ? (
              <div className="mt-4 space-y-3">
                {isFeesLoading ? (
                  <p className="py-6 text-center text-xs text-slate-400">Loading fee records...</p>
                ) : studentFees && studentFees.length > 0 ? (
                  studentFees.map((sf) => (
                    <div
                      key={sf.id}
                      className="flex flex-col justify-between rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{sf.feeHeadName}</h4>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              sf.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sf.status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sf.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Due Date: {new Date(sf.dueDate).toLocaleDateString()} • Net Due: ${sf.totalPayable}
                        </p>
                        <p className="text-xs text-slate-500">
                          Paid: <span className="font-semibold text-emerald-700">${sf.paidAmount}</span> | Remaining Due:{' '}
                          <span className="font-semibold text-rose-700">${sf.balanceAmount}</span>
                        </p>
                      </div>

                      <div className="mt-3 sm:mt-0">
                        {sf.status !== 'Paid' ? (
                          <button
                            onClick={() => {
                              setSelectedFee(sf);
                              setPayAmount(sf.balanceAmount);
                              setIsPaymentModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Collect Payment
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Cleared
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No fee obligations assigned to this student.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center text-xs text-slate-400">
                Please select a student on the left to view fee items.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fee Structures View */
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Institutional Fee Structures</h2>
              <p className="text-xs text-slate-500">Configured tuition, admission, and facility fee schedules</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feeStructures?.map((fs) => (
              <div key={fs.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-sm font-bold text-slate-900">{fs.name}</h3>
                <p className="text-xs text-indigo-700 font-semibold">{fs.className}</p>
                <p className="mt-2 text-sm font-extrabold text-slate-800">Total: ${fs.totalAmount}</p>

                <div className="mt-3 divide-y divide-slate-100 rounded-lg bg-white p-2.5 text-xs">
                  {fs.items?.map((item) => (
                    <div key={item.id} className="flex justify-between py-1 text-slate-600">
                      <span>{item.feeHeadName}</span>
                      <span className="font-semibold text-slate-800">${item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Collection Modal */}
      {selectedFee && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Collect Payment: ${selectedFee.feeHeadName}`}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-indigo-50 p-3 text-xs">
              <p className="text-slate-600">Student: <span className="font-bold text-slate-800">{selectedStudent?.fullName}</span></p>
              <p className="text-slate-600">Total Balance Outstanding: <span className="font-bold text-rose-700">${selectedFee.balanceAmount}</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Payment Amount ($/₹) *</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                min={1}
                max={selectedFee.balanceAmount}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Payment Mode *</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="UPI">UPI / NetBanking</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Transaction / Cheque Ref</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. TXN-948104"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Receipt Notes / Remarks</label>
              <input
                type="text"
                value={payRemarks}
                onChange={(e) => setPayRemarks(e.target.value)}
                placeholder="Optional notes"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payAmount <= 0 || recordPaymentMutation.isPending}
                onClick={() =>
                  recordPaymentMutation.mutate({
                    studentFeeId: selectedFee.id,
                    amount: payAmount,
                    mode: payMode,
                    transactionReference: payRef || undefined,
                    remarks: payRemarks || undefined,
                  })
                }
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm & Generate Receipt'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeeManagementPage;
