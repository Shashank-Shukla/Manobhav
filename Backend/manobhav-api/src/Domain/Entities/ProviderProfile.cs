namespace Domain.Entities;

public sealed class ProviderProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string LongDescription { get; set; } = string.Empty;
    public string SpecializationsJson { get; set; } = "[]";
    public string AvatarColor { get; set; } = "#9CAF88";
    public int Sessions { get; set; }
    public decimal Rating { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public List<ProviderAvailability> Availabilities { get; set; } = [];
}
