import { apiRequest } from '../../shared/api/apiClient';

export const ACTIVE_INTAKE_SUBMISSION_STORAGE_KEY = 'manobhav-active-intake-submission-id';
export const BOOKING_HOLD_STORAGE_KEY = 'manobhav-booking-hold-id';

export type ProviderSlot = {
  id: string;
  providerProfileId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
};

export type BookingHold = {
  id: string;
  providerProfileId: string;
  slotId: string;
  visitorSessionId?: string | null;
  userId?: string | null;
  intakeSubmissionId?: string | null;
  status: string;
  expiresAtUtc: string;
};

export type Appointment = {
  id: string;
  bookingHoldId: string;
  patientUserId: string;
  providerProfileId: string;
  slotId: string;
  intakeSubmissionId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: string;
  paymentStatus: string;
};

export async function createBookingHoldForProvider(input: {
  providerId: string;
  selectedDateIso: string;
  selectedSlotId?: string;
  signal?: AbortSignal;
}): Promise<BookingHold> {
  const intakeSubmissionId = readActiveIntakeSubmissionId();
  if (!intakeSubmissionId) {
    throw new Error('Complete intake before booking a provider.');
  }

  const slotId = await resolveSlotId(input.providerId, input.selectedDateIso, input.selectedSlotId, input.signal);
  const hold = await apiRequest<BookingHold>('/api/booking/holds', {
    method: 'POST',
    body: {
      providerId: input.providerId,
      slotId,
      intakeSubmissionId,
    },
    signal: input.signal,
  });
  window.sessionStorage.setItem(BOOKING_HOLD_STORAGE_KEY, hold.id);
  return hold;
}

export async function finalizeStoredBookingHold(signal?: AbortSignal): Promise<Appointment | null> {
  const holdId = window.sessionStorage.getItem(BOOKING_HOLD_STORAGE_KEY);
  if (!holdId) {
    return null;
  }

  const appointment = await apiRequest<Appointment>(
    `/api/booking/holds/${encodeURIComponent(holdId)}/finalize`,
    {
      method: 'POST',
      signal,
    },
  );
  window.sessionStorage.removeItem(BOOKING_HOLD_STORAGE_KEY);
  return appointment;
}

export function hasStoredBookingHold(): boolean {
  return Boolean(window.sessionStorage.getItem(BOOKING_HOLD_STORAGE_KEY));
}

async function resolveSlotId(
  providerId: string,
  selectedDateIso: string,
  selectedSlotId?: string,
  signal?: AbortSignal,
): Promise<string> {
  if (selectedSlotId) {
    return selectedSlotId;
  }

  const slots = await getProviderSlotsForDate(providerId, selectedDateIso, signal);
  const slot = slots.find((item) => item.status === 'Available');
  if (!slot) {
    throw new Error('No available slot was found for the selected date.');
  }

  return slot.id;
}

async function getProviderSlotsForDate(providerId: string, selectedDateIso: string, signal?: AbortSignal): Promise<ProviderSlot[]> {
  if (!selectedDateIso) {
    throw new Error('Choose a provider date before booking.');
  }

  const { from, to } = getUtcDateRange(selectedDateIso);
  return apiRequest<ProviderSlot[]>(
    `/api/public/providers/${encodeURIComponent(providerId)}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    {
      signal,
    },
  );
}

function readActiveIntakeSubmissionId(): string {
  return window.sessionStorage.getItem(ACTIVE_INTAKE_SUBMISSION_STORAGE_KEY)?.trim() ?? '';
}

function getUtcDateRange(dateIso: string): { from: string; to: string } {
  const from = new Date(`${dateIso}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from: from.toISOString(), to: to.toISOString() };
}
