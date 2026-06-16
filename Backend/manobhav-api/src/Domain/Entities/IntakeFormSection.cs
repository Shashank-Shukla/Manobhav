namespace Domain.Entities;

public sealed class IntakeFormSection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FormDefinitionId { get; set; }
    public string SectionKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsRequired { get; set; }
    public IntakeFormDefinition FormDefinition { get; set; } = null!;
    public List<IntakeQuestion> Questions { get; set; } = [];
}
