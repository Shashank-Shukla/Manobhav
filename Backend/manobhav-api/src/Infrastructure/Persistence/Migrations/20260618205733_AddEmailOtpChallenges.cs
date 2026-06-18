using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailOtpChallenges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmailOtpChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Flow = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    OtpHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    OtpSalt = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ProviderSession = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSentAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    VerifiedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    VerificationLockedUntilUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    VerificationLockToken = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    InvalidatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    InvalidationReason = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    ExternalSendStatus = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ExternalSendFailure = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    FailedAttempts = table.Column<int>(type: "integer", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailOtpChallenges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailOtpChallenges_Email_Flow_CreatedAtUtc",
                table: "EmailOtpChallenges",
                columns: new[] { "Email", "Flow", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_EmailOtpChallenges_Email_Flow_VerificationLockedUntilUtc",
                table: "EmailOtpChallenges",
                columns: new[] { "Email", "Flow", "VerificationLockedUntilUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_EmailOtpChallenges_Email_Flow_InvalidatedAtUtc_ExpiresAtUtc",
                table: "EmailOtpChallenges",
                columns: new[] { "Email", "Flow", "InvalidatedAtUtc", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_EmailOtpChallenges_ExpiresAtUtc",
                table: "EmailOtpChallenges",
                column: "ExpiresAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailOtpChallenges");
        }
    }
}
