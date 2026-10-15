using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Application.DTOs;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Infrastructure.Persistence;

namespace InstitutionErp.Api.Controllers;

[ApiController]
[Route("api/v1/academic-years")]
[Authorize]
public class AcademicYearsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public AcademicYearsController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AcademicYearDto>>> GetAcademicYears()
    {
        var years = await _db.AcademicYears
            .OrderByDescending(y => y.StartDate)
            .Select(y => new AcademicYearDto
            {
                Id = y.Id,
                Name = y.Name,
                StartDate = y.StartDate,
                EndDate = y.EndDate,
                IsActive = y.IsActive
            })
            .ToListAsync();

        return Ok(years);
    }

    [HttpPost]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<AcademicYearDto>> Create([FromBody] CreateAcademicYearRequest request)
    {
        if (request.IsActive)
        {
            var activeYears = await _db.AcademicYears.Where(y => y.IsActive).ToListAsync();
            foreach (var y in activeYears) y.IsActive = false;
        }

        var year = new AcademicYear
        {
            Name = request.Name,
            StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
            IsActive = request.IsActive
        };

        _db.AcademicYears.Add(year);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateAcademicYear", "AcademicYear", year.Id.ToString(), null, request);

        return CreatedAtAction(nameof(GetAcademicYears), new { id = year.Id }, new AcademicYearDto
        {
            Id = year.Id,
            Name = year.Name,
            StartDate = year.StartDate,
            EndDate = year.EndDate,
            IsActive = year.IsActive
        });
    }
}

[ApiController]
[Route("api/v1/classes")]
[Authorize]
public class ClassesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public ClassesController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<ClassRoomDto>>> GetClasses()
    {
        var classes = await _db.Classes
            .Include(c => c.AcademicYear)
            .Include(c => c.Students)
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Section)
            .Select(c => new ClassRoomDto
            {
                Id = c.Id,
                Name = c.Name,
                Section = c.Section,
                FullName = c.FullName,
                Capacity = c.Capacity,
                AcademicYearId = c.AcademicYearId,
                AcademicYearName = c.AcademicYear.Name,
                StudentCount = c.Students.Count
            })
            .ToListAsync();

        return Ok(classes);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ClassRoomDto>> GetClass(Guid id)
    {
        var c = await _db.Classes
            .Include(c => c.AcademicYear)
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (c == null) return NotFound();

        return Ok(new ClassRoomDto
        {
            Id = c.Id,
            Name = c.Name,
            Section = c.Section,
            FullName = c.FullName,
            Capacity = c.Capacity,
            AcademicYearId = c.AcademicYearId,
            AcademicYearName = c.AcademicYear.Name,
            StudentCount = c.Students.Count
        });
    }

    [HttpPost]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<ClassRoomDto>> Create([FromBody] CreateClassRoomRequest request)
    {
        var cr = new ClassRoom
        {
            Name = request.Name,
            Section = request.Section,
            Capacity = request.Capacity,
            AcademicYearId = request.AcademicYearId
        };

        _db.Classes.Add(cr);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateClass", "ClassRoom", cr.Id.ToString(), null, request);

        return CreatedAtAction(nameof(GetClass), new { id = cr.Id }, new ClassRoomDto
        {
            Id = cr.Id,
            Name = cr.Name,
            Section = cr.Section,
            FullName = cr.FullName,
            Capacity = cr.Capacity,
            AcademicYearId = cr.AcademicYearId,
            StudentCount = 0
        });
    }

    [HttpGet("{id}/subjects")]
    public async Task<ActionResult<List<SubjectDto>>> GetClassSubjects(Guid id)
    {
        var subjects = await _db.ClassSubjects
            .Where(cs => cs.ClassRoomId == id)
            .Include(cs => cs.Subject)
            .Select(cs => new SubjectDto
            {
                Id = cs.Subject.Id,
                Name = cs.Subject.Name,
                Code = cs.Subject.Code,
                Description = cs.Subject.Description
            })
            .ToListAsync();

        return Ok(subjects);
    }

    [HttpPost("{id}/subjects")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> AssignSubject(Guid id, [FromBody] AssignSubjectToClassRequest request)
    {
        if (await _db.ClassSubjects.AnyAsync(cs => cs.ClassRoomId == id && cs.SubjectId == request.SubjectId))
        {
            return BadRequest(new { message = "Subject is already assigned to this class." });
        }

        _db.ClassSubjects.Add(new ClassSubject { ClassRoomId = id, SubjectId = request.SubjectId });
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("AssignClassSubject", "ClassSubject", null, null, request);
        return Ok(new { message = "Subject assigned to class successfully." });
    }
}

[ApiController]
[Route("api/v1/subjects")]
[Authorize]
public class SubjectsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public SubjectsController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<SubjectDto>>> GetSubjects()
    {
        var subjects = await _db.Subjects
            .OrderBy(s => s.Name)
            .Select(s => new SubjectDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                Description = s.Description
            })
            .ToListAsync();

        return Ok(subjects);
    }

    [HttpPost]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<SubjectDto>> Create([FromBody] CreateSubjectRequest request)
    {
        if (await _db.Subjects.AnyAsync(s => s.Code.ToLower() == request.Code.ToLower()))
        {
            return BadRequest(new { message = "Subject code must be unique." });
        }

        var subject = new Subject
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description
        };

        _db.Subjects.Add(subject);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateSubject", "Subject", subject.Id.ToString(), null, request);

        return CreatedAtAction(nameof(GetSubjects), new { id = subject.Id }, new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Code = subject.Code,
            Description = subject.Description
        });
    }
}
