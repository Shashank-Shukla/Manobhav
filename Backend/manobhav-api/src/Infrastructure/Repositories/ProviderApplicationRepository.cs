using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class ProviderApplicationRepository : IProviderApplicationRepository
{
    private readonly ApplicationDbContext _db;

    public ProviderApplicationRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProviderOnboardingApplication>> ListApplicationsAsync(int take, CancellationToken cancellationToken)
    {
        return await _db.ProviderOnboardingApplications
            .Include(application => application.SectionReviews)
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<ProviderOnboardingApplication?> GetApplicationAsync(Guid applicationId, bool tracked, CancellationToken cancellationToken)
    {
        var query = _db.ProviderOnboardingApplications.Include(item => item.SectionReviews);
        return tracked
            ? await query.FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken)
            : await query.AsNoTracking().FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
    }

    public Task<ProviderProfile?> GetProfileByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        return _db.ProviderProfiles.FirstOrDefaultAsync(profile => profile.ProviderApplicationId == applicationId, cancellationToken);
    }

    public Task<ProviderProfile?> GetProfileByIdAsync(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return _db.ProviderProfiles.FirstOrDefaultAsync(profile => profile.Id == providerProfileId, cancellationToken);
    }

    public async Task AddProfileAsync(ProviderProfile profile, CancellationToken cancellationToken)
    {
        await _db.ProviderProfiles.AddAsync(profile, cancellationToken);
    }

    public Task<bool> ActiveRoleExistsAsync(Guid userId, string role, CancellationToken cancellationToken)
    {
        return _db.UserRoles.AnyAsync(item => item.UserId == userId && item.Role == role && item.IsActive, cancellationToken);
    }

    public async Task AddRoleAsync(UserRole role, CancellationToken cancellationToken)
    {
        await _db.UserRoles.AddAsync(role, cancellationToken);
    }

    public async Task<IReadOnlyList<UserRole>> GetActiveProviderRolesAsync(Guid userId, IReadOnlyList<string> roleNames, CancellationToken cancellationToken)
    {
        return await _db.UserRoles
            .Where(role => role.UserId == userId && role.IsActive && roleNames.Contains(role.Role))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Appointment>> GetScheduledAppointmentsAsync(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return await _db.Appointments
            .Where(appointment => appointment.ProviderProfileId == providerProfileId && appointment.Status == "Scheduled")
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertSectionReviewAsync(
        ProviderOnboardingApplication application,
        string sectionKey,
        string status,
        string? comment,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var review = application.SectionReviews.FirstOrDefault(item => string.Equals(item.SectionKey, sectionKey, StringComparison.Ordinal));
        var createdReview = review is null;
        if (review is null)
        {
            review = new ProviderApplicationSectionReview
            {
                ProviderApplicationId = application.Id,
                SectionKey = sectionKey,
                CreatedAtUtc = now,
            };
            _db.ProviderApplicationSectionReviews.Add(review);
        }

        review.Status = status;
        review.Comment = comment;
        review.ReviewedAtUtc = now;
        review.UpdatedAtUtc = review.CreatedAtUtc == now ? null : now;
        application.UpdatedAtUtc = now;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (createdReview)
        {
            await ResolveConcurrentSectionReviewInsertAsync(application, review, status, comment, now, cancellationToken);
        }
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }

    private async Task ResolveConcurrentSectionReviewInsertAsync(
        ProviderOnboardingApplication application,
        ProviderApplicationSectionReview insertedReview,
        string status,
        string? comment,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        _db.Entry(insertedReview).State = EntityState.Detached;
        var existingReview = await _db.ProviderApplicationSectionReviews
            .FirstOrDefaultAsync(
                item => item.ProviderApplicationId == application.Id && item.SectionKey == insertedReview.SectionKey,
                cancellationToken);
        if (existingReview is null)
        {
            throw new DbUpdateException("Concurrent provider application section review insert could not be resolved.");
        }

        existingReview.Status = status;
        existingReview.Comment = comment;
        existingReview.ReviewedAtUtc = now;
        existingReview.UpdatedAtUtc = now;
        application.UpdatedAtUtc = now;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
