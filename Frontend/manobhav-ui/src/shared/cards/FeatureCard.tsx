import type { LucideIcon } from 'lucide-react';
import { Text } from '../primitives/Text';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
};

export function FeatureCard({ icon: Icon, title, description, color }: FeatureCardProps) {
  return (
    <div className="p-8 rounded-3xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white border border-gray-100 group">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 group-hover:scale-110" style={{ backgroundColor: color }}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <Text variant="h3" className="mb-3">
        {title}
      </Text>
      <Text variant="body" className="text-gray-500">
        {description}
      </Text>
    </div>
  );
}
