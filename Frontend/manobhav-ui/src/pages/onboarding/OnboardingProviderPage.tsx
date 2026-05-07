import type { ComponentProps } from 'react';
import { ProviderOnboardingRoute } from '../../features/provider-onboarding';

export function OnboardingProviderPage(props: ComponentProps<typeof ProviderOnboardingRoute>) {
  return <ProviderOnboardingRoute {...props} />;
}

export default OnboardingProviderPage;
