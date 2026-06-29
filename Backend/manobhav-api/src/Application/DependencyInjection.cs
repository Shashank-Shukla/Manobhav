using Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register MediatR, validators, pipeline behaviors, and application services/use-cases here.
        // Example:
        // services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        // services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        // services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IVisitorAnalyticsService, VisitorAnalyticsService>();
        services.AddScoped<IntakeWorkflowService>();
        services.AddScoped<ProviderOnboardingSectionService>();
        services.AddScoped<ProviderProfileMaterializer>();
        services.AddScoped<Application.Interfaces.IProviderApplicationAdminService, ProviderApplicationAdminService>();
        services.AddScoped<Application.Interfaces.IProviderAvailabilityService, ProviderAvailabilityService>();
        services.AddScoped<Application.Interfaces.IBookingService, BookingService>();
        services.AddScoped<Application.Interfaces.IPublicContentService, PublicContentService>();
        services.AddScoped<Application.Interfaces.IAiDbDiagnosticsService, AiDbDiagnosticsService>();
        return services;
    }
}
