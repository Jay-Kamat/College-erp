using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Application.Common.Models;
using InstitutionErp.Application.DTOs;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Domain.Enums;
using InstitutionErp.Infrastructure.Persistence;

namespace InstitutionErp.Api.Controllers;

[ApiController]
[Route("api/v1/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public StudentsController(ApplicationDbContext db, IPasswordHasher passwordHasher, IAuditLogService auditLogService, ICurrentUserService currentUserService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<StudentDto>>> GetStudents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] Guid? classId = null,
        [FromQuery] StudentStatus? status = null)
    {
        var query = _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .AsNoTracking();

        if (classId.HasValue)
        {
            query = query.Where(s => s.ClassRoomId == classId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(s => s.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(x => x.User.FirstName.ToLower().Contains(s) ||
                                     x.User.LastName.ToLower().Contains(s) ||
                                     x.StudentRegistrationNumber.ToLower().Contains(s) ||
                                     x.RollNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var students = await query
            .OrderBy(s => s.RollNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new StudentDto
            {
                Id = s.Id,
                UserId = s.UserId,
                StudentRegistrationNumber = s.StudentRegistrationNumber,
                RollNumber = s.RollNumber,
                FirstName = s.User.FirstName,
                LastName = s.User.LastName,
                FullName = s.User.FullName,
                Email = s.User.Email,
                PhoneNumber = s.User.PhoneNumber,
                DateOfBirth = s.DateOfBirth,
                Gender = s.Gender,
                BloodGroup = s.BloodGroup,
                Address = s.Address,
                Status = s.Status,
                AdmissionDate = s.AdmissionDate,
                ClassRoomId = s.ClassRoomId,
                ClassName = s.ClassRoom.FullName,
                GuardianName = s.GuardianName,
                GuardianPhone = s.GuardianPhone,
                GuardianEmail = s.GuardianEmail
            })
            .ToListAsync();

        return Ok(PagedResult<StudentDto>.Create(students, total, page, pageSize));
    }

    [HttpGet("me")]
    public async Task<ActionResult<StudentDto>> GetMyProfile()
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        var s = await _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .FirstOrDefaultAsync(s => s.UserId == _currentUserService.UserId.Value);

        if (s == null) return NotFound("Student profile not found.");

        return Ok(new StudentDto
        {
            Id = s.Id,
            UserId = s.UserId,
            StudentRegistrationNumber = s.StudentRegistrationNumber,
            RollNumber = s.RollNumber,
            FirstName = s.User.FirstName,
            LastName = s.User.LastName,
            FullName = s.User.FullName,
            Email = s.User.Email,
            PhoneNumber = s.User.PhoneNumber,
            DateOfBirth = s.DateOfBirth,
            Gender = s.Gender,
            BloodGroup = s.BloodGroup,
            Address = s.Address,
            Status = s.Status,
            AdmissionDate = s.AdmissionDate,
            ClassRoomId = s.ClassRoomId,
            ClassName = s.ClassRoom.FullName,
            GuardianName = s.GuardianName,
            GuardianPhone = s.GuardianPhone,
            GuardianEmail = s.GuardianEmail
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StudentDto>> GetStudent(Guid id)
    {
        var s = await _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (s == null) return NotFound();

        return Ok(new StudentDto
        {
            Id = s.Id,
            UserId = s.UserId,
            StudentRegistrationNumber = s.StudentRegistrationNumber,
            RollNumber = s.RollNumber,
            FirstName = s.User.FirstName,
            LastName = s.User.LastName,
            FullName = s.User.FullName,
            Email = s.User.Email,
            PhoneNumber = s.User.PhoneNumber,
            DateOfBirth = s.DateOfBirth,
            Gender = s.Gender,
            BloodGroup = s.BloodGroup,
            Address = s.Address,
            Status = s.Status,
            AdmissionDate = s.AdmissionDate,
            ClassRoomId = s.ClassRoomId,
            ClassName = s.ClassRoom.FullName,
            GuardianName = s.GuardianName,
            GuardianPhone = s.GuardianPhone,
            GuardianEmail = s.GuardianEmail
        });
    }

    [HttpPost]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<StudentDto>> Create([FromBody] CreateStudentRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
        {
            return BadRequest(new { message = "Email already in use." });
        }

        var year = DateTime.UtcNow.Year;
        var total = await _db.Students.CountAsync() + 1;
        var regNo = $"{year}-CLS-{total:D4}";

        var studentRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == UserRoleType.Student.ToString());
        var user = new User
        {
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            IsActive = true
        };
        if (studentRole != null) user.UserRoles.Add(new UserRole { RoleId = studentRole.Id });
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var student = new Student
        {
            UserId = user.Id,
            StudentRegistrationNumber = regNo,
            RollNumber = request.RollNumber,
            DateOfBirth = DateTime.SpecifyKind(request.DateOfBirth, DateTimeKind.Utc),
            Gender = request.Gender,
            BloodGroup = request.BloodGroup,
            Address = request.Address,
            ClassRoomId = request.ClassRoomId,
            AdmissionDate = DateTime.SpecifyKind(request.AdmissionDate, DateTimeKind.Utc),
            Status = StudentStatus.Active,
            GuardianName = request.GuardianName,
            GuardianPhone = request.GuardianPhone,
            GuardianEmail = request.GuardianEmail,
            GuardianRelation = request.GuardianRelation
        };
        _db.Students.Add(student);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateStudent", "Student", student.Id.ToString(), null, request);

        return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, new StudentDto
        {
            Id = student.Id,
            UserId = student.UserId,
            StudentRegistrationNumber = student.StudentRegistrationNumber,
            RollNumber = student.RollNumber,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            DateOfBirth = student.DateOfBirth,
            Gender = student.Gender,
            BloodGroup = student.BloodGroup,
            Address = student.Address,
            Status = student.Status,
            AdmissionDate = student.AdmissionDate,
            ClassRoomId = student.ClassRoomId,
            GuardianName = student.GuardianName,
            GuardianPhone = student.GuardianPhone,
            GuardianEmail = student.GuardianEmail
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStudentRequest request)
    {
        var student = await _db.Students.Include(s => s.User).FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound();

        student.User.FirstName = request.FirstName;
        student.User.LastName = request.LastName;
        student.User.PhoneNumber = request.PhoneNumber;
        student.RollNumber = request.RollNumber;
        student.DateOfBirth = DateTime.SpecifyKind(request.DateOfBirth, DateTimeKind.Utc);
        student.Gender = request.Gender;
        student.BloodGroup = request.BloodGroup;
        student.Address = request.Address;
        student.ClassRoomId = request.ClassRoomId;
        student.Status = request.Status;

        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("UpdateStudent", "Student", student.Id.ToString(), null, request);

        return Ok(new { message = "Student updated successfully." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var student = await _db.Students.Include(s => s.User).FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound();

        student.IsDeleted = true;
        if (student.User != null) student.User.IsActive = false;

        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("DeleteStudent", "Student", id.ToString());

        return Ok(new { message = "Student successfully deleted." });
    }

    [HttpGet("export")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> ExportToCsv([FromQuery] Guid? classId)
    {
        var query = _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .AsNoTracking();

        if (classId.HasValue) query = query.Where(s => s.ClassRoomId == classId.Value);

        var list = await query.ToListAsync();
        var sb = new StringBuilder();
        sb.AppendLine("RegistrationNumber,RollNumber,FirstName,LastName,Email,Phone,Class,Gender,Status");

        foreach (var s in list)
        {
            sb.AppendLine($"\"{s.StudentRegistrationNumber}\",\"{s.RollNumber}\",\"{s.User.FirstName}\",\"{s.User.LastName}\",\"{s.User.Email}\",\"{s.User.PhoneNumber}\",\"{s.ClassRoom?.FullName}\",\"{s.Gender}\",\"{s.Status}\"");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"students_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}

[ApiController]
[Route("api/v1/parents")]
[Authorize]
public class ParentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUserService _currentUserService;

    public ParentsController(ApplicationDbContext db, ICurrentUserService currentUserService)
    {
        _db = db;
        _currentUserService = currentUserService;
    }

    [HttpGet("my-children")]
    public async Task<ActionResult<List<StudentDto>>> GetMyChildren()
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        // Returns self if student
        var student = await _db.Students
            .Include(s => s.User)
            .Include(s => s.ClassRoom)
            .FirstOrDefaultAsync(s => s.UserId == _currentUserService.UserId.Value);

        if (student != null)
        {
            return Ok(new List<StudentDto>
            {
                new()
                {
                    Id = student.Id,
                    UserId = student.UserId,
                    StudentRegistrationNumber = student.StudentRegistrationNumber,
                    RollNumber = student.RollNumber,
                    FirstName = student.User.FirstName,
                    LastName = student.User.LastName,
                    FullName = student.User.FullName,
                    Email = student.User.Email,
                    PhoneNumber = student.User.PhoneNumber,
                    ClassRoomId = student.ClassRoomId,
                    ClassName = student.ClassRoom.FullName,
                    GuardianName = student.GuardianName,
                    GuardianPhone = student.GuardianPhone,
                    GuardianEmail = student.GuardianEmail
                }
            });
        }

        return Ok(new List<StudentDto>());
    }
}
