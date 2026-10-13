namespace InstitutionErp.Application.DTOs;

public class AcademicYearDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
}

public record CreateAcademicYearRequest(string Name, DateTime StartDate, DateTime EndDate, bool IsActive);

public class ClassRoomDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
}

public record CreateClassRoomRequest(string Name, string Section, int Capacity, Guid AcademicYearId);

public class SubjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public record CreateSubjectRequest(string Name, string Code, string? Description);

public class ClassSubjectDto
{
    public Guid Id { get; set; }
    public Guid ClassRoomId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
}

public record AssignSubjectToClassRequest(Guid ClassRoomId, Guid SubjectId);
