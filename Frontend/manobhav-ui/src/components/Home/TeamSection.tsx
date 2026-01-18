import { ArrowRight } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { Button } from '../../shared/primitives/Button';
import { TherapistCard } from '../../shared/cards/TherapistCard';

const therapists = [
  { name: 'Dr. Ananya Rao', role: 'Clinical Psychologist', availability: 'Available Today' },
  { name: 'Sarah Jenkins', role: 'Wellness Coach', availability: 'Next slot: 2 PM' },
  { name: 'David Chen', role: 'Psychiatrist', availability: 'Available Tomorrow' },
  { name: 'Dr. Alisha K.', role: 'Child Specialist', availability: 'Available Today' },
];

export function TeamSection() {
  return (
    <section className="py-24 bg-white/50 px-6 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-[#F5F5F5] to-transparent" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <Text variant="caption" className="text-[#9CAF88] mb-2">
              Our Specialists
            </Text>
            <Text variant="h2" className="text-slate-800">
              Meet our compassionate experts
            </Text>
          </div>
          <Button variant="secondary" icon={ArrowRight}>
            View all specialists
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {therapists.map((therapist) => (
            <TherapistCard key={therapist.name} {...therapist} />
          ))}
        </div>
      </div>
    </section>
  );
}
