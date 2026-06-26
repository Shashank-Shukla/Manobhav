export interface AvailabilitySlot {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ... 6=Saturday
  startTime: string; // "HH:mm" 24h, e.g. "09:00"
  endTime: string; // "HH:mm" 24h, e.g. "17:00"
}
