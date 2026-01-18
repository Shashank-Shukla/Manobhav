import { Text } from '../primitives/Text';

type TherapistCardProps = {
  name: string;
  role: string;
  availability: string;
};

export function TherapistCard({ name, role, availability }: TherapistCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-[#D6A2AD]/30">
      <div className="w-24 h-24 rounded-full bg-[#E6EDE8] mb-4 overflow-hidden relative group-hover:bg-[#D6A2AD] transition-colors">
        <svg className="w-full h-full text-[#7A8C6A] p-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      </div>
      <Text variant="h3" className="text-lg">
        {name}
      </Text>
      <Text variant="body" className="text-sm text-gray-500 mb-4">
        {role}
      </Text>
      <div className="flex items-center gap-2 text-xs font-medium text-[#9CAF88] bg-[#E6EDE8] px-3 py-1 rounded-full">
        <div className="w-2 h-2 rounded-full bg-[#9CAF88] animate-pulse" />
        {availability}
      </div>
    </div>
  );
}
