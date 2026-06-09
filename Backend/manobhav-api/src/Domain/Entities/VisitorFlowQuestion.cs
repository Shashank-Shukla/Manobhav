namespace Domain.Entities;

public sealed class VisitorFlowQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FlowKey { get; set; } = "default";
    public int StepOrder { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
