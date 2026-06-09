using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class VisitorAnalyticsRepository : IVisitorAnalyticsRepository
{
    private readonly ApplicationDbContext _db;

    public VisitorAnalyticsRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task AddVisitorAsync(VisitorSession visitor, CancellationToken cancellationToken)
    {
        await _db.VisitorSessions.AddAsync(visitor, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> VisitorExistsAsync(Guid visitorId, CancellationToken cancellationToken)
    {
        return _db.VisitorSessions.AsNoTracking().AnyAsync(visitor => visitor.Id == visitorId, cancellationToken);
    }

    public async Task AddEventAsync(VisitorEvent visitorEvent, CancellationToken cancellationToken)
    {
        await _db.VisitorEvents.AddAsync(visitorEvent, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task LinkVisitorToUserAsync(Guid visitorId, string userSubject, CancellationToken cancellationToken)
    {
        var visitor = await _db.VisitorSessions.FirstOrDefaultAsync(item => item.Id == visitorId, cancellationToken);
        if (visitor is null)
        {
            return;
        }

        visitor.LinkedUserSubject = userSubject;
        visitor.LinkedAtUtc = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
