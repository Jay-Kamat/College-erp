# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and project files
COPY InstitutionErp.sln ./
COPY src/InstitutionErp.Domain/InstitutionErp.Domain.csproj src/InstitutionErp.Domain/
COPY src/InstitutionErp.Application/InstitutionErp.Application.csproj src/InstitutionErp.Application/
COPY src/InstitutionErp.Infrastructure/InstitutionErp.Infrastructure.csproj src/InstitutionErp.Infrastructure/
COPY src/InstitutionErp.Api/InstitutionErp.Api.csproj src/InstitutionErp.Api/
COPY tests/InstitutionErp.UnitTests/InstitutionErp.UnitTests.csproj tests/InstitutionErp.UnitTests/
COPY tests/InstitutionErp.IntegrationTests/InstitutionErp.IntegrationTests.csproj tests/InstitutionErp.IntegrationTests/

# Restore dependencies
RUN dotnet restore InstitutionErp.sln

# Copy source and publish
COPY . ./
RUN dotnet publish src/InstitutionErp.Api/InstitutionErp.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install fontconfig and fonts for QuestPDF PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:5050
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5050

ENTRYPOINT ["dotnet", "InstitutionErp.Api.dll"]
