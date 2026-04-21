import { LockKeyhole } from 'lucide-react';
import disclaimerPolicies from '../../assets/disclaimerPolicies.json';
import { PolicyPanel } from './PolicyPanel';

type PrivacyProps = {
  className?: string;
  mode?: 'card' | 'modal';
  onOpen?: () => void;
  onClose?: () => void;
};

export function Privacy({ className = '', mode = 'card', onOpen, onClose }: PrivacyProps) {
  return (
    <PolicyPanel
      className={className}
      mode={mode}
      onOpen={onOpen}
      onClose={onClose}
      icon={LockKeyhole}
      accent="#cfe0df"
      content={disclaimerPolicies.privacy}
    />
  );
}
