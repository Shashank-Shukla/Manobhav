using System.Reflection;
using Infrastructure.Persistence.Migrations;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

namespace UnitTests;

public sealed class PatientIntakeSeedMigrationTests
{
    [Fact]
    public void SeedMigration_CreatesActivePatientIntakeFormWithoutProviderData()
    {
        var migration = new SeedPatientIntakeForm();
        var builder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        InvokeMigrationStep(migration, "Up", builder);

        var sql = Assert.Single(builder.Operations.OfType<SqlOperation>()).Sql;
        Assert.Contains("'PatientIntake'", sql);
        Assert.Contains("'Active'", sql);
        Assert.Contains("'therapy_goal_primary'", sql);
        Assert.Contains("'visit_reason_source'", sql);
        Assert.Contains("'medical_history_support'", sql);
        Assert.DoesNotContain("ProviderProfiles", sql);
        Assert.DoesNotContain("ProviderOnboardingApplications", sql);
    }

    private static void InvokeMigrationStep(Migration migration, string methodName, MigrationBuilder builder)
    {
        var method = migration.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException($"Migration method '{methodName}' was not found.");

        method.Invoke(migration, [builder]);
    }
}
