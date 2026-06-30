import { useNavigate } from 'react-router-dom';
import { AboutHero } from './components/AboutHero';
import { CarePhilosophy } from './components/CarePhilosophy';
import { FounderSection } from './components/FounderSection';
import { OriginStory } from './components/OriginStory';
import { TeamIntro } from './components/TeamIntro';
import { VisionSection } from './components/VisionSection';

export function AboutPage() {
  const navigate = useNavigate();

  // Normal vertically-scrolling page (like FAQ): all sections stack and the window scrolls. The hero's
  // scroll indicator nudges the page down by roughly a viewport instead of paging section-by-section.
  const scrollToNextSection = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: 'smooth' });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <AboutHero onAdvanceSection={scrollToNextSection} />
      <VisionSection />
      <OriginStory />
      <FounderSection />
      <CarePhilosophy />
      <TeamIntro onExploreProviders={() => navigate('/providers')} />
    </div>
  );
}

export default AboutPage;
