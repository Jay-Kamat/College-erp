using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Application.DTOs;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Domain.Enums;
using InstitutionErp.Infrastructure.Persistence;

namespace InstitutionErp.Api.Controllers;

[ApiController]
[Route("api/v1/exams")]
[Authorize]
public class ExamsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public ExamsController(ApplicationDbContext db, IAuditLogService auditLogService, ICurrentUserService currentUserService)
    {
        _db = db;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<List<ExamDto>>> GetExams([FromQuery] Guid? classId)
    {
        var query = _db.Exams
            .Include(e => e.AcademicYear)
            .Include(e => e.ClassRoom)
            .Include(e => e.ExamSubjects).ThenInclude(es => es.Subject)
            .AsNoTracking();

        if (classId.HasValue) query = query.Where(e => e.ClassRoomId == classId.Value);

        // If student or parent, show only published exams
        if (_currentUserService.IsInRole("Student") || _currentUserService.IsInRole("Parent"))
        {
            query = query.Where(e => e.IsPublished);
        }

        var exams = await query
            .OrderByDescending(e => e.StartDate)
            .Select(e => new ExamDto
            {
                Id = e.Id,
                Name = e.Name,
                Type = e.Type,
                AcademicYearId = e.AcademicYearId,
                AcademicYearName = e.AcademicYear.Name,
                ClassRoomId = e.ClassRoomId,
                ClassName = e.ClassRoom.FullName,
                StartDate = e.StartDate,
                EndDate = e.EndDate,
                IsPublished = e.IsPublished,
                IsLocked = e.IsLocked,
                PublishedAt = e.PublishedAt,
                Subjects = e.ExamSubjects.Select(es => new ExamSubjectDto
                {
                    Id = es.Id,
                    ExamId = es.ExamId,
                    SubjectId = es.SubjectId,
                    SubjectName = es.Subject.Name,
                    SubjectCode = es.Subject.Code,
                    MaxMarks = es.MaxMarks,
                    PassMarks = es.PassMarks,
                    ExamDate = es.ExamDate
                }).ToList()
            })
            .ToListAsync();

        return Ok(exams);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExamDto>> GetExam(Guid id)
    {
        var e = await _db.Exams
            .Include(e => e.AcademicYear)
            .Include(e => e.ClassRoom)
            .Include(e => e.ExamSubjects).ThenInclude(es => es.Subject)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (e == null) return NotFound();

        return Ok(new ExamDto
        {
            Id = e.Id,
            Name = e.Name,
            Type = e.Type,
            AcademicYearId = e.AcademicYearId,
            AcademicYearName = e.AcademicYear.Name,
            ClassRoomId = e.ClassRoomId,
            ClassName = e.ClassRoom.FullName,
            StartDate = e.StartDate,
            EndDate = e.EndDate,
            IsPublished = e.IsPublished,
            IsLocked = e.IsLocked,
            PublishedAt = e.PublishedAt,
            Subjects = e.ExamSubjects.Select(es => new ExamSubjectDto
            {
                Id = es.Id,
                ExamId = es.ExamId,
                SubjectId = es.SubjectId,
                SubjectName = es.Subject.Name,
                SubjectCode = es.Subject.Code,
                MaxMarks = es.MaxMarks,
                PassMarks = es.PassMarks,
                ExamDate = es.ExamDate
            }).ToList()
        });
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<ExamDto>> Create([FromBody] CreateExamRequest request)
    {
        var exam = new Exam
        {
            Name = request.Name,
            Type = request.Type,
            AcademicYearId = request.AcademicYearId,
            ClassRoomId = request.ClassRoomId,
            StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
            IsPublished = false,
            IsLocked = false
        };

        foreach (var sub in request.Subjects)
        {
            exam.ExamSubjects.Add(new ExamSubject
            {
                SubjectId = sub.SubjectId,
                MaxMarks = sub.MaxMarks,
                PassMarks = sub.PassMarks,
                ExamDate = DateTime.SpecifyKind(sub.ExamDate, DateTimeKind.Utc)
            });
        }

        _db.Exams.Add(exam);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateExam", "Exam", exam.Id.ToString(), null, request);

        return CreatedAtAction(nameof(GetExam), new { id = exam.Id }, new ExamDto { Id = exam.Id, Name = exam.Name });
    }

    [HttpGet("{id}/marks/{examSubjectId}")]
    public async Task<ActionResult<List<SaveMarkItem>>> GetSubjectMarks(Guid id, Guid examSubjectId)
    {
        var exam = await _db.Exams.FindAsync(id);
        if (exam == null) return NotFound("Exam not found.");

        var marks = await _db.ExamMarks
            .Where(m => m.ExamSubjectId == examSubjectId)
            .Select(m => new SaveMarkItem(m.StudentId, m.MarksObtained, m.IsAbsent, m.Remarks))
            .ToListAsync();

        return Ok(marks);
    }

    [HttpPost("{id}/marks")]
    [Authorize(Roles = "SuperAdmin,Admin,Teacher")]
    public async Task<IActionResult> SaveMarks(Guid id, [FromBody] SaveMarksRequest request)
    {
        var exam = await _db.Exams.FindAsync(id);
        if (exam == null) return NotFound("Exam not found.");

        if (exam.IsLocked)
        {
            return BadRequest(new { message = "Marks entry is locked for this exam." });
        }

        var examSubject = await _db.ExamSubjects.FindAsync(request.ExamSubjectId);
        if (examSubject == null) return NotFound("Exam subject not found.");

        // Teacher resource check: teacher can only enter marks for their allocated subject
        var isAdmin = _currentUserService.IsInRole("SuperAdmin") || _currentUserService.IsInRole("Admin");
        if (_currentUserService.IsInRole("Teacher") && !isAdmin)
        {
            var teacher = await _db.Teachers.FirstOrDefaultAsync(t => t.UserId == _currentUserService.UserId);
            if (teacher == null) return Unauthorized();

            var allocated = await _db.TeacherAllocations.AnyAsync(a => a.TeacherId == teacher.Id && a.ClassRoomId == exam.ClassRoomId && a.SubjectId == examSubject.SubjectId);
            if (!allocated)
            {
                return Forbid("You can only enter marks for subjects allocated to you.");
            }
        }

        var existingMarks = await _db.ExamMarks
            .Where(m => m.ExamSubjectId == request.ExamSubjectId)
            .ToListAsync();

        foreach (var item in request.Marks)
        {
            // Validation: 0 <= marks <= max
            if (!item.IsAbsent && (item.MarksObtained < 0 || item.MarksObtained > examSubject.MaxMarks))
            {
                return BadRequest(new { message = $"Marks must be between 0 and {examSubject.MaxMarks}." });
            }

            var mark = existingMarks.FirstOrDefault(m => m.StudentId == item.StudentId);
            if (mark != null)
            {
                mark.MarksObtained = item.MarksObtained;
                mark.IsAbsent = item.IsAbsent;
                mark.Remarks = item.Remarks;
                mark.EnteredBy = _currentUserService.Email ?? "Teacher";
            }
            else
            {
                _db.ExamMarks.Add(new ExamMark
                {
                    ExamSubjectId = request.ExamSubjectId,
                    StudentId = item.StudentId,
                    MarksObtained = item.MarksObtained,
                    IsAbsent = item.IsAbsent,
                    Remarks = item.Remarks,
                    EnteredBy = _currentUserService.Email ?? "Teacher"
                });
            }
        }

        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("SaveMarks", "ExamMark", request.ExamSubjectId.ToString(), null, new { count = request.Marks.Count });

        return Ok(new { message = "Marks saved successfully." });
    }

    [HttpPost("{id}/publish")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> PublishExam(Guid id)
    {
        var exam = await _db.Exams.FindAsync(id);
        if (exam == null) return NotFound();

        exam.IsPublished = true;
        exam.IsLocked = true;
        exam.PublishedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("PublishExam", "Exam", exam.Id.ToString());

        return Ok(new { message = "Exam results published and locked successfully." });
    }
}

[ApiController]
[Route("api/v1/results")]
[Authorize]
public class ResultsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPdfService _pdfService;
    private readonly ICurrentUserService _currentUserService;

    public ResultsController(ApplicationDbContext db, IPdfService pdfService, ICurrentUserService currentUserService)
    {
        _db = db;
        _pdfService = pdfService;
        _currentUserService = currentUserService;
    }

    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<List<StudentExamResultDto>>> GetStudentResults(Guid studentId)
    {
        var student = await _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .FirstOrDefaultAsync(s => s.Id == studentId);

        if (student == null) return NotFound();

        // RBAC check: Student/Parent can only view own results
        if (_currentUserService.IsInRole("Student"))
        {
            if (student.UserId != _currentUserService.UserId) return Forbid();
        }
        else if (_currentUserService.IsInRole("Parent") && !_currentUserService.IsInRole("Admin") && !_currentUserService.IsInRole("SuperAdmin"))
        {
            var isLinked = await _db.StudentParents.AnyAsync(sp => sp.StudentId == studentId && sp.Parent.UserId == _currentUserService.UserId);
            if (!isLinked) return Forbid();
        }

        var exams = await _db.Exams
            .Where(e => e.ClassRoomId == student.ClassRoomId && e.IsPublished)
            .Include(e => e.ExamSubjects).ThenInclude(es => es.Subject)
            .OrderByDescending(e => e.StartDate)
            .ToListAsync();

        var gradeScales = await _db.GradeScales.OrderByDescending(g => g.MinPercentage).ToListAsync();
        var allClassStudents = await _db.Students.Where(s => s.ClassRoomId == student.ClassRoomId).ToListAsync();

        var attendances = await _db.Attendances.Where(a => a.StudentId == studentId).ToListAsync();
        var attPct = attendances.Count > 0
            ? Math.Round((decimal)attendances.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late) / attendances.Count * 100, 1)
            : 100m;

        var resultList = new List<StudentExamResultDto>();

        foreach (var exam in exams)
        {
            var marks = await _db.ExamMarks
                .Where(m => exam.ExamSubjects.Select(es => es.Id).Contains(m.ExamSubjectId))
                .ToListAsync();

            var studentMarks = marks.Where(m => m.StudentId == studentId).ToList();

            var subjectResults = new List<SubjectResultDto>();
            decimal totalObtained = 0;
            decimal totalMax = 0;

            foreach (var es in exam.ExamSubjects)
            {
                var mk = studentMarks.FirstOrDefault(m => m.ExamSubjectId == es.Id);
                var obtained = mk?.MarksObtained ?? 0;
                var absent = mk?.IsAbsent ?? false;

                if (!absent) totalObtained += obtained;
                totalMax += es.MaxMarks;

                var subPct = es.MaxMarks > 0 ? (obtained / es.MaxMarks) * 100 : 0;
                var gradeLetter = gradeScales.FirstOrDefault(g => subPct >= g.MinPercentage && subPct <= g.MaxPercentage)?.GradeLetter ?? "N/A";

                subjectResults.Add(new SubjectResultDto
                {
                    SubjectId = es.SubjectId,
                    SubjectName = es.Subject.Name,
                    SubjectCode = es.Subject.Code,
                    MaxMarks = es.MaxMarks,
                    PassMarks = es.PassMarks,
                    MarksObtained = obtained,
                    IsAbsent = absent,
                    GradeLetter = gradeLetter,
                    Remarks = mk?.Remarks
                });
            }

            var overallPct = totalMax > 0 ? Math.Round((totalObtained / totalMax) * 100, 2) : 0;
            var overallGrade = gradeScales.FirstOrDefault(g => overallPct >= g.MinPercentage && overallPct <= g.MaxPercentage)?.GradeLetter ?? "F";
            var isOverallPassed = subjectResults.All(sr => sr.IsPassed);

            // Calculate class rank
            var classTotals = allClassStudents.Select(cs =>
            {
                var csTotal = marks.Where(m => m.StudentId == cs.Id && !m.IsAbsent).Sum(m => m.MarksObtained);
                return new { StudentId = cs.Id, Total = csTotal };
            }).OrderByDescending(x => x.Total).ToList();

            var rank = classTotals.FindIndex(x => x.StudentId == studentId) + 1;

            resultList.Add(new StudentExamResultDto
            {
                ExamId = exam.Id,
                ExamName = exam.Name,
                StudentId = student.Id,
                StudentName = student.User?.FullName ?? "Student",
                RollNumber = student.RollNumber,
                ClassName = student.ClassRoom.FullName,
                SubjectResults = subjectResults,
                TotalMarksObtained = totalObtained,
                TotalMaxMarks = totalMax,
                Percentage = overallPct,
                OverallGrade = overallGrade,
                IsOverallPassed = isOverallPassed,
                ClassRank = rank > 0 ? rank : 1,
                AttendancePercentage = attPct
            });
        }

        return Ok(resultList);
    }

    [HttpGet("{examId}/report-card/{studentId}")]
    public async Task<IActionResult> DownloadReportCardPdf(Guid examId, Guid studentId)
    {
        var exam = await _db.Exams
            .Include(e => e.ClassRoom)
            .Include(e => e.ExamSubjects).ThenInclude(es => es.Subject)
            .FirstOrDefaultAsync(e => e.Id == examId);

        if (exam == null) return NotFound("Exam not found.");

        var student = await _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .FirstOrDefaultAsync(s => s.Id == studentId);

        if (student == null) return NotFound("Student not found.");

        // Check publishing requirement for students/parents
        if ((_currentUserService.IsInRole("Student") || _currentUserService.IsInRole("Parent")) && !exam.IsPublished)
        {
            return Forbid("Report cards are only available after results are published.");
        }

        var marks = await _db.ExamMarks
            .Where(m => exam.ExamSubjects.Select(es => es.Id).Contains(m.ExamSubjectId) && m.StudentId == studentId)
            .ToListAsync();

        var resultsList = exam.ExamSubjects.Select(es =>
        {
            var mk = marks.FirstOrDefault(m => m.ExamSubjectId == es.Id)
                     ?? new ExamMark { ExamSubjectId = es.Id, StudentId = studentId, MarksObtained = 0 };
            return (subject: es, mark: mk);
        }).ToList();

        var totalObtained = resultsList.Where(r => !r.mark.IsAbsent).Sum(r => r.mark.MarksObtained);
        var totalMax = resultsList.Sum(r => r.subject.MaxMarks);
        var pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

        var gradeScales = await _db.GradeScales.OrderByDescending(g => g.MinPercentage).ToListAsync();
        var grade = gradeScales.FirstOrDefault(g => pct >= g.MinPercentage && pct <= g.MaxPercentage)?.GradeLetter ?? "F";

        var attendances = await _db.Attendances.Where(a => a.StudentId == studentId).ToListAsync();
        var attPct = attendances.Count > 0
            ? Math.Round((decimal)attendances.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late) / attendances.Count * 100, 1)
            : 100m;

        var pdfBytes = await _pdfService.GenerateReportCardPdfAsync(student, exam, resultsList, attPct, grade, totalObtained, totalMax, pct, 1);

        return File(pdfBytes, "application/pdf", $"ReportCard_{exam.Name.Replace(" ", "_")}_{student.RollNumber}.pdf");
    }
}
