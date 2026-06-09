using Application.DTOs;

namespace Application.Services;

public interface IVisitorAnalyticsService
{
    Task<CreateVisitorResponse> CreateVisitorAsync(CreateVisitorRequest request, ServerVisitorTelemetry telemetry, CancellationToken cancellationToken);
    Task RecordEventAsync(Guid visitorId, VisitorEventRequest request, CancellationToken cancellationToken);
    Task LinkVisitorToUserAsync(Guid visitorId, string userSubject, CancellationToken cancellationToken);
}
