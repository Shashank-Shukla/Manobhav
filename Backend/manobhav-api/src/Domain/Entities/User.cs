namespace Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Email { get; set; }
    public string? Name { get; set; }
}
