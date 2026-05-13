import type { HiringCandidate } from '../types';

export const hiringCandidates: HiringCandidate[] = [
  {
    id: 'hire-001',
    name: 'Dr. Nisha Patel',
    role: 'Clinical Psychologist',
    stage: 'Credential review',
    tone: 'blue',
    score: 92,
    credentialStatus: 'Verified',
    nextStep: 'Panel interview',
  },
  {
    id: 'hire-002',
    name: 'Aditi Menon',
    role: 'Expressive Arts Therapist',
    stage: 'Interview',
    tone: 'sage',
    score: 86,
    credentialStatus: 'Pending references',
    nextStep: 'Founder conversation',
  },
  {
    id: 'hire-003',
    name: 'Kabir Sethi',
    role: 'Counsellor',
    stage: 'Application screen',
    tone: 'amber',
    score: 74,
    credentialStatus: 'Needs review',
    nextStep: 'Portfolio review',
  },
  {
    id: 'hire-004',
    name: 'Ritika Shah',
    role: 'Therapist',
    stage: 'Offer',
    tone: 'rose',
    score: 89,
    credentialStatus: 'Verified',
    nextStep: 'Compensation approval',
  },
];
