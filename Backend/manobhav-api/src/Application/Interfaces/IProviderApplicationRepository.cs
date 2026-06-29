using Domain.Entities;

namespace Application.Interfaces;

/// <summary>
/// Data access for the provider onboarding admin workflow (applications, section reviews, the
/// materialized public profile, and the activities deactivated on rejection). Hides EF Core
/// (tracking, includes, concurrency, transactions) from the application service.
/// </summary>
public interface IProviderApplicationRepository
{
    Task<IReadOnlyList<ProviderOnboardingApplication>> ListApplicationsAsync(int take, CancellationToken cancellationToken);

    /// <param name="tracked">True to load a tracked entity for mutation; false for a read-only detail load.</param>
    Task<ProviderOnboardingApplication?> GetApplicationAsync(Guid applicationId, bool tracked, CancellationToken cancellationToken);

    Task<ProviderProfile?> GetProfileByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken);

    Task<ProviderProfile?> GetProfileByIdAsync(Guid providerProfileId, CancellationToken cancellationToken);

    Task AddProfileAsync(ProviderProfile profile, CancellationToken cancellationToken);

    Task<bool> ActiveRoleExistsAsync(Guid userId, string role, CancellationToken cancellationToken);

    Task AddRoleAsync(UserRole role, CancellationToken cancellationToken);

    Task<IReadOnlyList<UserRole>> GetActiveProviderRolesAsync(Guid userId, IReadOnlyList<string> roleNames, CancellationToken cancellationToken);

    Task<IReadOnlyList<Appointment>> GetScheduledAppointmentsAsync(Guid providerProfileId, CancellationToken cancellationToken);

    /// <summary>
    /// Adds or updates the review for a section on a tracked application, resolving the unique-key
    /// race (two reviewers inserting the same section) internally.
    /// </summary>
    Task UpsertSectionReviewAsync(
        ProviderOnboardingApplication application,
        string sectionKey,
        string status,
        string? comment,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
