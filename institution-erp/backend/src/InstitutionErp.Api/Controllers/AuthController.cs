using System.Security.Cryptography;
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
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationSender _notificationSender;
    private readonly IAuditLogService _auditLogService;

    public AuthController(
        ApplicationDbContext db,
        IJwtTokenService jwtService,
        IPasswordHasher passwordHasher,
        ICurrentUserService currentUserService,
        INotificationSender notificationSender,
        IAuditLogService auditLogService)
    {
        _db = db;
        _jwtService = jwtService;
        _passwordHasher = passwordHasher;
        _currentUserService = currentUserService;
        _notificationSender = notificationSender;
        _auditLogService = auditLogService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Your account has been deactivated. Please contact administrator." });
        }

        // Account lockout check (5 failed attempts for 15 minutes)
        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remaining = (user.LockoutEnd.Value - DateTime.UtcNow).Minutes;
            return StatusCode(StatusCodes.Status423Locked, new { message = $"Account locked due to excessive failed attempts. Try again in {remaining + 1} minutes." });
        }

        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                await _db.SaveChangesAsync();
                await _auditLogService.LogAsync("AccountLockout", "User", user.Id.ToString(), null, new { reason = "5 failed password attempts" });
                return StatusCode(StatusCodes.Status423Locked, new { message = "Account locked for 15 minutes due to multiple failed login attempts." });
            }
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // Reset lockout upon success
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var rawRefreshToken = _jwtService.GenerateRefreshToken();

        // Hash and store refresh token
        var hashedToken = HashToken(rawRefreshToken);
        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hashedToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };

        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("Login", "User", user.Id.ToString());

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            AvatarUrl = user.AvatarUrl,
            IsActive = user.IsActive,
            Roles = roles
        };

        return Ok(new LoginResponse(accessToken, rawRefreshToken, DateTime.UtcNow.AddMinutes(15), userDto));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var principal = _jwtService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
        {
            return BadRequest(new { message = "Invalid access token." });
        }

        var userIdClaim = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? principal.FindFirst("sub")?.Value;

        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var hashedToken = HashToken(request.RefreshToken);
        var savedRefreshToken = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.UserId == userId && r.TokenHash == hashedToken && !r.IsRevoked);

        if (savedRefreshToken == null || savedRefreshToken.ExpiresAt <= DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Refresh token is invalid or expired." });
        }

        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "User not found or inactive." });
        }

        // Rotate refresh token
        savedRefreshToken.IsRevoked = true;
        var newRawRefreshToken = _jwtService.GenerateRefreshToken();
        var newHashedToken = HashToken(newRawRefreshToken);
        savedRefreshToken.ReplacedByTokenHash = newHashedToken;

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newHashedToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        });

        await _db.SaveChangesAsync();

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var newAccessToken = _jwtService.GenerateAccessToken(user, roles);

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            AvatarUrl = user.AvatarUrl,
            IsActive = user.IsActive,
            Roles = roles
        };

        return Ok(new LoginResponse(newAccessToken, newRawRefreshToken, DateTime.UtcNow.AddMinutes(15), userDto));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        if (_currentUserService.UserId.HasValue)
        {
            var tokens = await _db.RefreshTokens
                .Where(r => r.UserId == _currentUserService.UserId.Value && !r.IsRevoked)
                .ToListAsync();

            foreach (var t in tokens)
            {
                t.IsRevoked = true;
            }
            await _db.SaveChangesAsync();
            await _auditLogService.LogAsync("Logout", "User", _currentUserService.UserId.Value.ToString());
        }

        return Ok(new { message = "Logged out successfully." });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        var user = await _db.Users.FindAsync(_currentUserService.UserId.Value);
        if (user == null) return NotFound();

        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();
        await _auditLogService.LogAsync("ChangePassword", "User", user.Id.ToString());

        return Ok(new { message = "Password updated successfully." });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (user != null)
        {
            var resetToken = Guid.NewGuid().ToString("N");
            user.PasswordResetToken = resetToken;
            user.PasswordResetTokenExpires = DateTime.UtcNow.AddHours(2);
            await _db.SaveChangesAsync();

            await _notificationSender.QueueOutboxAsync(
                NotificationChannelType.Email,
                user.Email,
                "Password Reset Request",
                $"<p>Hello {user.FirstName},</p><p>Your password reset code is: <strong>{resetToken}</strong></p><p>It will expire in 2 hours.</p>"
            );
        }

        return Ok(new { message = "If the email exists, a password reset instruction has been dispatched." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (user == null || user.PasswordResetToken != request.Token || user.PasswordResetTokenExpires <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired reset token." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpires = null;
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("ResetPassword", "User", user.Id.ToString());

        return Ok(new { message = "Password reset successfully. You can now login with your new password." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId.Value);

        if (user == null) return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            AvatarUrl = user.AvatarUrl,
            IsActive = user.IsActive,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList()
        });
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
