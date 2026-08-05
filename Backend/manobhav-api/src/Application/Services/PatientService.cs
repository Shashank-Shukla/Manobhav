using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public sealed class PatientService : IPatientService
{
    private readonly IPatientRepository _repository;
    private readonly IBookingService _booking;

    public PatientService(IPatientRepository repository, IBookingService booking)
    {
        _repository = repository;
        _booking = booking;
    }

    public async Task<PatientOnboardingStatusDto> GetOnboardingStatusAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _repository.GetUserAsync(userId, cancellationToken)
            ?? throw new PatientException("Patient not found.", 404);

        var now = DateTimeOffset.UtcNow;
        var hasCompletedProfile = user.ProfileCompletedAtUtc.HasValue;
        var isRegisteredPatient = await IsPatientRoleAsync(user.Id, cancellationToken);

        var appointments = await _repository.GetAppointmentsAsync(userId, cancellationToken);
        var hasAppointments = appointments.Count > 0;

        var latestSubmission = await _repository.GetLatestIntakeSubmissionAsync(userId, cancellationToken);
        var resumableSubmissionId = latestSubmission is { Status: "Draft" or "Partial" }
            ? (Guid?)latestSubmission.Id
            : null;

        var activeHoldId = await _repository.GetActiveBookingHoldIdAsync(userId, now, cancellationToken);

        var nextStep = DetermineNextStep(hasCompletedProfile, isRegisteredPatient, activeHoldId, hasAppointments);

        return new PatientOnboardingStatusDto(
            isRegisteredPatient,
            hasCompletedProfile,
            hasAppointments,
            resumableSubmissionId,
            activeHoldId,
            nextStep);
    }

    public async Task<PatientDashboardDto> GetDashboardAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _repository.GetUserAsync(userId, cancellationToken)
            ?? throw new PatientException("Patient not found.", 404);

        var appointments = await _repository.GetAppointmentsAsync(userId, cancellationToken);
        var providerIds = appointments.Select(item => item.ProviderProfileId).Distinct().ToList();
        var providers = await _repository.GetProviderSummariesAsync(providerIds, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var upcoming = appointments
            .Where(item => item.StartsAtUtc > now && item.Status is "Scheduled")
            .ToList();
        var past = appointments
            .Where(item => item.StartsAtUtc <= now || item.Status is "Completed" or "Cancelled" or "NoShow")
            .ToList();

        var latestSubmission = await _repository.GetLatestIntakeSubmissionAsync(userId, cancellationToken);
        var intakeSummary = await BuildIntakeSummaryAsync(latestSubmission, cancellationToken);

        var consents = await _repository.GetConsentsAsync(userId, cancellationToken);
        var consentDtos = consents
            .Select(consent => new PatientConsentDto(
                consent.ConsentType,
                consent.PolicyVersion,
                consent.Accepted,
                consent.SignedAtUtc))
            .ToList();

        var metrics = new PatientDashboardMetricsDto(
            upcoming.Count,
            appointments.Count(item => item.Status == "Completed"),
            appointments.Count(item => item.Status == "Cancelled"));

        return new PatientDashboardDto(
            ToProfileDto(user),
            metrics,
            upcoming.Select(item => ToAppointmentDto(item, providers)).ToList(),
            past.Select(item => ToAppointmentDto(item, providers)).ToList(),
            intakeSummary,
            consentDtos);
    }

    public async Task<PatientProfileDto> UpdateProfileAsync(Guid userId, UpdatePatientProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await _repository.GetUserAsync(userId, cancellationToken)
            ?? throw new PatientException("Patient not found.", 404);

        user.Name = request.FullName;
        user.PreferredName = request.PreferredName;
        user.Email = request.Email;
        user.Phone = request.Phone;
        user.DateOfBirth = request.DateOfBirth;
        user.Gender = request.Gender;
        user.Occupation = request.Occupation;
        user.Address = request.Address;
        user.EmergencyContactName = request.EmergencyContactName;
        user.EmergencyContactRelation = request.EmergencyContactRelation;
        user.EmergencyContactPhone = request.EmergencyContactPhone;
        user.UpdatedAtUtc = DateTimeOffset.UtcNow;

        if (!user.ProfileCompletedAtUtc.HasValue)
        {
            user.ProfileCompletedAtUtc = DateTimeOffset.UtcNow;
        }

        await _repository.SaveChangesAsync(cancellationToken);
        return ToProfileDto(user);
    }

    private async Task<bool> IsPatientRoleAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _repository.GetUserAsync(userId, cancellationToken);
        return user?.Roles.Any(role => role.IsActive && role.Role == "Patient") == true;
    }

    private async Task<PatientIntakeSummaryDto> BuildIntakeSummaryAsync(
        IntakeSubmission? submission,
        CancellationToken cancellationToken)
    {
        if (submission is null)
        {
            return new PatientIntakeSummaryDto(null, null, null, null, []);
        }

        var answerRows = await _repository.GetIntakeAnswersAsync(submission.Id, cancellationToken);
        var answerDtos = answerRows
            .Select(row => new PatientIntakeAnswerDto(row.QuestionKey, row.Prompt, FormatAnswer(row.AnswerJsonb, row.OptionLabels)))
            .ToList();

        return new PatientIntakeSummaryDto(
            submission.Id,
            submission.Status,
            submission.SubmittedAtUtc,
            submission.CompletedAtUtc,
            answerDtos);
    }

    private static string DetermineNextStep(
        bool hasCompletedProfile,
        bool isRegisteredPatient,
        Guid? activeHoldId,
        bool hasAppointments)
    {
        if (!hasCompletedProfile)
        {
            return "CompleteProfile";
        }

        if (activeHoldId.HasValue)
        {
            return "FinalizeBooking";
        }

        if (!hasAppointments)
        {
            return "BrowseProviders";
        }

        return "Dashboard";
    }

    private static PatientProfileDto ToProfileDto(User user)
    {
        var displayName = user.PreferredName ?? user.DisplayName ?? user.Name ?? "Patient";
        var initials = BuildInitials(displayName);

        return new PatientProfileDto(
            user.Name ?? displayName,
            user.PreferredName,
            user.Email,
            user.Phone,
            user.DateOfBirth,
            user.Gender,
            user.Occupation,
            user.Address,
            user.EmergencyContactName,
            user.EmergencyContactRelation,
            user.EmergencyContactPhone,
            initials,
            user.ProfileCompletedAtUtc);
    }

    private static PatientAppointmentDto ToAppointmentDto(
        Appointment appointment,
        IReadOnlyDictionary<Guid, PatientProviderSummary> providers)
    {
        var provider = providers.GetValueOrDefault(appointment.ProviderProfileId);
        var now = DateTimeOffset.UtcNow;
        var canJoin = appointment.Status == "Scheduled" &&
            appointment.StartsAtUtc <= now.AddMinutes(5) &&
            appointment.EndsAtUtc > now;
        var canModify = appointment.Status == "Scheduled" && appointment.StartsAtUtc > now;

        return new PatientAppointmentDto(
            appointment.Id,
            appointment.ProviderProfileId,
            provider?.Name ?? "Provider",
            provider?.Title,
            provider?.AvatarColor ?? "#9CAF88",
            appointment.SlotId,
            appointment.StartsAtUtc,
            appointment.EndsAtUtc,
            appointment.Status,
            appointment.PaymentStatus,
            canJoin,
            canModify);
    }

    private static string BuildInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0)
        {
            return "?";
        }

        return parts.Length == 1
            ? parts[0][..1].ToUpperInvariant()
            : $"{parts[0][..1]}{parts[^1][..1]}".ToUpperInvariant();
    }

    private static string FormatAnswer(string answerJsonb, IReadOnlyDictionary<string, string> optionLabels)
    {
        try
        {
            using var doc = JsonDocument.Parse(answerJsonb);
            if (doc.RootElement.TryGetProperty("value", out var valueElement))
            {
                if (valueElement.ValueKind == JsonValueKind.Array)
                {
                    var labels = valueElement.EnumerateArray()
                        .Select(item => item.ValueKind == JsonValueKind.String
                            ? optionLabels.GetValueOrDefault(item.GetString() ?? item.ToString(), item.GetString() ?? item.ToString())
                            : item.ToString())
                        .ToList();
                    return string.Join(", ", labels);
                }

                if (valueElement.ValueKind == JsonValueKind.String)
                {
                    var raw = valueElement.GetString();
                    if (raw is not null && optionLabels.TryGetValue(raw, out var label))
                    {
                        return label;
                    }

                    return raw ?? valueElement.ToString();
                }

                return valueElement.ToString();
            }

            return answerJsonb;
        }
        catch (JsonException)
        {
            return answerJsonb;
        }
    }
}

public sealed class PatientException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
