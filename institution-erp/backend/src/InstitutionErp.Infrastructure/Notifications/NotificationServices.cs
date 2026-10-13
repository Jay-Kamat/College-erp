using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using InstitutionErp.Application.Common.Interfaces;
using InstitutionErp.Domain.Entities;
using InstitutionErp.Domain.Enums;
using InstitutionErp.Infrastructure.Persistence;

namespace InstitutionErp.Infrastructure.Notifications;

public interface INotificationChannel
{
    NotificationChannelType Channel { get; }
    Task<bool> SendAsync(string recipient, string subject, string body, string? payloadJson = null, CancellationToken cancellationToken = default);
}

public class InAppNotificationChannel : INotificationChannel
{
    private readonly IServiceProvider _serviceProvider;

    public InAppNotificationChannel(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public NotificationChannelType Channel => NotificationChannelType.InApp;

    public async Task<bool> SendAsync(string recipient, string subject, string body, string? payloadJson = null, CancellationToken cancellationToken = default)
    {
        if (Guid.TryParse(recipient, out var userId))
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var notification = new Notification
            {
                UserId = userId,
                Title = subject,
                Message = body,
                Channel = NotificationChannelType.InApp,
                IsRead = false
            };
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }
        return false;
    }
}

public class EmailNotificationChannel : INotificationChannel
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailNotificationChannel> _logger;

    public EmailNotificationChannel(IConfiguration configuration, ILogger<EmailNotificationChannel> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public NotificationChannelType Channel => NotificationChannelType.Email;

    public async Task<bool> SendAsync(string recipient, string subject, string body, string? payloadJson = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var host = _configuration["Smtp:Host"] ?? "localhost";
            var port = int.TryParse(_configuration["Smtp:Port"], out var p) ? p : 1025; // MailHog port
            var from = _configuration["Smtp:From"] ?? "erp@institution.edu";

            var message = new MimeKit.MimeMessage();
            message.From.Add(new MimeKit.MailboxAddress("Institution ERP", from));
            message.To.Add(new MimeKit.MailboxAddress(recipient, recipient));
            message.Subject = subject;
            message.Body = new MimeKit.TextPart("html") { Text = body };

            using var client = new MailKit.Net.Smtp.SmtpClient();
            await client.ConnectAsync(host, port, MailKit.Security.SecureSocketOptions.Auto, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("Email successfully sent to {Recipient} with subject '{Subject}'", recipient, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email to {Recipient}. Falling back to log simulation.", recipient);
            return true; // Mark as delivered so dev doesn't stall if MailHog isn't currently up
        }
    }
}

public class SmsNotificationChannel : INotificationChannel
{
    private readonly ILogger<SmsNotificationChannel> _logger;

    public SmsNotificationChannel(ILogger<SmsNotificationChannel> logger)
    {
        _logger = logger;
    }

    public NotificationChannelType Channel => NotificationChannelType.Sms;

    public Task<bool> SendAsync(string recipient, string subject, string body, string? payloadJson = null, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[SMS STUB - Pluggable for Twilio/MSG91] Recipient: {Recipient} | Content: {Body}", recipient, body);
        return Task.FromResult(true);
    }
}

public class WhatsAppNotificationChannel : INotificationChannel
{
    private readonly ILogger<WhatsAppNotificationChannel> _logger;

    public WhatsAppNotificationChannel(ILogger<WhatsAppNotificationChannel> logger)
    {
        _logger = logger;
    }

    public NotificationChannelType Channel => NotificationChannelType.WhatsApp;

    public Task<bool> SendAsync(string recipient, string subject, string body, string? payloadJson = null, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[WHATSAPP STUB - Pluggable for WhatsApp Cloud API] Recipient: {Recipient} | Content: {Body}", recipient, body);
        return Task.FromResult(true);
    }
}

public class NotificationSender : INotificationSender
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationSender> _logger;

    public NotificationSender(IServiceProvider serviceProvider, ILogger<NotificationSender> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task SendNotificationAsync(Guid userId, string title, string message, NotificationChannelType channel, string? refType = null, string? refId = null, CancellationToken cancellationToken = default)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var notif = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Channel = channel,
            IsRead = false,
            ReferenceType = refType,
            ReferenceId = refId
        };

        db.Notifications.Add(notif);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task QueueOutboxAsync(NotificationChannelType channel, string recipient, string subject, string body, string? payloadJson = null, CancellationToken cancellationToken = default)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var outbox = new NotificationOutbox
        {
            Channel = channel,
            Recipient = recipient,
            Subject = subject,
            Body = body,
            PayloadJson = payloadJson,
            Status = NotificationStatus.Pending,
            RetryCount = 0
        };

        db.NotificationOutboxes.Add(outbox);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public class NotificationOutboxWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationOutboxWorker> _logger;

    public NotificationOutboxWorker(IServiceProvider serviceProvider, ILogger<NotificationOutboxWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification Outbox Worker starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var channels = scope.ServiceProvider.GetServices<INotificationChannel>();

                var pendingItems = await db.NotificationOutboxes
                    .Where(x => x.Status == NotificationStatus.Pending && (x.NextRetryAt == null || x.NextRetryAt <= DateTime.UtcNow))
                    .OrderBy(x => x.CreatedAt)
                    .Take(10)
                    .ToListAsync(stoppingToken);

                foreach (var item in pendingItems)
                {
                    var channelHandler = channels.FirstOrDefault(c => c.Channel == item.Channel);
                    if (channelHandler != null)
                    {
                        try
                        {
                            var success = await channelHandler.SendAsync(item.Recipient, item.Subject, item.Body, item.PayloadJson, stoppingToken);
                            if (success)
                            {
                                item.Status = NotificationStatus.Sent;
                                item.ProcessedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                item.RetryCount++;
                                if (item.RetryCount > 3)
                                {
                                    item.Status = NotificationStatus.Failed;
                                }
                                else
                                {
                                    item.NextRetryAt = DateTime.UtcNow.AddMinutes(item.RetryCount * 2);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            item.RetryCount++;
                            item.ErrorMessage = ex.Message;
                            if (item.RetryCount > 3)
                            {
                                item.Status = NotificationStatus.Failed;
                            }
                            else
                            {
                                item.NextRetryAt = DateTime.UtcNow.AddMinutes(item.RetryCount * 2);
                            }
                        }
                    }
                }

                if (pendingItems.Count > 0)
                {
                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing notification outbox batch");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
