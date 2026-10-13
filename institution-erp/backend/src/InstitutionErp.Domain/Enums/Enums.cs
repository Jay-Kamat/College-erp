namespace InstitutionErp.Domain.Enums;

public enum UserRoleType
{
    SuperAdmin,
    Admin,
    Accountant,
    Teacher,
    Student,
    Parent
}

public enum Gender
{
    Male,
    Female,
    Other
}

public enum AdmissionStatus
{
    Submitted,
    UnderReview,
    Approved,
    Rejected,
    Waitlisted
}

public enum StudentStatus
{
    Active,
    Alumni,
    Suspended
}

public enum TeacherStatus
{
    Active,
    OnLeave,
    Resigned
}

public enum AttendanceStatus
{
    Present,
    Absent,
    Late,
    Leave
}

public enum PaymentMode
{
    Cash,
    Cheque,
    UPI,
    Card,
    BankTransfer,
    OnlineGateway
}

public enum PaymentStatus
{
    Pending,
    Partial,
    Paid,
    Failed
}

public enum FeeFrequency
{
    OneTime,
    Monthly,
    Term,
    Yearly
}

public enum ExamType
{
    UnitExam,
    MidTerm,
    FinalExam,
    Practical
}

public enum NoticeAudience
{
    All,
    SuperAdmin,
    Admin,
    Accountant,
    Teacher,
    Student,
    Parent,
    SpecificClass
}

public enum NotificationChannelType
{
    InApp,
    Email,
    Sms,
    WhatsApp
}

public enum NotificationStatus
{
    Pending,
    Sent,
    Failed
}
