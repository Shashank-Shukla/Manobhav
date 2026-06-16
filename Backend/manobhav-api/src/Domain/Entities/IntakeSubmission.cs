namespace Domain.Entities;

public sealed class IntakeSubmission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SubmissionKind { get; set; } = "PatientIntake";
    public Guid FormDefinitionId { get; set; }
    public int FormVersion { get; set; }
    public Guid? VisitorSessionId { get; set; }
    public Guid? UserId { get; set; }
    public string Status { get; set; } = "Draft";
    public string? CurrentStep { get; set; }
    public string AnswersJsonb { get; set; } = "{}";
    public DateTimeOffset StartedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSavedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SubmittedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public IntakeFormDefinition FormDefinition { get; set; } = null!;
    public VisitorSession? VisitorSession { get; set; }
    public User? User { get; set; }
    public List<IntakeAnswer> Answers { get; set; } = [];
}
