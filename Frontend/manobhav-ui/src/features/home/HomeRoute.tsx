import { ErrorBoundary } from '../../shared/error/ErrorBoundary';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { TeamSection } from './components/TeamSection';
import { InsightsSection } from './components/InsightsSection';

type HomePageProps = {
  onStartJourney?: () => void;
};

export function HomePage({ onStartJourney }: HomePageProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <ErrorBoundary context="hero" fallback={null}>
        <HeroSection onStartJourney={onStartJourney} />
      </ErrorBoundary>
      <ErrorBoundary context="services" fallback={null}>
        <ServicesSection />
      </ErrorBoundary>
      <ErrorBoundary context="team" fallback={null}>
        <TeamSection />
      </ErrorBoundary>
      <ErrorBoundary context="insights" fallback={null}>
        <InsightsSection />
      </ErrorBoundary>
    </div>
  );
}
