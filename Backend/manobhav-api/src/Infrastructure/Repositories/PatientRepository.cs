using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class PatientRepository : IPatientRepository
{
    private readonly ApplicationDbContext _db;

    public PatientRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        return _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<Appointment>> GetAppointmentsAsync(Guid patientUserId, CancellationToken cancellationToken)
    {
        return await _db.Appointments
            .AsNoTracking()
            .Where(item => item.PatientUserId == patientUserId)
            .OrderByDescending(item => item.StartsAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, PatientProviderSummary>> GetProviderSummariesAsync(
        IReadOnlyCollection<Guid> providerProfileIds,
        CancellationToken cancellationToken)
    {
        if (providerProfileIds.Count == 0)
        {
            return new Dictionary<Guid, PatientProviderSummary>();
        }

        var summaries = await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => providerProfileIds.Contains(provider.Id))
            .Select(provider => new PatientProviderSummary(
                provider.Id,
                provider.DisplayName ?? provider.Name,
                provider.ProfessionalTitle,
                provider.AvatarColor))
            .ToListAsync(cancellationToken);

        return summaries.ToDictionary(item => item.Id);
    }

    public async Task<IntakeSubmission?> GetLatestIntakeSubmissionAsync(Guid patientUserId, CancellationToken cancellationToken)
    {
        return await _db.IntakeSubmissions
            .AsNoTracking()
            .Where(item => item.UserId == patientUserId && item.SubmissionKind == "PatientIntake")
            .OrderByDescending(item => item.LastSavedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PatientIntakeAnswerRow>> GetIntakeAnswersAsync(Guid submissionId, CancellationToken cancellationToken)
    {
        var answers = await _db.IntakeAnswers
            .AsNoTracking()
            .Where(answer => answer.SubmissionId == submissionId)
            .Join(
                _db.IntakeQuestions.AsNoTracking(),
                answer => answer.QuestionId,
                question => question.Id,
                (answer, question) => new
                {
                    answer.QuestionKey,
                    question.Prompt,
                    question.DisplayOrder,
                    answer.AnswerJsonb,
                    question.Id
                })
            .OrderBy(item => item.DisplayOrder)
            .ToListAsync(cancellationToken);

        if (answers.Count == 0)
        {
            return [];
        }

        var questionIds = answers.Select(item => item.Id).Distinct().ToList();
        var options = await _db.IntakeQuestionOptions
            .AsNoTracking()
            .Where(option => questionIds.Contains(option.QuestionId))
            .ToListAsync(cancellationToken);

        var optionsByQuestion = options
            .GroupBy(option => option.QuestionId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyDictionary<string, string>)group.ToDictionary(
                    option => option.OptionKey,
                    option => option.Label));

        return answers.Select(item => new PatientIntakeAnswerRow(
            item.QuestionKey,
            item.Prompt,
            item.DisplayOrder,
            item.AnswerJsonb,
            optionsByQuestion.GetValueOrDefault(item.Id) ?? new Dictionary<string, string>()))
            .ToList();
    }

    public async Task<IReadOnlyList<Consent>> GetConsentsAsync(Guid patientUserId, CancellationToken cancellationToken)
    {
        return await _db.Consents
            .AsNoTracking()
            .Where(consent => consent.UserId == patientUserId)
            .OrderByDescending(consent => consent.SignedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<Guid?> GetActiveBookingHoldIdAsync(Guid patientUserId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var holdId = await _db.BookingHolds
            .AsNoTracking()
            .Where(hold =>
                hold.UserId == patientUserId &&
                hold.Status == "Active" &&
                hold.ExpiresAtUtc > now)
            .Select(hold => (Guid?)hold.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return holdId;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }
}
