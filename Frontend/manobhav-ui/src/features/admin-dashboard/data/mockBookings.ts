import type { BookingRecord, SlotRecord } from '../types';

export const bookings: BookingRecord[] = [
  {
    id: 'book-001',
    patientName: 'Aarav Sharma',
    providerName: 'Dr. Kavya Rao',
    date: 'May 7',
    time: '5:00 PM',
    status: 'Needs confirmation',
    tone: 'red',
    type: 'Video',
    payment: 'Package active',
    reschedules: 1,
  },
  {
    id: 'book-002',
    patientName: 'Meera Iyer',
    providerName: 'Mrs. Provider-2',
    date: 'May 8',
    time: '11:00 AM',
    status: 'Payment pending',
    tone: 'amber',
    type: 'Video',
    payment: 'Pending',
    reschedules: 0,
  },
  {
    id: 'book-003',
    patientName: 'Rohan Mehta',
    providerName: 'Mr. Therapist-1',
    date: 'May 9',
    time: '7:00 PM',
    status: 'Confirmed',
    tone: 'sage',
    type: 'Video',
    payment: 'Paid',
    reschedules: 0,
  },
  {
    id: 'book-004',
    patientName: 'Sara Khan',
    providerName: 'Dr. Provider-1',
    date: 'May 10',
    time: '4:30 PM',
    status: 'Reschedule requested',
    tone: 'rose',
    type: 'Video',
    payment: 'Refund requested',
    reschedules: 2,
  },
];

export const slots: SlotRecord[] = [
  { id: 'slot-001', providerName: 'Dr. Kavya Rao', day: 'Today', open: 2, booked: 7, blocked: 1 },
  { id: 'slot-002', providerName: 'Mrs. Provider-2', day: 'Today', open: 1, booked: 8, blocked: 0 },
  { id: 'slot-003', providerName: 'Mr. Therapist-1', day: 'Tomorrow', open: 5, booked: 4, blocked: 1 },
  { id: 'slot-004', providerName: 'Dr. Provider-1', day: 'Tomorrow', open: 3, booked: 6, blocked: 2 },
];
