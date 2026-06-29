using Application.Interfaces;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseNpgsql(
                config.GetConnectionString("DefaultConnection"),
                npgsqlOptions => npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3)));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IVisitorAnalyticsRepository, VisitorAnalyticsRepository>();
        services.AddScoped<IIntakeRepository, IntakeRepository>();
        services.AddScoped<IProviderApplicationRepository, ProviderApplicationRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IPublicContentRepository, PublicContentRepository>();
        services.AddScoped<IAiDbDiagnosticsRepository, AiDbDiagnosticsRepository>();

        // add other infrastructure services as needed

        return services;
    }
}
