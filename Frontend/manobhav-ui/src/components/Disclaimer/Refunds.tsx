import { RotateCcw } from 'lucide-react';
import disclaimerPolicies from '../../assets/disclaimerPolicies.json';
import { PolicyPanel } from './PolicyPanel';

type RefundsProps = {
  className?: string;
  mode?: 'card' | 'modal';
  onOpen?: () => void;
  onClose?: () => void;
};

export function Refunds({ className = '', mode = 'card', onOpen, onClose }: RefundsProps) {
  return (
    <PolicyPanel
      className={className}
      mode={mode}
      onOpen={onOpen}
      onClose={onClose}
      icon={RotateCcw}
      accent="#d9d3a8"
      content={disclaimerPolicies.refunds}
    />
  );
}
