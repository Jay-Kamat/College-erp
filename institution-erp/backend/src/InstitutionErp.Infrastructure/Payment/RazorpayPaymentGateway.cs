using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using InstitutionErp.Application.Common.Interfaces;

namespace InstitutionErp.Infrastructure.Payment;

public class RazorpayPaymentGateway : IPaymentGateway
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<RazorpayPaymentGateway> _logger;

    public RazorpayPaymentGateway(IConfiguration configuration, ILogger<RazorpayPaymentGateway> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public Task<(string orderId, decimal amount, string currency)> CreateOrderAsync(decimal amount, string receipt, CancellationToken cancellationToken = default)
    {
        var isEnabled = bool.TryParse(_configuration["Payment:Razorpay:Enabled"], out var enabled) && enabled;
        if (!isEnabled)
        {
            // Simulated / offline fallback
            var mockOrderId = $"order_sim_{Guid.NewGuid():N}".Substring(0, 20);
            return Task.FromResult((mockOrderId, amount, "INR"));
        }

        // Test mode stub
        var orderId = $"order_rzp_{Guid.NewGuid():N}".Substring(0, 20);
        _logger.LogInformation("Razorpay Order Created: {OrderId} for Amount: {Amount}", orderId, amount);
        return Task.FromResult((orderId, amount, "INR"));
    }

    public bool VerifySignature(string orderId, string paymentId, string signature)
    {
        var isEnabled = bool.TryParse(_configuration["Payment:Razorpay:Enabled"], out var enabled) && enabled;
        if (!isEnabled)
        {
            return true;
        }

        var secret = _configuration["Payment:Razorpay:KeySecret"] ?? "test_secret_key";
        var payload = $"{orderId}|{paymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var generatedSignature = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();

        return string.Equals(generatedSignature, signature, StringComparison.OrdinalIgnoreCase);
    }
}
