import { Activity, ClipboardList, Users } from 'lucide-react';
import type { InsightMetric, QueueItem } from '../types';

export const insightMetrics: InsightMetric[] = [
  {
    id: 'sessions-today',
    label: 'Sessions today',
    value: '28',
    delta: '+12%',
    helper: '9 completed, 16 scheduled, 3 pending confirmation',
    tone: 'sage',
  },
  {
    id: 'provider-utilization',
    label: 'Provider utilization',
    value: '82%',
    delta: '+6%',
    helper: 'Across active therapists this week',
    tone: 'blue',
  },
  {
    id: 'care-followups',
    label: 'Care follow-ups',
    value: '11',
    delta: '4 urgent',
    helper: 'Requires admin or provider response',
    tone: 'rose',
  },
  {
    id: 'pending-payouts',
    label: 'Pending payouts',
    value: 'Rs. 1.82L',
    delta: '6 approvals',
    helper: 'Hybrid salary and session incentives',
    tone: 'amber',
  },
];

export const opsQueues: QueueItem[] = [
  {
    id: 'risk-followup',
    title: 'High-risk patient follow-up',
    meta: 'Aarav Sharma needs same-day clinical review',
    status: 'Urgent',
    tone: 'red',
  },
  {
    id: 'slot-gap',
    title: 'Evening slot shortage',
    meta: 'Only 2 open slots after 6 PM this week',
    status: 'Capacity',
    tone: 'amber',
  },
  {
    id: 'interview',
    title: 'Provider interview pending',
    meta: 'Dr. Nisha Patel credential check complete',
    status: 'Hiring',
    tone: 'blue',
  },
  {
    id: 'payroll',
    title: 'Payroll approval batch',
    meta: '6 provider payouts awaiting review',
    status: 'Salary',
    tone: 'rose',
  },
];

export const quickActions: QueueItem[] = [
  {
    id: 'assign-provider',
    title: 'Assign provider',
    meta: 'Match new intake with open clinical capacity',
    status: 'Patients',
    tone: 'sage',
  },
  {
    id: 'open-slots',
    title: 'Open evening slots',
    meta: 'Review provider calendar gaps for this week',
    status: 'Bookings',
    tone: 'blue',
  },
  {
    id: 'approve-payout',
    title: 'Approve payout',
    meta: 'Validate hybrid salary adjustments',
    status: 'Salary',
    tone: 'rose',
  },
  {
    id: 'review-record',
    title: 'Review clinical record',
    meta: 'Open high-risk patient history',
    status: 'Clinical',
    tone: 'red',
  },
];

export const careSignals = [
  { label: 'Completed sessions', value: 72, icon: Activity },
  { label: 'On-time follow-ups', value: 84, icon: ClipboardList },
  { label: 'Provider load balance', value: 76, icon: Users },
];
