import { FileText } from 'lucide-react';
import disclaimerPolicies from '../../assets/disclaimerPolicies.json';
import { PolicyPanel } from './PolicyPanel';

type TermsProps = {
  className?: string;
  mode?: 'card' | 'modal';
  onOpen?: () => void;
  onClose?: () => void;
};

export function Terms({ className = '', mode = 'card', onOpen, onClose }: TermsProps) {
  return (
    <PolicyPanel
      className={className}
      mode={mode}
      onOpen={onOpen}
      onClose={onClose}
      icon={FileText}
      accent="#efd5cb"
      content={disclaimerPolicies.terms}
    />
  );
}
