type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, data?: unknown) {
  // Placeholder for future remote logging; today logs to console.
  const payload = data ? { message, data } : { message };
  if (level === 'info') console.info('[Manobhav]', payload);
  else if (level === 'warn') console.warn('[Manobhav]', payload);
  else console.error('[Manobhav]', payload);
}
