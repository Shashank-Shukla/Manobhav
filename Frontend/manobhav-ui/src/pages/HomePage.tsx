import { ErrorBoundary } from '../component/common/ErrorBoundary';
import { HeroSection } from '../component/Home/HeroSection';
import { ServicesSection } from '../component/Home/ServicesSection';
import { TeamSection } from '../component/Home/TeamSection';
import { InsightsSection } from '../component/Home/InsightsSection';

export function HomePage() {
  return (
    <div className="animate-in fade-in duration-500">
      <ErrorBoundary context="hero" fallback={null}>
        <HeroSection />
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
