import providersData from '../../../assets/providers.json';
import { theme } from '../../../utils/theme';
import type { ProviderRecord } from '../types';

type ProviderSource = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  specialities: string[];
  availabilities: string[];
};

const defaultThemeColors = [
  theme.colors.sage.DEFAULT,
  theme.colors.powderBlue.DEFAULT,
  theme.colors.dustyRose.DEFAULT,
];

export const providerDirectory: ProviderRecord[] = (providersData as ProviderSource[]).map((provider, index) => ({
  id: provider.id,
  name: provider.name,
  summary: provider.shortDescription,
  longDescription: provider.longDescription,
  shortDescription: provider.shortDescription,
  specializations: provider.specialities,
  avatarColor: defaultThemeColors[index % defaultThemeColors.length],
  nextDates: provider.availabilities.map((date) => ({
    display: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    iso: new Date(date).toISOString().split('T')[0],
  })),
  sessions: 10 + index * 2,
  rating: 4.2 + (index % 3) * 0.2,
}));
