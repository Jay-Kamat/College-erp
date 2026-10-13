import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, academicApi } from '../../api/endpoints';
import { Student } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { Search, Download, Eye, Trash2, Plus, Edit, UserCheck, ShieldCheck } from 'lucide-react';

export const StudentsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Add / Edit Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states for Add Student
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('Password@123');
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newDob, setNewDob] = useState('2010-01-15');
  const [newGender, setNewGender] = useState('Male');
  const [newBloodGroup, setNewBloodGroup] = useState('O+');
  const [newAddress, setNewAddress] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newAdmissionDate, setNewAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newGuardianPhone, setNewGuardianPhone] = useState('');
  const [newGuardianEmail, setNewGuardianEmail] = useState('');

  // Form states for Edit Student
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editAddress, setEditAddress] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Alumni' | 'Suspended'>('Active');

  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: academicApi.getClasses,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students-list', page, search, selectedClassId],
    queryFn: () =>
      studentsApi.getList({
        page,
        pageSize: 10,
        search: search || undefined,
        classId: selectedClassId || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => studentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setIsAddModalOpen(false);
      resetAddForm();
      alert('Student successfully enrolled and account created!');
    },
    onError: (err: any) => {
      alert(`Enrollment failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => studentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      setEditingStudent(null);
      alert('Student record updated successfully!');
    },
    onError: (err: any) => {
      alert(`Update failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSelectedStudent(null);
    },
    onError: (err: any) => {
      alert(`Failed to remove student: ${err.message}`);
    },
  });

  const resetAddForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewPhone('');
    setNewRollNumber('');
    setNewAddress('');
    setNewGuardianName('');
    setNewGuardianPhone('');
    setNewGuardianEmail('');
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditPhone(student.phoneNumber || '');
    setEditRollNumber(student.rollNumber);
    setEditDob(student.dateOfBirth.slice(0, 10));
    setEditGender(student.gender || 'Male');
    setEditBloodGroup(student.bloodGroup || 'O+');
    setEditAddress(student.address || '');
    setEditClassId(student.classRoomId);
    setEditStatus(student.status);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await studentsApi.exportCsv(selectedClassId || undefined);
    } catch (err) {
      alert('Failed to export students CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Roll No',
      accessor: (row: Student) => (
        <span className="font-mono text-xs font-bold text-indigo-700">{row.rollNumber}</span>
      ),
    },
    {
      header: 'Student Name',
      accessor: (row: Student) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      header: 'Class / Section',
      accessor: (row: Student) => (
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {row.className}
        </span>
      ),
    },
    {
      header: 'Gender',
      accessor: (row: Student) => (
        <span className="text-xs text-slate-600">{row.gender}</span>
      ),
    },
    {
      header: 'Admission Date',
      accessor: (row: Student) => (
        <span className="text-xs text-slate-500">
          {new Date(row.admissionDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Student) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            row.status === 'Active'
              ? 'bg-emerald-100 text-emerald-800'
              : row.status === 'Alumni'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Student) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedStudent(row)}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            title="View Full Profile"
          >
            <Eye className="h-3.5 w-3.5" />
            Profile
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            title="Edit Student"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to deactivate student ${row.fullName}?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Deactivate Student"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-sm text-slate-500">
            Comprehensive student roll, enrollment details, academic records and demographic profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => {
              if (classes && classes.length > 0 && !newClassId) {
                setNewClassId(classes[0].id);
              }
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Enroll Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      {/* Student Profile Modal */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Student Profile: ${selectedStudent.fullName}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white shadow-sm">
                  {selectedStudent.firstName?.[0] || 'S'}
                  {selectedStudent.lastName?.[0] || ''}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedStudent.fullName}</h3>
                  <p className="text-xs text-indigo-700">
                    Registration No: <span className="font-semibold">{selectedStudent.studentRegistrationNumber}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Roll No: <span className="font-semibold">{selectedStudent.rollNumber}</span> • Class:{' '}
                    <span className="font-semibold">{selectedStudent.className}</span>
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  selectedStudent.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedStudent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-400">Date of Birth:</span>
                <p className="font-medium text-slate-800">
                  {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Gender / Blood Group:</span>
                <p className="font-medium text-slate-800">
                  {selectedStudent.gender} • {selectedStudent.bloodGroup || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Emergency Phone:</span>
                <p className="font-medium text-slate-800">{selectedStudent.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Student Portal Email:</span>
                <p className="font-medium text-slate-800">{selectedStudent.email || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-400">Residential Address:</span>
                <p className="font-medium text-slate-800">{selectedStudent.address || 'N/A'}</p>
              </div>
            </div>

            {/* Guardian Info */}
            {selectedStudent.guardianName && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Parent / Guardian Information
                </h4>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Guardian Name:</span>
                    <p className="font-semibold text-slate-800">{selectedStudent.guardianName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>
                    <p className="font-semibold text-slate-800">{selectedStudent.guardianPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>
                    <p className="font-semibold text-slate-800">{selectedStudent.guardianEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-200 pt-4">
              <button
                onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  openEditModal(s);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Record
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Enroll Student Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Enroll New Student"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="e.g. Liam"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="e.g. Vance"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Student Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="student@institution.edu"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Class Room *</label>
                <select
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-700">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={newRollNumber}
                  onChange={(e) => setNewRollNumber(e.target.value)}
                  placeholder="e.g. 199"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Portal Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Gender</label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Blood Group</label>
                <select
                  value={newBloodGroup}
                  onChange={(e) => setNewBloodGroup(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Residential Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Residential street, city, state"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Guardian Fields */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Guardian Account (Optional)
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Guardian Name</label>
                  <input
                    type="text"
                    value={newGuardianName}
                    onChange={(e) => setNewGuardianName(e.target.value)}
                    placeholder="Parent / Guardian"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Guardian Phone</label>
                  <input
                    type="text"
                    value={newGuardianPhone}
                    onChange={(e) => setNewGuardianPhone(e.target.value)}
                    placeholder="+1 555-0299"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Guardian Email</label>
                  <input
                    type="email"
                    value={newGuardianEmail}
                    onChange={(e) => setNewGuardianEmail(e.target.value)}
                    placeholder="parent@family.com"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
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
                disabled={
                  !newFirstName ||
                  !newLastName ||
                  !newEmail ||
                  !newRollNumber ||
                  !newClassId ||
                  createMutation.isPending
                }
                onClick={() =>
                  createMutation.mutate({
                    firstName: newFirstName,
                    lastName: newLastName,
                    email: newEmail,
                    phoneNumber: newPhone || undefined,
                    password: newPassword,
                    rollNumber: newRollNumber,
                    dateOfBirth: newDob,
                    gender: newGender,
                    bloodGroup: newBloodGroup,
                    address: newAddress || 'Campus Residence',
                    classRoomId: newClassId,
                    admissionDate: newAdmissionDate,
                    guardianName: newGuardianName || undefined,
                    guardianPhone: newGuardianPhone || undefined,
                    guardianEmail: newGuardianEmail || undefined,
                    guardianRelation: 'Parent',
                  })
                }
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Enrolling...' : 'Enroll & Create Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <Modal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title={`Edit Student Record: ${editingStudent.fullName}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={editRollNumber}
                  onChange={(e) => setEditRollNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Class Room *</label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Residential Address</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!editFirstName || !editLastName || !editRollNumber || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: editingStudent.id,
                    data: {
                      firstName: editFirstName,
                      lastName: editLastName,
                      phoneNumber: editPhone || undefined,
                      rollNumber: editRollNumber,
                      dateOfBirth: editDob,
                      gender: editGender,
                      bloodGroup: editBloodGroup,
                      address: editAddress,
                      classRoomId: editClassId,
                      status: editStatus,
                    },
                  })
                }
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Update Record'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentsListPage;
