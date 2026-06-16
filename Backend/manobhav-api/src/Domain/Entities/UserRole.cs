namespace Domain.Entities;

public sealed class UserRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTimeOffset GrantedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public Guid? GrantedByUserId { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
    public Guid? RevokedByUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public User User { get; set; } = null!;
}
