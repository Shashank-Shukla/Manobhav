import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const nginxConfig = readFileSync(resolve(process.cwd(), 'nginx.conf'), 'utf8');
const expectedSecurityHeaders = [
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
];

describe('static security headers', () => {
  it('serves the expected production security headers from nginx', () => {
    expect(nginxConfig).toContain('add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;');
    expect(nginxConfig).toContain('add_header Content-Security-Policy "');
    expect(nginxConfig).toContain('add_header X-Frame-Options "DENY" always;');
    expect(nginxConfig).toContain('add_header Referrer-Policy "strict-origin-when-cross-origin" always;');
    expect(nginxConfig).toContain(
      'add_header Permissions-Policy "camera=(self \\"https://meet.jit.si\\"), microphone=(self \\"https://meet.jit.si\\"), geolocation=()" always;',
    );
  });

  it('keeps media permissions narrow and geolocation blocked', () => {
    expect(nginxConfig).not.toMatch(/camera=\(\*\)|microphone=\(\*\)|geolocation=\(self|\*/);
  });

  it('allows Jitsi without relaxing frame ancestry', () => {
    expect(nginxConfig).toContain("frame-src 'self' https://meet.jit.si;");
    expect(nginxConfig).toContain("connect-src 'self'");
    expect(nginxConfig).toContain("frame-ancestors 'none'");
  });

  it('adds security headers in cache-control locations', () => {
    expect(getLocationBlock('/assets/')).toEqual(expect.stringContaining('add_header Cache-Control'));
    expect(getLocationBlock('/')).toEqual(expect.stringContaining('add_header Cache-Control'));

    for (const location of ['/assets/', '/']) {
      const block = getLocationBlock(location);
      for (const header of expectedSecurityHeaders) {
        expect(block).toContain(`add_header ${header}`);
      }
    }
  });
});

function getLocationBlock(location: string): string {
  const match = nginxConfig.match(new RegExp(`location ${escapeRegExp(location)} \\{(?<block>[\\s\\S]*?)\\n  \\}`));
  return match?.groups?.block ?? '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
