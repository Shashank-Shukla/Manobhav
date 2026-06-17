import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeCognitoRedirect } from '../../shared/auth/cognitoAuth';
import { AuthCallbackRoute } from './AuthCallbackRoute';

vi.mock('../../shared/auth/cognitoAuth', () => ({
  completeCognitoRedirect: vi.fn(),
}));

describe('AuthCallbackRoute', () => {
  beforeEach(() => {
    vi.mocked(completeCognitoRedirect).mockReset();
  });

  it('uses friendly progress copy while completing sign in', () => {
    vi.mocked(completeCognitoRedirect).mockReturnValue(new Promise(() => undefined));

    render(
      <MemoryRouter initialEntries={['/callback']}>
        <AuthCallbackRoute />
      </MemoryRouter>,
    );

    expect(screen.getByText(/securely completes sign in/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/cognito/i);
  });

  it('hides raw callback error details from the user', async () => {
    vi.mocked(completeCognitoRedirect).mockRejectedValue(
      new Error('API request failed with status 400. Cognito callback invalid.'),
    );

    render(
      <MemoryRouter initialEntries={['/callback']}>
        <AuthCallbackRoute />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /sign in failed/i })).toBeInTheDocument();
    expect(screen.getByText(/we couldn't complete sign in/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/api|status|400|cognito/i);
  });
});
