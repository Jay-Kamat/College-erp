using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Infrastructure.Audit;
using InstitutionErp.Infrastructure.Auth;
using InstitutionErp.Infrastructure.Notifications;
using InstitutionErp.Infrastructure.Payment;
using InstitutionErp.Infrastructure.Pdf;
using InstitutionErp.Infrastructure.Persistence;
using InstitutionErp.Infrastructure.Seeding;
using InstitutionErp.Infrastructure.Storage;

namespace InstitutionErp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=institution_erp;Username=postgres;Password=root;";

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql(connectionString)
                   .UseSnakeCaseNamingConvention();
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        // Auth & Security
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Storage & PDF
        services.AddScoped<IFileStorage, FileStorageService>();
        services.AddScoped<IPdfService, QuestPdfService>();

        // Payment
        services.AddScoped<IPaymentGateway, RazorpayPaymentGateway>();

        // Notifications
        services.AddScoped<INotificationChannel, InAppNotificationChannel>();
        services.AddScoped<INotificationChannel, EmailNotificationChannel>();
        services.AddScoped<INotificationChannel, SmsNotificationChannel>();
        services.AddScoped<INotificationChannel, WhatsAppNotificationChannel>();
        services.AddScoped<INotificationSender, NotificationSender>();
        services.AddHostedService<NotificationOutboxWorker>();

        // Audit
        services.AddScoped<IAuditLogService, AuditLogService>();

        // Seeder
        services.AddScoped<DatabaseSeeder>();

        return services;
    }
}
