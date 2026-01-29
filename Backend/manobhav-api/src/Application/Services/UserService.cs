using Application.DTOs;
using Application.Interfaces;

namespace Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _repo;

    public UserService(IUserRepository repo)
    {
        _repo = repo;
    }

    public async Task<UserDto?> GetUserDtoAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _repo.GetByIdAsync(id, cancellationToken);
        return user == null ? null : new UserDto(user.Id, user.Name);
    }
}
