-- ============================================================================
-- One-off hard delete of the leftover TEST provider "dfgdf" from production.
--
-- Why this is a script and not run by the agent: reading the production database
-- connection string from AWS SSM is gated, and a hard delete against prod is
-- irreversible, so this is delivered for a human (or the agent, once granted DB
-- access) to run deliberately.
--
-- This is a genuine HARD delete, used ONLY because "dfgdf" is throwaway test data
-- that reached prod. The product's normal policy is SOFT delete (see
-- AdminProviderController.Reject / SoftDeleteProviderAsync) — do NOT use this on
-- real providers.
--
-- Identifiers are EF Core defaults (quoted PascalCase, e.g. "ProviderProfiles").
--
-- HOW TO RUN (psql or any SQL client), with a safety net:
--   1. Run the PREVIEW block first and confirm it shows exactly one test provider
--      with 0 real activity (0 appointments / holds / reviews).
--   2. Run the transaction block. It prints NOTICEs and leaves you in an open
--      transaction; verify the counts, then COMMIT (or ROLLBACK to abort).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PREVIEW (read-only) — confirm the target before deleting.
-- ----------------------------------------------------------------------------
SELECT
    pp."Id"                    AS profile_id,
    pp."Name",
    pp."DisplayName",
    pp."VisibilityStatus",
    pp."ProviderApplicationId" AS application_id,
    pp."UserId"               AS user_id,
    (SELECT count(*) FROM "Appointments"  a WHERE a."ProviderProfileId" = pp."Id") AS appointments,
    (SELECT count(*) FROM "BookingHolds"  h WHERE h."ProviderProfileId" = pp."Id") AS holds,
    (SELECT count(*) FROM "ProviderReviews" r WHERE r."ProviderProfileId" = pp."Id") AS reviews
FROM "ProviderProfiles" pp
WHERE pp."Name" = 'dfgdf' OR pp."DisplayName" = 'dfgdf';

-- ----------------------------------------------------------------------------
-- DELETE (transactional) — review NOTICEs, then COMMIT or ROLLBACK.
-- ----------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
    v_profile_id     uuid;
    v_application_id uuid;
    v_user_id        uuid;
BEGIN
    SELECT pp."Id", pp."ProviderApplicationId", pp."UserId"
      INTO v_profile_id, v_application_id, v_user_id
    FROM "ProviderProfiles" pp
    WHERE pp."Name" = 'dfgdf' OR pp."DisplayName" = 'dfgdf'
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        RAISE NOTICE 'No provider profile named dfgdf found; nothing to delete.';
        RETURN;
    END IF;

    RAISE NOTICE 'Deleting provider profile %, application %, user %.',
        v_profile_id, v_application_id, v_user_id;

    -- Consents reference appointments/holds (and the user) — clear them first.
    DELETE FROM "Consents"
     WHERE "AppointmentId" IN (SELECT "Id" FROM "Appointments" WHERE "ProviderProfileId" = v_profile_id)
        OR "BookingHoldId" IN (SELECT "Id" FROM "BookingHolds" WHERE "ProviderProfileId" = v_profile_id)
        OR (v_user_id IS NOT NULL AND "UserId" = v_user_id);

    -- Rows that reference the profile with ON DELETE RESTRICT must go before it.
    DELETE FROM "ProviderReviews"          WHERE "ProviderProfileId" = v_profile_id;
    DELETE FROM "Appointments"             WHERE "ProviderProfileId" = v_profile_id;
    DELETE FROM "BookingHolds"             WHERE "ProviderProfileId" = v_profile_id;
    -- These two cascade from the profile, but delete explicitly for clarity.
    DELETE FROM "ProviderAvailabilitySlots" WHERE "ProviderProfileId" = v_profile_id;
    DELETE FROM "ProviderAvailabilities"    WHERE "ProviderProfileId" = v_profile_id;

    -- The profile references the onboarding application and its documents with
    -- RESTRICT, so it must be deleted before the application (whose delete cascades
    -- documents, credentials, payout details, taxonomy terms and section reviews).
    DELETE FROM "ProviderProfiles" WHERE "Id" = v_profile_id;

    IF v_application_id IS NOT NULL THEN
        DELETE FROM "ProviderOnboardingApplications" WHERE "Id" = v_application_id;
    END IF;

    IF v_user_id IS NOT NULL THEN
        DELETE FROM "UserRoles" WHERE "UserId" = v_user_id;

        -- Remove the user account only when nothing else depends on it (a test
        -- provider shouldn't, but never orphan-delete a user with real activity).
        IF NOT EXISTS (SELECT 1 FROM "Appointments"     WHERE "PatientUserId" = v_user_id)
           AND NOT EXISTS (SELECT 1 FROM "IntakeSubmissions" WHERE "UserId" = v_user_id) THEN
            DELETE FROM "Users" WHERE "Id" = v_user_id;
            RAISE NOTICE 'Deleted user account %.', v_user_id;
        ELSE
            RAISE NOTICE 'User % retained: it still has patient appointments or intake submissions.', v_user_id;
        END IF;
    END IF;

    RAISE NOTICE 'dfgdf cleanup complete.';
END $$;

-- Verify (all should return 0), then finish the transaction:
SELECT count(*) AS remaining_dfgdf_profiles
FROM "ProviderProfiles" WHERE "Name" = 'dfgdf' OR "DisplayName" = 'dfgdf';

-- COMMIT;   -- uncomment to apply
-- ROLLBACK; -- uncomment to abort
