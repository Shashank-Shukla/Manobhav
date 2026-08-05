using Domain.Entities;

namespace Application.Interfaces;

public interface IIntakeRepository
{
    Task<IntakeFormDefinition?> GetActiveFormAsync(string submissionKind, CancellationToken cancellationToken);
    Task<IntakeFormDefinition?> GetFormAsync(Guid formDefinitionId, CancellationToken cancellationToken);
    Task<IntakeSubmission?> GetSubmissionAsync(Guid submissionId, CancellationToken cancellationToken);
    Task<IntakeQuestion?> GetQuestionByKeyAsync(Guid formDefinitionId, string questionKey, CancellationToken cancellationToken);
    Task AddSubmissionAsync(IntakeSubmission submission, CancellationToken cancellationToken);
    Task UpsertAnswerAsync(IntakeSubmission submission, IntakeQuestion question, string answerJsonb, CancellationToken cancellationToken);
    Task AddConsentAsync(Consent consent, CancellationToken cancellationToken);

    /// <summary>Tracked user row so the intake workflow can persist the completed patient profile.</summary>
    Task<User?> GetUserAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Grants a database role idempotently; no-op when an active grant already exists.</summary>
    Task EnsureActiveRoleAsync(Guid userId, string role, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
