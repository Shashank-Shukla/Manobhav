namespace Application.DTOs;

/// <summary>
/// Where a signed-in, non-provider account sits in the patient funnel. Drives post-login routing:
/// an account that has not completed the get-started flow is sent into it instead of the dashboard.
/// </summary>
public sealed record PatientOnboardingStatusDto(
    bool IsRegisteredPatient,
    bool HasCompletedProfile,
    bool HasAppointments,
    Guid? ResumableIntakeSubmissionId,
    Guid? ActiveBookingHoldId,
    string NextStep);

public sealed record PatientProfileDto(
    string FullName,
    string? PreferredName,
    string? Email,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Occupation,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactRelation,
    string? EmergencyContactPhone,
    string AvatarInitials,
    DateTimeOffset? ProfileCompletedAtUtc);

public sealed record PatientAppointmentDto(
    Guid Id,
    Guid ProviderProfileId,
    string ProviderName,
    string? ProviderTitle,
    string ProviderAvatarColor,
    Guid SlotId,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc,
    string Status,
    string PaymentStatus,
    bool CanJoin,
    bool CanModify);

public sealed record PatientIntakeAnswerDto(string QuestionKey, string Prompt, string Answer);

public sealed record PatientIntakeSummaryDto(
    Guid? SubmissionId,
    string? Status,
    DateTimeOffset? SubmittedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    IReadOnlyList<PatientIntakeAnswerDto> Answers);

public sealed record PatientConsentDto(
    string ConsentType,
    int PolicyVersion,
    bool Accepted,
    DateTimeOffset SignedAtUtc);

public sealed record PatientDashboardMetricsDto(
    int UpcomingCount,
    int CompletedCount,
    int CancelledCount);

public sealed record PatientDashboardDto(
    PatientProfileDto Profile,
    PatientDashboardMetricsDto Metrics,
    IReadOnlyList<PatientAppointmentDto> UpcomingAppointments,
    IReadOnlyList<PatientAppointmentDto> PastAppointments,
    PatientIntakeSummaryDto Intake,
    IReadOnlyList<PatientConsentDto> Consents);

public sealed record UpdatePatientProfileRequest(
    string FullName,
    string? PreferredName,
    string? Email,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Occupation,
    string? Address,
    string EmergencyContactName,
    string EmergencyContactRelation,
    string EmergencyContactPhone);

public sealed record ReschedulePatientAppointmentRequest(Guid SlotId);
