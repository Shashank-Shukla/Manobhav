namespace Domain.Entities;

public sealed class IntakeAnswer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubmissionId { get; set; }
    public Guid QuestionId { get; set; }
    public string QuestionKey { get; set; } = string.Empty;
    public string AnswerJsonb { get; set; } = "{}";
    public DateTimeOffset AnsweredAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public IntakeSubmission Submission { get; set; } = null!;
    public IntakeQuestion Question { get; set; } = null!;
}
