using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MvpDataIntakeProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountStatus",
                table: "Users",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CognitoSubject",
                table: "Users",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAtUtc",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastLoginAtUtc",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAtUtc",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "ProviderProfiles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAtUtc",
                table: "ProviderProfiles",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "CredentialsSummary",
                table: "ProviderProfiles",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "ProviderProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "IntroVideoDocumentId",
                table: "ProviderProfiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LanguagesJson",
                table: "ProviderProfiles",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "ProviderProfiles",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfessionalTitle",
                table: "ProviderProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProfilePhotoDocumentId",
                table: "ProviderProfiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProviderApplicationId",
                table: "ProviderProfiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PublishedAtUtc",
                table: "ProviderProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RatingAverage",
                table: "ProviderProfiles",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ReviewCount",
                table: "ProviderProfiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TherapyApproach",
                table: "ProviderProfiles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UnpublishedAtUtc",
                table: "ProviderProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAtUtc",
                table: "ProviderProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "ProviderProfiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VisibilityStatus",
                table: "ProviderProfiles",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "YearsExperience",
                table: "ProviderProfiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Action = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    RequestPath = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    BeforeJson = table.Column<string>(type: "jsonb", nullable: false),
                    AfterJson = table.Column<string>(type: "jsonb", nullable: false),
                    ChangedFieldsJson = table.Column<string>(type: "jsonb", nullable: false),
                    RedactionApplied = table.Column<bool>(type: "boolean", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    WorkflowEventType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IntakeFormDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionKind = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EffectiveFromUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    EffectiveToUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeFormDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProviderAvailabilitySlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAvailabilitySlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderAvailabilitySlots_ProviderProfiles_ProviderProfileId",
                        column: x => x.ProviderProfileId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProviderOnboardingApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CurrentStep = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    BasicProfileJson = table.Column<string>(type: "jsonb", nullable: false),
                    BioJson = table.Column<string>(type: "jsonb", nullable: false),
                    SessionDetailsJson = table.Column<string>(type: "jsonb", nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ApprovedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RejectedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SuspendedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderOnboardingApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderOnboardingApplications_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderOnboardingApplications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderTaxonomyTerms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    TermKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderTaxonomyTerms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    GrantedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    GrantedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RevokedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RevokedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IntakeFormSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FormDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeFormSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeFormSections_IntakeFormDefinitions_FormDefinitionId",
                        column: x => x.FormDefinitionId,
                        principalTable: "IntakeFormDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IntakeSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionKind = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    FormDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    FormVersion = table.Column<int>(type: "integer", nullable: false),
                    VisitorSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CurrentStep = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    AnswersJsonb = table.Column<string>(type: "jsonb", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSavedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeSubmissions_IntakeFormDefinitions_FormDefinitionId",
                        column: x => x.FormDefinitionId,
                        principalTable: "IntakeFormDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IntakeSubmissions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IntakeSubmissions_VisitorSessions_VisitorSessionId",
                        column: x => x.VisitorSessionId,
                        principalTable: "VisitorSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    SafeFileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    S3Bucket = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    S3Key = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    UploadedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ReplacedByDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderDocuments_ProviderDocuments_ReplacedByDocumentId",
                        column: x => x.ReplacedByDocumentId,
                        principalTable: "ProviderDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderDocuments_ProviderOnboardingApplications_ProviderAp~",
                        column: x => x.ProviderApplicationId,
                        principalTable: "ProviderOnboardingApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderDocuments_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderDocuments_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderPayoutDetails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    PayoutMode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    AccountHolderName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BankName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AccountDetailsEncrypted = table.Column<string>(type: "character varying(4096)", maxLength: 4096, nullable: true),
                    AccountLast4 = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    TaxIdentifierEncrypted = table.Column<string>(type: "character varying(4096)", maxLength: 4096, nullable: true),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    VerifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    VerifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderPayoutDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderPayoutDetails_ProviderOnboardingApplications_Provid~",
                        column: x => x.ProviderApplicationId,
                        principalTable: "ProviderOnboardingApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderPayoutDetails_Users_VerifiedByUserId",
                        column: x => x.VerifiedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderApplicationTaxonomyTerms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    OtherText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ReviewStatus = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderApplicationTaxonomyTerms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderApplicationTaxonomyTerms_ProviderOnboardingApplicat~",
                        column: x => x.ProviderApplicationId,
                        principalTable: "ProviderOnboardingApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderApplicationTaxonomyTerms_ProviderTaxonomyTerms_Term~",
                        column: x => x.TermId,
                        principalTable: "ProviderTaxonomyTerms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderApplicationTaxonomyTerms_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IntakeQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionKey = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Prompt = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    HelpText = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    InputType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    ValidationJson = table.Column<string>(type: "jsonb", nullable: false),
                    Sensitivity = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeQuestions_IntakeFormSections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "IntakeFormSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BookingHolds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitorSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IntakeSubmissionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ProviderSnapshotJson = table.Column<string>(type: "jsonb", nullable: false),
                    SelectedSlotSnapshotJson = table.Column<string>(type: "jsonb", nullable: false),
                    FlowStateJson = table.Column<string>(type: "jsonb", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancelledAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingHolds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookingHolds_IntakeSubmissions_IntakeSubmissionId",
                        column: x => x.IntakeSubmissionId,
                        principalTable: "IntakeSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingHolds_ProviderAvailabilitySlots_SlotId",
                        column: x => x.SlotId,
                        principalTable: "ProviderAvailabilitySlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingHolds_ProviderProfiles_ProviderProfileId",
                        column: x => x.ProviderProfileId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingHolds_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingHolds_VisitorSessions_VisitorSessionId",
                        column: x => x.VisitorSessionId,
                        principalTable: "VisitorSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderCredentials",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    CredentialType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Degree = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    University = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LicenseBody = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LicenseNumber = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    CertificationName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    VerificationStatus = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    VerifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    VerifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderCredentials_ProviderDocuments_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "ProviderDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderCredentials_ProviderOnboardingApplications_Provider~",
                        column: x => x.ProviderApplicationId,
                        principalTable: "ProviderOnboardingApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderCredentials_Users_VerifiedByUserId",
                        column: x => x.VerifiedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IntakeAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionKey = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    AnswerJsonb = table.Column<string>(type: "jsonb", nullable: false),
                    AnsweredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeAnswers_IntakeQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "IntakeQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IntakeAnswers_IntakeSubmissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "IntakeSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IntakeQuestionOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    OptionKey = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Label = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntakeQuestionOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IntakeQuestionOptions_IntakeQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "IntakeQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingHoldId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    IntakeSubmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    PaymentStatus = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    PaymentProvider = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    PaymentReference = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancelledAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_BookingHolds_BookingHoldId",
                        column: x => x.BookingHoldId,
                        principalTable: "BookingHolds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_IntakeSubmissions_IntakeSubmissionId",
                        column: x => x.IntakeSubmissionId,
                        principalTable: "IntakeSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_ProviderAvailabilitySlots_SlotId",
                        column: x => x.SlotId,
                        principalTable: "ProviderAvailabilitySlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_ProviderProfiles_ProviderProfileId",
                        column: x => x.ProviderProfileId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_Users_PatientUserId",
                        column: x => x.PatientUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Consents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    VisitorSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    IntakeSubmissionId = table.Column<Guid>(type: "uuid", nullable: true),
                    BookingHoldId = table.Column<Guid>(type: "uuid", nullable: true),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConsentType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    PolicyVersion = table.Column<int>(type: "integer", nullable: false),
                    Accepted = table.Column<bool>(type: "boolean", nullable: false),
                    TypedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SignedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Consents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Consents_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Consents_BookingHolds_BookingHoldId",
                        column: x => x.BookingHoldId,
                        principalTable: "BookingHolds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Consents_IntakeSubmissions_IntakeSubmissionId",
                        column: x => x.IntakeSubmissionId,
                        principalTable: "IntakeSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Consents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Consents_VisitorSessions_VisitorSessionId",
                        column: x => x.VisitorSessionId,
                        principalTable: "VisitorSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProviderReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    PublicReviewerLabel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Status = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    IsRatingIncludedInAggregate = table.Column<bool>(type: "boolean", nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    HiddenAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    HiddenByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    HideReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RemovedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderReviews_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderReviews_ProviderProfiles_ProviderProfileId",
                        column: x => x.ProviderProfileId,
                        principalTable: "ProviderProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderReviews_Users_HiddenByUserId",
                        column: x => x.HiddenByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderReviews_Users_PatientUserId",
                        column: x => x.PatientUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_CognitoSubject",
                table: "Users",
                column: "CognitoSubject",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Phone",
                table: "Users",
                column: "Phone");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderProfiles_IntroVideoDocumentId",
                table: "ProviderProfiles",
                column: "IntroVideoDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderProfiles_ProfilePhotoDocumentId",
                table: "ProviderProfiles",
                column: "ProfilePhotoDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderProfiles_ProviderApplicationId",
                table: "ProviderProfiles",
                column: "ProviderApplicationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderProfiles_UserId",
                table: "ProviderProfiles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_BookingHoldId",
                table: "Appointments",
                column: "BookingHoldId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_IntakeSubmissionId",
                table: "Appointments",
                column: "IntakeSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientUserId_StartsAtUtc",
                table: "Appointments",
                columns: new[] { "PatientUserId", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ProviderProfileId_StartsAtUtc",
                table: "Appointments",
                columns: new[] { "ProviderProfileId", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_SlotId",
                table: "Appointments",
                column: "SlotId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorUserId",
                table: "AuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityType_EntityId_OccurredAtUtc",
                table: "AuditLogs",
                columns: new[] { "EntityType", "EntityId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_ExpiresAtUtc",
                table: "BookingHolds",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_IntakeSubmissionId",
                table: "BookingHolds",
                column: "IntakeSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_ProviderProfileId",
                table: "BookingHolds",
                column: "ProviderProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_SlotId_Status",
                table: "BookingHolds",
                columns: new[] { "SlotId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_UserId",
                table: "BookingHolds",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_VisitorSessionId",
                table: "BookingHolds",
                column: "VisitorSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Consents_AppointmentId",
                table: "Consents",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Consents_BookingHoldId",
                table: "Consents",
                column: "BookingHoldId");

            migrationBuilder.CreateIndex(
                name: "IX_Consents_IntakeSubmissionId",
                table: "Consents",
                column: "IntakeSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Consents_UserId",
                table: "Consents",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Consents_VisitorSessionId",
                table: "Consents",
                column: "VisitorSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeAnswers_QuestionId",
                table: "IntakeAnswers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeAnswers_SubmissionId_QuestionKey",
                table: "IntakeAnswers",
                columns: new[] { "SubmissionId", "QuestionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IntakeFormDefinitions_SubmissionKind_Status_Version",
                table: "IntakeFormDefinitions",
                columns: new[] { "SubmissionKind", "Status", "Version" });

            migrationBuilder.CreateIndex(
                name: "IX_IntakeFormSections_FormDefinitionId_SectionKey",
                table: "IntakeFormSections",
                columns: new[] { "FormDefinitionId", "SectionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IntakeQuestionOptions_QuestionId_OptionKey",
                table: "IntakeQuestionOptions",
                columns: new[] { "QuestionId", "OptionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IntakeQuestions_SectionId_QuestionKey",
                table: "IntakeQuestions",
                columns: new[] { "SectionId", "QuestionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IntakeSubmissions_FormDefinitionId",
                table: "IntakeSubmissions",
                column: "FormDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeSubmissions_SubmissionKind_Status",
                table: "IntakeSubmissions",
                columns: new[] { "SubmissionKind", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_IntakeSubmissions_UserId",
                table: "IntakeSubmissions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_IntakeSubmissions_VisitorSessionId",
                table: "IntakeSubmissions",
                column: "VisitorSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderApplicationTaxonomyTerms_ProviderApplicationId_Term~",
                table: "ProviderApplicationTaxonomyTerms",
                columns: new[] { "ProviderApplicationId", "TermId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderApplicationTaxonomyTerms_ReviewedByUserId",
                table: "ProviderApplicationTaxonomyTerms",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderApplicationTaxonomyTerms_TermId",
                table: "ProviderApplicationTaxonomyTerms",
                column: "TermId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilitySlots_ProviderProfileId_StartsAtUtc",
                table: "ProviderAvailabilitySlots",
                columns: new[] { "ProviderProfileId", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilitySlots_Status",
                table: "ProviderAvailabilitySlots",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCredentials_DocumentId",
                table: "ProviderCredentials",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCredentials_ProviderApplicationId",
                table: "ProviderCredentials",
                column: "ProviderApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCredentials_VerifiedByUserId",
                table: "ProviderCredentials",
                column: "VerifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderDocuments_ProviderApplicationId_Category_Status",
                table: "ProviderDocuments",
                columns: new[] { "ProviderApplicationId", "Category", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderDocuments_ReplacedByDocumentId",
                table: "ProviderDocuments",
                column: "ReplacedByDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderDocuments_ReviewedByUserId",
                table: "ProviderDocuments",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderDocuments_UploadedByUserId",
                table: "ProviderDocuments",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderOnboardingApplications_ReviewedByUserId",
                table: "ProviderOnboardingApplications",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderOnboardingApplications_UserId_Status",
                table: "ProviderOnboardingApplications",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderPayoutDetails_ProviderApplicationId",
                table: "ProviderPayoutDetails",
                column: "ProviderApplicationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderPayoutDetails_VerifiedByUserId",
                table: "ProviderPayoutDetails",
                column: "VerifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderReviews_AppointmentId",
                table: "ProviderReviews",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderReviews_HiddenByUserId",
                table: "ProviderReviews",
                column: "HiddenByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderReviews_PatientUserId",
                table: "ProviderReviews",
                column: "PatientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderReviews_ProviderProfileId_Status",
                table: "ProviderReviews",
                columns: new[] { "ProviderProfileId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderTaxonomyTerms_Category_TermKey",
                table: "ProviderTaxonomyTerms",
                columns: new[] { "Category", "TermKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_UserId_Role_IsActive",
                table: "UserRoles",
                columns: new[] { "UserId", "Role", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderProfiles_ProviderDocuments_IntroVideoDocumentId",
                table: "ProviderProfiles",
                column: "IntroVideoDocumentId",
                principalTable: "ProviderDocuments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderProfiles_ProviderDocuments_ProfilePhotoDocumentId",
                table: "ProviderProfiles",
                column: "ProfilePhotoDocumentId",
                principalTable: "ProviderDocuments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderProfiles_ProviderOnboardingApplications_ProviderApp~",
                table: "ProviderProfiles",
                column: "ProviderApplicationId",
                principalTable: "ProviderOnboardingApplications",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderProfiles_Users_UserId",
                table: "ProviderProfiles",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProviderProfiles_ProviderDocuments_IntroVideoDocumentId",
                table: "ProviderProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_ProviderProfiles_ProviderDocuments_ProfilePhotoDocumentId",
                table: "ProviderProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_ProviderProfiles_ProviderOnboardingApplications_ProviderApp~",
                table: "ProviderProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_ProviderProfiles_Users_UserId",
                table: "ProviderProfiles");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "Consents");

            migrationBuilder.DropTable(
                name: "IntakeAnswers");

            migrationBuilder.DropTable(
                name: "IntakeQuestionOptions");

            migrationBuilder.DropTable(
                name: "ProviderApplicationTaxonomyTerms");

            migrationBuilder.DropTable(
                name: "ProviderCredentials");

            migrationBuilder.DropTable(
                name: "ProviderPayoutDetails");

            migrationBuilder.DropTable(
                name: "ProviderReviews");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "IntakeQuestions");

            migrationBuilder.DropTable(
                name: "ProviderTaxonomyTerms");

            migrationBuilder.DropTable(
                name: "ProviderDocuments");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "IntakeFormSections");

            migrationBuilder.DropTable(
                name: "ProviderOnboardingApplications");

            migrationBuilder.DropTable(
                name: "BookingHolds");

            migrationBuilder.DropTable(
                name: "IntakeSubmissions");

            migrationBuilder.DropTable(
                name: "ProviderAvailabilitySlots");

            migrationBuilder.DropTable(
                name: "IntakeFormDefinitions");

            migrationBuilder.DropIndex(
                name: "IX_Users_CognitoSubject",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_Phone",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_ProviderProfiles_IntroVideoDocumentId",
                table: "ProviderProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ProviderProfiles_ProfilePhotoDocumentId",
                table: "ProviderProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ProviderProfiles_ProviderApplicationId",
                table: "ProviderProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ProviderProfiles_UserId",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "AccountStatus",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CognitoSubject",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLoginAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Bio",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "CredentialsSummary",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "IntroVideoDocumentId",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "LanguagesJson",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "ProfessionalTitle",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoDocumentId",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "ProviderApplicationId",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "PublishedAtUtc",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "RatingAverage",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "ReviewCount",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "TherapyApproach",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "UnpublishedAtUtc",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "VisibilityStatus",
                table: "ProviderProfiles");

            migrationBuilder.DropColumn(
                name: "YearsExperience",
                table: "ProviderProfiles");
        }
    }
}
