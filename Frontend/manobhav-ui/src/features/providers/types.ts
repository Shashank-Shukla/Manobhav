export type ProvidersRouteProps = {
  onBackHome: () => void;
  onBook: () => void;
};

export type ProviderDateOption = {
  display: string;
  iso: string;
};

export type ProviderRecord = {
  id: string;
  name: string;
  summary: string;
  specializations: string[];
  avatarColor: string;
  nextDates: ProviderDateOption[];
  longDescription: string;
  shortDescription: string;
  sessions: number;
  rating: number;
};
