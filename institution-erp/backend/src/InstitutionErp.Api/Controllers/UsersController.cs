using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Application.Common.Models;
using InstitutionErp.Application.DTOs;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Infrastructure.Persistence;

namespace InstitutionErp.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogService _auditLogService;

    public UsersController(ApplicationDbContext db, IPasswordHasher passwordHasher, IAuditLogService auditLogService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null)
    {
        var query = _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(u => u.FirstName.ToLower().Contains(s) ||
                                     u.LastName.ToLower().Contains(s) ||
                                     u.Email.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var r = role.ToLower();
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name.ToLower() == r));
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                FullName = u.FullName,
                PhoneNumber = u.PhoneNumber,
                AvatarUrl = u.AvatarUrl,
                IsActive = u.IsActive,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .ToListAsync();

        return Ok(PagedResult<UserDto>.Create(users, total, page, pageSize));
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
        {
            return BadRequest(new { message = "Email already in use." });
        }

        var user = new User
        {
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            IsActive = true
        };

        var allRoles = await _db.Roles.ToListAsync();
        foreach (var rName in request.Roles)
        {
            var role = allRoles.FirstOrDefault(r => r.Name.Equals(rName, StringComparison.OrdinalIgnoreCase));
            if (role != null)
            {
                user.UserRoles.Add(new UserRole { RoleId = role.Id });
            }
        }

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("CreateUser", "User", user.Id.ToString(), null, new { email = user.Email, roles = request.Roles });

        return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            Roles = request.Roles
        });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var oldStatus = user.IsActive;
        user.IsActive = request.IsActive;
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("UpdateUserStatus", "User", user.Id.ToString(), new { isActive = oldStatus }, new { isActive = user.IsActive });

        return Ok(new { message = $"User status updated to {(user.IsActive ? "Active" : "Inactive")}." });
    }

    [HttpPut("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] AdminResetPasswordRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters long." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("ResetUserPassword", "User", user.Id.ToString(), null, new { email = user.Email });

        return Ok(new { message = "Password successfully reset." });
    }

    [HttpPut("{id}/roles")]
    public async Task<IActionResult> UpdateRoles(Guid id, [FromBody] UpdateUserRolesRequest request)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound();

        var oldRoles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

        var allRoles = await _db.Roles.ToListAsync();
        _db.UserRoles.RemoveRange(user.UserRoles);

        foreach (var rName in request.Roles)
        {
            var r = allRoles.FirstOrDefault(role => role.Name.Equals(rName, StringComparison.OrdinalIgnoreCase));
            if (r != null)
            {
                user.UserRoles.Add(new UserRole { RoleId = r.Id, UserId = user.Id });
            }
        }

        await _db.SaveChangesAsync();

        await _auditLogService.LogAsync("UpdateUserRoles", "User", user.Id.ToString(), new { roles = oldRoles }, new { roles = request.Roles });

        return Ok(new { message = "User roles successfully updated.", roles = request.Roles });
    }
}
