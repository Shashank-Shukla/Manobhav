import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { HeroSection } from '../components/Home/HeroSection';
import { ServicesSection } from '../components/Home/ServicesSection';
import { TeamSection } from '../components/Home/TeamSection';
import { InsightsSection } from '../components/Home/InsightsSection';

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
