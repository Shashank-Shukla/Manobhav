using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public sealed class IntakeValidationException : Exception
{
    public IntakeValidationException(string message) : base(message)
    {
    }
}

public sealed record IntakeOwnerContext(Guid? UserId, Guid? VisitorSessionId);

public sealed class IntakeWorkflowService
{
    private const int MaxAnswerJsonLength = 8192;
    private readonly IIntakeRepository _repository;

    public IntakeWorkflowService(IIntakeRepository repository)
    {
        _repository = repository;
    }

    public async Task<IntakeFormDto> GetActiveFormAsync(string submissionKind, CancellationToken cancellationToken)
    {
        var form = await _repository.GetActiveFormAsync(submissionKind, cancellationToken)
            ?? throw new IntakeValidationException("No active intake form is configured.");

        return ToDto(form);
    }

    public async Task<IntakeSubmissionDto> CreateSubmissionAsync(
        CreateIntakeSubmissionRequest request,
        IntakeOwnerContext owner,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(request.SubmissionKind, "PatientIntake", StringComparison.Ordinal) &&
            !string.Equals(request.SubmissionKind, "ProviderOnboarding", StringComparison.Ordinal))
        {
            throw new IntakeValidationException("Submission kind is not supported.");
        }

        var form = await _repository.GetFormAsync(request.FormDefinitionId, cancellationToken)
            ?? throw new IntakeValidationException("Intake form does not exist.");

        if (!string.Equals(form.SubmissionKind, request.SubmissionKind, StringComparison.Ordinal))
        {
            throw new IntakeValidationException("Intake form does not match submission kind.");
        }

        var submission = new IntakeSubmission
        {
            SubmissionKind = request.SubmissionKind,
            FormDefinitionId = form.Id,
            FormVersion = form.Version,
            VisitorSessionId = request.VisitorSessionId,
            // Signed-in visitors (e.g. a fresh Google sign-in that lands straight in the get-started
            // flow) own their submission from the first step, so later answer saves resolve ownership
            // by user id and never depend on a visitor-analytics session existing.
            UserId = owner.UserId,
            Status = "Draft",
            CurrentStep = NormalizeCurrentStep(request.CurrentStep, "start")
        };

