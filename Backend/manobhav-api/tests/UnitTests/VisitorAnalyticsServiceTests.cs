using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Entities;

namespace UnitTests;

public sealed class VisitorAnalyticsServiceTests
{
    [Fact]
    public async Task CreateVisitorAsync_RejectsFullCaptureWithoutLegalApproval()
    {
        var service = new VisitorAnalyticsService(
            new InMemoryVisitorAnalyticsRepository(),
            new VisitorAnalyticsOptions
            {
                Enabled = true,
                FullCaptureEnabled = true,
                FullCaptureLegalApproved = false,
                RetentionDays = 365
            });

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateVisitorAsync(new CreateVisitorRequest("/"), new ServerVisitorTelemetry("127.0.0.1", "test-agent", null), CancellationToken.None));
    }

    [Fact]
    public async Task RecordEventAsync_RejectsSensitivePropertyKeys()
    {
        var repository = new InMemoryVisitorAnalyticsRepository();
        var service = new VisitorAnalyticsService(
            repository,
            new VisitorAnalyticsOptions
            {
                Enabled = true,
                FullCaptureEnabled = true,
                FullCaptureLegalApproved = true,
                RetentionDays = 90
            });
        var visitor = await service.CreateVisitorAsync(new CreateVisitorRequest("/"), new ServerVisitorTelemetry("127.0.0.1", "test-agent", null), CancellationToken.None);

        var request = new VisitorEventRequest(
            "journey.answer.changed",
            "/journey",
            "question-1",
            new Dictionary<string, string?> { ["authToken"] = "should-not-be-accepted" },
            DateTimeOffset.UtcNow);

        var ex = await Assert.ThrowsAsync<VisitorAnalyticsValidationException>(() =>
            service.RecordEventAsync(visitor.VisitorId, request, CancellationToken.None));

        Assert.Contains("authToken", ex.Message);
    }

    [Fact]
    public async Task RecordEventAsync_AllowsNonSensitiveFunnelEvent()
    {
        var repository = new InMemoryVisitorAnalyticsRepository();
        var service = new VisitorAnalyticsService(
            repository,
            new VisitorAnalyticsOptions
            {
                Enabled = true,
                FullCaptureEnabled = true,
                FullCaptureLegalApproved = true,
                RetentionDays = 90
            });
        var visitor = await service.CreateVisitorAsync(new CreateVisitorRequest("/"), new ServerVisitorTelemetry("127.0.0.1", "test-agent", null), CancellationToken.None);

        await service.RecordEventAsync(
            visitor.VisitorId,
            new VisitorEventRequest(
                "journey.step.viewed",
                "/journey",
                "question-1",
                new Dictionary<string, string?> { ["answerLength"] = "12" },
                DateTimeOffset.UtcNow),
            CancellationToken.None);

        Assert.Single(repository.Events);
        Assert.Equal("journey.step.viewed", repository.Events[0].EventType);
    }

    [Fact]
    public async Task RecordEventAsync_RejectsOversizedPropertiesPayload()
    {
        var repository = new InMemoryVisitorAnalyticsRepository();
        var service = new VisitorAnalyticsService(
            repository,
            new VisitorAnalyticsOptions
            {
                Enabled = true,
                FullCaptureEnabled = true,
                FullCaptureLegalApproved = true,
                RetentionDays = 90
            });
        var visitor = await service.CreateVisitorAsync(new CreateVisitorRequest("/"), new ServerVisitorTelemetry("127.0.0.1", "test-agent", null), CancellationToken.None);

        var request = new VisitorEventRequest(
            "journey.step.viewed",
            "/journey",
            "question-1",
            new Dictionary<string, string?> { ["answerLength"] = new string('1', 5000) },
            DateTimeOffset.UtcNow);

        await Assert.ThrowsAsync<VisitorAnalyticsValidationException>(() =>
            service.RecordEventAsync(visitor.VisitorId, request, CancellationToken.None));
    }

    private sealed class InMemoryVisitorAnalyticsRepository : IVisitorAnalyticsRepository
    {
        private readonly Dictionary<Guid, VisitorSession> _sessions = new();

        public List<VisitorEvent> Events { get; } = [];

        public Task AddVisitorAsync(VisitorSession visitor, CancellationToken cancellationToken)
        {
            _sessions[visitor.Id] = visitor;
            return Task.CompletedTask;
        }

        public Task<bool> VisitorExistsAsync(Guid visitorId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_sessions.ContainsKey(visitorId));
        }

        public Task AddEventAsync(VisitorEvent visitorEvent, CancellationToken cancellationToken)
        {
            Events.Add(visitorEvent);
            return Task.CompletedTask;
        }

        public Task LinkVisitorToUserAsync(Guid visitorId, string userSubject, CancellationToken cancellationToken)
        {
            _sessions[visitorId].LinkedUserSubject = userSubject;
            _sessions[visitorId].LinkedAtUtc = DateTimeOffset.UtcNow;
            return Task.CompletedTask;
        }
    }
}
