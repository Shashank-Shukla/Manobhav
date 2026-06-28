export type ProvidersRouteProps = {
  onBackHome: () => void;
  onBook: () => void;
};

export type ProviderDateOption = {
  display: string;
  iso: string;
  slotId?: string;
};

/** A recurring weekly availability window. dayOfWeek is 0=Sunday..6=Saturday; times are "HH:mm". */
export type WeeklyAvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ProviderRecord = {
  id: string;
  name: string;
  /** Short bio, shown on the directory card. */
  summary: string;
  specializations: string[];
  avatarColor: string;
  /** The provider's recurring weekly schedule, straight from the API. */
  weeklyAvailability: WeeklyAvailabilitySlot[];
  /** Next available calendar dates (local time), derived from the weekly schedule. */
  nextDates: ProviderDateOption[];
  /** Weekdays (0=Sunday..6=Saturday) the provider works, used to limit the booking calendar. */
  availableDaysOfWeek: number[];
  /** Long bio, shown in the detail panel. */
  longDescription: string;
  sessions: number;
  rating: number;
};
