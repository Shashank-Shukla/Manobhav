namespace Application.DTOs;

public sealed record ProviderSlotDto(
    Guid Id,
    Guid ProviderProfileId,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc,
    string Status);

public sealed record CreateBookingHoldRequest(
    Guid ProviderId,
    Guid SlotId,
    Guid IntakeSubmissionId);

public sealed record BookingHoldDto(
    Guid Id,
    Guid ProviderProfileId,
    Guid SlotId,
    Guid? VisitorSessionId,
    Guid? UserId,
    Guid? IntakeSubmissionId,
    string Status,
    DateTimeOffset ExpiresAtUtc);

public sealed record PatchBookingHoldFlowStateRequest(string FlowStateJson);

public sealed record AppointmentDto(
    Guid Id,
    Guid BookingHoldId,
    Guid PatientUserId,
    Guid ProviderProfileId,
    Guid SlotId,
    Guid IntakeSubmissionId,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc,
    string Status,
    string PaymentStatus);
