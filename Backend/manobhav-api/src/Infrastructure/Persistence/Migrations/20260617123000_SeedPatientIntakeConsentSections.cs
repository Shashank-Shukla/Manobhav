using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260617123000_SeedPatientIntakeConsentSections")]
public partial class SeedPatientIntakeConsentSections : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            WITH active_form AS (
                SELECT "Id"
                FROM "IntakeFormDefinitions"
                WHERE "SubmissionKind" = 'PatientIntake'
                  AND "Status" = 'Active'
                ORDER BY "Version" DESC
                LIMIT 1
            ),
            seed_sections("Id", "SectionKey", "Title", "Description", "DisplayOrder", "IsRequired") AS (
                VALUES
                    (
                        '22222222-2222-4222-8222-222222222225'::uuid,
                        'consent_policies_confidentiality',
                        'Consent, Policies & Confidentiality',
                        E'Confidentiality: All information shared in therapy is confidential except where required by law (harm to self/others, abuse, or court order).\nSession Duration and Fees: Each session lasts ~50 minutes. Fees are payable before the session only.\nReceipts provided upon request.\nCancellations and Missed Appointments: 24-hour notice required. Late cancellations or missed sessions may result in full fee.\nCommunication Policy: Non-crisis communication only (scheduling, admin). Therapy discussions reserved for sessions.\nSocial Media and Boundaries: No personal or social media contact to maintain professionalism.\nRecord Keeping: Notes are securely stored and confidential.\nTermination of Therapy: May be mutually agreed or client-initiated; referrals provided if needed.',
                        5,
                        TRUE
                    ),
                    (
                        '22222222-2222-4222-8222-222222222226'::uuid,
                        'emergency_disclaimer',
                        'Crisis and Emergency Support',
                        E'Manobhav is not an emergency service.\nIf you are at immediate risk or may harm yourself or someone else, contact local emergency services or a crisis helpline right away.\nIn India, you can call emergency services at 112. You may also contact crisis helplines:\nAASRA: +91-9820466726\nVandrevala Foundation: 1860 266 2345 / 9999 666 555\nSnehi: +91-9582208181\nOngoing therapy can support safety planning and continued care, but it cannot replace urgent crisis care.',
                        6,
                        TRUE
                    ),
                    (
                        '22222222-2222-4222-8222-222222222227'::uuid,
                        'consent_to_therapy',
                        'Consent to Therapy',
                        'I have read and agree to the above terms and consent to therapy with Manobhav.',
                        7,
                        TRUE
                    )
            )
            INSERT INTO "IntakeFormSections" (
                "Id",
                "FormDefinitionId",
                "SectionKey",
                "Title",
                "Description",
                "DisplayOrder",
                "IsRequired"
            )
            SELECT
                seed_sections."Id",
                active_form."Id",
                seed_sections."SectionKey",
                seed_sections."Title",
                seed_sections."Description",
                seed_sections."DisplayOrder",
                seed_sections."IsRequired"
            FROM active_form
            CROSS JOIN seed_sections
            WHERE NOT EXISTS (
                SELECT 1
                FROM "IntakeFormSections" existing
                WHERE existing."FormDefinitionId" = active_form."Id"
                  AND existing."SectionKey" = seed_sections."SectionKey"
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DELETE FROM "IntakeFormSections"
            WHERE "SectionKey" IN (
                'consent_policies_confidentiality',
                'emergency_disclaimer',
                'consent_to_therapy'
            )
            AND "FormDefinitionId" IN (
                SELECT "Id"
                FROM "IntakeFormDefinitions"
                WHERE "SubmissionKind" = 'PatientIntake'
            );
            """);
    }
}
