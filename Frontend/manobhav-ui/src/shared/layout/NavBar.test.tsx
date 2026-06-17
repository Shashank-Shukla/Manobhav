import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthSession } from '../auth/useAuthSession';
import { NavBar } from './NavBar';

vi.mock('../auth/useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

describe('NavBar auth action', () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReturnValue({ session: null, loading: false });
  });

  it('shows Login when the visitor is not authenticated', () => {
    renderNavBar();

    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open profile/i })).not.toBeInTheDocument();
  });

  it('replaces Login with a profile avatar when the visitor is authenticated', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar(onNavigate);

    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();

    const profileButton = screen.getByRole('button', { name: /open profile/i });
    expect(profileButton).toHaveTextContent('U');

    await user.click(profileButton);

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/patient');
  });

  it('routes provider applicants from the profile avatar to the provider dashboard', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: ['ProviderApplicant'] },
      loading: false,
    });

    renderNavBar(onNavigate);

    await user.click(screen.getByRole('button', { name: /open profile/i }));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/provider');
  });
});

function renderNavBar(onNavigate = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <NavBar onNavigate={onNavigate} themeMode="light" />
    </MemoryRouter>,
  );
}
