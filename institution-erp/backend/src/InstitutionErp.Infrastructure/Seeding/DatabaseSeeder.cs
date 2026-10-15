using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Domain.Enums;
using InstitutionErp.Infrastructure.Persistence;

namespace InstitutionErp.Infrastructure.Seeding;

public class DatabaseSeeder
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _config;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        ApplicationDbContext db,
        IPasswordHasher passwordHasher,
        IConfiguration config,
        ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _config = config;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        // 1. Roles - Only Principal, Teacher, Student
        var roleNames = Enum.GetNames<UserRoleType>();
        foreach (var roleName in roleNames)
        {
            if (!await _db.Roles.AnyAsync(r => r.Name == roleName))
            {
                _db.Roles.Add(new Role
                {
                    Name = roleName,
                    Description = $"{roleName} role with specific operational permissions."
                });
            }
        }
        await _db.SaveChangesAsync();

        // Clean up legacy tables & obsolete roles using safe cascading raw SQL
        try
        {
            await _db.Database.ExecuteSqlRawAsync(@"
                DROP TABLE IF EXISTS student_parents CASCADE;
                DROP TABLE IF EXISTS parents CASCADE;
                DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE name NOT IN ('Principal', 'Teacher', 'Student'));
                DELETE FROM roles WHERE name NOT IN ('Principal', 'Teacher', 'Student');
            ");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Legacy cleanup note: {Message}", ex.Message);
        }

        var roles = await _db.Roles.ToDictionaryAsync(r => r.Name);
        var principalRoleId = roles[UserRoleType.Principal.ToString()].Id;

        // 2. Principal & Admin Accounts (Ensure principal@institution.edu and admin@institution.edu exist with Principal role and Password@123)
        var principalPassword = _config["Admin:Password"] ?? "Password@123";
        var adminEmails = new[] { "principal@institution.edu", "admin@institution.edu", "superadmin@institution.edu" };

        foreach (var email in adminEmails)
        {
            var user = await _db.Users
                .IgnoreQueryFilters()
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                user = new User
                {
                    Email = email,
                    FirstName = email.StartsWith("admin") ? "Administrator" : (email.StartsWith("superadmin") ? "Super" : "Arthur"),
                    LastName = email.StartsWith("admin") ? "Executive" : (email.StartsWith("superadmin") ? "Admin" : "Pendleton"),
                    PasswordHash = _passwordHasher.HashPassword(principalPassword),
                    PhoneNumber = "+1 555-0100",
                    IsActive = true,
                    IsDeleted = false
                };
                user.UserRoles.Add(new UserRole { RoleId = principalRoleId });
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Executive admin account seeded: {Email}", email);
            }
            else
            {
                // Ensure active, un-deleted, password updated to Password@123, lockout reset, and assigned Principal role
                user.IsDeleted = false;
                user.PasswordHash = _passwordHasher.HashPassword(principalPassword);
                user.IsActive = true;
                user.AccessFailedCount = 0;
                user.LockoutEnd = null;

                if (!user.UserRoles.Any(ur => ur.RoleId == principalRoleId))
                {
                    user.UserRoles.Add(new UserRole { RoleId = principalRoleId, UserId = user.Id });
                }
                await _db.SaveChangesAsync();
            }
        }

        // 4. Grade Scales
        if (!await _db.GradeScales.AnyAsync())
        {
            _db.GradeScales.AddRange(
                new GradeScale { GradeLetter = "A+", MinPercentage = 90, MaxPercentage = 100, GradePoint = 10.0m, Description = "Outstanding" },
                new GradeScale { GradeLetter = "A", MinPercentage = 80, MaxPercentage = 89.99m, GradePoint = 9.0m, Description = "Excellent" },
                new GradeScale { GradeLetter = "B+", MinPercentage = 70, MaxPercentage = 79.99m, GradePoint = 8.0m, Description = "Very Good" },
                new GradeScale { GradeLetter = "B", MinPercentage = 60, MaxPercentage = 69.99m, GradePoint = 7.0m, Description = "Good" },
                new GradeScale { GradeLetter = "C", MinPercentage = 50, MaxPercentage = 59.99m, GradePoint = 6.0m, Description = "Satisfactory" },
                new GradeScale { GradeLetter = "D", MinPercentage = 35, MaxPercentage = 49.99m, GradePoint = 4.0m, Description = "Pass" },
                new GradeScale { GradeLetter = "F", MinPercentage = 0, MaxPercentage = 34.99m, GradePoint = 0.0m, Description = "Fail" }
            );
            await _db.SaveChangesAsync();
        }

        // 5. Academic Year
        var currentYear = await _db.AcademicYears.FirstOrDefaultAsync(y => y.IsActive);
        if (currentYear == null)
        {
            currentYear = new AcademicYear
            {
                Name = "2026-2027",
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 5, 31, 0, 0, 0, DateTimeKind.Utc),
                IsActive = true
            };
            _db.AcademicYears.Add(currentYear);
            await _db.SaveChangesAsync();
        }

        // 6. Subjects
        var subjectsList = new[]
        {
            ("Mathematics", "MATH101"),
            ("Physics", "PHYS101"),
            ("Chemistry", "CHEM101"),
            ("Biology", "BIO101"),
            ("English Literature", "ENG101"),
            ("Computer Science", "CS101"),
            ("World History", "HIST101"),
            ("Economics", "ECON101")
        };

        var subjects = new List<Subject>();
        foreach (var (sName, sCode) in subjectsList)
        {
            var subj = await _db.Subjects.FirstOrDefaultAsync(s => s.Code == sCode);
            if (subj == null)
            {
                subj = new Subject { Name = sName, Code = sCode, Description = $"Standard curriculum for {sName}" };
                _db.Subjects.Add(subj);
                await _db.SaveChangesAsync();
            }
            subjects.Add(subj);
        }

        // 7. Classes
        var classesList = new[]
        {
            ("Grade 9", "A"),
            ("Grade 9", "B"),
            ("Grade 10", "A"),
            ("Grade 10", "B"),
            ("Grade 11", "Science"),
            ("Grade 12", "Science")
        };

        var classRooms = new List<ClassRoom>();
        foreach (var (cName, cSec) in classesList)
        {
            var cr = await _db.Classes.FirstOrDefaultAsync(c => c.Name == cName && c.Section == cSec && c.AcademicYearId == currentYear.Id);
            if (cr == null)
            {
                cr = new ClassRoom
                {
                    Name = cName,
                    Section = cSec,
                    Capacity = 40,
                    AcademicYearId = currentYear.Id
                };
                _db.Classes.Add(cr);
                await _db.SaveChangesAsync();

                // Allocate subjects to class
                foreach (var s in subjects)
                {
                    _db.ClassSubjects.Add(new ClassSubject { ClassRoomId = cr.Id, SubjectId = s.Id });
                }
                await _db.SaveChangesAsync();
            }
            classRooms.Add(cr);
        }

        // 8. Teachers (5 teachers)
        var teacherNames = new[]
        {
            ("John", "Doe", "M.Sc Mathematics", "Calculus & Geometry"),
            ("Emily", "Blunt", "Ph.D Physics", "Quantum & Mechanics"),
            ("Robert", "Downey", "M.Sc Chemistry", "Organic Chemistry"),
            ("Clara", "Oswald", "M.A English", "Literature & Composition"),
            ("Alan", "Turing", "M.Tech Computer Science", "Algorithms & Data Structures")
        };

        var teachers = new List<Teacher>();
        int tIdx = 1;
        foreach (var (fName, lName, qual, spec) in teacherNames)
        {
            var tEmail = $"teacher{tIdx}@institution.edu";
            var teacher = await _db.Teachers.Include(t => t.User).FirstOrDefaultAsync(t => t.User.Email == tEmail);
            if (teacher == null)
            {
                var tUser = new User
                {
                    Email = tEmail,
                    FirstName = fName,
                    LastName = lName,
                    PasswordHash = _passwordHasher.HashPassword("Password@123"),
                    PhoneNumber = $"+1 555-020{tIdx}",
                    IsActive = true
                };
                tUser.UserRoles.Add(new UserRole { RoleId = roles[UserRoleType.Teacher.ToString()].Id });
                _db.Users.Add(tUser);
                await _db.SaveChangesAsync();

                teacher = new Teacher
                {
                    UserId = tUser.Id,
                    EmployeeCode = $"TCH-00{tIdx}",
                    Qualification = qual,
                    Specialization = spec,
                    JoiningDate = DateTime.UtcNow.AddMonths(-24),
                    Status = TeacherStatus.Active
                };
                _db.Teachers.Add(teacher);
                await _db.SaveChangesAsync();

                // Allocate teacher to classes and subjects
                var targetClass = classRooms[(tIdx - 1) % classRooms.Count];
                var targetSubject = subjects[(tIdx - 1) % subjects.Count];
                _db.TeacherAllocations.Add(new TeacherAllocation
                {
                    TeacherId = teacher.Id,
                    ClassRoomId = targetClass.Id,
                    SubjectId = targetSubject.Id,
                    IsClassTeacher = tIdx == 1
                });

                // Timetable entry
                _db.TimetableEntries.Add(new TimetableEntry
                {
                    ClassRoomId = targetClass.Id,
                    SubjectId = targetSubject.Id,
                    TeacherId = teacher.Id,
                    DayOfWeek = DayOfWeek.Monday,
                    PeriodNumber = tIdx,
                    StartTime = new TimeSpan(9 + tIdx, 0, 0),
                    EndTime = new TimeSpan(9 + tIdx + 1, 0, 0),
                    RoomNumber = $"Room {100 + tIdx}"
                });
            }
            teachers.Add(teacher);
            tIdx++;
        }
        await _db.SaveChangesAsync();

        // 9. Fee Heads & Fee Structure
        var tuitionHead = await _db.FeeHeads.FirstOrDefaultAsync(h => h.Name == "Tuition Fee");
        if (tuitionHead == null)
        {
            tuitionHead = new FeeHead { Name = "Tuition Fee", Description = "Academic tuition fee per term", IsMandatory = true };
            _db.FeeHeads.Add(tuitionHead);
        }

        var labHead = await _db.FeeHeads.FirstOrDefaultAsync(h => h.Name == "Laboratory & Computer Fee");
        if (labHead == null)
        {
            labHead = new FeeHead { Name = "Laboratory & Computer Fee", Description = "Practical science and computer lab access", IsMandatory = true };
            _db.FeeHeads.Add(labHead);
        }
        await _db.SaveChangesAsync();

        var primaryClass = classRooms[0];
        var feeStructure = await _db.FeeStructures
            .Include(f => f.Items)
            .FirstOrDefaultAsync(f => f.ClassRoomId == primaryClass.Id && f.AcademicYearId == currentYear.Id);

        if (feeStructure == null)
        {
            feeStructure = new FeeStructure
            {
                Name = $"{primaryClass.FullName} Annual Fee Structure",
                AcademicYearId = currentYear.Id,
                ClassRoomId = primaryClass.Id,
                Frequency = FeeFrequency.Term,
                TotalAmount = 50000m
            };
            _db.FeeStructures.Add(feeStructure);
            await _db.SaveChangesAsync();

            feeStructure.Items.Add(new FeeStructureItem
            {
                FeeStructureId = feeStructure.Id,
                FeeHeadId = tuitionHead.Id,
                Amount = 35000m,
                DueDate = DateTime.UtcNow.AddMonths(1)
            });

            feeStructure.Items.Add(new FeeStructureItem
            {
                FeeStructureId = feeStructure.Id,
                FeeHeadId = labHead.Id,
                Amount = 15000m,
                DueDate = DateTime.UtcNow.AddMonths(2)
            });
            await _db.SaveChangesAsync();
        }

        var primaryItem = await _db.FeeStructureItems.FirstOrDefaultAsync(i => i.FeeStructureId == feeStructure.Id);
        if (primaryItem == null)
        {
            primaryItem = new FeeStructureItem
            {
                FeeStructureId = feeStructure.Id,
                FeeHeadId = tuitionHead.Id,
                Amount = 35000m,
                DueDate = DateTime.UtcNow.AddMonths(1)
            };
            _db.FeeStructureItems.Add(primaryItem);
            await _db.SaveChangesAsync();
        }

        // 10. Students & Parents (60 students across classes)
        var studentCount = await _db.Students.CountAsync();
        if (studentCount < 60)
        {
            var firstNames = new[] { "James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Lucas", "Mia", "Oliver", "Sophia", "Elijah", "Charlotte", "William", "Amelia", "Henry", "Harper", "Alexander", "Evelyn", "Daniel", "Abigail" };
            var lastNames = new[] { "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White" };

            for (int i = studentCount + 1; i <= 60; i++)
            {
                var sFirstName = firstNames[(i - 1) % firstNames.Length];
                var sLastName = lastNames[((i - 1) * 3) % lastNames.Length];
                var sEmail = $"student{i}@institution.edu";
                var pEmail = $"parent{i}@family.com";

                var targetClass = classRooms[(i - 1) % classRooms.Count];

                // Create Student User
                var sUser = new User
                {
                    Email = sEmail,
                    FirstName = sFirstName,
                    LastName = sLastName,
                    PasswordHash = _passwordHasher.HashPassword("Password@123"),
                    PhoneNumber = $"+1 555-10{i:D2}",
                    IsActive = true
                };
                sUser.UserRoles.Add(new UserRole { RoleId = roles[UserRoleType.Student.ToString()].Id });
                _db.Users.Add(sUser);
                await _db.SaveChangesAsync();

                var regNo = $"2026-CLS-{i:D4}";
                var student = new Student
                {
                    UserId = sUser.Id,
                    StudentRegistrationNumber = regNo,
                    RollNumber = $"{100 + i}",
                    DateOfBirth = new DateTime(2010, (i % 12) + 1, (i % 25) + 1, 0, 0, 0, DateTimeKind.Utc),
                    Gender = i % 2 == 0 ? Gender.Female : Gender.Male,
                    BloodGroup = (i % 4) switch { 0 => "O+", 1 => "A+", 2 => "B+", _ => "AB+" },
                    Address = $"{100 + i} Campus Avenue, Cityville",
                    ClassRoomId = targetClass.Id,
                    AdmissionDate = DateTime.UtcNow.AddMonths(-6),
                    Status = StudentStatus.Active,
                    GuardianName = $"Guardian {sLastName}",
                    GuardianPhone = $"+1 555-20{i:D2}",
                    GuardianEmail = $"guardian{i}@example.com",
                    GuardianRelation = i % 2 == 0 ? "Mother" : "Father"
                };
                _db.Students.Add(student);
                await _db.SaveChangesAsync();

                // Assign Fee installment
                var sf = new StudentFee
                {
                    StudentId = student.Id,
                    FeeStructureItemId = primaryItem.Id,
                    BaseAmount = primaryItem.Amount,
                    DueDate = primaryItem.DueDate,
                    PaidAmount = (i % 3 == 0) ? primaryItem.Amount : (i % 3 == 1 ? 15000m : 0m),
                    Status = (i % 3 == 0) ? PaymentStatus.Paid : (i % 3 == 1 ? PaymentStatus.Partial : PaymentStatus.Pending)
                };
                _db.StudentFees.Add(sf);
                await _db.SaveChangesAsync();

                if (sf.PaidAmount > 0)
                {
                    var payment = new FeePayment
                    {
                        StudentFeeId = sf.Id,
                        Amount = sf.PaidAmount,
                        Mode = PaymentMode.UPI,
                        TransactionReference = $"UPI-TXN-{Guid.NewGuid():N}".Substring(0, 16).ToUpper(),
                        PaymentDate = DateTime.UtcNow.AddDays(-i),
                        ReceivedBy = "principal@institution.edu"
                    };
                    _db.FeePayments.Add(payment);
                    await _db.SaveChangesAsync();

                    var receipt = new FeeReceipt
                    {
                        FeePaymentId = payment.Id,
                        ReceiptNumber = $"REC-2026-{i:D4}",
                        IssueDate = payment.PaymentDate
                    };
                    _db.FeeReceipts.Add(receipt);
                }

                // 30 days of attendance
                for (int d = 1; d <= 30; d++)
                {
                    var attDate = DateTime.UtcNow.Date.AddDays(-d);
                    var isAbsent = (i + d) % 9 == 0;
                    var isLate = !isAbsent && (i + d) % 15 == 0;
                    _db.Attendances.Add(new Attendance
                    {
                        StudentId = student.Id,
                        ClassRoomId = targetClass.Id,
                        Date = attDate,
                        Status = isAbsent ? AttendanceStatus.Absent : (isLate ? AttendanceStatus.Late : AttendanceStatus.Present),
                        MarkedBy = "teacher1@institution.edu"
                    });
                }
            }
            await _db.SaveChangesAsync();
            _logger.LogInformation("60 students, fees, and attendance seeded successfully.");
        }

        // 11. Mid Term Exam with Marks & Published Results
        var existingExam = await _db.Exams.FirstOrDefaultAsync(e => e.ClassRoomId == primaryClass.Id);
        if (existingExam == null)
        {
            var exam = new Exam
            {
                Name = "Mid-Term Examinations 2026",
                Type = ExamType.MidTerm,
                AcademicYearId = currentYear.Id,
                ClassRoomId = primaryClass.Id,
                StartDate = DateTime.UtcNow.AddDays(-20),
                EndDate = DateTime.UtcNow.AddDays(-10),
                IsPublished = true,
                IsLocked = true,
                PublishedAt = DateTime.UtcNow.AddDays(-9)
            };
            _db.Exams.Add(exam);
            await _db.SaveChangesAsync();

            var examSub1 = new ExamSubject
            {
                ExamId = exam.Id,
                SubjectId = subjects[0].Id, // Math
                MaxMarks = 100,
                PassMarks = 35,
                ExamDate = exam.StartDate
            };

            var examSub2 = new ExamSubject
            {
                ExamId = exam.Id,
                SubjectId = subjects[1].Id, // Physics
                MaxMarks = 100,
                PassMarks = 35,
                ExamDate = exam.StartDate.AddDays(2)
            };

            var examSub3 = new ExamSubject
            {
                ExamId = exam.Id,
                SubjectId = subjects[4].Id, // English
                MaxMarks = 100,
                PassMarks = 35,
                ExamDate = exam.StartDate.AddDays(4)
            };

            _db.ExamSubjects.AddRange(examSub1, examSub2, examSub3);
            await _db.SaveChangesAsync();

            var classStudents = await _db.Students.Where(s => s.ClassRoomId == primaryClass.Id).ToListAsync();
            int stIdx = 1;
            foreach (var st in classStudents)
            {
                decimal mark1 = Math.Clamp(55 + (stIdx * 4) % 45, 35, 98);
                decimal mark2 = Math.Clamp(60 + (stIdx * 3) % 40, 36, 95);
                decimal mark3 = Math.Clamp(70 + (stIdx * 2) % 30, 40, 99);

                _db.ExamMarks.Add(new ExamMark { ExamSubjectId = examSub1.Id, StudentId = st.Id, MarksObtained = mark1, EnteredBy = "teacher1@institution.edu" });
                _db.ExamMarks.Add(new ExamMark { ExamSubjectId = examSub2.Id, StudentId = st.Id, MarksObtained = mark2, EnteredBy = "teacher2@institution.edu" });
                _db.ExamMarks.Add(new ExamMark { ExamSubjectId = examSub3.Id, StudentId = st.Id, MarksObtained = mark3, EnteredBy = "teacher4@institution.edu" });
                stIdx++;
            }
            await _db.SaveChangesAsync();
            _logger.LogInformation("Exam and student marks seeded successfully.");
        }

        // 12. Notices
        if (!await _db.Notices.AnyAsync())
        {
            _db.Notices.AddRange(
                new Notice
                {
                    Title = "Welcome to Academic Year 2026-2027",
                    Content = "Orientation sessions for all classes commence next Monday. Students are advised to report in full uniform by 8:30 AM.",
                    Audience = NoticeAudience.All,
                    IsPinned = true,
                    PostedBy = "Principal Office",
                    CreatedAt = DateTime.UtcNow.AddDays(-15)
                },
                new Notice
                {
                    Title = "Mid-Term Examination Results Declared",
                    Content = "The mid-term examination results have been published. Parents and students can view performance reports on the portal.",
                    Audience = NoticeAudience.All,
                    IsPinned = true,
                    PostedBy = "Exam Department",
                    CreatedAt = DateTime.UtcNow.AddDays(-8)
                },
                new Notice
                {
                    Title = "Faculty Coordination Meeting",
                    Content = "Faculty coordination meeting for all departments will be conducted this Saturday from 10:00 AM to 1:00 PM.",
                    Audience = NoticeAudience.Teacher,
                    IsPinned = false,
                    PostedBy = "Principal Office",
                    CreatedAt = DateTime.UtcNow.AddDays(-3)
                },
                new Notice
                {
                    Title = "Upcoming Term Fee Payment Deadline",
                    Content = "Kindly ensure fee installments are settled on or before the due date to avoid automated late fee charges.",
                    Audience = NoticeAudience.Student,
                    IsPinned = false,
                    PostedBy = "Principal Office",
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                }
            );
            await _db.SaveChangesAsync();
            _logger.LogInformation("Notices seeded successfully.");
        }

        _logger.LogInformation("Database seeding complete.");
    }
}
