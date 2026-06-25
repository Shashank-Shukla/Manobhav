import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthSession } from '../auth/useAuthSession';
import { theme } from '../../utils/theme';
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

  it('opens the profile menu from the authenticated avatar without immediate navigation', async () => {
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
    expect(profileButton).toHaveAttribute('aria-haspopup', 'menu');

    await user.click(profileButton);

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /profile/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('closes the profile menu when Escape is pressed', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /open profile/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the profile menu after an outside click', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /open profile/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('cycles focus between profile menu items with arrow keys', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /open profile/i }));

    const dashboardItem = screen.getByRole('menuitem', { name: /dashboard/i });
    const signOutItem = screen.getByRole('menuitem', { name: /sign out/i });
    dashboardItem.focus();

    await user.keyboard('{ArrowDown}');
    expect(signOutItem).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(dashboardItem).toHaveFocus();
  });

  it('moves profile menu focus to the first and last items with boundary keys', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /open profile/i }));

    const dashboardItem = screen.getByRole('menuitem', { name: /dashboard/i });
    const signOutItem = screen.getByRole('menuitem', { name: /sign out/i });
    dashboardItem.focus();

    await user.keyboard('{End}');
    expect(signOutItem).toHaveFocus();

    await user.keyboard('{Home}');
    expect(dashboardItem).toHaveFocus();
  });

  it('returns focus to the avatar when Escape closes a focused profile menu item', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar();

    const profileButton = screen.getByRole('button', { name: /open profile/i });
    await user.click(profileButton);

    screen.getByRole('menuitem', { name: /dashboard/i }).focus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(profileButton).toHaveFocus();
  });

  it('uses shared theme colors for profile menu styling', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /open profile/i }));

    expect(screen.getByText('U')).toHaveStyle({
      backgroundColor: theme.colors.textMain,
      color: theme.colors.white,
    });
    expect(screen.getByRole('menu')).toHaveStyle({
      backgroundColor: theme.colors.white,
      borderColor: theme.colors.grey.DEFAULT,
    });
    expect(screen.getByRole('menuitem', { name: /dashboard/i })).toHaveStyle({
      '--profile-menu-item-active-bg': theme.colors.sage.light,
      '--profile-menu-item-active-color': theme.colors.textMain,
      color: theme.colors.textMain,
    });
  });

  it('routes the profile menu Dashboard action to the single /dashboard entry by default', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    vi.mocked(useAuthSession).mockReturnValue({
      session: { isAuthenticated: true, expiresAtUtc: null, groups: [] },
      loading: false,
    });

    renderNavBar(onNavigate);

    await user.click(screen.getByRole('button', { name: /open profile/i }));
    await user.click(screen.getByRole('menuitem', { name: /dashboard/i }));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it.each([['Admin'], ['Provider'], ['ProviderApplicant'], []])(
    'routes the profile menu Dashboard action to /dashboard for %s sessions',
    async (...groups) => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      vi.mocked(useAuthSession).mockReturnValue({
        session: { isAuthenticated: true, expiresAtUtc: null, groups },
        loading: false,
      });

      renderNavBar(onNavigate);

      await user.click(screen.getByRole('button', { name: /open profile/i }));
      await user.click(screen.getByRole('menuitem', { name: /dashboard/i }));

      expect(onNavigate).toHaveBeenCalledWith('/dashboard');
    },
  );
});

function renderNavBar(onNavigate = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <NavBar onNavigate={onNavigate} themeMode="light" />
    </MemoryRouter>,
  );
}
