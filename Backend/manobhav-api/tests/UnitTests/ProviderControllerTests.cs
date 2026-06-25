using System.Security.Claims;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.Controllers;

namespace UnitTests;

public sealed class ProviderControllerTests
{
    private const string Subject = "provider-subject";

    [Fact]
    public async Task GetDashboard_WithProfileAndAppointments_ReturnsProfileNameMetricsAndTodayPatient()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db, name: "Login Name");
        var profile = await AddProfileAsync(db, user.Id, displayName: "Dr. Asha Rao", published: true);
        var patient = await AddPatientAsync(db, "Riya Patient");

        var now = DateTimeOffset.UtcNow;
        var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        db.Appointments.Add(ScheduledAppointment(profile.Id, patient.Id, todayStart.AddHours(10)));
        db.Appointments.Add(CompletedAppointment(profile.Id, patient.Id, now.AddDays(-3)));
        db.Appointments.Add(ScheduledAppointment(profile.Id, patient.Id, now.AddDays(2)));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.GetDashboard(CancellationToken.None);

        var dto = AssertOkDashboard(result);
        Assert.Equal("Provider", dto.Provider.Status);
        Assert.Equal("Dr. Asha Rao", dto.Provider.Name);
        Assert.True(dto.Provider.ProfilePublished);
        Assert.Equal("DR", dto.Provider.AvatarInitials);
        Assert.Equal(1, dto.Metrics.SessionsTotal);
        Assert.Equal(2, dto.Metrics.UpcomingCount);
        var todayAppointment = Assert.Single(dto.TodayAppointments);
        Assert.Equal("Riya Patient", todayAppointment.PatientName);
        Assert.Equal(7, dto.WeekCalendar.Count);
        Assert.True(dto.WeekCalendar[0].IsToday);
        Assert.Equal(0, dto.Notifications.UnreadCount);
    }

    [Fact]
    public async Task GetDashboard_PatientNameFallsBackWhenPatientHasNoName()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db, name: "Login Name");
        var profile = await AddProfileAsync(db, user.Id, displayName: "Dr. Asha Rao", published: false);
        var patient = await AddPatientAsync(db, name: null);
        var now = DateTimeOffset.UtcNow;
        var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        db.Appointments.Add(ScheduledAppointment(profile.Id, patient.Id, todayStart.AddHours(9)));
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = AssertOkDashboard(await controller.GetDashboard(CancellationToken.None));
        Assert.False(dto.Provider.ProfilePublished);
        Assert.Equal("Patient", Assert.Single(dto.TodayAppointments).PatientName);
    }

    [Fact]
    public async Task GetDashboard_ApplicantWithoutProfile_ReturnsEmptyDashboardWithApplicationName()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db, name: "Login Name");
        db.ProviderOnboardingApplications.Add(new ProviderOnboardingApplication
        {
            UserId = user.Id,
            Status = "Submitted",
            BasicProfileJson = """{"displayName":"Applicant Asha"}"""
        });
        db.UserRoles.Add(new UserRole { UserId = user.Id, Role = "ProviderApplicant" });
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = AssertOkDashboard(await controller.GetDashboard(CancellationToken.None));
        Assert.Equal("ProviderApplicant", dto.Provider.Status);
        Assert.Equal("Applicant Asha", dto.Provider.Name);
        Assert.False(dto.Provider.ProfilePublished);
        Assert.Empty(dto.TodayAppointments);
        Assert.Empty(dto.UpcomingAppointments);
        Assert.Equal(0, dto.Metrics.SessionsTotal);
        Assert.Equal(0, dto.Metrics.SessionsThisWeek);
        Assert.Equal(0, dto.Metrics.UpcomingCount);
        Assert.Equal(7, dto.WeekCalendar.Count);
    }

    [Fact]
    public async Task GetDashboard_ApplicantWithoutApplicationName_FallsBackToUser()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db, name: "Login Name", displayName: "Display User");
        db.UserRoles.Add(new UserRole { UserId = user.Id, Role = "ProviderApplicant" });
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var dto = AssertOkDashboard(await controller.GetDashboard(CancellationToken.None));
        Assert.Equal("ProviderApplicant", dto.Provider.Status);
        Assert.Equal("Display User", dto.Provider.Name);
    }

    [Fact]
    public async Task GetDashboard_AuthenticatedUserWithNoProfileApplicationOrRole_ReturnsPendingProfile()
    {
        await using var db = CreateDbContext();
        await AddUserAsync(db, name: "Solo Login");
        var controller = CreateController(db);

        var dto = AssertOkDashboard(await controller.GetDashboard(CancellationToken.None));
        Assert.Equal("PendingProfile", dto.Provider.Status);
        Assert.Equal("Solo Login", dto.Provider.Name);
        Assert.Empty(dto.UpcomingAppointments);
        Assert.Equal(7, dto.WeekCalendar.Count);
    }

    [Fact]
    public async Task GetDashboard_NoLocalUser_ReturnsEmptyPendingProfileDashboard()
    {
        await using var db = CreateDbContext();
        var controller = CreateController(db);

        var dto = AssertOkDashboard(await controller.GetDashboard(CancellationToken.None));
        Assert.Equal("PendingProfile", dto.Provider.Status);
        Assert.Equal("Provider", dto.Provider.Name);
        Assert.Empty(dto.TodayAppointments);
        Assert.Equal(0, dto.Metrics.UpcomingCount);
        Assert.Equal(7, dto.WeekCalendar.Count);
    }

    private static ProviderDashboardDto AssertOkDashboard(ActionResult<ProviderDashboardDto> result)
    {
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<ProviderDashboardDto>(ok.Value);
    }

    private static ProviderController CreateController(ApplicationDbContext db)
    {
        return new ProviderController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim("sub", Subject),
                        new Claim("email", "provider@example.com")
                    ], "TestAuth"))
                }
            }
        };
    }

    private static async Task<User> AddUserAsync(ApplicationDbContext db, string? name, string? displayName = null)
    {
        var user = new User
        {
            CognitoSubject = Subject,
            Email = "provider@example.com",
            Name = name,
            DisplayName = displayName
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<User> AddPatientAsync(ApplicationDbContext db, string? name)
    {
        var patient = new User
        {
            CognitoSubject = $"patient-{Guid.NewGuid():N}",
            Email = "patient@example.com",
            Name = name
        };
        db.Users.Add(patient);
        await db.SaveChangesAsync();
        return patient;
    }

    private static async Task<ProviderProfile> AddProfileAsync(
        ApplicationDbContext db,
        Guid userId,
        string displayName,
        bool published)
    {
        var profile = new ProviderProfile
        {
            UserId = userId,
            Name = "Legal Name",
            DisplayName = displayName,
            ProfessionalTitle = "Clinical Psychologist",
            Role = "Therapist",
            AvatarColor = "#123456",
            VisibilityStatus = published ? "Published" : "Hidden",
            IsActive = true
        };
        db.ProviderProfiles.Add(profile);
        await db.SaveChangesAsync();
        return profile;
    }

    private static Appointment ScheduledAppointment(Guid profileId, Guid patientId, DateTimeOffset startsAt)
    {
        return new Appointment
        {
            ProviderProfileId = profileId,
            PatientUserId = patientId,
            StartsAtUtc = startsAt,
            EndsAtUtc = startsAt.AddMinutes(60),
            Status = "Scheduled"
        };
    }

    private static Appointment CompletedAppointment(Guid profileId, Guid patientId, DateTimeOffset startsAt)
    {
        return new Appointment
        {
            ProviderProfileId = profileId,
            PatientUserId = patientId,
            StartsAtUtc = startsAt,
            EndsAtUtc = startsAt.AddMinutes(60),
            Status = "Completed",
            CompletedAtUtc = startsAt.AddMinutes(60)
        };
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }
}
