using Microsoft.EntityFrameworkCore;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Domain.Common;
using InstitutionErp.Domain.Entities;

namespace InstitutionErp.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    private readonly ICurrentUserService? _currentUserService;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentUserService? currentUserService = null) : base(options)
    {
        _currentUserService = currentUserService;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AcademicYear> AcademicYears => Set<AcademicYear>();
    public DbSet<ClassRoom> Classes => Set<ClassRoom>();
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<ClassSubject> ClassSubjects => Set<ClassSubject>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<TeacherAllocation> TeacherAllocations => Set<TeacherAllocation>();
    public DbSet<TimetableEntry> TimetableEntries => Set<TimetableEntry>();
    public DbSet<TeacherAttendance> TeacherAttendances => Set<TeacherAttendance>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Admission> Admissions => Set<Admission>();
    public DbSet<AdmissionDocument> AdmissionDocuments => Set<AdmissionDocument>();
    public DbSet<AdmissionStatusHistory> AdmissionStatusHistories => Set<AdmissionStatusHistory>();
    public DbSet<FeeHead> FeeHeads => Set<FeeHead>();
    public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
    public DbSet<FeeStructureItem> FeeStructureItems => Set<FeeStructureItem>();
    public DbSet<StudentFee> StudentFees => Set<StudentFee>();
    public DbSet<FeePayment> FeePayments => Set<FeePayment>();
    public DbSet<FeeReceipt> FeeReceipts => Set<FeeReceipt>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamSubject> ExamSubjects => Set<ExamSubject>();
    public DbSet<ExamMark> ExamMarks => Set<ExamMark>();
    public DbSet<GradeScale> GradeScales => Set<GradeScale>();
    public DbSet<Notice> Notices => Set<Notice>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationOutbox> NotificationOutboxes => Set<NotificationOutbox>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global query filter for soft delete
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(ConvertFilterExpression(entityType.ClrType));
            }
        }

        // User & Roles
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(r => r.Name).IsUnique();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });
            entity.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });


        // Attendance uniqueness: (StudentId, Date)
        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasIndex(a => new { a.StudentId, a.Date }).IsUnique();
        });

        // Timetable unique slot per teacher or class
        modelBuilder.Entity<TimetableEntry>(entity =>
        {
            entity.HasIndex(t => new { t.ClassRoomId, t.DayOfWeek, t.PeriodNumber });
            entity.HasIndex(t => new { t.TeacherId, t.DayOfWeek, t.PeriodNumber });
        });

        // Fee Payment & Receipt 1:1
        modelBuilder.Entity<FeePayment>(entity =>
        {
            entity.HasOne(p => p.Receipt)
                .WithOne(r => r.FeePayment)
                .HasForeignKey<FeeReceipt>(r => r.FeePaymentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Student registration number index
        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasIndex(s => s.StudentRegistrationNumber).IsUnique();
        });
    }

    private static System.Linq.Expressions.LambdaExpression ConvertFilterExpression(Type entityType)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");
        var property = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
        var condition = System.Linq.Expressions.Expression.Equal(property, System.Linq.Expressions.Expression.Constant(false));
        return System.Linq.Expressions.Expression.Lambda(condition, parameter);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var userEmail = _currentUserService?.Email ?? "System";

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    entry.Entity.CreatedBy = userEmail;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    entry.Entity.UpdatedBy = userEmail;
                    break;
                case EntityState.Deleted:
                    // Soft delete
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    entry.Entity.UpdatedBy = userEmail;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
