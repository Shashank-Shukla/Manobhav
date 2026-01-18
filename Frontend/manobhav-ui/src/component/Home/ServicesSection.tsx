import { User, Wind, BookOpen } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { FeatureCard } from '../../shared/cards/FeatureCard';
import { theme } from '../../utils/theme';

const features = [
  {
    icon: User,
    title: '1-on-1 Therapy',
    description: 'Personalized sessions with licensed professionals tailored to your goals.',
    color: theme.colors.sage.DEFAULT,
  },
  {
    icon: Wind,
    title: 'Meditation Guides',
    description: 'Mindfulness exercises to help you find calm in daily life.',
    color: theme.colors.powderBlue.DEFAULT,
  },
  {
    icon: BookOpen,
    title: 'Self-Paced Journeys',
    description: 'Structured programs to build resilience and emotional intelligence.',
    color: theme.colors.dustyRose.DEFAULT,
  },
];

export function ServicesSection() {
  return (
    <section id="talk-to-us" className="py-24 px-6 bg-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <Text variant="caption" className="text-[#D6A2AD] mb-2">
            Our Services
          </Text>
          <Text variant="h2" className="mb-4 text-slate-800">
            Holistic Care for Your Mind
          </Text>
          <Text variant="body" className="text-gray-500">
            We provide a safe space for you to heal, grow, and thrive with our comprehensive mental health services.
          </Text>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
