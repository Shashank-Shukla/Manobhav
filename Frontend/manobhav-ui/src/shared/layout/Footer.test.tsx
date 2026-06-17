import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('footer routing', () => {
  it('routes Careers to provider onboarding', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: /careers/i })).toHaveAttribute('href', '/onboarding/provider');
  });
});
