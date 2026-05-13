import { CalendarCheck, ClipboardList, IndianRupee, Users } from 'lucide-react';

export const metricIcons = {
  'sessions-today': CalendarCheck,
  'provider-utilization': Users,
  'care-followups': ClipboardList,
  'pending-payouts': IndianRupee,
};

export function includesSearch(values: Array<string | number>, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return values.some((value) => String(value).toLowerCase().includes(query));
}
