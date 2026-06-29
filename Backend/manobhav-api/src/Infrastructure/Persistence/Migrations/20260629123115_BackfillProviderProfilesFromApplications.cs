using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillProviderProfilesFromApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Backfill provider profiles that were materialized before the onboarding details were
            // copied onto them (their cards render blank on the public directory). Mirrors
            // ProviderProfileMaterializer using Postgres jsonb operators. Idempotent: only rows whose
            // target fields are still empty/default are touched, and array fields are type-guarded.
            migrationBuilder.Sql("""
                UPDATE "ProviderProfiles" AS p
                SET
                    "Summary" = COALESCE(LEFT(a."BioJson" #>> '{bio,shortBio}', 512), p."Summary"),
                    "LongDescription" = COALESCE(LEFT(a."BioJson" #>> '{bio,longBio}', 2000), p."LongDescription"),
                    "Bio" = LEFT(a."BioJson" #>> '{bio,longBio}', 2000),
                    "LanguagesJson" = COALESCE(
                        CASE WHEN jsonb_typeof(a."BioJson" #> '{bio,languages}') = 'array'
                             THEN a."BioJson" #> '{bio,languages}' END,
                        p."LanguagesJson"),
                    "SpecializationsJson" = COALESCE(
                        CASE WHEN jsonb_typeof(a."BioJson" #> '{specializations,focusAreas}') = 'array'
                             THEN a."BioJson" #> '{specializations,focusAreas}' END,
                        p."SpecializationsJson"),
                    "WeeklyAvailabilityJson" = COALESCE(
                        CASE WHEN jsonb_typeof(a."SessionDetailsJson" #> '{sessionDetails,availabilitySlots}') = 'array'
                             THEN a."SessionDetailsJson" #> '{sessionDetails,availabilitySlots}' END,
                        p."WeeklyAvailabilityJson")
                FROM "ProviderOnboardingApplications" AS a
                WHERE p."ProviderApplicationId" = a."Id"
                  AND (
                        p."Summary" = ''
                        OR p."SpecializationsJson" = '[]'::jsonb
                        OR p."WeeklyAvailabilityJson" = '[]'::jsonb
                      );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // One-time data backfill; nothing to revert (no schema change).
        }
    }
}
