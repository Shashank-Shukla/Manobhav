using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WebApi.Controllers;
using WebApi.Security;

namespace UnitTests;

public sealed class EmailOtpAuthFlowTests
{
    private static readonly DateTimeOffset FixedNow = DateTimeOffset.Parse("2026-06-19T10:00:00Z");

    [Fact]
    public async Task SignUpRequest_WhenCognitoAccountExists_ReturnsConflictWithFriendlyMessage()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth { ExistingUsers = { "person@example.com" } };
        var controller = CreateController(db, cognito, clock);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("Person@Example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal("We believe you've already registered with us, you might want to try Signing in.", details.Title);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        Assert.Empty(db.EmailOtpChallenges);
    }

    [Fact]
    public async Task SignUpRequest_CreatesCognitoUserAndRequestsSingleSignInOtp()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var controller = CreateController(db, cognito, clock);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("Person@Example.com", "sign-up"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<EmailOtpAuthResponse>(ok.Value);
        Assert.Equal("person@example.com", response.Email);
        Assert.Equal("sign-up", response.Flow);
        Assert.NotEqual(Guid.Empty, response.ChallengeId);
        Assert.Equal(FixedNow.AddMinutes(1), response.ResendAvailableAtUtc);
        Assert.Equal(2, response.SendsRemainingThisHour);
        // User is created and a single Cognito EMAIL_OTP challenge is started at request time.
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal("person@example.com", cognito.CreatedUsers.Single());
        Assert.Equal(1, cognito.SignInChallengeRequestCount);
        Assert.Equal("person@example.com", cognito.SignInChallenges.Single().Email);
        var challenge = Assert.Single(db.EmailOtpChallenges);
        Assert.Equal(response.ChallengeId, challenge.Id);
        Assert.Equal("person@example.com", challenge.Email);
        Assert.Equal("sign-up", challenge.Flow);
        // No platform OTP hashing happens any more.
        Assert.Null(challenge.OtpHash);
        Assert.Null(challenge.OtpSalt);
        // The Cognito session is stored so verify can respond to the challenge.
        Assert.Equal("cognito-session", challenge.ProviderSession);
        Assert.Equal("sent", challenge.ExternalSendStatus);
    }

