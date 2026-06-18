import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('uses the absolute Manobhav logo asset path', () => {
    render(<Logo />);

    expect(screen.getByRole('img', { name: /manobhav/i })).toHaveAttribute('src', '/Manobhav_Logo.png');
  });
});
