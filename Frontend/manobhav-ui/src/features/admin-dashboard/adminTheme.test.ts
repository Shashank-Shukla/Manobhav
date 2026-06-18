import { describe, expect, it } from 'vitest';
import { theme } from '../../utils/theme';
import { adminTheme } from './adminTheme';

describe('adminTheme', () => {
  it('uses shared theme tokens for shell, panel, and brand colors', () => {
    expect(adminTheme.shellBg).toBe(theme.colors.smokeWhite);
    expect(adminTheme.panelBg).toBe(theme.colors.white);
    expect(adminTheme.sage).toBe(theme.colors.sage);
  });
});
