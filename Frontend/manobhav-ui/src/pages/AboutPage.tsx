import { useRef } from 'react';
import { AboutHero } from '../components/About/AboutHero';
import { OriginStory } from '../components/About/OriginStory';
import { VisionSection } from '../components/About/VisionSection';

export function AboutPage() {
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
    </div>
  );
}

export default AboutPage;
