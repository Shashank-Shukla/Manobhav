namespace Application.DTOs;

/// <summary>
/// Read-only, PII-redacted projections for the AI diagnostics endpoint. Highly sensitive tables
/// (email OTP challenges, payout/bank details, raw intake answers, audit before/after JSON, visitor
/// IPs) are intentionally NOT represented here, and emails/phones are masked.
/// </summary>
public sealed record DiagnosticsTableSummaryDto(string Table, int Count);

public sealed record DiagnosticsUserDto(
    Guid Id,
    string? Email,
    string? Phone,
    string? Name,
    string? DisplayName,
    string AccountStatus,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? LastLoginAtUtc);

public sealed record DiagnosticsProviderProfileDto(
    Guid Id,
    Guid? ProviderApplicationId,
    Guid? UserId,
    string Name,
    string? DisplayName,
    string Role,
    string Summary,
    string LongDescription,
    string SpecializationsJson,
    string WeeklyAvailabilityJson,
    string VisibilityStatus,
    bool IsActive,
    bool IsFeatured,
    int Sessions,
    decimal Rating,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? PublishedAtUtc);

public sealed record DiagnosticsProviderApplicationDto(
    Guid Id,
    Guid UserId,
    string Status,
    string? CurrentStep,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    DateTimeOffset? SubmittedAtUtc,
    string BioJson,
    string AvailabilitySlotsJson);

public sealed record DiagnosticsAvailabilitySlotDto(
    Guid Id,
    Guid ProviderProfileId,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc,
    string Status);

public sealed record DiagnosticsAppointmentDto(
    Guid Id,
    Guid ProviderProfileId,
    Guid PatientUserId,
    Guid SlotId,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc,
    string Status,
    string PaymentStatus);

public sealed record DiagnosticsBookingHoldDto(
    Guid Id,
    Guid ProviderProfileId,
    Guid SlotId,
    Guid? UserId,
    Guid? VisitorSessionId,
    string Status,
    DateTimeOffset ExpiresAtUtc);

public sealed record DiagnosticsUserRoleDto(
    Guid Id,
    Guid UserId,
    string Role,
    bool IsActive);
