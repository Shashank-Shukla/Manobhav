import { describe, expect, it } from 'vitest';
import { getApiBaseUrl } from './apiClient';

describe('api client configuration', () => {
  it('uses the configured API base URL when supplied', () => {
    expect(getApiBaseUrl({ VITE_PUBLIC_API_BASE_URL: 'https://api.example.com/' })).toBe('https://api.example.com');
  });

  it('defaults to the ASP.NET Core dev API URL during local Vite development', () => {
    expect(getApiBaseUrl({ DEV: true, VITE_PUBLIC_API_BASE_URL: '' })).toBe('http://localhost:5163');
  });

  it('does not invent an API URL for production builds', () => {
    expect(getApiBaseUrl({ DEV: false, VITE_PUBLIC_API_BASE_URL: '' })).toBe('');
  });
});
