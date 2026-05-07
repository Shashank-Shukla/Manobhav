import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';

type Props = {
  onBack: () => void;
};

export function OnboardingPatientPage({ onBack }: Props) {
  return (
    <div className="max-w-5xl mx-auto py-16 px-6 space-y-8">
      <div className="flex justify-between items-center">
        <Text variant="h2">Patient Onboarding</Text>
        <Button variant="secondary" onClick={onBack}>Back</Button>
      </div>
      <Text variant="body" className="text-gray-600">
        Help us tailor your care: tell us your goals, preferences, and any accessibility needs. (Form to be implemented.)
      </Text>
      <div className="grid gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">Profile & contact</div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">Goals & concerns</div>
        <div className="p-4 rounded-2xl border border-gray-200 bg-white/70">Scheduling preferences</div>
      </div>
      <Button variant="primary">Continue</Button>
    </div>
  );
}

export default OnboardingPatientPage;
