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
[Route("api/v1/[controller]")]
public class AdmissionsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IFileStorage _fileStorage;
    private readonly IPasswordHasher _passwordHasher;
    private readonly INotificationSender _notificationSender;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public AdmissionsController(
        ApplicationDbContext db,
        IFileStorage fileStorage,
        IPasswordHasher passwordHasher,
        INotificationSender notificationSender,
        IAuditLogService auditLogService,
        ICurrentUserService currentUserService)
    {
        _db = db;
        _fileStorage = fileStorage;
        _passwordHasher = passwordHasher;
        _notificationSender = notificationSender;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    [HttpPost("apply")]
    [AllowAnonymous]
    public async Task<ActionResult<AdmissionDto>> Apply([FromBody] ApplyAdmissionRequest request)
    {
        var year = DateTime.UtcNow.Year;
        var totalThisYear = await _db.Admissions.CountAsync(a => a.CreatedAt.Year == year) + 1;
        var refNumber = $"ADM-{year}-{totalThisYear:D4}";

        var admission = new Admission
        {
            ReferenceNumber = refNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            DateOfBirth = DateTime.SpecifyKind(request.DateOfBirth, DateTimeKind.Utc),
            Gender = request.Gender,
            Address = request.Address,
            GuardianName = request.GuardianName,
            GuardianPhone = request.GuardianPhone,
            GuardianEmail = request.GuardianEmail,
            GuardianRelation = request.GuardianRelation,
            DesiredClassRoomId = request.DesiredClassRoomId,
            PreviousSchoolName = request.PreviousSchoolName,
            PreviousSchoolPercentage = request.PreviousSchoolPercentage,
            Status = AdmissionStatus.Submitted
        };

        admission.StatusHistory.Add(new AdmissionStatusHistory
        {
            FromStatus = AdmissionStatus.Submitted,
            ToStatus = AdmissionStatus.Submitted,
            Remarks = "Application submitted online.",
            ChangedBy = "Applicant"
        });

        _db.Admissions.Add(admission);
        await _db.SaveChangesAsync();

        // Queue notification to applicant
        await _notificationSender.QueueOutboxAsync(
            NotificationChannelType.Email,
            admission.Email,
            $"Admission Application Received - {refNumber}",
            $"<p>Dear {admission.FirstName},</p><p>Your application <strong>{refNumber}</strong> has been received and is currently under review.</p>"
        );

        return Ok(new AdmissionDto
        {
            Id = admission.Id,
            ReferenceNumber = admission.ReferenceNumber,
            FirstName = admission.FirstName,
            LastName = admission.LastName,
            FullName = admission.FullName,
            Email = admission.Email,
            PhoneNumber = admission.PhoneNumber,
            Status = admission.Status,
            CreatedAt = admission.CreatedAt
        });
    }

    [HttpGet("status/{referenceNumber}")]
    [AllowAnonymous]
    public async Task<ActionResult<AdmissionDto>> GetStatus(string referenceNumber)
    {
        var adm = await _db.Admissions
            .Include(a => a.DesiredClassRoom)
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.ReferenceNumber.ToUpper() == referenceNumber.ToUpper());

        if (adm == null) return NotFound(new { message = "Application reference number not found." });

        return Ok(new AdmissionDto
        {
            Id = adm.Id,
            ReferenceNumber = adm.ReferenceNumber,
            FirstName = adm.FirstName,
            LastName = adm.LastName,
            FullName = adm.FullName,
            Email = adm.Email,
            PhoneNumber = adm.PhoneNumber,
            DesiredClassName = adm.DesiredClassRoom?.FullName ?? "N/A",
            Status = adm.Status,
            ReviewRemarks = adm.ReviewRemarks,
            ReviewedAt = adm.ReviewedAt,
            CreatedAt = adm.CreatedAt,
            StatusHistory = adm.StatusHistory.Select(h => new AdmissionStatusHistoryDto
            {
                Id = h.Id,
                FromStatus = h.FromStatus,
                ToStatus = h.ToStatus,
                Remarks = h.Remarks,
                ChangedBy = h.ChangedBy,
                ChangedAt = h.ChangedAt
            }).ToList()
        });
    }

    [HttpPost("{id}/documents")]
    [Consumes("multipart/form-data")]
    [AllowAnonymous]
    public async Task<IActionResult> UploadDocument(Guid id, [FromForm] AdmissionDocumentUploadRequest request)
    {
        var admission = await _db.Admissions.FindAsync(id);
        if (admission == null) return NotFound("Admission application not found.");

        if (request.File == null || request.File.Length == 0) return BadRequest("File is empty.");

        using var stream = request.File.OpenReadStream();
        var storagePath = await _fileStorage.SaveFileAsync(stream, request.File.FileName, "admissions");

        var doc = new AdmissionDocument
        {
            AdmissionId = id,
            DocumentType = request.DocumentType,
            FileName = request.File.FileName,
            FilePath = storagePath,
            FileSize = request.File.Length,
            ContentType = request.File.ContentType
        };

        _db.AdmissionDocuments.Add(doc);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Document uploaded successfully.", documentId = doc.Id, fileName = doc.FileName });
    }

    [HttpGet]
    [Authorize(Roles = "Principal,SuperAdmin,Admin")]
    public async Task<ActionResult<PagedResult<AdmissionDto>>> GetAdmissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] AdmissionStatus? status = null,
        [FromQuery] Guid? classId = null)
    {
        var query = _db.Admissions
            .Include(a => a.DesiredClassRoom)
            .Include(a => a.Documents)
            .AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        if (classId.HasValue)
        {
            query = query.Where(a => a.DesiredClassRoomId == classId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a => a.FirstName.ToLower().Contains(s) ||
                                     a.LastName.ToLower().Contains(s) ||
                                     a.ReferenceNumber.ToLower().Contains(s) ||
                                     a.Email.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AdmissionDto
            {
                Id = a.Id,
                ReferenceNumber = a.ReferenceNumber,
                FirstName = a.FirstName,
                LastName = a.LastName,
                FullName = a.FullName,
                Email = a.Email,
                PhoneNumber = a.PhoneNumber,
                DateOfBirth = a.DateOfBirth,
                Gender = a.Gender,
                Address = a.Address,
                GuardianName = a.GuardianName,
                GuardianPhone = a.GuardianPhone,
                GuardianEmail = a.GuardianEmail,
                GuardianRelation = a.GuardianRelation,
                DesiredClassRoomId = a.DesiredClassRoomId,
                DesiredClassName = a.DesiredClassRoom.FullName,
                PreviousSchoolName = a.PreviousSchoolName,
                PreviousSchoolPercentage = a.PreviousSchoolPercentage,
                Status = a.Status,
                ReviewRemarks = a.ReviewRemarks,
                ReviewedAt = a.ReviewedAt,
                ReviewedBy = a.ReviewedBy,
                CreatedAt = a.CreatedAt,
                CreatedStudentId = a.CreatedStudentId,
                Documents = a.Documents.Select(d => new AdmissionDocumentDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    FileName = d.FileName,
                    FileSize = d.FileSize,
                    ContentType = d.ContentType,
                    DownloadUrl = $"/api/v1/admissions/documents/{d.Id}/download"
                }).ToList()
            })
            .ToListAsync();

        return Ok(PagedResult<AdmissionDto>.Create(items, total, page, pageSize));
    }

    [HttpGet("documents/{id}/download")]
    [Authorize]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var doc = await _db.AdmissionDocuments.FindAsync(id);
        if (doc == null) return NotFound();

        var stream = await _fileStorage.GetFileStreamAsync(doc.FilePath);
        return File(stream, doc.ContentType, doc.FileName);
    }

    [HttpGet("export")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> ExportToCsv([FromQuery] AdmissionStatus? status, [FromQuery] Guid? classId)
    {
        var query = _db.Admissions
            .Include(a => a.DesiredClassRoom)
            .AsNoTracking();

        if (status.HasValue) query = query.Where(a => a.Status == status.Value);
        if (classId.HasValue) query = query.Where(a => a.DesiredClassRoomId == classId.Value);

        var list = await query.ToListAsync();
        var sb = new StringBuilder();
        sb.AppendLine("ReferenceNumber,FirstName,LastName,Email,Phone,AppliedClass,GuardianName,GuardianPhone,Status,SubmissionDate");

        foreach (var a in list)
        {
            sb.AppendLine($"\"{a.ReferenceNumber}\",\"{a.FirstName}\",\"{a.LastName}\",\"{a.Email}\",\"{a.PhoneNumber}\",\"{a.DesiredClassRoom?.FullName}\",\"{a.GuardianName}\",\"{a.GuardianPhone}\",\"{a.Status}\",\"{a.CreatedAt:yyyy-MM-dd}\"");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"admissions_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAdmissionStatusRequest request)
    {
        var admission = await _db.Admissions
            .Include(a => a.DesiredClassRoom)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (admission == null) return NotFound();

        var oldStatus = admission.Status;
        admission.Status = request.NewStatus;
        admission.ReviewRemarks = request.Remarks;
        admission.ReviewedAt = DateTime.UtcNow;
        admission.ReviewedBy = _currentUserService.Email ?? "Principal";

        _db.AdmissionStatusHistories.Add(new AdmissionStatusHistory
        {
            AdmissionId = admission.Id,
            FromStatus = oldStatus,
            ToStatus = request.NewStatus,
            Remarks = request.Remarks,
            ChangedBy = admission.ReviewedBy
        });

        // If Approved, auto-create Student Account and notification!
        if (request.NewStatus == AdmissionStatus.Approved && admission.CreatedStudentId == null)
        {
            var year = DateTime.UtcNow.Year;
            var studentCountThisYear = await _db.Students.CountAsync(s => s.CreatedAt.Year == year) + 1;
            var regNo = $"{year}-CLS-{studentCountThisYear:D4}";

            // 1. Student User account
            var sUser = new User
            {
                Email = admission.Email,
                FirstName = admission.FirstName,
                LastName = admission.LastName,
                PhoneNumber = admission.PhoneNumber,
                PasswordHash = _passwordHasher.HashPassword("Welcome@123"),
                IsActive = true
            };
            var studentRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == UserRoleType.Student.ToString());
            if (studentRole != null)
            {
                sUser.UserRoles.Add(new UserRole { RoleId = studentRole.Id });
            }
            _db.Users.Add(sUser);
            await _db.SaveChangesAsync();

            // 2. Student record
            var student = new Student
            {
                UserId = sUser.Id,
                StudentRegistrationNumber = regNo,
                RollNumber = $"{100 + studentCountThisYear}",
                DateOfBirth = admission.DateOfBirth,
                Gender = admission.Gender,
                BloodGroup = "O+",
                Address = admission.Address,
                ClassRoomId = admission.DesiredClassRoomId,
                AdmissionDate = DateTime.UtcNow,
                Status = StudentStatus.Active,
                GuardianName = admission.GuardianName,
                GuardianPhone = admission.GuardianPhone,
                GuardianEmail = admission.GuardianEmail,
                GuardianRelation = admission.GuardianRelation
            };
            _db.Students.Add(student);
            await _db.SaveChangesAsync();

            admission.CreatedStudentId = student.Id;

            // 3. Auto-assign class fees
            var feeStructures = await _db.FeeStructures
                .Include(f => f.Items)
                .Where(f => f.ClassRoomId == admission.DesiredClassRoomId)
                .ToListAsync();

            foreach (var fs in feeStructures)
            {
                foreach (var item in fs.Items)
                {
                    _db.StudentFees.Add(new StudentFee
                    {
                        StudentId = student.Id,
                        FeeStructureItemId = item.Id,
                        BaseAmount = item.Amount,
                        DueDate = item.DueDate,
                        PaidAmount = 0,
                        Status = PaymentStatus.Pending
                    });
                }
            }

            // 4. Send credentials notification to student
            await _notificationSender.QueueOutboxAsync(
                NotificationChannelType.Email,
                admission.Email,
                "Admission Approved - Your Student Portal Credentials",
                $"<p>Dear {admission.FirstName},</p><p>Congratulations! Your admission has been approved.</p><p>Student ID: <strong>{regNo}</strong><br/>Username: {admission.Email}<br/>Default Password: <strong>Welcome@123</strong></p><p>Please log in and update your password immediately.</p>"
            );
        }

        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("UpdateAdmissionStatus", "Admission", admission.Id.ToString(), new { oldStatus }, new { newStatus = request.NewStatus });

        return Ok(new { message = $"Admission status transitioned to {request.NewStatus}." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Principal,SuperAdmin,Admin")]
    public async Task<IActionResult> DeleteAdmission(Guid id)
    {
        var admission = await _db.Admissions
            .Include(a => a.Documents)
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (admission == null) return NotFound(new { message = "Admission application not found." });

        // Delete associated uploaded physical files
        foreach (var doc in admission.Documents)
        {
            if (!string.IsNullOrEmpty(doc.FilePath))
            {
                try
                {
                    await _fileStorage.DeleteFileAsync(doc.FilePath);
                }
                catch
                {
                    // Continue cleanup even if physical file is missing
                }
            }
        }

        var refNumber = admission.ReferenceNumber;
        var fullName = admission.FullName;

        _db.AdmissionDocuments.RemoveRange(admission.Documents);
        _db.AdmissionStatusHistories.RemoveRange(admission.StatusHistory);
        _db.Admissions.Remove(admission);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync(
            "DeleteAdmission",
            "Admission",
            id.ToString(),
            new { ReferenceNumber = refNumber, FullName = fullName, admission.Email, admission.Status },
            null
        );

        return Ok(new { message = $"Admission application {refNumber} ({fullName}) deleted successfully." });
    }
}

public class AdmissionDocumentUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string DocumentType { get; set; } = string.Empty;
}
