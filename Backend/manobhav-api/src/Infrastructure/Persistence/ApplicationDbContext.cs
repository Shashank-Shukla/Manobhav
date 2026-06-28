using Domain.Entities;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    private readonly IAuditContextAccessor? _auditContextAccessor;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        IAuditContextAccessor? auditContextAccessor = null) : base(options)
    {
        _auditContextAccessor = auditContextAccessor;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<VisitorSession> VisitorSessions => Set<VisitorSession>();
    public DbSet<VisitorEvent> VisitorEvents => Set<VisitorEvent>();
    public DbSet<IntakeFormDefinition> IntakeFormDefinitions => Set<IntakeFormDefinition>();
    public DbSet<IntakeFormSection> IntakeFormSections => Set<IntakeFormSection>();
    public DbSet<IntakeQuestion> IntakeQuestions => Set<IntakeQuestion>();
    public DbSet<IntakeQuestionOption> IntakeQuestionOptions => Set<IntakeQuestionOption>();
    public DbSet<IntakeSubmission> IntakeSubmissions => Set<IntakeSubmission>();
    public DbSet<IntakeAnswer> IntakeAnswers => Set<IntakeAnswer>();
    public DbSet<Consent> Consents => Set<Consent>();
    public DbSet<ProviderProfile> ProviderProfiles => Set<ProviderProfile>();
    public DbSet<ProviderAvailability> ProviderAvailabilities => Set<ProviderAvailability>();
    public DbSet<ProviderAvailabilitySlot> ProviderAvailabilitySlots => Set<ProviderAvailabilitySlot>();
    public DbSet<BookingHold> BookingHolds => Set<BookingHold>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<ProviderOnboardingApplication> ProviderOnboardingApplications => Set<ProviderOnboardingApplication>();
    public DbSet<ProviderCredential> ProviderCredentials => Set<ProviderCredential>();
    public DbSet<ProviderPayoutDetails> ProviderPayoutDetails => Set<ProviderPayoutDetails>();
    public DbSet<ProviderTaxonomyTerm> ProviderTaxonomyTerms => Set<ProviderTaxonomyTerm>();
    public DbSet<ProviderApplicationTaxonomyTerm> ProviderApplicationTaxonomyTerms => Set<ProviderApplicationTaxonomyTerm>();
    public DbSet<ProviderDocument> ProviderDocuments => Set<ProviderDocument>();
    public DbSet<ProviderApplicationSectionReview> ProviderApplicationSectionReviews => Set<ProviderApplicationSectionReview>();
    public DbSet<ProviderReview> ProviderReviews => Set<ProviderReview>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<VisitorFlowQuestion> VisitorFlowQuestions => Set<VisitorFlowQuestion>();
    public DbSet<AdminNotification> AdminNotifications => Set<AdminNotification>();
    public DbSet<EmailOtpChallenge> EmailOtpChallenges => Set<EmailOtpChallenge>();
    public DbSet<EmailOtpRateLimitBucket> EmailOtpRateLimitBuckets => Set<EmailOtpRateLimitBucket>();

    public override int SaveChanges()
    {
        AddAuditLogs();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AddAuditLogs();
        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.Email);
            entity.HasIndex(user => user.CognitoSubject).IsUnique();
            entity.HasIndex(user => user.Phone);
            entity.Property(user => user.CognitoSubject).HasMaxLength(160);
            entity.Property(user => user.Email).HasMaxLength(320);
            entity.Property(user => user.Phone).HasMaxLength(40);
            entity.Property(user => user.Name).HasMaxLength(200);
            entity.Property(user => user.DisplayName).HasMaxLength(200);
            entity.Property(user => user.AccountStatus).HasMaxLength(40).IsRequired();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(role => role.Id);
            entity.HasIndex(role => new { role.UserId, role.Role, role.IsActive });
            entity.Property(role => role.Role).HasMaxLength(80).IsRequired();
            entity.HasOne(role => role.User)
                .WithMany(user => user.Roles)
                .HasForeignKey(role => role.UserId)
                .OnDelete(DeleteBehavior.Cascade);
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

        modelBuilder.Entity<IntakeFormDefinition>(entity =>
        {
            entity.HasKey(form => form.Id);
            entity.HasIndex(form => new { form.SubmissionKind, form.Status, form.Version });
            entity.Property(form => form.SubmissionKind).HasMaxLength(80).IsRequired();
            entity.Property(form => form.Name).HasMaxLength(200).IsRequired();
            entity.Property(form => form.Status).HasMaxLength(40).IsRequired();
        });

        modelBuilder.Entity<IntakeFormSection>(entity =>
        {
            entity.HasKey(section => section.Id);
            entity.HasIndex(section => new { section.FormDefinitionId, section.SectionKey }).IsUnique();
            entity.Property(section => section.SectionKey).HasMaxLength(120).IsRequired();
            entity.Property(section => section.Title).HasMaxLength(240).IsRequired();
            entity.Property(section => section.Description).HasMaxLength(1000);
            entity.HasOne(section => section.FormDefinition)
                .WithMany(form => form.Sections)
                .HasForeignKey(section => section.FormDefinitionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IntakeQuestion>(entity =>
        {
            entity.HasKey(question => question.Id);
            entity.HasIndex(question => new { question.SectionId, question.QuestionKey }).IsUnique();
            entity.Property(question => question.QuestionKey).HasMaxLength(160).IsRequired();
            entity.Property(question => question.Prompt).HasMaxLength(1000).IsRequired();
            entity.Property(question => question.HelpText).HasMaxLength(1000);
            entity.Property(question => question.InputType).HasMaxLength(60).IsRequired();
            entity.Property(question => question.ValidationJson).HasColumnType("jsonb");
            entity.Property(question => question.Sensitivity).HasMaxLength(60).IsRequired();
            entity.HasOne(question => question.Section)
                .WithMany(section => section.Questions)
                .HasForeignKey(question => question.SectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IntakeQuestionOption>(entity =>
        {
            entity.HasKey(option => option.Id);
            entity.HasIndex(option => new { option.QuestionId, option.OptionKey }).IsUnique();
            entity.Property(option => option.OptionKey).HasMaxLength(160).IsRequired();
            entity.Property(option => option.Label).HasMaxLength(300).IsRequired();
            entity.HasOne(option => option.Question)
                .WithMany(question => question.Options)
                .HasForeignKey(option => option.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IntakeSubmission>(entity =>
        {
            entity.HasKey(submission => submission.Id);
            entity.HasIndex(submission => new { submission.SubmissionKind, submission.Status });
            entity.HasIndex(submission => submission.VisitorSessionId);
            entity.HasIndex(submission => submission.UserId);
            entity.Property(submission => submission.SubmissionKind).HasMaxLength(80).IsRequired();
            entity.Property(submission => submission.Status).HasMaxLength(60).IsRequired();
            entity.Property(submission => submission.CurrentStep).HasMaxLength(160);
            entity.Property(submission => submission.AnswersJsonb).HasColumnType("jsonb");
            entity.HasOne(submission => submission.FormDefinition)
                .WithMany()
                .HasForeignKey(submission => submission.FormDefinitionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(submission => submission.VisitorSession)
                .WithMany()
                .HasForeignKey(submission => submission.VisitorSessionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(submission => submission.User)
                .WithMany()
                .HasForeignKey(submission => submission.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<IntakeAnswer>(entity =>
        {
            entity.HasKey(answer => answer.Id);
            entity.HasIndex(answer => new { answer.SubmissionId, answer.QuestionKey }).IsUnique();
            entity.Property(answer => answer.QuestionKey).HasMaxLength(160).IsRequired();
            entity.Property(answer => answer.AnswerJsonb).HasColumnType("jsonb");
            entity.HasOne(answer => answer.Submission)
                .WithMany(submission => submission.Answers)
                .HasForeignKey(answer => answer.SubmissionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(answer => answer.Question)
                .WithMany()
                .HasForeignKey(answer => answer.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Consent>(entity =>
        {
            entity.HasKey(consent => consent.Id);
            entity.HasIndex(consent => consent.IntakeSubmissionId);
            entity.Property(consent => consent.ConsentType).HasMaxLength(80).IsRequired();
            entity.Property(consent => consent.TypedName).HasMaxLength(200);
            entity.Property(consent => consent.IpAddress).HasMaxLength(128);
            entity.Property(consent => consent.UserAgent).HasMaxLength(512);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(consent => consent.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<VisitorSession>()
                .WithMany()
                .HasForeignKey(consent => consent.VisitorSessionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<IntakeSubmission>()
                .WithMany()
                .HasForeignKey(consent => consent.IntakeSubmissionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BookingHold>()
                .WithMany()
                .HasForeignKey(consent => consent.BookingHoldId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Appointment>()
                .WithMany()
                .HasForeignKey(consent => consent.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
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
            entity.Property(provider => provider.DisplayName).HasMaxLength(200);
            entity.Property(provider => provider.ProfessionalTitle).HasMaxLength(200);
            entity.Property(provider => provider.CredentialsSummary).HasMaxLength(300);
            entity.Property(provider => provider.LanguagesJson).HasColumnType("jsonb").HasDefaultValue("[]");
            entity.Property(provider => provider.Location).HasMaxLength(160);
            entity.Property(provider => provider.Bio).HasMaxLength(2000);
            entity.Property(provider => provider.TherapyApproach).HasMaxLength(2000);
            entity.Property(provider => provider.SpecializationsJson).HasColumnType("jsonb").HasDefaultValue("[]").IsRequired();
            entity.Property(provider => provider.WeeklyAvailabilityJson).HasColumnType("jsonb").HasDefaultValue("[]");
            entity.Property(provider => provider.AvatarColor).HasMaxLength(16).IsRequired();
            entity.Property(provider => provider.VisibilityStatus).HasMaxLength(40).IsRequired();
            entity.Property(provider => provider.Rating).HasPrecision(3, 2);
            entity.Property(provider => provider.RatingAverage).HasPrecision(3, 2);
            entity.HasIndex(provider => provider.ProviderApplicationId).IsUnique();
            entity.HasOne<ProviderOnboardingApplication>()
                .WithOne()
                .HasForeignKey<ProviderProfile>(provider => provider.ProviderApplicationId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(provider => provider.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ProviderDocument>()
                .WithMany()
                .HasForeignKey(provider => provider.ProfilePhotoDocumentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ProviderDocument>()
                .WithMany()
                .HasForeignKey(provider => provider.IntroVideoDocumentId)
                .OnDelete(DeleteBehavior.Restrict);
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

        modelBuilder.Entity<ProviderAvailabilitySlot>(entity =>
        {
            entity.HasKey(slot => slot.Id);
            entity.HasIndex(slot => new { slot.ProviderProfileId, slot.StartsAtUtc });
            entity.HasIndex(slot => slot.Status);
            entity.Property(slot => slot.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(slot => slot.ProviderProfile)
                .WithMany(provider => provider.AvailabilitySlots)
                .HasForeignKey(slot => slot.ProviderProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BookingHold>(entity =>
        {
            entity.HasKey(hold => hold.Id);
            entity.HasIndex(hold => new { hold.SlotId, hold.Status });
            entity.HasIndex(hold => hold.ExpiresAtUtc);
            entity.Property(hold => hold.Status).HasMaxLength(60).IsRequired();
            entity.Property(hold => hold.ProviderSnapshotJson).HasColumnType("jsonb");
            entity.Property(hold => hold.SelectedSlotSnapshotJson).HasColumnType("jsonb");
            entity.Property(hold => hold.FlowStateJson).HasColumnType("jsonb");
            entity.Property(hold => hold.IpAddress).HasMaxLength(128);
            entity.Property(hold => hold.UserAgent).HasMaxLength(512);
            entity.HasOne<ProviderProfile>()
                .WithMany()
                .HasForeignKey(hold => hold.ProviderProfileId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ProviderAvailabilitySlot>()
                .WithMany()
                .HasForeignKey(hold => hold.SlotId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<VisitorSession>()
                .WithMany()
                .HasForeignKey(hold => hold.VisitorSessionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(hold => hold.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<IntakeSubmission>()
                .WithMany()
                .HasForeignKey(hold => hold.IntakeSubmissionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(appointment => appointment.Id);
            entity.HasIndex(appointment => appointment.BookingHoldId).IsUnique();
            entity.HasIndex(appointment => new { appointment.ProviderProfileId, appointment.StartsAtUtc });
            entity.HasIndex(appointment => new { appointment.PatientUserId, appointment.StartsAtUtc });
            entity.Property(appointment => appointment.Status).HasMaxLength(60).IsRequired();
            entity.Property(appointment => appointment.PaymentStatus).HasMaxLength(60).IsRequired();
            entity.Property(appointment => appointment.PaymentProvider).HasMaxLength(80);
            entity.Property(appointment => appointment.PaymentReference).HasMaxLength(160);
            entity.HasOne<BookingHold>()
                .WithOne()
                .HasForeignKey<Appointment>(appointment => appointment.BookingHoldId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(appointment => appointment.PatientUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ProviderProfile>()
                .WithMany()
                .HasForeignKey(appointment => appointment.ProviderProfileId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ProviderAvailabilitySlot>()
                .WithMany()
                .HasForeignKey(appointment => appointment.SlotId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<IntakeSubmission>()
                .WithMany()
                .HasForeignKey(appointment => appointment.IntakeSubmissionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProviderOnboardingApplication>(entity =>
        {
            entity.HasKey(application => application.Id);
            entity.HasIndex(application => new { application.UserId, application.Status });
            entity.Property(application => application.Status).HasMaxLength(60).IsRequired();
            entity.Property(application => application.CurrentStep).HasMaxLength(160);
            entity.Property(application => application.BasicProfileJson).HasColumnType("jsonb");
            entity.Property(application => application.BioJson).HasColumnType("jsonb");
            entity.Property(application => application.SessionDetailsJson).HasColumnType("jsonb");
            entity.Property(application => application.ReviewNotes).HasMaxLength(1000);
            entity.HasOne(application => application.User)
                .WithMany()
                .HasForeignKey(application => application.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(application => application.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProviderApplicationSectionReview>(entity =>
        {
            entity.HasKey(review => review.Id);
            entity.HasIndex(review => new { review.ProviderApplicationId, review.SectionKey }).IsUnique();
            entity.Property(review => review.SectionKey).HasMaxLength(120).IsRequired();
            entity.Property(review => review.Status).HasMaxLength(60).IsRequired();
            entity.Property(review => review.Comment).HasMaxLength(2000);
            entity.HasOne(review => review.Application)
                .WithMany(application => application.SectionReviews)
                .HasForeignKey(review => review.ProviderApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProviderCredential>(entity =>
        {
            entity.HasKey(credential => credential.Id);
            entity.HasIndex(credential => credential.ProviderApplicationId);
            entity.Property(credential => credential.CredentialType).HasMaxLength(80).IsRequired();
            entity.Property(credential => credential.Degree).HasMaxLength(200);
            entity.Property(credential => credential.University).HasMaxLength(200);
            entity.Property(credential => credential.LicenseBody).HasMaxLength(200);
            entity.Property(credential => credential.LicenseNumber).HasMaxLength(120);
            entity.Property(credential => credential.CertificationName).HasMaxLength(200);
            entity.Property(credential => credential.VerificationStatus).HasMaxLength(60).IsRequired();
            entity.HasOne<ProviderOnboardingApplication>()
                .WithMany()
                .HasForeignKey(credential => credential.ProviderApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ProviderDocument>()
                .WithMany()
                .HasForeignKey(credential => credential.DocumentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(credential => credential.VerifiedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProviderPayoutDetails>(entity =>
        {
            entity.HasKey(payout => payout.Id);
            entity.HasIndex(payout => payout.ProviderApplicationId).IsUnique();
            entity.Property(payout => payout.PayoutMode).HasMaxLength(80);
            entity.Property(payout => payout.AccountHolderName).HasMaxLength(200);
            entity.Property(payout => payout.BankName).HasMaxLength(200);
            entity.Property(payout => payout.AccountDetailsEncrypted).HasMaxLength(4096);
            entity.Property(payout => payout.AccountLast4).HasMaxLength(8);
            entity.Property(payout => payout.TaxIdentifierEncrypted).HasMaxLength(4096);
            entity.Property(payout => payout.Status).HasMaxLength(60).IsRequired();
            entity.HasOne<ProviderOnboardingApplication>()
                .WithOne()
                .HasForeignKey<ProviderPayoutDetails>(payout => payout.ProviderApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(payout => payout.VerifiedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProviderTaxonomyTerm>(entity =>
        {
            entity.HasKey(term => term.Id);
            entity.HasIndex(term => new { term.Category, term.TermKey }).IsUnique();
            entity.Property(term => term.Category).HasMaxLength(80).IsRequired();
            entity.Property(term => term.TermKey).HasMaxLength(120).IsRequired();
            entity.Property(term => term.Label).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<ProviderApplicationTaxonomyTerm>(entity =>
        {
            entity.HasKey(term => term.Id);
            entity.HasIndex(term => new { term.ProviderApplicationId, term.TermId }).IsUnique();
            entity.Property(term => term.OtherText).HasMaxLength(200);
            entity.Property(term => term.ReviewStatus).HasMaxLength(60).IsRequired();
            entity.HasOne<ProviderOnboardingApplication>()
                .WithMany()
                .HasForeignKey(term => term.ProviderApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ProviderTaxonomyTerm>()
                .WithMany()
                .HasForeignKey(term => term.TermId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(term => term.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProviderDocument>(entity =>
        {
            entity.HasKey(document => document.Id);
            entity.HasIndex(document => new { document.ProviderApplicationId, document.Category, document.Status });
            entity.Property(document => document.Category).HasMaxLength(80).IsRequired();
            entity.Property(document => document.Status).HasMaxLength(60).IsRequired();
            entity.Property(document => document.OriginalFileName).HasMaxLength(260).IsRequired();
            entity.Property(document => document.SafeFileName).HasMaxLength(260).IsRequired();
            entity.Property(document => document.ContentType).HasMaxLength(120).IsRequired();
            entity.Property(document => document.S3Bucket).HasMaxLength(120).IsRequired();
            entity.Property(document => document.S3Key).HasMaxLength(1024).IsRequired();
            entity.Property(document => document.ReviewNotes).HasMaxLength(1000);
            entity.HasOne<ProviderOnboardingApplication>()
                .WithMany()
                .HasForeignKey(document => document.ProviderApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(document => document.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(document => document.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ProviderDocument>()
                .WithMany()
                .HasForeignKey(document => document.ReplacedByDocumentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProviderReview>(entity =>
        {
            entity.HasKey(review => review.Id);
            entity.HasIndex(review => new { review.ProviderProfileId, review.Status });
            entity.HasIndex(review => review.AppointmentId);
            entity.Property(review => review.Comment).HasMaxLength(2000);
            entity.Property(review => review.PublicReviewerLabel).HasMaxLength(80).IsRequired();
            entity.Property(review => review.Status).HasMaxLength(60).IsRequired();
            entity.Property(review => review.HideReason).HasMaxLength(1000);
            entity.HasOne<ProviderProfile>()
                .WithMany()
                .HasForeignKey(review => review.ProviderProfileId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Appointment>()
                .WithMany()
                .HasForeignKey(review => review.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(review => review.PatientUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(review => review.HiddenByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(audit => audit.Id);
            entity.HasIndex(audit => new { audit.EntityType, audit.EntityId, audit.OccurredAtUtc });
            entity.Property(audit => audit.ActorType).HasMaxLength(80).IsRequired();
            entity.Property(audit => audit.ActorSubject).HasMaxLength(160);
            entity.Property(audit => audit.Action).HasMaxLength(120).IsRequired();
            entity.Property(audit => audit.EntityType).HasMaxLength(120).IsRequired();
            entity.Property(audit => audit.EntityId).HasMaxLength(120).IsRequired();
            entity.Property(audit => audit.CorrelationId).HasMaxLength(120);
            entity.Property(audit => audit.RequestPath).HasMaxLength(256);
            entity.Property(audit => audit.IpAddress).HasMaxLength(128);
            entity.Property(audit => audit.UserAgent).HasMaxLength(512);
            entity.Property(audit => audit.BeforeJson).HasColumnType("jsonb");
            entity.Property(audit => audit.AfterJson).HasColumnType("jsonb");
            entity.Property(audit => audit.ChangedFieldsJson).HasColumnType("jsonb");
            entity.Property(audit => audit.Reason).HasMaxLength(1000);
            entity.Property(audit => audit.WorkflowEventType).HasMaxLength(120);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(audit => audit.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VisitorFlowQuestion>(entity =>
        {
            entity.HasKey(question => question.Id);
            entity.HasIndex(question => new { question.FlowKey, question.IsActive, question.StepOrder });
            entity.Property(question => question.FlowKey).HasMaxLength(80).IsRequired();
            entity.Property(question => question.Text).HasMaxLength(600).IsRequired();
        });

        modelBuilder.Entity<AdminNotification>(entity =>
        {
            entity.HasKey(notification => notification.Id);
            entity.HasIndex(notification => notification.NotificationKey).IsUnique();
            entity.HasIndex(notification => notification.ReadAtUtc);
            entity.HasIndex(notification => notification.CreatedAtUtc);
            entity.Property(notification => notification.NotificationKey).HasMaxLength(180).IsRequired();
            entity.Property(notification => notification.Type).HasMaxLength(80).IsRequired();
            entity.Property(notification => notification.Title).HasMaxLength(200).IsRequired();
            entity.Property(notification => notification.Body).HasMaxLength(1000).IsRequired();
            entity.Property(notification => notification.LinkPath).HasMaxLength(300).IsRequired();
            entity.Property(notification => notification.SourceEntityType).HasMaxLength(120);
            entity.Property(notification => notification.SourceEntityId).HasMaxLength(120);
        });

        modelBuilder.Entity<EmailOtpChallenge>(entity =>
        {
            entity.HasKey(challenge => challenge.Id);
            entity.HasIndex(challenge => new { challenge.Email, challenge.Flow, challenge.CreatedAtUtc });
            entity.HasIndex(challenge => challenge.ExpiresAtUtc);
            entity.HasIndex(challenge => new { challenge.Email, challenge.Flow, challenge.VerificationLockedUntilUtc });
            entity.HasIndex(challenge => new { challenge.Email, challenge.Flow, challenge.InvalidatedAtUtc, challenge.ExpiresAtUtc });
            entity.Property(challenge => challenge.Email).HasMaxLength(320).IsRequired();
            entity.Property(challenge => challenge.Flow).HasMaxLength(40).IsRequired();
            entity.Property(challenge => challenge.OtpHash).HasMaxLength(128);
            entity.Property(challenge => challenge.OtpSalt).HasMaxLength(64);
            entity.Property(challenge => challenge.ProviderSession).HasMaxLength(2048);
            entity.Property(challenge => challenge.VerificationLockToken).HasMaxLength(64);
            entity.Property(challenge => challenge.InvalidationReason).HasMaxLength(120);
            entity.Property(challenge => challenge.ExternalSendStatus).HasMaxLength(40).IsRequired();
            entity.Property(challenge => challenge.ExternalSendFailure).HasMaxLength(240);
            entity.Property(challenge => challenge.IpAddress).HasMaxLength(128);
            entity.Property(challenge => challenge.UserAgent).HasMaxLength(512);
        });

        modelBuilder.Entity<EmailOtpRateLimitBucket>(entity =>
        {
            entity.HasKey(bucket => bucket.Id);
            entity.HasIndex(bucket => new { bucket.Email, bucket.Flow }).IsUnique();
            entity.HasIndex(bucket => bucket.UpdatedAtUtc);
            entity.Property(bucket => bucket.Email).HasMaxLength(320).IsRequired();
            entity.Property(bucket => bucket.Flow).HasMaxLength(40).IsRequired();
            entity.Property(bucket => bucket.Version).IsConcurrencyToken();
        });
    }

    private void AddAuditLogs()
    {
        var auditContext = _auditContextAccessor?.Current ?? AuditRequestContext.System;
        var auditLogs = ChangeTracker.Entries()
            .Where(ShouldAuditEntry)
            .Select(entry => CreateAuditLog(entry, auditContext))
            .ToList();

        if (auditLogs.Count == 0)
        {
            return;
        }

        AuditLogs.AddRange(auditLogs);
    }

    private static bool ShouldAuditEntry(EntityEntry entry)
    {
        return entry.Entity is not AuditLog &&
            entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted;
    }

    private static AuditLog CreateAuditLog(EntityEntry entry, AuditRequestContext auditContext)
    {
        return new AuditLog
        {
            ActorType = ResolveActorType(auditContext),
            ActorUserId = auditContext.IsAuthenticated ? auditContext.ActorUserId : null,
            ActorSubject = auditContext.IsAuthenticated ? TrimToMaxLength(auditContext.ActorSubject, 160) : null,
            Action = entry.State.ToString(),
            EntityType = entry.Metadata.ClrType.Name,
            EntityId = ReadEntityId(entry),
            CorrelationId = TrimToMaxLength(auditContext.CorrelationId, 120),
            RequestPath = TrimToMaxLength(auditContext.RequestPath, 256),
            IpAddress = TrimToMaxLength(auditContext.IpAddress, 128),
            UserAgent = TrimToMaxLength(auditContext.UserAgent, 512),
            ChangedFieldsJson = JsonSerializer.Serialize(ReadChangedFieldNames(entry)),
            BeforeJson = "{}",
            AfterJson = "{}"
        };
    }

    private static string ResolveActorType(AuditRequestContext auditContext)
    {
        if (!auditContext.HasHttpContext)
        {
            return "System";
        }

        if (!auditContext.IsAuthenticated)
        {
            return "Anonymous";
        }

        return auditContext.IsAdmin ? "Admin" : "User";
    }

    private static string? TrimToMaxLength(string? value, int maxLength)
    {
        return string.IsNullOrEmpty(value) || value.Length <= maxLength
            ? value
            : value[..maxLength];
    }

    private static string ReadEntityId(EntityEntry entry)
    {
        var key = entry.Properties.FirstOrDefault(property => property.Metadata.IsPrimaryKey());
        return key?.CurrentValue?.ToString() ?? string.Empty;
    }

    private static string[] ReadChangedFieldNames(EntityEntry entry)
    {
        return entry.Properties
            .Where(property => entry.State != EntityState.Modified || property.IsModified)
            .Select(property => RedactSensitiveFieldName(property.Metadata.Name))
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();
    }

    private static string RedactSensitiveFieldName(string fieldName)
    {
        return IsSensitiveFieldName(fieldName) ? "[REDACTED_FIELD]" : fieldName;
    }

    private static bool IsSensitiveFieldName(string fieldName)
    {
        return fieldName.Contains("password", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("secret", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("token", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("auth", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("payout", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("payment", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("account", StringComparison.OrdinalIgnoreCase) ||
            fieldName.Contains("tax", StringComparison.OrdinalIgnoreCase);
    }
}