        await _repository.AddSubmissionAsync(submission, cancellationToken);
        return ToDto(submission);
    }

    public async Task<IntakeSubmissionDto> SaveAnswerAsync(
        Guid submissionId,
        string questionKey,
        SaveIntakeAnswerRequest request,
        IntakeOwnerContext owner,
        CancellationToken cancellationToken)
    {
        var submission = await GetMutableSubmissionAsync(submissionId, owner, cancellationToken);
        var question = await _repository.GetQuestionByKeyAsync(submission.FormDefinitionId, questionKey, cancellationToken)
            ?? throw new IntakeValidationException("Question does not exist in this intake form.");

        ValidateRequiredAnswer(question, request.Answer, request.IsAdvancing);
        var answerJsonb = SerializeAnswer(request.Answer);
        if (answerJsonb.Length > MaxAnswerJsonLength)
        {
            throw new IntakeValidationException("Answer payload is too large.");
        }

        submission.CurrentStep = NormalizeCurrentStep(request.CurrentStep, questionKey);
        submission.LastSavedAtUtc = DateTimeOffset.UtcNow;
        await _repository.UpsertAnswerAsync(submission, question, answerJsonb, cancellationToken);
        return ToDto(submission);
    }

    public async Task<IntakeSubmissionDto> SubmitPartialAsync(
        Guid submissionId,
        SubmitPartialIntakeRequest request,
        IntakeOwnerContext owner,
        CancellationToken cancellationToken)
    {
        if (!request.PolicyAcknowledged)
        {
            throw new IntakeValidationException("Policy acknowledgement is required before provider browsing.");
        }

        var submission = await GetMutableSubmissionAsync(submissionId, owner, cancellationToken);
        submission.Status = "PartiallySubmitted";
        submission.SubmittedAtUtc = DateTimeOffset.UtcNow;
        submission.LastSavedAtUtc = DateTimeOffset.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);
        return ToDto(submission);
    }

    public async Task<IntakeSubmissionDto> CompleteProfileAsync(
        Guid submissionId,
        Guid userId,
        Guid? visitorSessionId,
        CompleteProfileRequest request,
        CancellationToken cancellationToken)
    {
        ValidateRequired(request.FullName, "Full name");
        ValidateRequired(request.EmergencyContactName, "Emergency contact name");
        ValidateRequired(request.EmergencyContactRelation, "Emergency contact relation");
        ValidateRequired(request.EmergencyContactPhone, "Emergency contact phone");
        if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.Phone))
        {
            throw new IntakeValidationException("Either email or phone is required.");
        }

        var submission = await GetMutableSubmissionAsync(submissionId, new IntakeOwnerContext(userId, visitorSessionId), cancellationToken);
        var user = await _repository.GetUserAsync(userId, cancellationToken)
            ?? throw new IntakeValidationException("Authenticated user does not exist.");

        ApplyProfile(user, request);
        await _repository.EnsureActiveRoleAsync(userId, "Patient", cancellationToken);

        submission.UserId = userId;
        submission.Status = "Completed";
        submission.CompletedAtUtc = DateTimeOffset.UtcNow;
        submission.LastSavedAtUtc = DateTimeOffset.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);
        return ToDto(submission);
    }

    public async Task<IntakeSubmissionDto> SignConsentAsync(
        Guid submissionId,
        IntakeOwnerContext owner,
        SignConsentRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        ValidateRequired(request.ConsentType, "Consent type");
        ValidateRequired(request.TypedName, "Typed name");
        if (!request.Accepted)
        {
            throw new IntakeValidationException("Consent must be accepted.");
        }

        var submission = await GetMutableSubmissionAsync(submissionId, owner, cancellationToken);
        var consent = new Consent
        {
            UserId = owner.UserId,
            VisitorSessionId = owner.VisitorSessionId ?? submission.VisitorSessionId,
            IntakeSubmissionId = submission.Id,
            ConsentType = request.ConsentType,
            PolicyVersion = request.PolicyVersion,
            Accepted = request.Accepted,
            TypedName = request.TypedName.Trim(),
            IpAddress = Limit(ipAddress, 128),
            UserAgent = Limit(userAgent, 512)
        };

        submission.Status = "ProfilePending";
        submission.LastSavedAtUtc = DateTimeOffset.UtcNow;
        await _repository.AddConsentAsync(consent, cancellationToken);
        return ToDto(submission);
    }

    /// <summary>
    /// Persists the Section 1 personal/profile answers onto the patient's user row. Previously these
    /// values were validated and then discarded, so the patient dashboard had no profile to render.
    /// </summary>
    private static void ApplyProfile(User user, CompleteProfileRequest request)
    {
        var now = DateTimeOffset.UtcNow;
        user.Name = Limit(request.FullName.Trim(), 200);
        user.PreferredName = Limit(request.PreferredName?.Trim(), 200) ?? user.PreferredName;
        user.Email = Limit(request.Email?.Trim(), 320) ?? user.Email;
        user.Phone = Limit(request.Phone?.Trim(), 40) ?? user.Phone;
        user.DateOfBirth = request.DateOfBirth ?? user.DateOfBirth;
        user.Gender = Limit(request.Gender?.Trim(), 40) ?? user.Gender;
        user.Occupation = Limit(request.Occupation?.Trim(), 160) ?? user.Occupation;
        user.Address = Limit(request.Address?.Trim(), 500) ?? user.Address;
        user.EmergencyContactName = Limit(request.EmergencyContactName.Trim(), 200);
        user.EmergencyContactRelation = Limit(request.EmergencyContactRelation.Trim(), 80);
        user.EmergencyContactPhone = Limit(request.EmergencyContactPhone.Trim(), 40);
        user.ProfileCompletedAtUtc ??= now;
        user.UpdatedAtUtc = now;
    }

    private async Task<IntakeSubmission> GetMutableSubmissionAsync(
        Guid submissionId,
        IntakeOwnerContext owner,
        CancellationToken cancellationToken)
    {
        var submission = await _repository.GetSubmissionAsync(submissionId, cancellationToken)
            ?? throw new IntakeValidationException("Intake submission does not exist.");

        EnsureCanMutateSubmission(submission, owner);
        if (submission.Status is "Completed" or "Cancelled")
        {
            throw new IntakeValidationException("Intake submission can no longer be changed.");
        }

        return submission;
    }

    private static void EnsureCanMutateSubmission(IntakeSubmission submission, IntakeOwnerContext owner)
    {
        if (BelongsToCurrentUser(submission, owner) || BelongsToCurrentVisitor(submission, owner))
        {
            return;
        }

        throw new IntakeValidationException("Intake submission does not belong to the current visitor or user.");
    }

    private static bool BelongsToCurrentUser(IntakeSubmission submission, IntakeOwnerContext owner)
    {
        return submission.UserId.HasValue && submission.UserId == owner.UserId;
    }

    private static bool BelongsToCurrentVisitor(IntakeSubmission submission, IntakeOwnerContext owner)
    {
        return !submission.UserId.HasValue &&
            submission.VisitorSessionId.HasValue &&
            submission.VisitorSessionId == owner.VisitorSessionId;
    }

    private static string SerializeAnswer(object? answer)
    {
        return JsonSerializer.Serialize(new { value = answer });
    }

    private static void ValidateRequiredAnswer(IntakeQuestion question, object? answer, bool isAdvancing)
    {
        if (!isAdvancing || !question.IsRequired || HasAnswerValue(answer, question.InputType))
        {
            return;
        }

        throw new IntakeValidationException($"{question.QuestionKey} is required.");
    }

    private static bool HasAnswerValue(object? answer, string inputType)
    {
        return answer switch
        {
            null => false,
            string value => !string.IsNullOrWhiteSpace(value),
            JsonElement value => HasJsonAnswerValue(value, inputType),
            IEnumerable<string> values => values.Any(value => !string.IsNullOrWhiteSpace(value)),
            bool value => !IsAcknowledgement(inputType) || value,
            _ => true
        };
    }

    private static bool HasJsonAnswerValue(JsonElement value, string inputType)
    {
        return value.ValueKind switch
        {
            JsonValueKind.Undefined or JsonValueKind.Null => false,
            JsonValueKind.String => !string.IsNullOrWhiteSpace(value.GetString()),
            JsonValueKind.Array => value.EnumerateArray().Any(item => HasJsonAnswerValue(item, inputType)),
            JsonValueKind.False => !IsAcknowledgement(inputType),
            JsonValueKind.Object => value.EnumerateObject().Any(),
            _ => true
        };
    }

    private static bool IsAcknowledgement(string inputType)
    {
        return NormalizeInputType(inputType) == "acknowledgement";
    }

    private static string NormalizeInputType(string inputType)
    {
        return inputType.Replace("-", string.Empty, StringComparison.Ordinal)
            .Replace("_", string.Empty, StringComparison.Ordinal)
            .ToLowerInvariant();
    }

    private static string? Limit(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static string NormalizeCurrentStep(string? currentStep, string fallback)
    {
        return Limit(string.IsNullOrWhiteSpace(currentStep) ? fallback : currentStep.Trim(), 160) ?? fallback;
    }

    private static void ValidateRequired(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new IntakeValidationException($"{field} is required.");
        }
    }

    private static IntakeSubmissionDto ToDto(IntakeSubmission submission)
    {
        return new IntakeSubmissionDto(
            submission.Id,
            submission.SubmissionKind,
            submission.FormDefinitionId,
            submission.FormVersion,
            submission.VisitorSessionId,
            submission.UserId,
            submission.Status,
            submission.CurrentStep,
            submission.StartedAtUtc,
            submission.LastSavedAtUtc);
    }

    private static IntakeFormDto ToDto(IntakeFormDefinition form)
    {
        return new IntakeFormDto(
            form.Id,
            form.SubmissionKind,
            form.Name,
            form.Version,
            form.Sections
                .OrderBy(section => section.DisplayOrder)
                .Select(ToDto)
                .ToList());
    }

    private static IntakeSectionDto ToDto(IntakeFormSection section)
    {
        return new IntakeSectionDto(
            section.Id,
            section.SectionKey,
            section.Title,
            section.Description,
            section.DisplayOrder,
            section.IsRequired,
            section.Questions
                .OrderBy(question => question.DisplayOrder)
                .Select(ToDto)
                .ToList());
    }

    private static IntakeQuestionDto ToDto(IntakeQuestion question)
    {
        return new IntakeQuestionDto(
            question.Id,
            question.QuestionKey,
            question.Prompt,
            question.HelpText,
            question.InputType,
            question.DisplayOrder,
            question.IsRequired,
            question.Sensitivity,
            question.Options
                .Where(option => option.IsActive)
                .OrderBy(option => option.DisplayOrder)
                .Select(option => new IntakeQuestionOptionDto(option.Id, option.OptionKey, option.Label, option.DisplayOrder))
                .ToList());
    }
}
