using System.Text;
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
[Route("api/v1/fee-structures")]
[Authorize]
public class FeeStructuresController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public FeeStructuresController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<FeeStructureDto>>> GetStructures([FromQuery] Guid? classId)
    {
        var query = _db.FeeStructures
            .Include(f => f.AcademicYear)
            .Include(f => f.ClassRoom)
            .Include(f => f.Items).ThenInclude(i => i.FeeHead)
            .AsNoTracking();

        if (classId.HasValue) query = query.Where(f => f.ClassRoomId == classId.Value);

        var list = await query
            .OrderBy(f => f.Name)
            .Select(f => new FeeStructureDto
            {
                Id = f.Id,
                Name = f.Name,
                AcademicYearId = f.AcademicYearId,
                AcademicYearName = f.AcademicYear.Name,
                ClassRoomId = f.ClassRoomId,
                ClassName = f.ClassRoom.FullName,
                Frequency = f.Frequency,
                TotalAmount = f.TotalAmount,
                Items = f.Items.Select(i => new FeeStructureItemDto
                {
                    Id = i.Id,
                    FeeHeadId = i.FeeHeadId,
                    FeeHeadName = i.FeeHead.Name,
                    Amount = i.Amount,
                    DueDate = i.DueDate
                }).ToList()
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<FeeStructureDto>> Create([FromBody] CreateFeeStructureRequest request)
    {
        var total = request.Items.Sum(i => i.Amount);
        var fs = new FeeStructure
        {
            Name = request.Name,
            AcademicYearId = request.AcademicYearId,
            ClassRoomId = request.ClassRoomId,
            Frequency = request.Frequency,
            TotalAmount = total
        };

        foreach (var it in request.Items)
        {
            fs.Items.Add(new FeeStructureItem
            {
                FeeHeadId = it.FeeHeadId,
                Amount = it.Amount,
                DueDate = DateTime.SpecifyKind(it.DueDate, DateTimeKind.Utc)
            });
        }

        _db.FeeStructures.Add(fs);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateFeeStructure", "FeeStructure", fs.Id.ToString(), null, request);

        return Ok(new FeeStructureDto { Id = fs.Id, Name = fs.Name, TotalAmount = fs.TotalAmount });
    }
}

[ApiController]
[Route("api/v1/fee-heads")]
[Authorize]
public class FeeHeadsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _auditLogService;

    public FeeHeadsController(ApplicationDbContext db, IAuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<FeeHeadDto>>> GetHeads()
    {
        var heads = await _db.FeeHeads
            .OrderBy(h => h.Name)
            .Select(h => new FeeHeadDto
            {
                Id = h.Id,
                Name = h.Name,
                Description = h.Description,
                IsMandatory = h.IsMandatory
            })
            .ToListAsync();

        return Ok(heads);
    }

    [HttpPost]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<FeeHeadDto>> Create([FromBody] CreateFeeHeadRequest request)
    {
        var head = new FeeHead
        {
            Name = request.Name,
            Description = request.Description,
            IsMandatory = request.IsMandatory
        };

        _db.FeeHeads.Add(head);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateFeeHead", "FeeHead", head.Id.ToString(), null, request);

        return Ok(new FeeHeadDto { Id = head.Id, Name = head.Name, IsMandatory = head.IsMandatory });
    }
}

[ApiController]
[Route("api/v1/fees")]
[Authorize]
public class FeesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPdfService _pdfService;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUserService;

    public FeesController(
        ApplicationDbContext db,
        IPdfService pdfService,
        IPaymentGateway paymentGateway,
        IAuditLogService auditLogService,
        ICurrentUserService currentUserService)
    {
        _db = db;
        _pdfService = pdfService;
        _paymentGateway = paymentGateway;
        _auditLogService = auditLogService;
        _currentUserService = currentUserService;
    }

    [HttpGet("student/{studentId}")]
    public async Task<ActionResult<List<StudentFeeDto>>> GetStudentFees(Guid studentId)
    {
        // RBAC check: Student can only view own fees
        if (_currentUserService.IsInRole("Student"))
        {
            var isSelf = await _db.Students.AnyAsync(s => s.Id == studentId && s.UserId == _currentUserService.UserId);
            if (!isSelf) return Forbid();
        }

        var fees = await _db.StudentFees
            .Where(f => f.StudentId == studentId)
            .Include(f => f.Student).ThenInclude(s => s.User)
            .Include(f => f.Student).ThenInclude(s => s.ClassRoom)
            .Include(f => f.FeeStructureItem).ThenInclude(i => i.FeeHead)
            .Include(f => f.Payments).ThenInclude(p => p.Receipt)
            .OrderBy(f => f.DueDate)
            .Select(f => new StudentFeeDto
            {
                Id = f.Id,
                StudentId = f.StudentId,
                StudentName = f.Student.User.FullName,
                RollNumber = f.Student.RollNumber,
                ClassName = f.Student.ClassRoom.FullName,
                FeeStructureItemId = f.FeeStructureItemId,
                FeeHeadName = f.FeeStructureItem.FeeHead.Name,
                BaseAmount = f.BaseAmount,
                DiscountAmount = f.DiscountAmount,
                LateFeeAmount = f.LateFeeAmount,
                TotalPayable = f.TotalPayable,
                PaidAmount = f.PaidAmount,
                BalanceAmount = f.BalanceAmount,
                DueDate = f.DueDate,
                Status = f.Status,
                Payments = f.Payments.Select(p => new FeePaymentDto
                {
                    Id = p.Id,
                    StudentFeeId = p.StudentFeeId,
                    StudentName = f.Student.User.FullName,
                    FeeHeadName = f.FeeStructureItem.FeeHead.Name,
                    Amount = p.Amount,
                    Mode = p.Mode,
                    TransactionReference = p.TransactionReference,
                    PaymentDate = p.PaymentDate,
                    ReceivedBy = p.ReceivedBy,
                    Remarks = p.Remarks,
                    ReceiptId = p.Receipt != null ? p.Receipt.Id : null,
                    ReceiptNumber = p.Receipt != null ? p.Receipt.ReceiptNumber : null
                }).ToList()
            })
            .ToListAsync();

        return Ok(fees);
    }

    [HttpPost("payments")]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<FeePaymentDto>> RecordPayment([FromBody] CollectPaymentRequest request)
    {
        var studentFee = await _db.StudentFees
            .Include(sf => sf.Student).ThenInclude(s => s.User)
            .Include(sf => sf.Student).ThenInclude(s => s.ClassRoom)
            .Include(sf => sf.FeeStructureItem).ThenInclude(i => i.FeeHead)
            .FirstOrDefaultAsync(sf => sf.Id == request.StudentFeeId);

        if (studentFee == null) return NotFound("Student fee installment not found.");

        if (studentFee.BalanceAmount <= 0)
        {
            return BadRequest(new { message = "Fee is already fully paid." });
        }

        if (request.Amount > studentFee.BalanceAmount)
        {
            return BadRequest(new { message = $"Payment amount ({request.Amount}) cannot exceed balance due ({studentFee.BalanceAmount})." });
        }

        var year = DateTime.UtcNow.Year;
        var paymentCount = await _db.FeePayments.CountAsync(p => p.PaymentDate.Year == year) + 1;
        var receiptNo = $"REC-{year}-{paymentCount:D4}";

        var payment = new FeePayment
        {
            StudentFeeId = studentFee.Id,
            Amount = request.Amount,
            Mode = request.Mode,
            TransactionReference = request.TransactionReference,
            PaymentDate = DateTime.UtcNow,
            ReceivedBy = _currentUserService.Email ?? "Principal",
            Remarks = request.Remarks
        };

        _db.FeePayments.Add(payment);
        await _db.SaveChangesAsync();

        var receipt = new FeeReceipt
        {
            FeePaymentId = payment.Id,
            ReceiptNumber = receiptNo,
            IssueDate = payment.PaymentDate
        };
        _db.FeeReceipts.Add(receipt);

        // Update StudentFee paid amount & status
        studentFee.PaidAmount += request.Amount;
        if (studentFee.PaidAmount >= studentFee.TotalPayable)
        {
            studentFee.Status = PaymentStatus.Paid;
        }
        else
        {
            studentFee.Status = PaymentStatus.Partial;
        }

        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("RecordFeePayment", "FeePayment", payment.Id.ToString(), null, new { receiptNo, amount = request.Amount, student = studentFee.Student.User.FullName });

        return Ok(new FeePaymentDto
        {
            Id = payment.Id,
            StudentFeeId = studentFee.Id,
            StudentName = studentFee.Student.User.FullName,
            FeeHeadName = studentFee.FeeStructureItem.FeeHead.Name,
            Amount = payment.Amount,
            Mode = payment.Mode,
            TransactionReference = payment.TransactionReference,
            PaymentDate = payment.PaymentDate,
            ReceivedBy = payment.ReceivedBy,
            ReceiptId = receipt.Id,
            ReceiptNumber = receipt.ReceiptNumber
        });
    }

    [HttpGet("payments/{paymentId}/receipt")]
    public async Task<IActionResult> DownloadReceiptPdf(Guid paymentId)
    {
        var payment = await _db.FeePayments
            .Include(p => p.Receipt)
            .Include(p => p.StudentFee).ThenInclude(sf => sf.Student).ThenInclude(s => s.User)
            .Include(p => p.StudentFee).ThenInclude(sf => sf.Student).ThenInclude(s => s.ClassRoom)
            .Include(p => p.StudentFee).ThenInclude(sf => sf.FeeStructureItem).ThenInclude(i => i.FeeHead)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null || payment.Receipt == null) return NotFound("Payment or receipt record not found.");

        var student = payment.StudentFee.Student;
        var classRoom = student.ClassRoom;
        var item = payment.StudentFee.FeeStructureItem;

        var pdfBytes = await _pdfService.GenerateFeeReceiptPdfAsync(payment, payment.Receipt, student, classRoom, item);

        return File(pdfBytes, "application/pdf", $"Receipt_{payment.Receipt.ReceiptNumber}.pdf");
    }

    [HttpGet("reports/collection")]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<FeeCollectionSummaryDto>> GetCollectionSummary()
    {
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var tomorrow = today.AddDays(1);
        var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var todaySum = await _db.FeePayments
            .Where(p => p.PaymentDate >= today && p.PaymentDate < tomorrow)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var monthSum = await _db.FeePayments
            .Where(p => p.PaymentDate >= startOfMonth)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var pendingFees = await _db.StudentFees
            .Where(sf => sf.Status != PaymentStatus.Paid)
            .SumAsync(sf => (decimal?)(sf.BaseAmount - sf.DiscountAmount + sf.LateFeeAmount - sf.PaidAmount)) ?? 0m;

        var defaultersCount = await _db.StudentFees
            .Where(sf => sf.Status != PaymentStatus.Paid && sf.DueDate < DateTime.UtcNow)
            .Select(sf => sf.StudentId)
            .Distinct()
            .CountAsync();

        return Ok(new FeeCollectionSummaryDto
        {
            TodayCollection = todaySum,
            ThisMonthCollection = monthSum,
            TotalPendingDues = pendingFees,
            DefaulterCount = defaultersCount
        });
    }

    [HttpGet("reports/defaulters")]
    [Authorize(Roles = "Principal")]
    public async Task<ActionResult<List<FeeDefaulterDto>>> GetDefaulters([FromQuery] Guid? classId)
    {
        var now = DateTime.UtcNow;
        var query = _db.StudentFees
            .Where(sf => sf.Status != PaymentStatus.Paid && sf.DueDate < now)
            .Include(sf => sf.Student).ThenInclude(s => s.User)
            .Include(sf => sf.Student).ThenInclude(s => s.ClassRoom)
            .AsQueryable();

        if (classId.HasValue)
            query = query.Where(sf => sf.Student.ClassRoomId == classId.Value);

        var list = await query.ToListAsync();
        var grouped = list.GroupBy(sf => sf.StudentId).Select(g =>
        {
            var first = g.First();
            var totalDue = g.Sum(x => x.BalanceAmount);
            var earliestDue = g.Min(x => x.DueDate);
            var daysOverdue = (int)(now - earliestDue).TotalDays;
            var guardianName = first.Student.GuardianName ?? "N/A";
            var guardianPhone = first.Student.GuardianPhone ?? "N/A";

            return new FeeDefaulterDto
            {
                StudentId = first.StudentId,
                StudentName = first.Student.User.FullName,
                RollNumber = first.Student.RollNumber,
                ClassName = first.Student.ClassRoom.FullName,
                GuardianName = guardianName,
                GuardianPhone = guardianPhone,
                TotalDue = totalDue,
                EarliestDueDate = earliestDue,
                DaysOverdue = daysOverdue
            };
        }).OrderByDescending(d => d.DaysOverdue).ToList();

        return Ok(grouped);
    }

    [HttpGet("reports/defaulters/export")]
    [Authorize(Roles = "Principal")]
    public async Task<IActionResult> ExportDefaultersToCsv([FromQuery] Guid? classId)
    {
        var defaultersRes = await GetDefaulters(classId);
        var defaulters = (defaultersRes.Result as OkObjectResult)?.Value as List<FeeDefaulterDto> ?? new List<FeeDefaulterDto>();

        var sb = new StringBuilder();
        sb.AppendLine("RollNumber,StudentName,Class,GuardianName,GuardianPhone,TotalDue,DaysOverdue");

        foreach (var d in defaulters)
        {
            sb.AppendLine($"\"{d.RollNumber}\",\"{d.StudentName}\",\"{d.ClassName}\",\"{d.GuardianName}\",\"{d.GuardianPhone}\",{d.TotalDue},{d.DaysOverdue}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"fee_defaulters_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpPost("online/create-order")]
    public async Task<IActionResult> CreateOnlineOrder([FromBody] decimal amount)
    {
        var (orderId, orderAmount, currency) = await _paymentGateway.CreateOrderAsync(amount, "receipt_online");
        return Ok(new { orderId, amount = orderAmount, currency });
    }
}
