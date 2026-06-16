using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVisitorAnalytics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VisitorSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LandingPath = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Referrer = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    DeviceInfo = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    NetworkInfo = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    UtmSource = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    UtmMedium = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    UtmCampaign = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: true),
                    LinkedUserSubject = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    LinkedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitorSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VisitorEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitorSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Route = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    TargetKey = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    PropertiesJson = table.Column<string>(type: "character varying(4096)", maxLength: 4096, nullable: false),
                    ClientTimestampUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitorEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VisitorEvents_VisitorSessions_VisitorSessionId",
                        column: x => x.VisitorSessionId,
                        principalTable: "VisitorSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_VisitorEvents_VisitorSessionId_CreatedAtUtc",
                table: "VisitorEvents",
                columns: new[] { "VisitorSessionId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_VisitorSessions_CreatedAtUtc",
                table: "VisitorSessions",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_VisitorSessions_LinkedUserSubject",
                table: "VisitorSessions",
                column: "LinkedUserSubject");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "VisitorEvents");

            migrationBuilder.DropTable(
                name: "VisitorSessions");
        }
    }
}
