import type { LucideIcon } from 'lucide-react';

export type AdminModule =
  | 'today'
  | 'patients'
  | 'providers'
  | 'bookings'
  | 'hiring'
  | 'salary'
  | 'insights'
  | 'clinical-records';

export type StatusTone = 'sage' | 'rose' | 'blue' | 'amber' | 'grey' | 'red';

export type AdminModuleConfig = {
  id: AdminModule;
  label: string;
  helper: string;
  path: string;
  icon: LucideIcon;
};

export type InsightMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  helper: string;
  tone: StatusTone;
};

export type QueueItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
  tone: StatusTone;
};

export type BookingHistoryItem = {
  date: string;
  provider: string;
  status: string;
  payment: string;
};

export type PatientRecord = {
  id: string;
  name: string;
  age: number;
  status: string;
  tone: StatusTone;
  assignedProvider: string;
  nextSession: string;
  paymentStatus: string;
  intakeStatus: string;
  riskLevel: string;
  concern: string;
  sessionsCompleted: number;
  lastContact: string;
  clinicalRecordId: string;
  bookingHistory: BookingHistoryItem[];
};

export type ProviderRecord = {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: StatusTone;
  specialities: string[];
  load: number;
  nextOpenSlot: string;
  sessionsThisMonth: number;
  rating: number;
  salaryBand: string;
  utilization: number;
};

export type BookingRecord = {
  id: string;
  patientName: string;
  providerName: string;
  date: string;
  time: string;
  status: string;
  tone: StatusTone;
  type: string;
  payment: string;
  reschedules: number;
};

export type SlotRecord = {
  id: string;
  providerName: string;
  day: string;
  open: number;
  booked: number;
  blocked: number;
};

export type HiringCandidate = {
  id: string;
  name: string;
  role: string;
  stage: string;
  tone: StatusTone;
  score: number;
  credentialStatus: string;
  nextStep: string;
};

export type CompensationRecord = {
  id: string;
  providerName: string;
  fixedSalary: number;
  completedSessions: number;
  incentive: number;
  deductions: number;
  netPayout: number;
  status: string;
  tone: StatusTone;
};

export type ClinicalSessionNote = {
  date: string;
  provider: string;
  note: string;
};

export type ClinicalRecord = {
  id: string;
  patientId: string;
  patientName: string;
  riskLevel: string;
  tone: StatusTone;
  intakeSummary: string;
  carePlan: string;
  medicationNotes: string;
  lastUpdated: string;
  sessionNotes: ClinicalSessionNote[];
};
