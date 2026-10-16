using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using InstitutionErp.Api.Middleware;
using InstitutionErp.Api.Services;
using InstitutionErp.Application;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Infrastructure;
using InstitutionErp.Infrastructure.Persistence;
using InstitutionErp.Infrastructure.Seeding;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Setup
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/erp-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();
// 2. Add Layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// 3. Current User & HttpContext
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// 4. JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "SuperSecretEnterpriseKeyWithMinimum256BitsLengthForHmacSha256Security!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InstitutionErp";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "InstitutionErpApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 5. Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequirePrincipal", policy => policy.RequireRole("Principal"));
    options.AddPolicy("RequireTeacher", policy => policy.RequireRole("Principal", "Teacher"));
    options.AddPolicy("RequireStudent", policy => policy.RequireRole("Principal", "Student"));
    // Backward compatibility aliases
    options.AddPolicy("RequireSuperAdmin", policy => policy.RequireRole("Principal"));
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole("Principal"));
    options.AddPolicy("RequireAccountant", policy => policy.RequireRole("Principal"));
    options.AddPolicy("RequireParentOrStudent", policy => policy.RequireRole("Principal", "Student"));
});

// 6. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 7. Rate Limiter
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth-limit", opt =>
    {
        opt.PermitLimit = 15;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });
});

// 8. Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddHealthChecks();

// 9. Swagger / OpenAPI with JWT Bearer
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Campus Core Institution ERP API",
        Version = "v1",
        Description = "Enterprise Digital Institution Management System API with RBAC, admissions, attendance, exams, and fees."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT Bearer token into the field below."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 10. Database initialization & Seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureCreatedAsync();

        var seeder = services.GetRequiredService<DatabaseSeeder>();
        await seeder.SeedAsync();
        Log.Information("Database verification and seeding completed successfully.");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred during database migration or seeding.");
    }
}

// 11. Middleware Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

app.UseSerilogRequestLogging();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Institution ERP API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("CorsPolicy");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
