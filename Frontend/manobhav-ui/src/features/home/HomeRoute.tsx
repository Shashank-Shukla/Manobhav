import { ErrorBoundary } from '../../shared/error/ErrorBoundary';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { TeamSection } from './components/TeamSection';

type HomePageProps = {
  onStartJourney?: () => void;
  onContact?: () => void;
};

export function HomePage({ onStartJourney, onContact }: HomePageProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <ErrorBoundary context="hero" fallback={null}>
        <HeroSection onStartJourney={onStartJourney} onContact={onContact} />
      </ErrorBoundary>
      <ErrorBoundary context="services" fallback={null}>
        <ServicesSection />
      </ErrorBoundary>
      <ErrorBoundary context="team" fallback={null}>
        <TeamSection />
      </ErrorBoundary>
    </div>
  );
}
