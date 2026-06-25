using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WebApi.Controllers;
using WebApi.Notifications;
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
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), clock);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("Person@Example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal("We believe you've already registered with us, you might want to try Signing in.", details.Title);
    }

    [Fact]
    public async Task SignUpRequest_StoresPlatformOtpAndDoesNotCallCognito()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var sender = new RecordingOtpEmailSender();
        var controller = CreateController(db, cognito, sender, clock);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("Person@Example.com", "sign-up"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<EmailOtpAuthResponse>(ok.Value);
        Assert.Equal("person@example.com", response.Email);
        Assert.Equal("sign-up", response.Flow);
        Assert.NotEqual(Guid.Empty, response.ChallengeId);
        Assert.Equal(FixedNow.AddMinutes(1), response.ResendAvailableAtUtc);
        Assert.Equal(2, response.SendsRemainingThisHour);
        Assert.Equal(0, cognito.SignUpRequestCount);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        var challenge = Assert.Single(db.EmailOtpChallenges);
        Assert.Equal(response.ChallengeId, challenge.Id);
        Assert.Equal("person@example.com", challenge.Email);
        Assert.Equal("sign-up", challenge.Flow);
        Assert.NotEqual("123456", challenge.OtpHash);
        Assert.False(string.IsNullOrWhiteSpace(challenge.OtpSalt));
        Assert.Null(challenge.ProviderSession);
        var sent = Assert.Single(sender.Sent);
        Assert.Equal("person@example.com", sent.Email);
        Assert.Equal("123456", sent.Otp);
    }

    [Fact]
    public async Task SignUpVerify_WithWrongOtp_DoesNotCreateCognitoUser()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var sender = new RecordingOtpEmailSender();
        var controller = CreateController(db, cognito, sender, clock);
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "999999"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpVerify_WithValidOtp_CreatesCognitoUserAndReturnsSignInChallenge()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var sender = new RecordingOtpEmailSender();
        var controller = CreateController(db, cognito, sender, clock);
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<EmailOtpVerifyResponse>(ok.Value);
        Assert.Equal("sign-in-otp-required", response.Status);
        Assert.Null(response.Session);
        Assert.NotNull(response.Challenge);
        Assert.Equal("sign-in", response.Challenge!.Flow);
        Assert.Equal("person@example.com", response.Challenge.Email);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(1, cognito.SignInChallengeRequestCount);
        Assert.Equal("person@example.com", cognito.CreatedUsers.Single());
        Assert.Equal("person@example.com", cognito.SignInChallenges.Single().Email);
        Assert.DoesNotContain(controller.Response.Headers.SetCookie, value => value?.StartsWith("mbv_auth=", StringComparison.Ordinal) == true);
    }

    [Fact]
    public async Task RequestEmailOtp_RejectsSecondSendWithinMinute()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var controller = CreateController(db, new RecordingCognitoEmailOtpAuth(), new RecordingOtpEmailSender(), clock);

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
        var controller = CreateController(db, new RecordingCognitoEmailOtpAuth(), new RecordingOtpEmailSender(), clock);

        for (var i = 0; i < 3; i += 1)
        {
            clock.UtcNow = FixedNow.AddMinutes(i);
            Assert.IsType<OkObjectResult>(
                await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        }

        clock.UtcNow = FixedNow.AddMinutes(3);
        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal(FixedNow.AddHours(1), details.Extensions["resendAvailableAtUtc"]);
        Assert.Equal(3420, details.Extensions["retryAfterSeconds"]);
        Assert.Equal(0, details.Extensions["sendsRemainingThisHour"]);
    }

    [Fact]
    public async Task SignUpRequest_WhenReservationFails_DoesNotSendEmail()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var sender = new RecordingOtpEmailSender();
        var limiter = new RejectingEmailOtpRateLimiter(FixedNow.AddMinutes(1), 60, 2);
        var controller = CreateController(db, new RecordingCognitoEmailOtpAuth(), sender, clock, limiter);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        Assert.Empty(sender.Sent);
        Assert.Empty(db.EmailOtpChallenges);
    }

    [Fact]
    public async Task SignInRequest_WhenReservationFails_DoesNotCallCognitoChallenge()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var limiter = new RejectingEmailOtpRateLimiter(FixedNow.AddMinutes(1), 60, 2);
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), clock, limiter);

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        Assert.Empty(db.EmailOtpChallenges);
    }

    [Fact]
    public async Task SignUpVerify_WhenFollowUpSignInQuotaExhausted_DoesNotCallCognitoChallengeAndReturnsRateLimit()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var limiter = new FlowAwareEmailOtpRateLimiter(
            new EmailOtpRateLimitReservation(FixedNow.AddMinutes(1), 60, 2),
            new EmailOtpRateLimitException("Too many OTP requests. Please wait before requesting another code.", FixedNow.AddMinutes(4), 180, 0));
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), clock, limiter);
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.StatusCode);
        Assert.Equal("180", controller.Response.Headers.RetryAfter.ToString());
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal(FixedNow.AddMinutes(4), details.Extensions["resendAvailableAtUtc"]);
        Assert.Equal(180, details.Extensions["retryAfterSeconds"]);
        Assert.Equal(0, details.Extensions["sendsRemainingThisHour"]);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpVerify_AfterMaxFailedAttempts_DoesNotCreateCognitoUser()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), clock, new NonLimitingEmailOtpRateLimiter());
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        for (var i = 0; i < 5; i += 1)
        {
            var failed = await controller.VerifyEmailOtp(
                new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "999999"),
                CancellationToken.None);
            var failedProblem = Assert.IsType<ObjectResult>(failed.Result);
            Assert.Equal(StatusCodes.Status400BadRequest, failedProblem.StatusCode);
        }

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Equal(0, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpVerify_WithOtpHashedByDifferentSecret_DoesNotCreateCognitoUser()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        await using (var requestDb = database.CreateDbContext())
        {
            var requestController = CreateController(
                requestDb,
                cognito,
                new RecordingOtpEmailSender(),
                clock,
                new NonLimitingEmailOtpRateLimiter(),
                "request-secret");
            var requestResult = Assert.IsType<OkObjectResult>(
                await requestController.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
            var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

            await using var verifyDb = database.CreateDbContext();
            var verifyController = CreateController(
                verifyDb,
                cognito,
                new RecordingOtpEmailSender(),
                clock,
                new NonLimitingEmailOtpRateLimiter(),
                "different-secret");

            var result = await verifyController.VerifyEmailOtp(
                new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
                CancellationToken.None);

            var problem = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
            Assert.Equal(0, cognito.CreateUserRequestCount);
            Assert.Equal(0, cognito.SignInChallengeRequestCount);
        }
    }

    [Fact]
    public async Task SignUpVerify_WhenFollowUpCognitoChallengeFailsAfterUserCreate_DeletesUserAndInvalidatesFollowUpChallenge()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnRequestSignInOtpAsync = _ => throw new CognitoEmailOtpException("Cognito did not start an email OTP challenge.");
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), clock, new NonLimitingEmailOtpRateLimiter());
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(["person@example.com"], cognito.DeletedUsers);
        var signInChallenge = Assert.Single(db.EmailOtpChallenges, challenge => challenge.Flow == "sign-in");
        Assert.NotNull(signInChallenge.InvalidatedAtUtc);
        Assert.Equal("cognito-sign-in-challenge-failed", signInChallenge.InvalidationReason);
        Assert.Equal("failed", signInChallenge.ExternalSendStatus);
        Assert.Null(signInChallenge.ProviderSession);
        Assert.Null(db.EmailOtpChallenges.Single(challenge => challenge.Flow == "sign-up").VerifiedAtUtc);
    }

    [Fact]
    public async Task SignUpVerify_WhenCognitoDuplicateAfterFollowUpChallengeSaved_InvalidatesFollowUpChallengeAndReturnsConflict()
    {
        await using var db = CreateDbContext();
        var clock = new MutableClock(FixedNow);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnCreateUserAsync = _ => throw new CognitoEmailOtpException("User already exists.", "UsernameExistsException");
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), clock, new NonLimitingEmailOtpRateLimiter());
        var requestResult = Assert.IsType<OkObjectResult>(
            await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
        var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", request.ChallengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(0, cognito.SignInChallengeRequestCount);
        var signInChallenge = Assert.Single(db.EmailOtpChallenges, challenge => challenge.Flow == "sign-in");
        Assert.NotNull(signInChallenge.InvalidatedAtUtc);
        Assert.Equal("cognito-duplicate-user", signInChallenge.InvalidationReason);
        Assert.Equal("failed", signInChallenge.ExternalSendStatus);
        var signUpChallenge = Assert.Single(db.EmailOtpChallenges, challenge => challenge.Flow == "sign-up");
        Assert.Null(signUpChallenge.VerifiedAtUtc);
        Assert.Null(signUpChallenge.VerificationLockToken);
        Assert.Null(signUpChallenge.VerificationLockedUntilUtc);
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
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter());

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
    public async Task SignUpVerify_WhenMarkVerifiedLosesLock_CompensatesAndDoesNotReturnSignInChallenge()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        Guid signUpChallengeId;
        await using (var setupDb = database.CreateDbContext())
        {
            var setupController = CreateController(
                setupDb,
                new RecordingCognitoEmailOtpAuth(),
                new RecordingOtpEmailSender(),
                new MutableClock(FixedNow),
                new NonLimitingEmailOtpRateLimiter());
            var requestResult = Assert.IsType<OkObjectResult>(
                await setupController.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
            var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);
            signUpChallengeId = request.ChallengeId;
        }

        await using var db = database.CreateDbContext();
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnRequestSignInOtpAsync = async _ =>
        {
            await using var verificationDb = database.CreateDbContext();
            await verificationDb.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "EmailOtpChallenges"
                SET "VerificationLockToken" = {"newer-owner"},
                    "VerificationLockedUntilUtc" = {FixedNow.AddMinutes(3)}
                WHERE "Id" = {signUpChallengeId}
                """);
        };
        var controller = CreateController(db, cognito, new RecordingOtpEmailSender(), new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter());

        var result = await controller.VerifyEmailOtp(
            new EmailOtpVerifyRequest("person@example.com", "sign-up", signUpChallengeId, "123456"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(["person@example.com"], cognito.DeletedUsers);
        db.ChangeTracker.Clear();
        var signInChallenge = Assert.Single(db.EmailOtpChallenges, challenge => challenge.Flow == "sign-in");
        Assert.NotNull(signInChallenge.InvalidatedAtUtc);
        Assert.Equal("sign-up-mark-verified-failed", signInChallenge.InvalidationReason);
        Assert.Equal("failed", signInChallenge.ExternalSendStatus);
        Assert.Equal("cognito-session", signInChallenge.ProviderSession);
        var signUpChallenge = Assert.Single(db.EmailOtpChallenges, challenge => challenge.Flow == "sign-up");
        Assert.Null(signUpChallenge.VerifiedAtUtc);
        Assert.Equal("newer-owner", signUpChallenge.VerificationLockToken);
        Assert.Equal(FixedNow.AddMinutes(3), signUpChallenge.VerificationLockedUntilUtc);
    }

    [Fact]
    public async Task SignUpVerify_WhenStaleVerifierClearsLock_DoesNotClearNewerOwnerLock()
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
            new RecordingOtpEmailSender(),
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
    public async Task SignUpRequest_SavesChallengeBeforeSendingEmail()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        await using var db = database.CreateDbContext();
        var sender = new RecordingOtpEmailSender();
        sender.OnSendAsync = async email =>
        {
            await using var verificationDb = database.CreateDbContext();
            var saved = await verificationDb.EmailOtpChallenges
                .CountAsync(challenge => challenge.Email == email && challenge.Flow == "sign-up");
            Assert.Equal(1, saved);
        };
        var controller = CreateController(
            db,
            new RecordingCognitoEmailOtpAuth(),
            sender,
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        Assert.Single(sender.Sent);
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
            new RecordingOtpEmailSender(),
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        var result = await controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpRequest_WhenInitialChallengeSaveFails_DoesNotSendEmail()
    {
        await using var db = CreateDbContext(failEmailOtpChallengeInserts: true);
        var sender = new RecordingOtpEmailSender();
        var controller = CreateController(
            db,
            new RecordingCognitoEmailOtpAuth(),
            sender,
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));

        Assert.Empty(sender.Sent);
    }

    [Fact]
    public async Task SignInRequest_WhenInitialChallengeSaveFails_DoesNotStartCognitoChallenge()
    {
        await using var db = CreateDbContext(failEmailOtpChallengeInserts: true);
        var cognito = new RecordingCognitoEmailOtpAuth();
        var controller = CreateController(
            db,
            cognito,
            new RecordingOtpEmailSender(),
            new MutableClock(FixedNow),
            new NonLimitingEmailOtpRateLimiter());

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            controller.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-in"), CancellationToken.None));

        Assert.Equal(0, cognito.SignInChallengeRequestCount);
    }

    [Fact]
    public async Task SignUpVerify_WhenConcurrentValidOtpReplay_OnlyOneCreatesCognitoUser()
    {
        await using var database = await SqliteAuthDatabase.CreateAsync();
        await using (var setupDb = database.CreateDbContext())
        {
            var setupController = CreateController(
                setupDb,
                new RecordingCognitoEmailOtpAuth(),
                new RecordingOtpEmailSender(),
                new MutableClock(FixedNow),
                new NonLimitingEmailOtpRateLimiter());
            var requestResult = Assert.IsType<OkObjectResult>(
                await setupController.RequestEmailOtp(new EmailOtpAuthRequest("person@example.com", "sign-up"), CancellationToken.None));
            var request = Assert.IsType<EmailOtpAuthResponse>(requestResult.Value);
            await RunConcurrentSignUpVerifyReplayAsync(database, request.ChallengeId);
        }
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

        await RunConcurrentSignInVerifyReplayAsync(database, challengeId);
    }

    private static AuthController CreateController(
        ApplicationDbContext db,
        RecordingCognitoEmailOtpAuth cognito,
        RecordingOtpEmailSender sender,
        MutableClock clock,
        IEmailOtpRateLimiter? limiter = null,
        string emailOtpHmacSecret = "unit-test-email-otp-hmac-secret")
    {
        var service = CreateEmailOtpService(db, cognito, sender, clock, limiter, emailOtpHmacSecret);
        return new AuthController(new StubCognitoTokenExchange(), new AuthCookieManager(CreateAuthOptions(emailOtpHmacSecret)), service)
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
        RecordingOtpEmailSender sender,
        MutableClock clock,
        IEmailOtpRateLimiter? limiter = null,
        string emailOtpHmacSecret = "unit-test-email-otp-hmac-secret")
    {
        var options = CreateAuthOptions(emailOtpHmacSecret);
        return new EmailOtpAuthService(
            db,
            cognito,
            sender,
            Options.Create(options),
            clock,
            NullLogger<EmailOtpAuthService>.Instance,
            new FixedOtpCodeGenerator(),
            limiter ?? new EmailOtpRateLimiter(db, NullLogger<EmailOtpRateLimiter>.Instance));
    }

    private static AuthOptions CreateAuthOptions(string emailOtpHmacSecret)
    {
        var options = new AuthOptions
        {
            Enabled = true,
            Audience = "client-id",
            CognitoAuthority = "https://issuer.example.com",
            CognitoDomain = "https://cognito.example.com",
            UserPoolId = "pool-id",
            OtpEmailFromAddress = "no-reply@example.com",
            EmailOtpHmacSecret = emailOtpHmacSecret
        };
        return options;
    }

    private static async Task RunConcurrentSignUpVerifyReplayAsync(SqliteAuthDatabase database, Guid challengeId)
    {
        var firstCreateStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondCreateStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseFirstCreate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var cognito = new RecordingCognitoEmailOtpAuth();
        cognito.OnCreateUserAsync = async count =>
        {
            if (count == 1)
            {
                firstCreateStarted.SetResult();
                await releaseFirstCreate.Task;
            }
            else
            {
                secondCreateStarted.SetResult();
            }
        };

        await using var firstDb = database.CreateDbContext();
        await using var secondDb = database.CreateDbContext();
        var first = CreateController(firstDb, cognito, new RecordingOtpEmailSender(), new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter())
            .VerifyEmailOtp(new EmailOtpVerifyRequest("person@example.com", "sign-up", challengeId, "123456"), CancellationToken.None);
        await firstCreateStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var second = CreateController(secondDb, cognito, new RecordingOtpEmailSender(), new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter())
            .VerifyEmailOtp(new EmailOtpVerifyRequest("person@example.com", "sign-up", challengeId, "123456"), CancellationToken.None);

        var secondCompletedOrReplayed = await Task.WhenAny(second, secondCreateStarted.Task).WaitAsync(TimeSpan.FromSeconds(5));
        releaseFirstCreate.SetResult();
        await Task.WhenAll(first, second);

        Assert.NotSame(secondCreateStarted.Task, secondCompletedOrReplayed);
        Assert.Equal(1, cognito.CreateUserRequestCount);
        Assert.Equal(1, cognito.SignInChallengeRequestCount);
    }

    private static async Task RunConcurrentSignInVerifyReplayAsync(SqliteAuthDatabase database, Guid challengeId)
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
        var first = CreateController(firstDb, cognito, new RecordingOtpEmailSender(), new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter())
            .VerifyEmailOtp(new EmailOtpVerifyRequest("person@example.com", "sign-in", challengeId, "123456"), CancellationToken.None);
        await firstVerifyStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var second = CreateController(secondDb, cognito, new RecordingOtpEmailSender(), new MutableClock(FixedNow), new NonLimitingEmailOtpRateLimiter())
            .VerifyEmailOtp(new EmailOtpVerifyRequest("person@example.com", "sign-in", challengeId, "123456"), CancellationToken.None);

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
        public int SignUpRequestCount { get; private set; }
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
            VerifiedSignInChallenges.Add((email, session));
            if (OnVerifySignInOtpAsync is not null)
            {
                await OnVerifySignInOtpAsync(VerifiedSignInChallenges.Count);
            }

            return new CognitoTokenSet("header.eyJjb2duaXRvOmdyb3VwcyI6WyJQYXRpZW50Il19.signature", null, null, 900);
        }

        public Task<string?> GetUserEmailAsync(string username, CancellationToken cancellationToken)
        {
            return Task.FromResult<string?>(null);
        }
    }

    private sealed class RecordingOtpEmailSender : IEmailOtpSender
    {
        public List<(string Email, string Otp)> Sent { get; } = [];
        public Func<string, Task>? OnSendAsync { get; set; }

        public async Task SendOtpAsync(string email, string otp, CancellationToken cancellationToken)
        {
            Sent.Add((email, otp));
            if (OnSendAsync is not null)
            {
                await OnSendAsync(email);
            }
        }
    }

    private sealed class FixedOtpCodeGenerator : IEmailOtpCodeGenerator
    {
        public string Generate()
        {
            return "123456";
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

    private sealed class FlowAwareEmailOtpRateLimiter(
        EmailOtpRateLimitReservation signUpReservation,
        EmailOtpRateLimitException signInException) : IEmailOtpRateLimiter
    {
        public Task<EmailOtpRateLimitReservation> ReserveAsync(string email, string flow, DateTimeOffset now, CancellationToken cancellationToken)
        {
            if (flow == "sign-in")
            {
                throw signInException;
            }

            return Task.FromResult(signUpReservation);
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
