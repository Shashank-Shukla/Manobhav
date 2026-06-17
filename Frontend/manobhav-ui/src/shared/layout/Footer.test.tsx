import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('footer routing', () => {
  it('routes Careers through provider registration before onboarding', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: /careers/i })).toHaveAttribute(
      'href',
      '/login?mode=sign-up&returnTo=%2Fonboarding%2Fprovider',
    );
  });
});
