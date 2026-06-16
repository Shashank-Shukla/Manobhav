namespace Domain.Entities;

public sealed class IntakeQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SectionId { get; set; }
    public string QuestionKey { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string? HelpText { get; set; }
    public string InputType { get; set; } = "Text";
    public int DisplayOrder { get; set; }
    public bool IsRequired { get; set; }
    public string ValidationJson { get; set; } = "{}";
    public string Sensitivity { get; set; } = "Standard";
    public IntakeFormSection Section { get; set; } = null!;
    public List<IntakeQuestionOption> Options { get; set; } = [];
}
