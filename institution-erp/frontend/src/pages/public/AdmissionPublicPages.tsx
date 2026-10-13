import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { admissionsApi, academicApi } from '../../api/endpoints';
import {
  CheckCircle2,
  Upload,
  ArrowRight,
  Search,
  Clock,
  Check,
  XCircle,
  FileText,
} from 'lucide-react';

export const ApplyAdmissionPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianRelation: 'Father',
    desiredClassRoomId: '',
    previousSchoolName: '',
    previousSchoolPercentage: '',
  });

  const [files, setFiles] = useState<{ idProof?: File; marksheet?: File }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: classes } = useQuery({
    queryKey: ['public-classes'],
    queryFn: academicApi.getClasses,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
        previousSchoolPercentage: parseFloat(formData.previousSchoolPercentage) || 0,
      };

      const result = await admissionsApi.apply(payload);

      // Upload documents if selected
      if (files.idProof) {
        const fd = new FormData();
        fd.append('file', files.idProof);
        fd.append('documentType', 'IdentityProof');
        await admissionsApi.uploadDoc(result.id, fd);
      }
      if (files.marksheet) {
        const fd = new FormData();
        fd.append('file', files.marksheet);
        fd.append('documentType', 'PreviousMarksheet');
        await admissionsApi.uploadDoc(result.id, fd);
      }

      setSuccessResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to submit application. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Application Submitted!</h2>
        <p className="text-sm text-slate-500 mt-2">
          Your admission form has been received. Please save your application reference number for tracking:
        </p>

        <div className="my-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-400 block uppercase">Reference Number</span>
          <span className="text-2xl font-mono font-black text-primary-600 dark:text-primary-400 mt-1 block">
            {successResult.referenceNumber}
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          An email confirmation has been sent to <strong>{formData.email}</strong>.
        </p>

        <a
          href={`/admissions/track?ref=${successResult.referenceNumber}`}
          className="inline-flex items-center gap-2 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
        >
          Track Application Status <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-150 dark:border-slate-800 pb-5 mb-8">
        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400 uppercase tracking-wider">
          Academic Year 2026-2027
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
          Online Student Admission Application
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete the form below to enroll. No login required. All fields marked with * are required.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Applicant Info */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-4">
            1. Applicant Personal Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Residential Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Section 2: Guardian Details */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-4">
            2. Parent / Guardian Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Guardian Name *</label>
              <input
                type="text"
                required
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Relationship *</label>
              <select
                value={formData.guardianRelation}
                onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Legal Guardian</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Guardian Phone *</label>
              <input
                type="tel"
                required
                value={formData.guardianPhone}
                onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Guardian Email *</label>
              <input
                type="email"
                required
                value={formData.guardianEmail}
                onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Course & Academic Record */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-4">
            3. Desired Program & Previous Academic History
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Desired Class / Grade *</label>
              <select
                required
                value={formData.desiredClassRoomId}
                onChange={(e) => setFormData({ ...formData, desiredClassRoomId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="">-- Select Class --</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Previous School / College</label>
              <input
                type="text"
                value={formData.previousSchoolName}
                onChange={(e) => setFormData({ ...formData, previousSchoolName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Previous Score / Percentage (%) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={formData.previousSchoolPercentage}
                onChange={(e) => setFormData({ ...formData, previousSchoolPercentage: e.target.value })}
                placeholder="e.g. 85.5"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Document Uploads */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-4">
            4. Supporting Document Uploads (PDF / JPG / PNG, Max 5MB)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Identity / Birth Certificate</p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFiles({ ...files, idProof: e.target.files?.[0] })}
                className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary-50 file:text-primary-600"
              />
            </div>
            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Previous School Marksheet</p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFiles({ ...files, marksheet: e.target.files?.[0] })}
                className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary-50 file:text-primary-600"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-3 px-8 text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const CheckAdmissionStatusPage: React.FC = () => {
  const [refInput, setRefInput] = useState('');
  const [queryRef, setQueryRef] = useState('');

  const { data: admission, isLoading, error } = useQuery({
    queryKey: ['admission-status', queryRef],
    queryFn: () => admissionsApi.getStatus(queryRef),
    enabled: !!queryRef,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (refInput.trim()) {
      setQueryRef(refInput.trim());
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-bold text-xs"><Check className="w-3.5 h-3.5" /> Approved</span>;
      case 'UnderReview':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full font-bold text-xs"><Clock className="w-3.5 h-3.5" /> Under Review</span>;
      case 'Waitlisted':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full font-bold text-xs"><Clock className="w-3.5 h-3.5" /> Waitlisted</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full font-bold text-xs"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-bold text-xs">Submitted</span>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Track Admission Application
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Enter the reference number provided upon application submission (e.g. ADM-2026-0001).
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="e.g. ADM-2026-0001"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl uppercase font-mono"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Track Status
          </button>
        </form>

        {isLoading && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Looking up application status...
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            No application found matching that reference number. Please verify and try again.
          </div>
        )}

        {admission && (
          <div className="mt-8 border-t border-slate-150 dark:border-slate-800 pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400 font-bold block">{admission.referenceNumber}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{admission.fullName}</h3>
                <p className="text-xs text-slate-500">Applied for: {admission.desiredClassName}</p>
              </div>
              <div>{getStatusBadge(admission.status)}</div>
            </div>

            {admission.reviewRemarks && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Administrative Remarks:</span>
                <p className="text-slate-600 dark:text-slate-400">{admission.reviewRemarks}</p>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Status Timeline</h4>
              <div className="space-y-3">
                {admission.statusHistory?.map((h: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Transitioned to {h.toStatus}
                      </span>
                      {h.remarks && <p className="text-slate-500">{h.remarks}</p>}
                      <span className="text-[10px] text-slate-400">{new Date(h.changedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
