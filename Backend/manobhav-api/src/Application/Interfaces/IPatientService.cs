using Application.DTOs;

namespace Application.Interfaces;

public interface IPatientService
{
    Task<PatientOnboardingStatusDto> GetOnboardingStatusAsync(Guid userId, CancellationToken cancellationToken);

    Task<PatientDashboardDto> GetDashboardAsync(Guid userId, CancellationToken cancellationToken);

    Task<PatientProfileDto> UpdateProfileAsync(Guid userId, UpdatePatientProfileRequest request, CancellationToken cancellationToken);
}
