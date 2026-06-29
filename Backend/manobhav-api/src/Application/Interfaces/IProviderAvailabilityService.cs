using Application.DTOs;

namespace Application.Interfaces;

/// <summary>
/// Exposes a provider's bookable slots for a window, materializing concrete one-hour slots on demand
/// from the recurring weekly availability captured during onboarding.
/// </summary>
public interface IProviderAvailabilityService
{
    Task<IReadOnlyList<ProviderSlotDto>> GetSlotsAsync(
        Guid providerId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken);
}
