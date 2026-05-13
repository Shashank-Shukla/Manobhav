import {
  BriefcaseBusiness,
  CalendarDays,
  HeartPulse,
  IndianRupee,
  LayoutDashboard,
  LineChart,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { AdminModule, AdminModuleConfig } from '../types';

export const adminModules: AdminModuleConfig[] = [
  {
    id: 'today',
    label: "Today's Ops",
    helper: 'Daily command center',
    path: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    id: 'patients',
    label: 'Patients',
    helper: 'Profiles and care status',
    path: '/dashboard/admin/patients',
    icon: Users,
  },
  {
    id: 'providers',
    label: 'Providers',
    helper: 'Roster and capacity',
    path: '/dashboard/admin/providers',
    icon: Stethoscope,
  },
  {
    id: 'bookings',
    label: 'Bookings & Slots',
    helper: 'Sessions and availability',
    path: '/dashboard/admin/bookings',
    icon: CalendarDays,
  },
  {
    id: 'hiring',
    label: 'Hiring',
    helper: 'Candidate pipeline',
    path: '/dashboard/admin/hiring',
    icon: BriefcaseBusiness,
  },
  {
    id: 'salary',
    label: 'Salary',
    helper: 'Compensation approvals',
    path: '/dashboard/admin/salary',
    icon: IndianRupee,
  },
  {
    id: 'insights',
    label: 'Insights',
    helper: 'Growth and care health',
    path: '/dashboard/admin/insights',
    icon: LineChart,
  },
  {
    id: 'clinical-records',
    label: 'Clinical Records',
    helper: 'Detailed care history',
    path: '/dashboard/admin/clinical-records',
    icon: HeartPulse,
  },
];

export const adminModuleIds = adminModules.map((module) => module.id);

export function isAdminModule(value: string | undefined): value is AdminModule {
  return adminModuleIds.includes(value as AdminModule);
}
