import { describe, expect, it } from 'vitest';
import { isAdminSession } from './cognitoAuth';

describe('cognito auth helpers', () => {
  it('requires the configured admin group for admin sessions', () => {
    expect(isAdminSession({ accessToken: 'token', expiresAt: Date.now() + 10000, groups: ['Admin'] }, 'Admin')).toBe(true);
    expect(isAdminSession({ accessToken: 'token', expiresAt: Date.now() + 10000, groups: ['Visitor'] }, 'Admin')).toBe(false);
  });
});
