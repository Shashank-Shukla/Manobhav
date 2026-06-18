using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailOtpRateLimitBuckets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmailOtpRateLimitBuckets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Flow = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    WindowStartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    WindowSendCount = table.Column<int>(type: "integer", nullable: false),
                    LastReservedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailOtpRateLimitBuckets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailOtpRateLimitBuckets_Email_Flow",
                table: "EmailOtpRateLimitBuckets",
                columns: new[] { "Email", "Flow" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailOtpRateLimitBuckets_UpdatedAtUtc",
                table: "EmailOtpRateLimitBuckets",
                column: "UpdatedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailOtpRateLimitBuckets");
        }
    }
}
