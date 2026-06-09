using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<VisitorSession> VisitorSessions => Set<VisitorSession>();
    public DbSet<VisitorEvent> VisitorEvents => Set<VisitorEvent>();
    public DbSet<ProviderProfile> ProviderProfiles => Set<ProviderProfile>();
    public DbSet<ProviderAvailability> ProviderAvailabilities => Set<ProviderAvailability>();
    public DbSet<VisitorFlowQuestion> VisitorFlowQuestions => Set<VisitorFlowQuestion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.Email);
            entity.Property(user => user.Email).HasMaxLength(320);
            entity.Property(user => user.Name).HasMaxLength(200);
        });

        modelBuilder.Entity<VisitorSession>(entity =>
        {
            entity.HasKey(visitor => visitor.Id);
            entity.HasIndex(visitor => visitor.CreatedAtUtc);
            entity.HasIndex(visitor => visitor.LinkedUserSubject);
            entity.Property(visitor => visitor.LandingPath).HasMaxLength(256);
            entity.Property(visitor => visitor.IpAddress).HasMaxLength(128);
            entity.Property(visitor => visitor.UserAgent).HasMaxLength(512);
            entity.Property(visitor => visitor.Referrer).HasMaxLength(1024);
            entity.Property(visitor => visitor.TimeZone).HasMaxLength(80);
            entity.Property(visitor => visitor.DeviceInfo).HasMaxLength(512);
            entity.Property(visitor => visitor.NetworkInfo).HasMaxLength(256);
            entity.Property(visitor => visitor.UtmSource).HasMaxLength(120);
            entity.Property(visitor => visitor.UtmMedium).HasMaxLength(120);
            entity.Property(visitor => visitor.UtmCampaign).HasMaxLength(180);
            entity.Property(visitor => visitor.LinkedUserSubject).HasMaxLength(160);
        });

        modelBuilder.Entity<VisitorEvent>(entity =>
        {
            entity.HasKey(visitorEvent => visitorEvent.Id);
            entity.HasIndex(visitorEvent => new { visitorEvent.VisitorSessionId, visitorEvent.CreatedAtUtc });
            entity.Property(visitorEvent => visitorEvent.EventType).HasMaxLength(120).IsRequired();
            entity.Property(visitorEvent => visitorEvent.Route).HasMaxLength(256).IsRequired();
            entity.Property(visitorEvent => visitorEvent.TargetKey).HasMaxLength(160);
            entity.Property(visitorEvent => visitorEvent.PropertiesJson).HasMaxLength(4096).IsRequired();
            entity.HasOne(visitorEvent => visitorEvent.VisitorSession)
                .WithMany(visitor => visitor.Events)
                .HasForeignKey(visitorEvent => visitorEvent.VisitorSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProviderProfile>(entity =>
        {
            entity.HasKey(provider => provider.Id);
            entity.HasIndex(provider => new { provider.IsActive, provider.DisplayOrder });
            entity.HasIndex(provider => provider.IsFeatured);
            entity.Property(provider => provider.Name).HasMaxLength(200).IsRequired();
            entity.Property(provider => provider.Role).HasMaxLength(160).IsRequired();
            entity.Property(provider => provider.Summary).HasMaxLength(512).IsRequired();
            entity.Property(provider => provider.LongDescription).HasMaxLength(2000).IsRequired();
            entity.Property(provider => provider.SpecializationsJson).HasMaxLength(1024).IsRequired();
            entity.Property(provider => provider.AvatarColor).HasMaxLength(16).IsRequired();
            entity.Property(provider => provider.Rating).HasPrecision(3, 2);
        });

        modelBuilder.Entity<ProviderAvailability>(entity =>
        {
            entity.HasKey(availability => availability.Id);
            entity.HasIndex(availability => new { availability.ProviderProfileId, availability.StartsAtUtc });
            entity.HasOne(availability => availability.ProviderProfile)
                .WithMany(provider => provider.Availabilities)
                .HasForeignKey(availability => availability.ProviderProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VisitorFlowQuestion>(entity =>
        {
            entity.HasKey(question => question.Id);
            entity.HasIndex(question => new { question.FlowKey, question.IsActive, question.StepOrder });
            entity.Property(question => question.FlowKey).HasMaxLength(80).IsRequired();
            entity.Property(question => question.Text).HasMaxLength(600).IsRequired();
        });
    }
}
