using Microsoft.Extensions.Configuration;
using InstitutionErp.Application.Common.Interfaces;

namespace InstitutionErp.Infrastructure.Storage;

public class FileStorageService : IFileStorage
{
    private readonly string _baseStoragePath;
    private static readonly string[] AllowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };
    private const long MaxFileSize = 5 * 1024 * 1024; // 5 MB

    public FileStorageService(IConfiguration configuration)
    {
        _baseStoragePath = configuration["Storage:BasePath"]
            ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "uploads");

        if (!Directory.Exists(_baseStoragePath))
        {
            Directory.CreateDirectory(_baseStoragePath);
        }
    }

    public async Task<string> SaveFileAsync(Stream stream, string fileName, string folder, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
        {
            throw new InvalidOperationException($"File type '{ext}' is not allowed. Allowed types are: {string.Join(", ", AllowedExtensions)}");
        }

        if (stream.Length > MaxFileSize)
        {
            throw new InvalidOperationException($"File size exceeds the 5 MB limit.");
        }

        var folderPath = Path.Combine(_baseStoragePath, folder);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(folderPath, uniqueFileName);

        using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        stream.Seek(0, SeekOrigin.Begin);
        await stream.CopyToAsync(fileStream, cancellationToken);

        return Path.Combine(folder, uniqueFileName).Replace("\\", "/");
    }

    public Task DeleteFileAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_baseStoragePath, filePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        return Task.CompletedTask;
    }

    public Task<Stream> GetFileStreamAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_baseStoragePath, filePath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("File not found on storage.", filePath);
        }

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(stream);
    }
}
