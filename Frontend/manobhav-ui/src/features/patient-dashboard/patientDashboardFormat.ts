const istFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Full IST date-time, e.g. "15 Jun 2026, 10:00 AM". */
export function formatDateTime(utc: string): string {
  const parsed = parseDate(utc);
  return parsed ? istFormatter.format(parsed) : '';
}

/** IST time only, e.g. "10:00 AM". */
export function formatTime(utc: string): string {
  const parsed = parseDate(utc);
  return parsed ? timeFormatter.format(parsed) : '';
}

/** IST date only, e.g. "15 Jun 2026". */
export function formatDate(utc: string): string {
  const parsed = parseDate(utc);
  return parsed ? dateFormatter.format(parsed) : '';
}

/** Human-readable consent type from camelCase, e.g. "TelemedicineConsent" → "Telemedicine Consent". */
export function formatConsentType(consentType: string): string {
  return consentType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

/** Two-letter initials from a full name. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') {
    return '?';
  }
  return parts.length === 1
    ? parts[0].charAt(0).toUpperCase()
    : `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
