import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidIfsc, lookupBankByIfsc } from './ifscLookup';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isValidIfsc', () => {
  it('accepts well-formed IFSC codes', () => {
    expect(isValidIfsc('HDFC0001234')).toBe(true);
    expect(isValidIfsc('SBIN0ABCDEF')).toBe(true);
  });

  it('trims and uppercases before validating', () => {
    expect(isValidIfsc('  hdfc0001234  ')).toBe(true);
  });

  it('rejects malformed IFSC codes', () => {
    expect(isValidIfsc('')).toBe(false);
    expect(isValidIfsc('HDFC1001234')).toBe(false); // 5th char must be 0
    expect(isValidIfsc('HDF0001234')).toBe(false); // too short bank code
    expect(isValidIfsc('HDFC000123')).toBe(false); // too short overall
    expect(isValidIfsc('HDFC0001234X')).toBe(false); // too long
  });
});

describe('lookupBankByIfsc', () => {
  it('returns parsed bank and branch on a 200 response', async () => {
    const fetchMock = vi.fn(async () => Response.json({ BANK: 'HDFC Bank', BRANCH: 'Koramangala' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupBankByIfsc('HDFC0001234');

    expect(result).toEqual({ bank: 'HDFC Bank', branch: 'Koramangala' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ifsc.razorpay.com/HDFC0001234',
      expect.objectContaining({ signal: undefined }),
    );
  });

  it('returns null on a 404 response', async () => {
    const fetchMock = vi.fn(async () => Response.json({ error: 'Not found' }, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupBankByIfsc('HDFC0000000');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws (e.g. abort/network error)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupBankByIfsc('HDFC0001234');

    expect(result).toBeNull();
  });
});
