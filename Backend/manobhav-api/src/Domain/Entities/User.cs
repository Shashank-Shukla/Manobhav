namespace Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? CognitoSubject { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Name { get; set; }
    public string? DisplayName { get; set; }
    public string AccountStatus { get; set; } = "Active";
    public string? PreferredName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Occupation { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactRelation { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public DateTimeOffset? ProfileCompletedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public DateTimeOffset? LastLoginAtUtc { get; set; }
    public List<UserRole> Roles { get; set; } = [];
}
