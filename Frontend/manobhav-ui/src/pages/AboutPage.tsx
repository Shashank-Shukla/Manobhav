import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AboutHero } from '../components/About/AboutHero';
import { CarePhilosophy } from '../components/About/CarePhilosophy';
import { FounderSection } from '../components/About/FounderSection';
import { OriginStory } from '../components/About/OriginStory';
import { TeamIntro } from '../components/About/TeamIntro';
import { VisionSection } from '../components/About/VisionSection';

export function AboutPage() {
  const navigate = useNavigate();
  const visionRef = useRef<HTMLDivElement | null>(null);

  const scrollToVision = () => {
    visionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <AboutHero onScrollToVision={scrollToVision} />
      <div ref={visionRef}>
        <VisionSection />
      </div>
      <OriginStory />
      <FounderSection />
      <CarePhilosophy />
      <TeamIntro onExploreProviders={() => navigate('/providers')} />
    </div>
  );
}

export default AboutPage;
