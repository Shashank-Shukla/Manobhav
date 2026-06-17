namespace Application.DTOs;

public sealed record IntakeFormDto(
    Guid Id,
    string SubmissionKind,
    string Name,
    int Version,
    IReadOnlyList<IntakeSectionDto> Sections);

public sealed record IntakeSectionDto(
    Guid Id,
    string SectionKey,
    string Title,
    string? Description,
    int DisplayOrder,
    bool IsRequired,
    IReadOnlyList<IntakeQuestionDto> Questions);

public sealed record IntakeQuestionDto(
    Guid Id,
    string QuestionKey,
    string Prompt,
    string? HelpText,
    string InputType,
    int DisplayOrder,
    bool IsRequired,
    string Sensitivity,
    IReadOnlyList<IntakeQuestionOptionDto> Options);

public sealed record IntakeQuestionOptionDto(
    Guid Id,
    string OptionKey,
    string Label,
    int DisplayOrder);

public sealed record CreateIntakeSubmissionRequest(
    string SubmissionKind,
    Guid FormDefinitionId,
    Guid? VisitorSessionId,
    string? CurrentStep = null);

public sealed record IntakeSubmissionDto(
    Guid Id,
    string SubmissionKind,
    Guid FormDefinitionId,
    int FormVersion,
    Guid? VisitorSessionId,
    Guid? UserId,
    string Status,
    string? CurrentStep,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset LastSavedAtUtc);

public sealed record SaveIntakeAnswerRequest(
    object? Answer,
    string? CurrentStep,
    int TimeToAnswerMs,
    DateTimeOffset? ClientTimestampUtc,
    bool IsAdvancing = false,
    string? StepId = null);

public sealed record SubmitPartialIntakeRequest(bool PolicyAcknowledged);

public sealed record SignConsentRequest(
    string ConsentType,
    int PolicyVersion,
    bool Accepted,
    string TypedName);

public sealed record CompleteProfileRequest(
    string FullName,
    string? Email,
    string? Phone,
    string EmergencyContactName,
    string EmergencyContactRelation,
    string EmergencyContactPhone);
