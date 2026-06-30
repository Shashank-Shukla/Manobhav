import { useNavigate } from 'react-router-dom';
import { AboutHero } from './components/AboutHero';
import { CarePhilosophy } from './components/CarePhilosophy';
import { FounderSection } from './components/FounderSection';
import { OriginStory } from './components/OriginStory';
import { TeamIntro } from './components/TeamIntro';
import { VisionSection } from './components/VisionSection';

export function AboutPage() {
  const navigate = useNavigate();

  // Normal vertically-scrolling page (like FAQ): all sections stack and the window scrolls.
  return (
    <div className="animate-in fade-in duration-500">
      <AboutHero />
      <VisionSection />
      <OriginStory />
      <FounderSection />
      <CarePhilosophy />
      <TeamIntro onExploreProviders={() => navigate('/providers')} />
    </div>
  );
}

export default AboutPage;
