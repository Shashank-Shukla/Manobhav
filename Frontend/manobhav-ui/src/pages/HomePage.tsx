import { ArrowRight, BookOpen, Heart, MessageCircle, ShieldCheck, Smile, User, Wind } from 'lucide-react';
import { AbstractShape } from '../components/primitives/AbstractShape';
import { Button } from '../components/primitives/Button';
import { Text } from '../components/primitives/Text';
import { FeatureCard } from '../components/cards/FeatureCard';
import { TherapistCard } from '../components/cards/TherapistCard';
import { theme } from '../utils/theme';

const therapists = [
  { name: 'Dr. Ananya Rao', role: 'Clinical Psychologist', availability: 'Available Today' },
  { name: 'Sarah Jenkins', role: 'Wellness Coach', availability: 'Next slot: 2 PM' },
  { name: 'David Chen', role: 'Psychiatrist', availability: 'Available Tomorrow' },
  { name: 'Dr. Alisha K.', role: 'Child Specialist', availability: 'Available Today' },
];

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

const HeroSection = () => (
  <section id="about" className="relative min-h-screen pt-32 pb-20 px-6 flex items-center overflow-hidden">
    <div className="absolute top-0 right-0 w-2/3 h-full bg-[#E6EDE8]/30 -z-10 rounded-l-[100px] translate-x-20" />
    <AbstractShape color={theme.colors.dustyRose.DEFAULT} className="top-20 left-10 w-64 h-64 animate-blob" />
    <AbstractShape color={theme.colors.powderBlue.DEFAULT} className="bottom-20 right-20 w-96 h-96 animate-blob animation-delay-2000" />

    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-8 z-10">
        <Text variant="h1" className="leading-tight text-slate-800">
          Find your{' '}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10 text-[#9CAF88] text-5xl md:text-7xl">inner peace</span>
            <svg className="absolute bottom-1 left-0 w-full h-3 -z-10 text-[#D6A2AD]/30" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
          <br />
          today.
        </Text>
        <Text variant="body" className="text-lg text-gray-600 max-w-lg">
          Connect with licensed therapists and discover a harmonious path to mental clarity. Your journey to a balanced mind starts here.
        </Text>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" icon={ArrowRight}>Get Started</Button>
          <Button variant="secondary" icon={MessageCircle}>How it works</Button>
        </div>
      </div>

        <div className="relative z-10 hidden lg:block">
          <div className="relative w-full aspect-square max-w-lg mx-auto">
             <div className="absolute inset-4 bg-white/40 backdrop-blur-sm rounded-full border border-white/60" />
             <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
                  alt="Calm illustration"
                  className="w-[82%] h-[82%] object-contain drop-shadow-xl"
                />
             </div>

          <div className="absolute top-10 right-0 bg-white p-4 rounded-2xl shadow-lg animate-bounce duration-[3000ms] border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <Smile size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400">Mood</div>
                <div className="text-sm font-bold text-gray-700">Excellent</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-20 left-0 bg-white p-4 rounded-2xl shadow-lg animate-pulse border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <Heart size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400">Heart Rate</div>
                <div className="text-sm font-bold text-gray-700">72 bpm</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ServicesSection = () => (
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

const TeamSection = () => (
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

const InsightsSection = () => (
  <section id="insights" className="py-24 px-6 bg-transparent">
    <div className="max-w-7xl mx-auto bg-[#9CAF88] rounded-[3rem] p-12 md:p-20 relative overflow-hidden text-center md:text-left shadow-xl">
      <AbstractShape color="#FFFFFF" className="top-0 right-0 w-96 h-96 opacity-10" />

      <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">Nurture your mind with daily insights</h2>
          <p className="text-green-50 text-lg">
            Join 25,000+ subscribers receiving our weekly newsletter on mental wellness, productivity, and happiness.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-green-100 focus:outline-none focus:bg-white/20 backdrop-blur-md"
            />
            <button className="px-8 py-4 rounded-full bg-white text-[#9CAF88] font-bold hover:bg-green-50 transition-colors shadow-lg">
              Subscribe
            </button>
          </div>
        </div>
        <div className="hidden md:flex justify-end">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 max-w-sm shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                <ShieldCheck size={20} />
              </div>
              <div className="text-white">
                <div className="font-bold">Daily Tip</div>
                <div className="text-xs text-green-100">Just now</div>
              </div>
            </div>
            <p className="text-white text-lg font-medium">"Be kind to yourself. You are doing the best you can."</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export function HomePage() {
  return (
    <div className="animate-in fade-in duration-500">
      <HeroSection />
      <ServicesSection />
      <TeamSection />
      <InsightsSection />
    </div>
  );
}
