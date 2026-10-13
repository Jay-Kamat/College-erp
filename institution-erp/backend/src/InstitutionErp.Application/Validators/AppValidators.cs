using FluentValidation;
using InstitutionErp.Application.DTOs;

namespace InstitutionErp.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class ApplyAdmissionRequestValidator : AbstractValidator<ApplyAdmissionRequest>
{
    public ApplyAdmissionRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.PhoneNumber).NotEmpty().MinimumLength(10);
        RuleFor(x => x.GuardianName).NotEmpty();
        RuleFor(x => x.GuardianPhone).NotEmpty();
        RuleFor(x => x.DesiredClassRoomId).NotEmpty();
        RuleFor(x => x.PreviousSchoolPercentage).InclusiveBetween(0, 100);
    }
}

public class CreateStudentRequestValidator : AbstractValidator<CreateStudentRequest>
{
    public CreateStudentRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.RollNumber).NotEmpty();
        RuleFor(x => x.ClassRoomId).NotEmpty();
    }
}

public class CreateTeacherRequestValidator : AbstractValidator<CreateTeacherRequest>
{
    public CreateTeacherRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Qualification).NotEmpty();
    }
}

public class CollectPaymentRequestValidator : AbstractValidator<CollectPaymentRequest>
{
    public CollectPaymentRequestValidator()
    {
        RuleFor(x => x.StudentFeeId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}

public class CreateExamRequestValidator : AbstractValidator<CreateExamRequest>
{
    public CreateExamRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ClassRoomId).NotEmpty();
        RuleFor(x => x.AcademicYearId).NotEmpty();
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate);
        RuleFor(x => x.Subjects).NotEmpty();
    }
}

public class CreateNoticeRequestValidator : AbstractValidator<CreateNoticeRequest>
{
    public CreateNoticeRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty();
    }
}
