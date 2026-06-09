import { apiRequest } from '../../shared/api/apiClient';
import type { ProviderRecord } from '../providers';

export type FeaturedExpert = {
  id: string;
  name: string;
  role: string;
  availability: string;
};

export type LandingContent = {
  featuredExperts: FeaturedExpert[];
};

export type VisitorFlowQuestion = {
  id: string;
  stepOrder: number;
  text: string;
};

export type VisitorFlow = {
  flowKey: string;
  questions: VisitorFlowQuestion[];
};

export async function getLandingContent(signal?: AbortSignal): Promise<LandingContent> {
  return apiRequest<LandingContent>('/api/public/landing', { includeAuth: false, signal });
}

export async function getVisitorFlow(signal?: AbortSignal): Promise<VisitorFlow> {
  return apiRequest<VisitorFlow>('/api/public/visitor-flow', { includeAuth: false, signal });
}

export async function getProviders(signal?: AbortSignal): Promise<ProviderRecord[]> {
  return apiRequest<ProviderRecord[]>('/api/public/providers', { includeAuth: false, signal });
}
