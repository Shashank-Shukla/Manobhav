using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260617093000_SeedPatientIntakeForm")]
public partial class SeedPatientIntakeForm : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM "IntakeFormDefinitions"
                    WHERE "SubmissionKind" = 'PatientIntake'
                      AND "Status" = 'Active'
                ) THEN
                    INSERT INTO "IntakeFormDefinitions" (
                        "Id",
                        "SubmissionKind",
                        "Name",
                        "Version",
                        "Status",
                        "EffectiveFromUtc",
                        "EffectiveToUtc",
                        "CreatedAtUtc",
                        "CreatedByUserId"
                    ) VALUES (
                        '11111111-1111-4111-8111-111111111111',
                        'PatientIntake',
                        'Patient Intake',
                        1,
                        'Active',
                        TIMESTAMPTZ '2026-06-17 00:00:00+00',
                        NULL,
                        TIMESTAMPTZ '2026-06-17 00:00:00+00',
                        NULL
                    );

                    INSERT INTO "IntakeFormSections" (
                        "Id",
                        "FormDefinitionId",
                        "SectionKey",
                        "Title",
                        "Description",
                        "DisplayOrder",
                        "IsRequired"
                    ) VALUES
                        (
                            '22222222-2222-4222-8222-222222222221',
                            '11111111-1111-4111-8111-111111111111',
                            'therapy_goals',
                            'Therapy goals',
                            'Understand the visitor goals before matching.',
                            1,
                            TRUE
                        ),
                        (
                            '22222222-2222-4222-8222-222222222222',
                            '11111111-1111-4111-8111-111111111111',
                            'visit_reason',
                            'Referral and reason for visit',
                            'Capture how and why the visitor is seeking support.',
                            2,
                            TRUE
                        ),
                        (
                            '22222222-2222-4222-8222-222222222223',
                            '11111111-1111-4111-8111-111111111111',
                            'medical_history',
                            'Medical history',
                            'Capture optional background context with prefer-not-to-say support.',
                            3,
                            FALSE
                        );

                    INSERT INTO "IntakeQuestions" (
                        "Id",
                        "SectionId",
                        "QuestionKey",
                        "Prompt",
                        "HelpText",
                        "InputType",
                        "DisplayOrder",
                        "IsRequired",
                        "ValidationJson",
                        "Sensitivity"
                    ) VALUES
                        (
                            '33333333-3333-4333-8333-333333333331',
                            '22222222-2222-4222-8222-222222222221',
                            'therapy_goal_primary',
                            'What would you most like support with right now?',
                            NULL,
                            'SingleChoice',
                            1,
                            TRUE,
                            '{}'::jsonb,
                            'Personal'
                        ),
                        (
                            '33333333-3333-4333-8333-333333333332',
                            '22222222-2222-4222-8222-222222222221',
                            'therapy_goal_context',
                            'Tell us a little more about what you want help with.',
                            'Share only what feels comfortable.',
                            'Textarea',
                            2,
                            FALSE,
                            '{"maxLength":1200}'::jsonb,
                            'Personal'
                        ),
                        (
                            '33333333-3333-4333-8333-333333333333',
                            '22222222-2222-4222-8222-222222222222',
                            'visit_reason_source',
                            'What brought you to Manobhav today?',
                            NULL,
                            'SingleChoice',
                            3,
                            TRUE,
                            '{}'::jsonb,
                            'Standard'
                        ),
                        (
                            '33333333-3333-4333-8333-333333333334',
                            '22222222-2222-4222-8222-222222222222',
                            'visit_reason_urgency',
                            'How soon would you like to speak with someone?',
                            NULL,
                            'SingleChoice',
                            4,
                            TRUE,
                            '{}'::jsonb,
                            'Standard'
                        ),
                        (
                            '33333333-3333-4333-8333-333333333335',
                            '22222222-2222-4222-8222-222222222223',
                            'medical_history_support',
                            'Have you received mental health support before?',
                            NULL,
                            'SingleChoice',
                            5,
                            FALSE,
                            '{}'::jsonb,
                            'Sensitive'
                        ),
                        (
                            '33333333-3333-4333-8333-333333333336',
                            '22222222-2222-4222-8222-222222222223',
                            'medical_history_notes',
                            'Anything important you want your therapist to know before matching?',
                            'You can skip this or choose to share later.',
                            'Textarea',
                            6,
                            FALSE,
                            '{"maxLength":1500}'::jsonb,
                            'Sensitive'
                        );

                    INSERT INTO "IntakeQuestionOptions" (
                        "Id",
                        "QuestionId",
                        "OptionKey",
                        "Label",
                        "DisplayOrder",
                        "IsActive"
                    ) VALUES
                        (
                            '44444444-4444-4444-8444-444444444401',
                            '33333333-3333-4333-8333-333333333331',
                            'stress',
                            'Stress',
                            1,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444402',
                            '33333333-3333-4333-8333-333333333331',
                            'anxiety',
                            'Anxiety',
                            2,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444403',
                            '33333333-3333-4333-8333-333333333331',
                            'sleep',
                            'Sleep',
                            3,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444404',
                            '33333333-3333-4333-8333-333333333331',
                            'relationships',
                            'Relationships',
                            4,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444405',
                            '33333333-3333-4333-8333-333333333331',
                            'mood',
                            'Mood',
                            5,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444406',
                            '33333333-3333-4333-8333-333333333331',
                            'motivation',
                            'Motivation',
                            6,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444407',
                            '33333333-3333-4333-8333-333333333331',
                            'grief',
                            'Grief',
                            7,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444408',
                            '33333333-3333-4333-8333-333333333331',
                            'self_esteem',
                            'Self-esteem',
                            8,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444409',
                            '33333333-3333-4333-8333-333333333331',
                            'other',
                            'Something else',
                            9,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444410',
                            '33333333-3333-4333-8333-333333333333',
                            'self',
                            'I found Manobhav myself',
                            1,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444411',
                            '33333333-3333-4333-8333-333333333333',
                            'family_friend',
                            'Family or friend',
                            2,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444412',
                            '33333333-3333-4333-8333-333333333333',
                            'doctor',
                            'Doctor or healthcare professional',
                            3,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444413',
                            '33333333-3333-4333-8333-333333333333',
                            'workplace',
                            'Workplace or institution',
                            4,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444414',
                            '33333333-3333-4333-8333-333333333333',
                            'social_media',
                            'Social media',
                            5,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444415',
                            '33333333-3333-4333-8333-333333333333',
                            'other',
                            'Other',
                            6,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444416',
                            '33333333-3333-4333-8333-333333333334',
                            'today',
                            'Today',
                            1,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444417',
                            '33333333-3333-4333-8333-333333333334',
                            'this_week',
                            'This week',
                            2,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444418',
                            '33333333-3333-4333-8333-333333333334',
                            'next_week',
                            'Next week',
                            3,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444419',
                            '33333333-3333-4333-8333-333333333334',
                            'exploring',
                            'I am exploring options',
                            4,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444420',
                            '33333333-3333-4333-8333-333333333335',
                            'yes_currently',
                            'Yes, currently',
                            1,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444421',
                            '33333333-3333-4333-8333-333333333335',
                            'yes_past',
                            'Yes, in the past',
                            2,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444422',
                            '33333333-3333-4333-8333-333333333335',
                            'no',
                            'No',
                            3,
                            TRUE
                        ),
                        (
                            '44444444-4444-4444-8444-444444444423',
                            '33333333-3333-4333-8333-333333333335',
                            'prefer_not_to_say',
                            'Prefer not to say',
                            4,
                            TRUE
                        );
                END IF;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DELETE FROM "IntakeQuestionOptions"
            WHERE "QuestionId" IN (
                '33333333-3333-4333-8333-333333333331',
                '33333333-3333-4333-8333-333333333332',
                '33333333-3333-4333-8333-333333333333',
                '33333333-3333-4333-8333-333333333334',
                '33333333-3333-4333-8333-333333333335',
                '33333333-3333-4333-8333-333333333336'
            );

            DELETE FROM "IntakeQuestions"
            WHERE "Id" IN (
                '33333333-3333-4333-8333-333333333331',
                '33333333-3333-4333-8333-333333333332',
                '33333333-3333-4333-8333-333333333333',
                '33333333-3333-4333-8333-333333333334',
                '33333333-3333-4333-8333-333333333335',
                '33333333-3333-4333-8333-333333333336'
            );

            DELETE FROM "IntakeFormSections"
            WHERE "FormDefinitionId" = '11111111-1111-4111-8111-111111111111';

            DELETE FROM "IntakeFormDefinitions"
            WHERE "Id" = '11111111-1111-4111-8111-111111111111';
            """);
    }
}
