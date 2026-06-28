using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderWeeklyAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Postgres cannot implicitly cast varchar -> jsonb; the existing values are already valid
            // JSON arrays, so an explicit USING clause performs the conversion safely.
            migrationBuilder.Sql(
                "ALTER TABLE \"ProviderProfiles\" " +
                "ALTER COLUMN \"SpecializationsJson\" TYPE jsonb USING \"SpecializationsJson\"::jsonb, " +
                "ALTER COLUMN \"SpecializationsJson\" SET DEFAULT '[]'::jsonb;");

            migrationBuilder.AddColumn<string>(
                name: "WeeklyAvailabilityJson",
                table: "ProviderProfiles",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeeklyAvailabilityJson",
                table: "ProviderProfiles");

            migrationBuilder.Sql(
                "ALTER TABLE \"ProviderProfiles\" " +
                "ALTER COLUMN \"SpecializationsJson\" TYPE character varying(1024) USING \"SpecializationsJson\"::text, " +
                "ALTER COLUMN \"SpecializationsJson\" DROP DEFAULT;");
        }
    }
}
