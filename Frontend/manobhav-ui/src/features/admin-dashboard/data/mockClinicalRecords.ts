import type { ClinicalRecord } from '../types';

export const clinicalRecords: ClinicalRecord[] = [
  {
    id: 'clin-001',
    patientId: 'pat-001',
    patientName: 'Aarav Sharma',
    riskLevel: 'High',
    tone: 'red',
    intakeSummary: 'Sleep disruption, anxiety spikes, and recent work-related distress. Safety check required today.',
    carePlan: 'Weekly CBT-informed therapy, grounding protocol, provider follow-up after two missed check-ins.',
    medicationNotes: 'No medication records stored in Manobhav. Referred to psychiatrist if symptoms escalate.',
    lastUpdated: 'Today, 12:05 PM',
    sessionNotes: [
      {
        date: 'May 2',
        provider: 'Dr. Kavya Rao',
        note: 'Patient reported lower sleep quality but used breathing routine twice. Continue structured check-ins.',
      },
      {
        date: 'May 5',
        provider: 'Dr. Kavya Rao',
        note: 'Session rescheduled. Admin asked to confirm support call because risk score increased.',
      },
    ],
  },
  {
    id: 'clin-002',
    patientId: 'pat-002',
    patientName: 'Meera Iyer',
    riskLevel: 'Moderate',
    tone: 'blue',
    intakeSummary: 'Burnout, relationship stress, and difficulty sustaining routines after work hours.',
    carePlan: 'Short-term therapy with habit coaching, reflective prompts, and fortnightly progress review.',
    medicationNotes: 'No active medication note.',
    lastUpdated: 'Yesterday, 7:00 PM',
    sessionNotes: [
      {
        date: 'May 4',
        provider: 'Mrs. Provider-2',
        note: 'Initial session completed. Patient prefers structured exercises and evening availability.',
      },
    ],
  },
  {
    id: 'clin-003',
    patientId: 'pat-003',
    patientName: 'Rohan Mehta',
    riskLevel: 'Low',
    tone: 'sage',
    intakeSummary: 'Mood steadiness and motivation support. Strong adherence to between-session tasks.',
    carePlan: 'Maintain CBT exercises and monthly review after the next three completed sessions.',
    medicationNotes: 'No active medication note.',
    lastUpdated: 'May 6, 10:10 AM',
    sessionNotes: [
      {
        date: 'Apr 28',
        provider: 'Mr. Therapist-1',
        note: 'Mood tracking improved. Next session should review routine consistency and work boundaries.',
      },
    ],
  },
  {
    id: 'clin-004',
    patientId: 'pat-004',
    patientName: 'Sara Khan',
    riskLevel: 'Moderate',
    tone: 'amber',
    intakeSummary: 'Panic episodes and sleep difficulty. Patient requested pause after cancellation.',
    carePlan: 'Admin follow-up to rebook or close refund path. Provider suggests check-in before care pause.',
    medicationNotes: 'External psychiatrist mentioned by patient; no documents uploaded.',
    lastUpdated: 'May 3, 3:30 PM',
    sessionNotes: [
      {
        date: 'Apr 26',
        provider: 'Dr. Provider-1',
        note: 'Patient responded well to grounding routine. Follow-up recommended within one week.',
      },
    ],
  },
];
