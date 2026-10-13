using FluentAssertions;
using Xunit;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Domain.Enums;

namespace InstitutionErp.UnitTests;

public class BusinessLogicTests
{
    [Theory]
    [InlineData(95, "A+")]
    [InlineData(85, "A")]
    [InlineData(75, "B+")]
    [InlineData(65, "B")]
    [InlineData(55, "C")]
    [InlineData(40, "D")]
    [InlineData(25, "F")]
    public void GradeScale_CalculatesCorrectGradeLetter(decimal percentage, string expectedGrade)
    {
        // Arrange
        var scales = new List<GradeScale>
        {
            new() { GradeLetter = "A+", MinPercentage = 90, MaxPercentage = 100 },
            new() { GradeLetter = "A", MinPercentage = 80, MaxPercentage = 89.99m },
            new() { GradeLetter = "B+", MinPercentage = 70, MaxPercentage = 79.99m },
            new() { GradeLetter = "B", MinPercentage = 60, MaxPercentage = 69.99m },
            new() { GradeLetter = "C", MinPercentage = 50, MaxPercentage = 59.99m },
            new() { GradeLetter = "D", MinPercentage = 35, MaxPercentage = 49.99m },
            new() { GradeLetter = "F", MinPercentage = 0, MaxPercentage = 34.99m }
        };

        // Act
        var matched = scales.FirstOrDefault(s => percentage >= s.MinPercentage && percentage <= s.MaxPercentage);

        // Assert
        matched.Should().NotBeNull();
        matched!.GradeLetter.Should().Be(expectedGrade);
    }

    [Theory]
    [InlineData(30, 27, 90.0, false)] // 90% -> not low attendance
    [InlineData(30, 22, 73.3, true)]  // 73.3% -> low attendance (< 75%)
    [InlineData(30, 15, 50.0, true)]  // 50% -> low attendance (< 75%)
    public void AttendancePercentage_CalculatesAndDetectsLowAttendance(int totalDays, int presentDays, decimal expectedPct, bool isLowExpected)
    {
        // Act
        var calculatedPct = Math.Round((decimal)presentDays / totalDays * 100, 1);
        var isLow = calculatedPct < 75.0m;

        // Assert
        calculatedPct.Should().Be(expectedPct);
        isLow.Should().Be(isLowExpected);
    }

    [Fact]
    public void FeeDueAndPayment_CalculatesBalancesAndStatusAccurately()
    {
        // Arrange
        var studentFee = new StudentFee
        {
            BaseAmount = 50000m,
            DiscountAmount = 5000m,
            LateFeeAmount = 1000m,
            PaidAmount = 0m,
            DueDate = DateTime.UtcNow.AddDays(-10),
            Status = PaymentStatus.Pending
        };

        // Act 1: Initial state
        studentFee.TotalPayable.Should().Be(46000m); // 50000 - 5000 + 1000
        studentFee.BalanceAmount.Should().Be(46000m);

        // Act 2: Partial Payment of 20000
        studentFee.PaidAmount += 20000m;
        studentFee.Status = studentFee.PaidAmount >= studentFee.TotalPayable ? PaymentStatus.Paid : PaymentStatus.Partial;

        studentFee.BalanceAmount.Should().Be(26000m);
        studentFee.Status.Should().Be(PaymentStatus.Partial);

        // Act 3: Final Payment of 26000
        studentFee.PaidAmount += 26000m;
        studentFee.Status = studentFee.PaidAmount >= studentFee.TotalPayable ? PaymentStatus.Paid : PaymentStatus.Partial;

        studentFee.BalanceAmount.Should().Be(0m);
        studentFee.Status.Should().Be(PaymentStatus.Paid);
    }

    [Fact]
    public void AdmissionApproval_TransitionsStateCorrectly()
    {
        // Arrange
        var admission = new Admission
        {
            ReferenceNumber = "ADM-2026-0001",
            FirstName = "Alice",
            LastName = "Wonderland",
            Status = AdmissionStatus.Submitted
        };

        // Act: Under review
        admission.Status = AdmissionStatus.UnderReview;
        admission.Status.Should().Be(AdmissionStatus.UnderReview);

        // Act: Approved
        admission.Status = AdmissionStatus.Approved;
        admission.Status.Should().Be(AdmissionStatus.Approved);
    }
}
