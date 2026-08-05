import { useState } from 'react';
import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';
import { Input } from '../../shared/primitives/Input';
import { ApiError } from '../../shared/api/apiClient';
import { completeIntakeProfile } from '../patient-dashboard';
import { finalizeStoredBookingHold, hasStoredBookingHold, ACTIVE_INTAKE_SUBMISSION_STORAGE_KEY } from '../providers';

type Props = {
  onBack: () => void;
  onComplete: () => void;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  address: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
};

const initialForm: FormState = {
  fullName: '',
  email: '',
  phone: '',
  preferredName: '',
  dateOfBirth: '',
  gender: '',
  occupation: '',
  address: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
};

export function PatientOnboardingRoute({ onBack, onComplete }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    const submissionId = readActiveIntakeSubmissionId();
    if (!submissionId) {
      setError('No active intake submission found. Please complete the intake form first.');
      return;
    }

    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!form.emergencyContactName.trim() || !form.emergencyContactPhone.trim()) {
      setError('Emergency contact name and phone are required.');
      return;
    }

    setSubmitting(true);
    try {
      await completeIntakeProfile(submissionId, {
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        preferredName: form.preferredName.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender.trim() || null,
        occupation: form.occupation.trim() || null,
        address: form.address.trim() || null,
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactRelation: form.emergencyContactRelation.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
      });

      if (hasStoredBookingHold()) {
        await finalizeStoredBookingHold();
      }

      window.sessionStorage.removeItem(ACTIVE_INTAKE_SUBMISSION_STORAGE_KEY);
      onComplete();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Text variant="h2">Complete Your Profile</Text>
          <Button variant="ghost" onClick={onBack} className="text-sm">
            Back
          </Button>
        </div>

        <Text variant="body" className="text-gray-600">
          We need a few details to set up your account and finalize your appointment.
        </Text>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
            <Text variant="body" className="text-red-600 text-sm">
              {error}
            </Text>
          </div>
        )}

        <div className="space-y-4">
          <FormField label="Full Name" required>
            <Input
              type="text"
              placeholder="Your full name"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
            />
          </FormField>

          <FormField label="Preferred Name">
            <Input
              type="text"
              placeholder="What should we call you?"
              value={form.preferredName}
              onChange={(e) => update('preferredName', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Email">
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </FormField>

            <FormField label="Phone">
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date of Birth">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
            </FormField>

            <FormField label="Gender">
              <Input
                type="text"
                placeholder="Optional"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Occupation">
            <Input
              type="text"
              placeholder="Optional"
              value={form.occupation}
              onChange={(e) => update('occupation', e.target.value)}
            />
          </FormField>

          <FormField label="Address">
            <Input
              type="text"
              placeholder="City, State"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </FormField>

          <div className="pt-4">
            <Text variant="h3" className="mb-3">
              Emergency Contact
            </Text>
          </div>

          <FormField label="Contact Name" required>
            <Input
              type="text"
              placeholder="Emergency contact name"
              value={form.emergencyContactName}
              onChange={(e) => update('emergencyContactName', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Relationship">
              <Input
                type="text"
                placeholder="e.g. Parent, Spouse"
                value={form.emergencyContactRelation}
                onChange={(e) => update('emergencyContactRelation', e.target.value)}
              />
            </FormField>

            <FormField label="Phone" required>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.emergencyContactPhone}
                onChange={(e) => update('emergencyContactPhone', e.target.value)}
              />
            </FormField>
          </div>

          <div className="pt-4">
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Complete & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function readActiveIntakeSubmissionId(): string {
  return window.sessionStorage.getItem(ACTIVE_INTAKE_SUBMISSION_STORAGE_KEY)?.trim() ?? '';
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export default PatientOnboardingRoute;
