using Domain.Entities;

namespace Application.Interfaces;

public interface IVisitorAnalyticsRepository
{
    Task AddVisitorAsync(VisitorSession visitor, CancellationToken cancellationToken);
    Task<bool> VisitorExistsAsync(Guid visitorId, CancellationToken cancellationToken);
    Task AddEventAsync(VisitorEvent visitorEvent, CancellationToken cancellationToken);
    Task LinkVisitorToUserAsync(Guid visitorId, string userSubject, CancellationToken cancellationToken);
}
