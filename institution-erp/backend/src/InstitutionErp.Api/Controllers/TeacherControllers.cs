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
[Route("api/v1/teachers")]
[Authorize]
public class TeachersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public TeachersController(
        ApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IAuditLogService auditLogService,
        ICurrentUserService currentUserService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TeacherDto>>> GetTeachers()
    {
        var teachers = await _db.Teachers
            .Include(t => t.User)
            .Include(t => t.Allocations)
                .ThenInclude(a => a.ClassRoom)
            .Include(t => t.Allocations)
                .ThenInclude(a => a.Subject)
            .OrderBy(t => t.EmployeeCode)
            .Select(t => new TeacherDto
            {
                Id = t.Id,
                UserId = t.UserId,
                EmployeeCode = t.EmployeeCode,
                FirstName = t.User.FirstName,
                LastName = t.User.LastName,
                FullName = t.User.FullName,
                Email = t.User.Email,
                PhoneNumber = t.User.PhoneNumber,
                Qualification = t.Qualification,
                Specialization = t.Specialization,
                JoiningDate = t.JoiningDate,
                Status = t.Status,
                Allocations = t.Allocations.Select(a => new TeacherAllocationDto
                {
                    Id = a.Id,
                    TeacherId = a.TeacherId,
                    TeacherName = t.User.FullName,
                    ClassRoomId = a.ClassRoomId,
                    ClassName = a.ClassRoom.FullName,
                    SubjectId = a.SubjectId,
                    SubjectName = a.Subject.Name,
                    IsClassTeacher = a.IsClassTeacher
                }).ToList()
            })
            .ToListAsync();

        return Ok(teachers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TeacherDto>> GetTeacher(Guid id)
    {
        var t = await _db.Teachers
            .Include(t => t.User)
            .Include(t => t.Allocations).ThenInclude(a => a.ClassRoom)
            .Include(t => t.Allocations).ThenInclude(a => a.Subject)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t == null) return NotFound();

        return Ok(new TeacherDto
        {
            Id = t.Id,
            UserId = t.UserId,
            EmployeeCode = t.EmployeeCode,
            FirstName = t.User.FirstName,
            LastName = t.User.LastName,
            FullName = t.User.FullName,
            Email = t.User.Email,
            PhoneNumber = t.User.PhoneNumber,
            Qualification = t.Qualification,
            Specialization = t.Specialization,
            JoiningDate = t.JoiningDate,
            Status = t.Status,
            Allocations = t.Allocations.Select(a => new TeacherAllocationDto
            {
                Id = a.Id,
                TeacherId = a.TeacherId,
                TeacherName = t.User.FullName,
                ClassRoomId = a.ClassRoomId,
                ClassName = a.ClassRoom.FullName,
                SubjectId = a.SubjectId,
                SubjectName = a.Subject.Name,
                IsClassTeacher = a.IsClassTeacher
            }).ToList()
        });
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<TeacherDto>> Create([FromBody] CreateTeacherRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
        {
            return BadRequest(new { message = "Email already in use." });
        }

        var teacherRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == UserRoleType.Teacher.ToString());
        if (teacherRole == null) return BadRequest("Teacher role not configured.");

        var count = await _db.Teachers.CountAsync() + 1;
        var empCode = $"TCH-{count:D3}";

        var user = new User
        {
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            IsActive = true
        };
        user.UserRoles.Add(new UserRole { RoleId = teacherRole.Id });
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var teacher = new Teacher
        {
            UserId = user.Id,
            EmployeeCode = empCode,
            Qualification = request.Qualification,
            Specialization = request.Specialization,
            JoiningDate = DateTime.SpecifyKind(request.JoiningDate, DateTimeKind.Utc),
            Status = TeacherStatus.Active
        };
        _db.Teachers.Add(teacher);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateTeacher", "Teacher", teacher.Id.ToString(), null, request);

        return CreatedAtAction(nameof(GetTeacher), new { id = teacher.Id }, new TeacherDto
        {
            Id = teacher.Id,
            UserId = teacher.UserId,
            EmployeeCode = teacher.EmployeeCode,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Qualification = teacher.Qualification,
            Specialization = teacher.Specialization,
            JoiningDate = teacher.JoiningDate,
            Status = teacher.Status
        });
    }

    [HttpPost("{id}/allocations")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> AllocateTeacher(Guid id, [FromBody] AllocateTeacherRequest request)
    {
        // Conflict check: no double allocation of the same subject in the same class to another teacher
        var existing = await _db.TeacherAllocations
            .FirstOrDefaultAsync(a => a.ClassRoomId == request.ClassRoomId && a.SubjectId == request.SubjectId);

        if (existing != null)
        {
            return BadRequest(new { message = "This class and subject is already allocated to another teacher." });
        }

        var allocation = new TeacherAllocation
        {
            TeacherId = id,
            ClassRoomId = request.ClassRoomId,
            SubjectId = request.SubjectId,
            IsClassTeacher = request.IsClassTeacher
        };

        _db.TeacherAllocations.Add(allocation);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("AllocateTeacher", "TeacherAllocation", allocation.Id.ToString(), null, request);
        return Ok(new { message = "Teacher successfully allocated." });
    }
}

[ApiController]
[Route("api/v1/timetable")]
[Authorize]
public class TimetableController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public TimetableController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet("class/{classId}")]
    public async Task<ActionResult<List<TimetableEntryDto>>> GetByClass(Guid classId)
    {
        var entries = await _db.TimetableEntries
            .Where(t => t.ClassRoomId == classId)
            .Include(t => t.ClassRoom)
            .Include(t => t.Subject)
            .Include(t => t.Teacher).ThenInclude(tc => tc.User)
            .OrderBy(t => t.DayOfWeek)
            .ThenBy(t => t.PeriodNumber)
            .Select(t => new TimetableEntryDto
            {
                Id = t.Id,
                ClassRoomId = t.ClassRoomId,
                ClassName = t.ClassRoom.FullName,
                SubjectId = t.SubjectId,
                SubjectName = t.Subject.Name,
                TeacherId = t.TeacherId,
                TeacherName = t.Teacher.User.FullName,
                DayOfWeek = t.DayOfWeek,
                PeriodNumber = t.PeriodNumber,
                StartTime = t.StartTime.ToString(@"hh\:mm"),
                EndTime = t.EndTime.ToString(@"hh\:mm"),
                RoomNumber = t.RoomNumber
            })
            .ToListAsync();

        return Ok(entries);
    }

    [HttpGet("teacher/{teacherId}")]
    public async Task<ActionResult<List<TimetableEntryDto>>> GetByTeacher(Guid teacherId)
    {
        var entries = await _db.TimetableEntries
            .Where(t => t.TeacherId == teacherId)
            .Include(t => t.ClassRoom)
            .Include(t => t.Subject)
            .Include(t => t.Teacher).ThenInclude(tc => tc.User)
            .OrderBy(t => t.DayOfWeek)
            .ThenBy(t => t.PeriodNumber)
            .Select(t => new TimetableEntryDto
            {
                Id = t.Id,
                ClassRoomId = t.ClassRoomId,
                ClassName = t.ClassRoom.FullName,
                SubjectId = t.SubjectId,
                SubjectName = t.Subject.Name,
                TeacherId = t.TeacherId,
                TeacherName = t.Teacher.User.FullName,
                DayOfWeek = t.DayOfWeek,
                PeriodNumber = t.PeriodNumber,
                StartTime = t.StartTime.ToString(@"hh\:mm"),
                EndTime = t.EndTime.ToString(@"hh\:mm"),
                RoomNumber = t.RoomNumber
            })
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<TimetableEntryDto>> Create([FromBody] CreateTimetableEntryRequest request)
    {
        // Clash detection 1: Class double-booked for the same day and period
        if (await _db.TimetableEntries.AnyAsync(t => t.ClassRoomId == request.ClassRoomId && t.DayOfWeek == request.DayOfWeek && t.PeriodNumber == request.PeriodNumber))
        {
            return BadRequest(new { message = $"Class already has a period assigned at Day {request.DayOfWeek}, Period #{request.PeriodNumber}." });
        }

        // Clash detection 2: Teacher double-booked for the same day and period
        if (await _db.TimetableEntries.AnyAsync(t => t.TeacherId == request.TeacherId && t.DayOfWeek == request.DayOfWeek && t.PeriodNumber == request.PeriodNumber))
        {
            return BadRequest(new { message = $"Teacher is already assigned to another class at Day {request.DayOfWeek}, Period #{request.PeriodNumber}." });
        }

        TimeSpan.TryParse(request.StartTime, out var start);
        TimeSpan.TryParse(request.EndTime, out var end);

        var entry = new TimetableEntry
        {
            ClassRoomId = request.ClassRoomId,
            SubjectId = request.SubjectId,
            TeacherId = request.TeacherId,
            DayOfWeek = request.DayOfWeek,
            PeriodNumber = request.PeriodNumber,
            StartTime = start,
            EndTime = end,
            RoomNumber = request.RoomNumber
        };

        _db.TimetableEntries.Add(entry);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateTimetableEntry", "TimetableEntry", entry.Id.ToString(), null, request);

        return Ok(new TimetableEntryDto
        {
            Id = entry.Id,
            ClassRoomId = entry.ClassRoomId,
            SubjectId = entry.SubjectId,
            TeacherId = entry.TeacherId,
            DayOfWeek = entry.DayOfWeek,
            PeriodNumber = entry.PeriodNumber,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            RoomNumber = entry.RoomNumber
        });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await _db.TimetableEntries.FindAsync(id);
        if (entry == null) return NotFound();

        _db.TimetableEntries.Remove(entry);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("DeleteTimetableEntry", "TimetableEntry", id.ToString());
        return Ok(new { message = "Timetable entry removed." });
    }
}

[ApiController]
[Route("api/v1/teacher-attendance")]
[Authorize]
public class TeacherAttendanceController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public TeacherAttendanceController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<TeacherAttendanceDto>>> GetAttendance([FromQuery] DateTime? date)
    {
        var targetDate = (date ?? DateTime.UtcNow).Date;

        var records = await _db.TeacherAttendances
            .Where(a => a.Date.Date == targetDate)
            .Include(a => a.Teacher).ThenInclude(t => t.User)
            .Select(a => new TeacherAttendanceDto
            {
                Id = a.Id,
                TeacherId = a.TeacherId,
                TeacherName = a.Teacher.User.FullName,
                Date = a.Date,
                Status = a.Status,
                Remarks = a.Remarks
            })
            .ToListAsync();

        return Ok(records);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Mark([FromBody] MarkTeacherAttendanceRequest request)
    {
        var targetDate = request.Date.Date;
        var existing = await _db.TeacherAttendances
            .FirstOrDefaultAsync(a => a.TeacherId == request.TeacherId && a.Date.Date == targetDate);

        if (existing != null)
        {
            existing.Status = request.Status;
            existing.Remarks = request.Remarks;
        }
        else
        {
            _db.TeacherAttendances.Add(new TeacherAttendance
            {
                TeacherId = request.TeacherId,
                Date = DateTime.SpecifyKind(targetDate, DateTimeKind.Utc),
                Status = request.Status,
                Remarks = request.Remarks
            });
        }

        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("MarkTeacherAttendance", "TeacherAttendance", null, null, request);

        return Ok(new { message = "Teacher attendance recorded." });
    }
}
