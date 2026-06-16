namespace Domain.Entities;

public sealed class IntakeFormDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SubmissionKind { get; set; } = "PatientIntake";
    public string Name { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public string Status { get; set; } = "Draft";
    public DateTimeOffset? EffectiveFromUtc { get; set; }
    public DateTimeOffset? EffectiveToUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public Guid? CreatedByUserId { get; set; }
    public List<IntakeFormSection> Sections { get; set; } = [];
}