    [Fact]
    public async Task SignUpVerify_WithValidOtp_ReturnsAuthenticatedAndSetsAuthCookie()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var controller = CreateController(db, cognito, clock);
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);
        // User creation happened at the REQUEST step, not at verify.
        Assert.Equal(1, cognito.CreateUserRequestCount);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<EmailOtpVerifyResponse>(ok.Value);
        Assert.Equal("authenticated", response.Status);
        Assert.NotNull(response.Session);
        Assert.Null(response.Challenge);
        Assert.Single(cognito.VerifiedSignInChallenges);
        Assert.Equal("person@example.com", cognito.VerifiedSignInChallenges.Single().Email);
        // No second user creation at verify.
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Contains(controller.Response.Headers.SetCookie, value => value?.StartsWith("mbv_auth=", StringComparison.Ordinal) == true);
        db.ChangeTracker.Clear();
        var challenge = await db.EmailOtpChallenges.SingleAsync(item => item.Id == request.ChallengeId);
        Assert.NotNull(challenge.VerifiedAtUtc);
    }

    [Fact]
    public async Task SignUpVerify_WithWrongOtp_FailsAndDoesNotSetAuthCookie()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnVerifySignInOtpAsync = _ => throw new CognitoEmailOtpException("Incorrect username or password.", "NotAuthorizedException");
        var controller = CreateController(db, cognito, clock);
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "999999"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.DoesNotContain(controller.Response.Headers.SetCookie, value => value?.StartsWith("mbv_auth=", StringComparison.Ordinal) == true);
        // User creation happened once at request; verify failure does not create another user.
        Assert.Equal(1, cognito.CreateUserRequestCount);
        db.ChangeTracker.Clear();
        var challenge = await db.EmailOtpChallenges.SingleAsync(item => item.Id == request.ChallengeId);
        Assert.Null(challenge.VerifiedAtUtc);
        // Lock is cleared so the user can retry with the same challenge.
        Assert.Null(challenge.VerificationLockToken);
    }

    [Fact]
    public async Task SignUpRequest_WhenCognitoCreateReportsDuplicate_ReturnsConflictAndReleasesReservation()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnCreateUserAsync = _ => throw new CognitoEmailOtpException("User already exists.", "UsernameExistsException");
        var controller = CreateController(db, cognito, clock);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal("We believe you've already registered with us, you might want to try Signing in.", details.Title);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        Assert.Empty(db.EmailOtpChallenges);
    }

    [Fact]
    public async Task SignUpRequest_WhenCognitoChallengeFailsAfterUserCreate_DeletesUserAndInvalidatesChallenge()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnRequestSignInOtpAsync = _ => throw new CognitoEmailOtpException("Cognito did not start an email OTP challenge.");
        var controller = CreateController(db, cognito, clock, new NonLimitingEmailOtpRateLimiter());

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(["person@example.com"], cognito.DeletedUsers);
        var challenge = Assert.Single(db.EmailOtpChallenges);
        Assert.Equal("sign-up", challenge.Flow);
        Assert.NotNull(challenge.InvalidatedAtUtc);
        Assert.Equal("cognito-challenge-failed", challenge.InvalidationReason);
        Assert.Equal("failed", challenge.ExternalSendStatus);
        Assert.Null(challenge.ProviderSession);
    }

    [Fact]
    public async Task RequestEmailOtp_RejectsSecondSendWithinMinute()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var controller = CreateController(db, new RecordingCognitoEmailOtpAuth(), clock);

        Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        clock.UtcNow = FixedNow.AddSeconds(20);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        Assert.Equal("40", controller.Response.Headers.RetryAfter.ToString());
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal(FixedNow.AddMinutes(1), details.Extensions["resendAvailableAtUtc"]);
        Assert.Equal(40, details.Extensions["retryAfterSeconds"]);
        Assert.Equal(2, details.Extensions["sendsRemainingThisHour"]);
    }

    [Fact]
    public async Task RequestEmailOtp_RejectsFourthSendWithinHour()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var controller = CreateController(db, new RecordingCognitoEmailOtpAuth(), clock);

        for (var i = 0; i < 3; i += 1)
        {
            clock.UtcNow = FixedNow.AddMinutes(i);
            Assert.IsType<OkObjectResult>(
                await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None));
        }

        clock.UtcNow = FixedNow.AddMinutes(3);
        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal(FixedNow.AddHours(1), details.Extensions["resendAvailableAtUtc"]);
        Assert.Equal(3420, details.Extensions["retryAfterSeconds"]);
        Assert.Equal(0, details.Extensions["sendsRemainingThisHour"]);
    }

    [Fact]
    public async Task SignUpRequest_WhenReservationFails_DoesNotCreateUserOrCallCognitoChallenge()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var limiter = new RejectingEmailOtpRateLimiter(FixedNow.AddMinutes(1), 60, 2);
        var controller = CreateController(db, cognito, clock, limiter);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        Assert.Empty(db.EmailOtpChallenges);
    }

    [Fact]
    public async Task SignInRequest_WhenReservationFails_DoesNotCallCognitoChallenge()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var limiter = new RejectingEmailOtpRateLimiter(FixedNow.AddMinutes(1), 60, 2);
        var controller = CreateController(db, cognito, clock, limiter);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        Assert.Empty(db.EmailOtpChallenges);
    }

    [Fact]
    public async Task SignInVerify_WhenMarkVerifiedLosesLock_DoesNotAuthenticate()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        var challengeId = Guid.NewGuid();
        await using (var setupDb = database.CreateDbContext())
        {
            setupDb.EmailOtpChallenges.Add(new Domain.Entities.EmailOtpChallenge
            {
                Id = challengeId,
                Email = "person@example.com",
                Flow = "sign-in",
                ProviderSession = "provider-session",
                CreatedAtUtc = FixedNow,
                LastSentAtUtc = FixedNow,
                ExpiresAtUtc = FixedNow.AddMinutes(10)
            });
            await setupDb.SaveChangesAsync();
        }

        await using var db = database.CreateDbContext();
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnVerifySignInOtpAsync = async _ =>
        {
            await using var verificationDb = database.CreateDbContext();
            await verificationDb.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "EmailOtpChallenges"
                SET "VerificationLockToken" = {"newer-owner"},
                    "VerificationLockedUntilUtc" = {FixedNow.AddMinutes(3)}
                WHERE "Id" = {challengeId}
                """);
        };
        var controller = CreateController(db, cognito, new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter());

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-in", challengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.DoesNotContain(controller.Response.Headers.SetCookie, value => value?.StartsWith("mbv_auth=", StringComparison.Ordinal) == true);
        db.ChangeTracker.Clear();
        var challenge = await db.EmailOtpChallenges.SingleAsync(item => item.Id == challengeId);
        Assert.Null(challenge.VerifiedAtUtc);
        Assert.Equal("newer-owner", challenge.VerificationLockToken);
        Assert.Equal(FixedNow.AddMinutes(3), challenge.VerificationLockedUntilUtc);
        Assert.Single(cognito.VerifiedSignInChallenges);
    }

    [Fact]
    public async Task SignUpVerify_WhenMarkVerifiedLosesLock_DoesNotAuthenticate()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        Guid signUpChallengeId;
        await using (var setupDb = database.CreateDbContext())
        {
            var setupController = CreateController(
                setupDb,
                new RecordingCognitoEmailOtpAuth(),
                new MutableClock(FixedNow),
                new NonLimitingEmailOtpRateLimiter());
            var requestResult = Assert.IsType<OkObjectResult>(
                await setupController.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
            var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);
            signUpChallengeId = request.ChallengeId;
        }

        await using var db = database.CreateDbContext();
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnVerifySignInOtpAsync = async _ =>
        {
            await using var verificationDb = database.CreateDbContext();
            await verificationDb.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "EmailOtpChallenges"
                SET "VerificationLockToken" = {"newer-owner"},
                    "VerificationLockedUntilUtc" = {FixedNow.AddMinutes(3)}
                WHERE "Id" = {signUpChallengeId}
                """);
        };
        var controller = CreateController(db, cognito, new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter());

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", signUpChallengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.DoesNotContain(controller.Response.Headers.SetCookie, value => value?.StartsWith("mbv_auth=", StringComparison.Ordinal) == true);
        Assert.Single(cognito.VerifiedSignInChallenges);
        db.ChangeTracker.Clear();
        var challenge = await db.EmailOtpChallenges.SingleAsync(item => item.Id == signUpChallengeId);
        Assert.Null(challenge.VerifiedAtUtc);
        Assert.Equal("newer-owner", challenge.VerificationLockToken);
        Assert.Equal(FixedNow.AddMinutes(3), challenge.VerificationLockedUntilUtc);
    }

    [Fact]
    public async Task Verify_WhenStaleVerifierClearsLock_DoesNotClearNewerOwnerLock()
    {
        await using var db = CreateDbContext();
        var challenge = new Domain.Entities.EmailOtpChallenge
        {
            Id = Guid.NewGuid(),
            Email = "person@example.com",
            Flow = "sign-up",
            CreatedAtUtc = FixedNow,
            LastSentAtUtc = FixedNow,
            ExpiresAtUtc = FixedNow.AddMinutes(10),
            VerificationLockedUntilUtc = FixedNow.AddMinutes(3),
            VerificationLockToken = "newer-owner"
        };
        db.EmailOtpChallenges.Add(challenge);
        await db.SaveChangesAsync();
        var service = CreateEmailOtpService(
            db,
            new RecordingCognitoEmailOtpAuth(),
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());
        var clearMethod = typeof(EmailOtpAuthService).GetMethod(
            "ClearChallengeLockAsync",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic,
            binder: null,
            types: [typeof(Guid), typeof(string), typeof(string), typeof(string), typeof(CancellationToken)],
            modifiers: null);
        Assert.NotNull(clearMethod);

        var clearTask = (Task)clearMethod.Invoke(
            service,
            [challenge.Id, challenge.Email, challenge.Flow, "stale-owner", CancellationToken.None])!;
        await clearTask;

        await db.Entry(challenge).ReloadAsync();
        Assert.Equal("newer-owner", challenge.VerificationLockToken);
        Assert.Equal(FixedNow.AddMinutes(3), challenge.VerificationLockedUntilUtc);
    }

    [Fact]
    public async Task SignUpRequest_SavesChallengeBeforeStartingCognitoChallenge()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        await using var db = database.CreateDbContext();
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnRequestSignInOtpAsync = async email =>
        {
            await using var verificationDb = database.CreateDbContext();
            var saved = await verificationDb.EmailOtpChallenges.CountAsync(challenge =>
                challenge.Email == email &&
                challenge.Flow == "sign-up" &&
                challenge.ProviderSession == null);
            Assert.Equal(1, saved);
        };
        var controller = CreateController(
            db,
            cognito,
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(1, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignInRequest_SavesPendingChallengeBeforeStartingCognitoChallenge()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        await using var db = database.CreateDbContext();
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnRequestSignInOtpAsync = async email =>
        {
            await using var verificationDb = database.CreateDbContext();
            var saved = await verificationDb.EmailOtpChallenges.CountAsync(challenge =>
                challenge.Email == email &&
                challenge.Flow == "sign-in" &&
                challenge.ProviderSession == null);
            Assert.Equal(1, saved);
        };
        var controller = CreateController(
            db,
            cognito,
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(1, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpRequest_WhenInitialChallengeSaveFails_DeletesCreatedUserAndDoesNotStartCognitoChallenge()
    {
        await using var db = CreateDbContext(failEmailOtpChallengeInserts: true);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var controller = CreateController(
            db,
            cognito,
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));

        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(["person@example.com"], cognito.DeletedUsers);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignInRequest_WhenInitialChallengeSaveFails_DoesNotStartCognitoChallenge()
    {
        await using var db = CreateDbContext(failEmailOtpChallengeInserts: true);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var controller = CreateController(
            db,
            cognito,
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None));

        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpVerify_WhenConcurrentReplay_OnlyOneCallsCognitoVerify()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        Guid challengeId;
        await using (var setupDb = database.CreateDbContext())
        {
            var setupController = CreateController(
                setupDb,
                new RecordingCognitoEmailOtpAuth(),
                new MutableClock(FixedNow),
                new NonLimitingEmailOtpRateLimiter());
            var requestResult = Assert.IsType<OkObjectResult>(
                await setupController.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
            var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);
            challengeId = request.ChallengeId;
        }

        await RunConcurrentVerifyReplayAsync(database, challengeId, "sign-up");
    }

    [Fact]
    public async Task SignInVerify_WhenConcurrentReplay_OnlyOneCallsCognitoVerify()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        var challengeId = Guid.NewGuid();
        await using (var setupDb = database.CreateDbContext())
        {
            setupDb.EmailOtpChallenges.Add(new Domain.Entities.EmailOtpChallenge
            {
                Id = challengeId,
                Email = "person@example.com",
                Flow = "sign-in",
                ProviderSession = "provider-session",
                CreatedAtUtc = FixedNow,
                LastSentAtUtc = FixedNow,
                ExpiresAtUtc = FixedNow.AddMinutes(10)
            });
            await setupDb.SaveChangesAsync();
        }

        await RunConcurrentVerifyReplayAsync(database, challengeId, "sign-in");
    }

    private static AuthController CreateController(
        ApplicationDbContext db,
        RecordingCognitoEmailOtpAuth cognito,
        MutableClock clock,
        IEmailOtpRateLimiter? limiter = null)
    {
        var service = CreateEmailOtpService(db, cognito, clock, limiter);
        return new AuthController(new StubCognitoTokenExchange(), new AuthCookieManager(CreateAuthOptions()), service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    private static EmailOtpAuthService CreateEmailOtpService(
        ApplicationDbContext db,
        RecordingCognitoEmailOtpAuth cognito,
        MutableClock clock,
        IEmailOtpRateLimiter? limiter = null)
    {
        var options = CreateAuthOptions();
        return new EmailOtpAuthService(
            db,
            cognito,
            Options.Create(options),
            clock,
            NullLogger<EmailOtpAuthService>.Instance,
            limiter ?? new EmailOtpRateLimiter(db, NullLogger<EmailOtpRateLimiter>.Instance));
    }

    private static AuthOptions CreateAuthOptions()
    {
        var options = new AuthOptions
        {
            Enabled = true,
            Audience = "client-id",
            CognitoAuthority = "https://issuer.example.com",
            CognitoDomain = "https://cognito.example.com",
            UserPoolId = "pool-id",
            OtpEmailFromAddress = "no-reply@example.com",
            EmailOtpHmacSecret = "unit-test-email-otp-hmac-secret"
        };
        return options;
    }

    private static async Task RunConcurrentVerifyReplayAsync(SqliteAuthDatabase database, Guid challengeId, string flow)
    {
        var firstVerifyStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondVerifyStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseFirstVerify = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnVerifySignInOtpAsync = async count =>
        {
            if (count == 1)
            {
                firstVerifyStarted.SetResult();
                await releaseFirstVerify.Task;
            }
            else
            {
                secondVerifyStarted.SetResult();
            }
        };

        await using var firstDb = database.CreateDbContext();
        await using var secondDb = database.CreateDbContext();
        var first = CreateController(firstDb, cognito, new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter())
            .VerifyEmailOtp(new EmailOtpVerifyRequest("person@example.com", flow, challengeId, "123456"), CancellationToken.None);
        await firstVerifyStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var second = CreateController(secondDb, cognito, new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter())
            .VerifyEmailOtp(new EmailOtpVerifyRequest("person@example.com", flow, challengeId, "123456"), CancellationToken.None);

        var secondCompletedOrReplayed = await Task.WhenAny(second, secondVerifyStarted.Task).WaitAsync(TimeSpan.FromSeconds(5));
        releaseFirstVerify.SetResult();
        await Task.WhenAll(first, second);

        Assert.NotSame(secondVerifyStarted.Task, secondCompletedOrReplayed);
        Assert.Single(cognito.VerifiedSignInChallenges);
    }

    private static ApplicationDbContext CreateDbContext(bool failEmailOtpChallengeInserts = false)
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;
        var db = new SqliteAuthTestDbContext(connection, options, failEmailOtpChallengeInserts);
        db.Database.EnsureCreated();
        return db;
    }

    private sealed class StubCognitoTokenExchange : ICognitoTokenExchange
    {
        public Task<CognitoTokenSet> ExchangeCodeAsync(AuthCallbackRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new CognitoTokenSet("access-token", null, null, 900));
        }
    }

    private sealed class RecordingCognitoEmailOtpAuth : ICognitoEmailOtpAuth
    {
        public HashSet<string> ExistingUsers { get; } = new(StringComparer.OrdinalIgnoreCase);
        public List<string> CreatedUsers { get; } = [];
        public List<string> DeletedUsers { get; } = [];
        public List<(string Email, string Session)> VerifiedSignInChallenges { get; } = [];
        public List<(string Email, string Session)> SignInChallenges { get; } = [];
        public Func<string, Task>? OnRequestSignInOtpAsync { get; set; }
        public Func<int, Task>? OnCreateUserAsync { get; set; }
        public Func<int, Task>? OnVerifySignInOtpAsync { get; set; }
        public int CreateUserRequestCount { get; private set; }
        public int SignInChallengeRequestCount { get; private set; }

        public Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken)
        {
            return Task.FromResult(ExistingUsers.Contains(email));
        }

        public Task CreatePasswordlessUserAsync(string email, CancellationToken cancellationToken)
        {
            CreateUserRequestCount += 1;
            CreatedUsers.Add(email);
            return OnCreateUserAsync?.Invoke(CreateUserRequestCount) ?? Task.CompletedTask;
        }

        public Task DeletePasswordlessUserAsync(string email, CancellationToken cancellationToken)
        {
            DeletedUsers.Add(email);
            return Task.CompletedTask;
        }

        public async Task<WebApi.Security.EmailOtpChallenge> RequestSignInOtpAsync(string email, CancellationToken cancellationToken)
        {
            SignInChallengeRequestCount += 1;
            SignInChallenges.Add((email, "cognito-session"));
            if (OnRequestSignInOtpAsync is not null)
            {
                await OnRequestSignInOtpAsync(email);
            }

            return new WebApi.Security.EmailOtpChallenge("cognito-session", "sign-in");
        }

        public async Task<CognitoTokenSet> VerifySignInOtpAsync(string email, string otp, string session, CancellationToken cancellationToken)
        {
            if (OnVerifySignInOtpAsync is not null)
            {
                await OnVerifySignInOtpAsync(VerifiedSignInChallenges.Count + 1);
            }

            VerifiedSignInChallenges.Add((email, session));
            return new CognitoTokenSet("header.eyJjb2duaXRvOmdyb3VwcyI6WyJQYXRpZW50Il19.signature", null, null, 900);
        }
    }

    private sealed class RejectingEmailOtpRateLimiter(
        DateTimeOffset resendAvailableAtUtc,
        int retryAfterSeconds,
        int sendsRemainingThisHour) : IEmailOtpRateLimiter
    {
        public Task<EmailOtpRateLimitReservation> ReserveAsync(string email, string flow, DateTimeOffset now, CancellationToken cancellationToken)
        {
            throw new EmailOtpRateLimitException(
                "Too many OTP requests. Please wait before requesting another code.",
                resendAvailableAtUtc,
                retryAfterSeconds,
                sendsRemainingThisHour);
        }

        public Task ReleaseAsync(EmailOtpRateLimitReservation reservation, DateTimeOffset now, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class NonLimitingEmailOtpRateLimiter : IEmailOtpRateLimiter
    {
        public Task<EmailOtpRateLimitReservation> ReserveAsync(string email, string flow, DateTimeOffset now, CancellationToken cancellationToken)
        {
            return Task.FromResult(new EmailOtpRateLimitReservation(now.AddMinutes(1), 60, 2));
        }

        public Task ReleaseAsync(EmailOtpRateLimitReservation reservation, DateTimeOffset now, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class MutableClock(DateTimeOffset utcNow) : ISystemClock
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;
    }

    private sealed class SqliteAuthTestDbContext(
        SqliteConnection connection,
        DbContextOptions<ApplicationDbContext> options,
        bool failEmailOtpChallengeInserts) : ApplicationDbContext(options)
    {
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (failEmailOtpChallengeInserts &&
                ChangeTracker.Entries<Domain.Entities.EmailOtpChallenge>().Any(entry => entry.State == EntityState.Added))
            {
                throw new DbUpdateException("Simulated email OTP challenge insert failure.");
            }

            return await base.SaveChangesAsync(cancellationToken);
        }

        public override async ValueTask DisposeAsync()
        {
            await base.DisposeAsync();
            await connection.DisposeAsync();
        }
    }

    private sealed class SqliteAuthDatabase : IAsyncDisposable
    {
        private readonly string _databasePath;
        private readonly DbContextOptions<ApplicationDbContext> _options;

        private SqliteAuthDatabase(string databasePath, DbContextOptions<ApplicationDbContext> options)
        {
            _databasePath = databasePath;
            _options = options;
        }

        public static async Task<SqliteAuthDatabase> CreateAsync()
        {
            var databasePath = Path.Combine(Path.GetTempPath(), $"manobhav-otp-auth-{Guid.NewGuid():N}.db");
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite($"Data Source={databasePath};Cache=Shared;Default Timeout=30;Pooling=False")
                .Options;
            await using var db = new ApplicationDbContext(options);
            await db.Database.EnsureCreatedAsync();
            return new SqliteAuthDatabase(databasePath, options);
        }

        public ApplicationDbContext CreateDbContext()
        {
            return new ApplicationDbContext(_options);
        }

        public async ValueTask DisposeAsync()
        {
            await Task.CompletedTask;
            SqliteConnection.ClearAllPools();
            if (File.Exists(_databasePath))
            {
                File.Delete(_databasePath);
            }
        }
    }
}
