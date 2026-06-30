using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DefaultProviderRatingAndTitleCaseNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "RatingAverage",
                table: "ProviderProfiles",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 5m,
                oldClrType: typeof(decimal),
                oldType: "numeric(3,2)",
                oldPrecision: 3,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "Rating",
                table: "ProviderProfiles",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 5m,
                oldClrType: typeof(decimal),
                oldType: "numeric(3,2)",
                oldPrecision: 3,
                oldScale: 2);

            // Backfill existing providers. Default the rating to 5 stars wherever there are no real
            // reviews yet (the new column default only applies to future inserts), and store names in
            // title case. Postgres initcap() matches the app's NameFormatter ("abcd xyz" -> "Abcd Xyz");
            // the equality guards keep these idempotent and avoid needless audit churn.
            migrationBuilder.Sql(
                """
                UPDATE "ProviderProfiles"
                SET "Rating" = 5, "RatingAverage" = 5
                WHERE "ReviewCount" = 0 AND ("Rating" <> 5 OR "RatingAverage" <> 5);
                """);

            migrationBuilder.Sql(
                """
                UPDATE "ProviderProfiles"
                SET "Name" = initcap("Name")
                WHERE "Name" IS NOT NULL AND "Name" <> '' AND "Name" <> initcap("Name");
                """);

            migrationBuilder.Sql(
                """
                UPDATE "ProviderProfiles"
                SET "DisplayName" = initcap("DisplayName")
                WHERE "DisplayName" IS NOT NULL AND "DisplayName" <> '' AND "DisplayName" <> initcap("DisplayName");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "RatingAverage",
                table: "ProviderProfiles",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(3,2)",
                oldPrecision: 3,
                oldScale: 2,
                oldDefaultValue: 5m);

            migrationBuilder.AlterColumn<decimal>(
                name: "Rating",
                table: "ProviderProfiles",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(3,2)",
                oldPrecision: 3,
                oldScale: 2,
                oldDefaultValue: 5m);
        }
    }
}
