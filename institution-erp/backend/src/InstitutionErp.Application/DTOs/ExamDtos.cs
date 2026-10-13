using InstitutionErp.Domain.Enums;

namespace InstitutionErp.Application.DTOs;

public class ExamDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ExamType Type { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = string.Empty;
    public Guid ClassRoomId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsPublished { get; set; }
    public bool IsLocked { get; set; }
    public DateTime? PublishedAt { get; set; }
    public List<ExamSubjectDto> Subjects { get; set; } = new();
}

public class ExamSubjectDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
    public decimal MaxMarks { get; set; }
    public decimal PassMarks { get; set; }
    public DateTime ExamDate { get; set; }
}

public record CreateExamRequest(
    string Name,
    ExamType Type,
    Guid AcademicYearId,
    Guid ClassRoomId,
    DateTime StartDate,
    DateTime EndDate,
    List<AddExamSubjectRequest> Subjects
);

public record AddExamSubjectRequest(
    Guid SubjectId,
    decimal MaxMarks,
    decimal PassMarks,
    DateTime ExamDate
);

public record SaveMarkItem(
    Guid StudentId,
    decimal MarksObtained,
    bool IsAbsent,
    string? Remarks
);

public record SaveMarksRequest(
    Guid ExamSubjectId,
    List<SaveMarkItem> Marks
);

public class SubjectResultDto
{
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
    public decimal MaxMarks { get; set; }
    public decimal PassMarks { get; set; }
    public decimal MarksObtained { get; set; }
    public bool IsAbsent { get; set; }
    public bool IsPassed => !IsAbsent && MarksObtained >= PassMarks;
    public string GradeLetter { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class StudentExamResultDto
{
    public Guid ExamId { get; set; }
    public string ExamName { get; set; } = string.Empty;
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string RollNumber { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public List<SubjectResultDto> SubjectResults { get; set; } = new();
    public decimal TotalMarksObtained { get; set; }
    public decimal TotalMaxMarks { get; set; }
    public decimal Percentage { get; set; }
    public string OverallGrade { get; set; } = string.Empty;
    public bool IsOverallPassed { get; set; }
    public int ClassRank { get; set; }
    public decimal AttendancePercentage { get; set; }
}

public class GradeScaleDto
{
    public Guid Id { get; set; }
    public string GradeLetter { get; set; } = string.Empty;
    public decimal MinPercentage { get; set; }
    public decimal MaxPercentage { get; set; }
    public decimal GradePoint { get; set; }
    public string? Description { get; set; }
}
