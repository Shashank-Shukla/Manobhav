export const providerDashboardData = {
  provider: {
    name: 'Dr. Asha Rao',
    shortName: 'Dr. Asha',
    role: 'Clinical Psychologist',
    focus: 'Mindfulness and trauma-informed care',
    avatarInitials: 'AR',
    profileHref: '/dashboard/provider#dashboard-overview',
  },
  notifications: {
    unreadCount: 3,
  },
  calendarDays: [
    { id: '2026-06-15', dayName: 'Mon', dateLabel: '15', ariaLabel: 'Monday, Jun 15', appointmentCount: 1, isToday: false },
    { id: '2026-06-16', dayName: 'Tue', dateLabel: '16', ariaLabel: 'Tuesday, Jun 16', appointmentCount: 2, isToday: false },
    { id: '2026-06-17', dayName: 'Wed', dateLabel: '17', ariaLabel: 'Wednesday, Jun 17', appointmentCount: 1, isToday: false },
    { id: '2026-06-18', dayName: 'Thu', dateLabel: '18', ariaLabel: 'Today, Thursday, Jun 18', appointmentCount: 3, isToday: true },
    { id: '2026-06-19', dayName: 'Fri', dateLabel: '19', ariaLabel: 'Friday, Jun 19', appointmentCount: 2, isToday: false },
    { id: '2026-06-20', dayName: 'Sat', dateLabel: '20', ariaLabel: 'Saturday, Jun 20', appointmentCount: 1, isToday: false },
    { id: '2026-06-21', dayName: 'Sun', dateLabel: '21', ariaLabel: 'Sunday, Jun 21', appointmentCount: 0, isToday: false },
  ],
  todayAppointments: [
    {
      id: 'appt-meera',
      patientName: 'Meera Iyer',
      time: '10:00 AM',
      mode: 'Video session',
      focus: 'Anxiety follow-up',
    },
    {
      id: 'appt-rohan',
      patientName: 'Rohan Kapoor',
      time: '1:30 PM',
      mode: 'Clinic visit',
      focus: 'Sleep routine review',
    },
    {
      id: 'appt-ananya',
      patientName: 'Ananya Sen',
      time: '4:15 PM',
      mode: 'Video session',
      focus: 'Care plan check-in',
    },
  ],
  weeklyMetrics: [
    { id: 'sessions', label: 'Sessions', value: '18', helper: '+4 this week' },
    { id: 'completion', label: 'Completion', value: '92%', helper: 'On-time notes' },
    { id: 'followups', label: 'Follow-ups', value: '7', helper: 'Pending outreach' },
  ],
  myAppointments: [
    { id: 'next-1', patientName: 'Kabir Shah', time: 'Tomorrow, 9:30 AM', type: 'Initial consult' },
    { id: 'next-2', patientName: 'Nisha Menon', time: 'Fri, 11:00 AM', type: 'Couples session' },
    { id: 'next-3', patientName: 'Aarav Das', time: 'Sat, 2:00 PM', type: 'Progress review' },
  ],
  backlogTodos: {
    searchAppointmentPatient: 'TODO: Search appointment/patient control',
    addPatient: 'TODO: Add patient action',
    providerSettings: 'TODO: Provider-specific settings action',
  },
} as const;

export type ProviderDashboardData = typeof providerDashboardData;
