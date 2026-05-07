import type { ComponentProps } from 'react';
import { PatientOnboardingRoute } from '../../features/patient-onboarding';

export function OnboardingPatientPage(props: ComponentProps<typeof PatientOnboardingRoute>) {
  return <PatientOnboardingRoute {...props} />;
}

export default OnboardingPatientPage;
