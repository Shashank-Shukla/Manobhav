using Domain.Entities;

namespace Application.Interfaces;

/// <summary>A provider profile reduced to the fields a patient is allowed to see.</summary>
public sealed record PatientProviderSummary(Guid Id, string Name, string? Title, string AvatarColor);

/// <summary>An intake answer joined to its question prompt and (for choice answers) option labels.</summary>
public sealed record PatientIntakeAnswerRow(
    string QuestionKey,
    string Prompt,
    int DisplayOrder,
    string AnswerJsonb,
    IReadOnlyDictionary<string, string> OptionLabels);

/// <summary>
/// Read/write access for the patient's own surfaces: profile row, appointments with the public
/// provider fields, latest intake submission plus answers, and consent records. All reads are
/// scoped by the signed-in user id, so the repository cannot serve another patient's data.
/// </summary>
public interface IPatientRepository
{
    Task<User?> GetUserAsync(Guid userId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Appointment>> GetAppointmentsAsync(Guid patientUserId, CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<Guid, PatientProviderSummary>> GetProviderSummariesAsync(
        IReadOnlyCollection<Guid> providerProfileIds,
        CancellationToken cancellationToken);

    /// <summary>Most recently saved patient-intake submission for the user, or null when none exists.</summary>
    Task<IntakeSubmission?> GetLatestIntakeSubmissionAsync(Guid patientUserId, CancellationToken cancellationToken);

    Task<IReadOnlyList<PatientIntakeAnswerRow>> GetIntakeAnswersAsync(Guid submissionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Consent>> GetConsentsAsync(Guid patientUserId, CancellationToken cancellationToken);

    /// <summary>Id of the user's still-active booking hold, or null when there is none.</summary>
    Task<Guid?> GetActiveBookingHoldIdAsync(Guid patientUserId, DateTimeOffset now, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
