using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class IntakeRepository : IIntakeRepository
{
    private readonly ApplicationDbContext _db;

    public IntakeRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<IntakeFormDefinition?> GetActiveFormAsync(string submissionKind, CancellationToken cancellationToken)
    {
        return FormQuery()
            .Where(form => form.SubmissionKind == submissionKind && form.Status == "Active")
            .OrderByDescending(form => form.Version)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<IntakeFormDefinition?> GetFormAsync(Guid formDefinitionId, CancellationToken cancellationToken)
    {
        return FormQuery().FirstOrDefaultAsync(form => form.Id == formDefinitionId, cancellationToken);
    }

    public Task<IntakeSubmission?> GetSubmissionAsync(Guid submissionId, CancellationToken cancellationToken)
    {
        return _db.IntakeSubmissions
            .Include(submission => submission.Answers)
            .FirstOrDefaultAsync(submission => submission.Id == submissionId, cancellationToken);
    }

    public Task<IntakeQuestion?> GetQuestionByKeyAsync(Guid formDefinitionId, string questionKey, CancellationToken cancellationToken)
    {
        return _db.IntakeQuestions
            .Include(question => question.Section)
            .Where(question => question.Section.FormDefinitionId == formDefinitionId)
            .FirstOrDefaultAsync(question => question.QuestionKey == questionKey, cancellationToken);
    }

    public async Task AddSubmissionAsync(IntakeSubmission submission, CancellationToken cancellationToken)
    {
        await _db.IntakeSubmissions.AddAsync(submission, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertAnswerAsync(
        IntakeSubmission submission,
        IntakeQuestion question,
        string answerJsonb,
        CancellationToken cancellationToken)
    {
        var answer = submission.Answers.FirstOrDefault(item => item.QuestionKey == question.QuestionKey);
        if (answer is null)
        {
            answer = new IntakeAnswer
            {
                SubmissionId = submission.Id,
                QuestionId = question.Id,
                QuestionKey = question.QuestionKey
            };
            await _db.IntakeAnswers.AddAsync(answer, cancellationToken);
            submission.Answers.Add(answer);
        }

        answer.AnswerJsonb = answerJsonb;
        answer.UpdatedAtUtc = DateTimeOffset.UtcNow;
        submission.AnswersJsonb = MergeAnswerSnapshot(submission.AnswersJsonb, question.QuestionKey, answerJsonb);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddConsentAsync(Consent consent, CancellationToken cancellationToken)
    {
        await _db.Consents.AddAsync(consent, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<IntakeFormDefinition> FormQuery()
    {
        return _db.IntakeFormDefinitions
            .AsNoTracking()
            .Include(form => form.Sections.OrderBy(section => section.DisplayOrder))
            .ThenInclude(section => section.Questions.OrderBy(question => question.DisplayOrder))
            .ThenInclude(question => question.Options.OrderBy(option => option.DisplayOrder));
    }

    private static string MergeAnswerSnapshot(string answersJsonb, string questionKey, string answerJsonb)
    {
        var snapshot = ParseSnapshot(answersJsonb);
        snapshot[questionKey] = JsonNode.Parse(answerJsonb);
        return snapshot.ToJsonString();
    }

    private static JsonObject ParseSnapshot(string answersJsonb)
    {
        if (string.IsNullOrWhiteSpace(answersJsonb))
        {
            return new JsonObject();
        }

        try
        {
            return JsonSerializer.Deserialize<JsonObject>(answersJsonb) ?? new JsonObject();
        }
        catch (JsonException)
        {
            return new JsonObject();
        }
    }
}
