using Application.DTOs;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.Controllers;

namespace UnitTests;

public sealed class BookingControllerTests
{
    [Fact]
    public async Task GetProviderSlots_ReleasesExpiredHoldAndReturnsSlot()
    {
        await using var db = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var providerId = Guid.NewGuid();
        var slotId = Guid.NewGuid();
        var holdId = Guid.NewGuid();

        db.ProviderProfiles.Add(new ProviderProfile
        {
            Id = providerId,
            Name = "Dr. API",
            Role = "Therapist",
            Summary = "API backed provider",
            LongDescription = "API backed provider profile.",
            VisibilityStatus = "Published",
            IsActive = true
        });
        db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
        {
            Id = slotId,
            ProviderProfileId = providerId,
            StartsAtUtc = now.AddHours(1),
            EndsAtUtc = now.AddHours(2),
            Status = "Held"
        });
        db.BookingHolds.Add(new BookingHold
        {
            Id = holdId,
            ProviderProfileId = providerId,
            SlotId = slotId,
            IntakeSubmissionId = Guid.NewGuid(),
            Status = "Active",
            ExpiresAtUtc = now.AddMinutes(-1)
        });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var controller = CreateController(db);

        var result = await controller.GetProviderSlots(providerId, now.AddMinutes(-5), now.AddDays(1), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var slots = Assert.IsAssignableFrom<IReadOnlyList<ProviderSlotDto>>(ok.Value);
        var slot = Assert.Single(slots);
        Assert.Equal(slotId, slot.Id);

        Assert.Equal("Expired", (await db.BookingHolds.FindAsync([holdId], CancellationToken.None))!.Status);
        Assert.Equal("Available", (await db.ProviderAvailabilitySlots.FindAsync([slotId], CancellationToken.None))!.Status);
    }

    [Fact]
    public async Task CreateHold_RejectsIntakeSubmissionOwnedByDifferentVisitor()
    {
        await using var db = CreateDbContext();
        var providerId = Guid.NewGuid();
        var slotId = Guid.NewGuid();
        var intakeSubmissionId = Guid.NewGuid();
        db.ProviderProfiles.Add(CreateProvider(providerId));
        db.ProviderAvailabilitySlots.Add(CreateSlot(providerId, slotId));
        db.IntakeSubmissions.Add(new IntakeSubmission
        {
            Id = intakeSubmissionId,
            FormDefinitionId = Guid.NewGuid(),
            VisitorSessionId = Guid.NewGuid()
        });
        await db.SaveChangesAsync();
        var controller = CreateController(db, Guid.NewGuid());

        var result = await controller.CreateHold(
            new CreateBookingHoldRequest(providerId, slotId, intakeSubmissionId),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Empty(db.BookingHolds);
    }

    [Fact]
    public async Task GetHold_ReturnsNotFoundForDifferentVisitor()
    {
        await using var db = CreateDbContext();
        var holdId = Guid.NewGuid();
        db.BookingHolds.Add(CreateHold(holdId, Guid.NewGuid()));
        await db.SaveChangesAsync();
        var controller = CreateController(db, Guid.NewGuid());

        var result = await controller.GetHold(holdId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task PatchFlowState_ReturnsNotFoundForDifferentVisitor()
    {
        await using var db = CreateDbContext();
        var holdId = Guid.NewGuid();
        db.BookingHolds.Add(CreateHold(holdId, Guid.NewGuid()));
        await db.SaveChangesAsync();
        var controller = CreateController(db, Guid.NewGuid());

        var result = await controller.PatchFlowState(
            holdId,
            new PatchBookingHoldFlowStateRequest("{\"step\":\"payment\"}"),
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal("{}", (await db.BookingHolds.FindAsync([holdId], CancellationToken.None))!.FlowStateJson);
    }

    [Fact]
    public async Task CancelHold_DoesNotCancelHoldOwnedByDifferentVisitor()
    {
        await using var db = CreateDbContext();
        var holdId = Guid.NewGuid();
        db.BookingHolds.Add(CreateHold(holdId, Guid.NewGuid()));
        await db.SaveChangesAsync();
        var controller = CreateController(db, Guid.NewGuid());

        var result = await controller.CancelHold(holdId, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("Active", (await db.BookingHolds.FindAsync([holdId], CancellationToken.None))!.Status);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static BookingController CreateController(ApplicationDbContext db, Guid? visitorId = null)
    {
        var repository = new BookingRepository(db);
        var controller = new BookingController(db, new BookingService(repository), new ProviderAvailabilityService(repository))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        if (visitorId.HasValue)
        {
            controller.Request.Headers.Cookie = $"mbv_vid={visitorId.Value:D}";
        }

        return controller;
    }

    private static ProviderProfile CreateProvider(Guid providerId)
    {
        return new ProviderProfile
        {
            Id = providerId,
            Name = "Dr. API",
            Role = "Therapist",
            Summary = "API backed provider",
            LongDescription = "API backed provider profile.",
            VisibilityStatus = "Published",
            IsActive = true
        };
    }

    private static ProviderAvailabilitySlot CreateSlot(Guid providerId, Guid slotId)
    {
        return new ProviderAvailabilitySlot
        {
            Id = slotId,
            ProviderProfileId = providerId,
            StartsAtUtc = DateTimeOffset.UtcNow.AddHours(1),
            EndsAtUtc = DateTimeOffset.UtcNow.AddHours(2),
            Status = "Available"
        };
    }

    private static BookingHold CreateHold(Guid holdId, Guid visitorId)
    {
        return new BookingHold
        {
            Id = holdId,
            ProviderProfileId = Guid.NewGuid(),
            SlotId = Guid.NewGuid(),
            VisitorSessionId = visitorId,
            IntakeSubmissionId = Guid.NewGuid(),
            Status = "Active",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(10)
        };
    }
}
