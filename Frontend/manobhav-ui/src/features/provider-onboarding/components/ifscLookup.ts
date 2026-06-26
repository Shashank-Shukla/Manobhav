// Pure, dependency-free IFSC helpers so they can be unit-tested with a mocked `fetch`.

export interface IfscBank {
  bank: string;
  branch?: string;
}

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Validates an IFSC code. Trims and uppercases the input before testing the pattern. */
export function isValidIfsc(ifsc: string): boolean {
  return IFSC_PATTERN.test(ifsc.trim().toUpperCase());
}

/**
 * Looks up bank/branch details for an IFSC code via Razorpay's public, key-less API.
 * Returns `null` on a non-200 response, a thrown error, or an aborted request — never throws.
 */
export async function lookupBankByIfsc(ifsc: string, signal?: AbortSignal): Promise<IfscBank | null> {
  try {
    const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`, { signal });
    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || typeof data.BANK !== 'string') {
      return null;
    }

    return {
      bank: data.BANK,
      branch: typeof data.BRANCH === 'string' ? data.BRANCH : undefined,
    };
  } catch {
    // Aborted requests, network failures, and non-JSON bodies all resolve to "no match".
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
