using InstitutionErp.Domain.Common;
using InstitutionErp.Domain.Enums;

namespace InstitutionErp.Domain.Entities;

public class Student : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string StudentRegistrationNumber { get; set; } = string.Empty; // e.g. "2026-CLS-0001"
    public string RollNumber { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public Gender Gender { get; set; }
    public string BloodGroup { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public StudentStatus Status { get; set; } = StudentStatus.Active;
    public DateTime AdmissionDate { get; set; }

    public Guid ClassRoomId { get; set; }
    public ClassRoom ClassRoom { get; set; } = null!;

    public ICollection<StudentParent> StudentParents { get; set; } = new List<StudentParent>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<ExamMark> ExamMarks { get; set; } = new List<ExamMark>();
    public ICollection<StudentFee> StudentFees { get; set; } = new List<StudentFee>();
}

public class Parent : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Occupation { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string AlternatePhone { get; set; } = string.Empty;

    public ICollection<StudentParent> StudentParents { get; set; } = new List<StudentParent>();
}

public class StudentParent
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public Guid ParentId { get; set; }
    public Parent Parent { get; set; } = null!;

    public string Relationship { get; set; } = "Parent"; // Father, Mother, Guardian
    public bool IsPrimaryContact { get; set; } = true;
}

public class Attendance : BaseEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public Guid ClassRoomId { get; set; }
    public ClassRoom ClassRoom { get; set; } = null!;

    public DateTime Date { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string? Remarks { get; set; }
    public string? MarkedBy { get; set; }
}
