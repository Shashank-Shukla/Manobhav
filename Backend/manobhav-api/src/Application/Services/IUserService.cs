using Application.DTOs;

namespace Application.Services;

public interface IUserService
{
    Task<UserDto?> GetUserDtoAsync(Guid id, CancellationToken cancellationToken = default);
}
