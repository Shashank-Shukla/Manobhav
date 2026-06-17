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

    [Fact]
    public void ProviderTaxonomySeedMigration_SeedsCustomerFrameworkTerms()
    {
        var migrationType = typeof(SeedPatientIntakeForm).Assembly
            .GetTypes()
            .SingleOrDefault(type => type.Name == "SeedProviderTaxonomyTerms");
        Assert.NotNull(migrationType);
        var migration = Assert.IsAssignableFrom<Migration>(Activator.CreateInstance(migrationType!));
        var builder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        InvokeMigrationStep(migration, "Up", builder);

        var sql = Assert.Single(builder.Operations.OfType<SqlOperation>()).Sql;
        Assert.Contains("\"ProviderTaxonomyTerms\"", sql);
        Assert.Contains("'specializations'", sql);
        Assert.Contains("'therapyApproaches'", sql);
        Assert.Contains("'languages'", sql);
        Assert.Contains("'Anxiety'", sql);
        Assert.Contains("'Sexual abuse / Emotional abuse'", sql);
        Assert.Contains("'CBT - Cognitive Behavioral Therapy'", sql);
        Assert.Contains("'LGBTQ+ affirmative therapy'", sql);
        Assert.Contains("'Tamil'", sql);
        Assert.Contains("'Santali'", sql);
        Assert.DoesNotContain("ProviderProfiles", sql);
        Assert.DoesNotContain("ProviderOnboardingApplications", sql);
    }

    [Fact]
    public void PatientIntakeConsentSeedMigration_SeedsCustomerIntakeSectionsFiveThroughSeven()
    {
        var migrationType = typeof(SeedPatientIntakeForm).Assembly
            .GetTypes()
            .SingleOrDefault(type => type.Name == "SeedPatientIntakeConsentSections");
        Assert.NotNull(migrationType);
        var migration = Assert.IsAssignableFrom<Migration>(Activator.CreateInstance(migrationType!));
        var builder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        InvokeMigrationStep(migration, "Up", builder);

        var sql = Assert.Single(builder.Operations.OfType<SqlOperation>()).Sql;
        Assert.Contains("'consent_policies_confidentiality'", sql);
        Assert.Contains("'emergency_disclaimer'", sql);
        Assert.Contains("'consent_to_therapy'", sql);
        Assert.Contains("Confidentiality: All information shared in therapy is confidential", sql);
        Assert.Contains("Crisis and Emergency Support", sql);
        Assert.Contains("Manobhav is not an emergency service", sql);
        Assert.Contains("contact local emergency services or a crisis helpline right away", sql);
        Assert.Contains("therapy can support safety planning", sql);
        Assert.Contains("cannot replace urgent crisis care", sql);
        Assert.Contains("AASRA: +91-9820466726", sql);
        Assert.Contains("I have read and agree to the above terms and consent to therapy with Manobhav.", sql);
        Assert.Contains("\"DisplayOrder\"", sql);
        Assert.DoesNotContain("ProviderProfiles", sql);
        Assert.DoesNotContain("ProviderOnboardingApplications", sql);
    }

    [Fact]
    public void ProviderTaxonomySeedMigration_PreservesExistingTermsOnConflict()
    {
        var migrationType = typeof(SeedPatientIntakeForm).Assembly
            .GetTypes()
            .SingleOrDefault(type => type.Name == "SeedProviderTaxonomyTerms");
        Assert.NotNull(migrationType);
        var migration = Assert.IsAssignableFrom<Migration>(Activator.CreateInstance(migrationType!));
        var builder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        InvokeMigrationStep(migration, "Up", builder);

        var sql = Assert.Single(builder.Operations.OfType<SqlOperation>()).Sql;
        Assert.Contains("ON CONFLICT (\"Category\", \"TermKey\") DO NOTHING", sql);
        Assert.DoesNotContain("DO UPDATE SET", sql);
        Assert.DoesNotContain("\"IsActive\" = TRUE", sql);
    }

    private static void InvokeMigrationStep(Migration migration, string methodName, MigrationBuilder builder)
    {
        var method = migration.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException($"Migration method '{methodName}' was not found.");

        method.Invoke(migration, [builder]);
    }
}
