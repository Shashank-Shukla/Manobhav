import { startTransition, useCallback, useEffect, useRef, useState, type TouchEvent, type WheelEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AboutHero } from './components/AboutHero';
import { CarePhilosophy } from './components/CarePhilosophy';
import { FounderSection } from './components/FounderSection';
import { OriginStory } from './components/OriginStory';
import { TeamIntro } from './components/TeamIntro';
import { VisionSection } from './components/VisionSection';

type Direction = 1 | -1;
type TransitionPhase = 'idle' | 'exiting' | 'entering';

const EXIT_MS = 220;
const ENTER_MS = 340;
const SWIPE_THRESHOLD = 48;
const WHEEL_THRESHOLD = 24;
const TOTAL_SECTIONS = 6;

export function AboutPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [direction, setDirection] = useState<Direction>(1);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const transitionLockRef = useRef(false);
  const exitTimeoutRef = useRef<number | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);

  const clearTransitionTimers = useCallback(() => {
    if (exitTimeoutRef.current !== null) {
      window.clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
    if (enterTimeoutRef.current !== null) {
      window.clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
  }, []);

  const goToSection = useCallback((nextIndex: number) => {
    if (cannotChangeSection(nextIndex, currentIndex, transitionLockRef.current)) {
      return;
    }

    clearTransitionTimers();
    transitionLockRef.current = true;
    const nextDirection: Direction = nextIndex > currentIndex ? 1 : -1;

    setDirection(nextDirection);
    setTransitionPhase('exiting');

    exitTimeoutRef.current = window.setTimeout(() => {
      startTransition(() => setCurrentIndex(nextIndex));
      setTransitionPhase('entering');

      enterTimeoutRef.current = window.setTimeout(() => {
        setTransitionPhase('idle');
        transitionLockRef.current = false;
      }, ENTER_MS);
    }, EXIT_MS);
  }, [clearTransitionTimers, currentIndex]);

  const goNext = useCallback(() => goToSection(currentIndex + 1), [currentIndex, goToSection]);
  const goPrevious = useCallback(() => goToSection(currentIndex - 1), [currentIndex, goToSection]);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
      transitionLockRef.current = false;
    };
  }, [clearTransitionTimers]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleAboutKeyDown(event, goNext, goPrevious);

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrevious]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!isWheelNavigation(event.deltaY)) {
      return;
    }

    moveByDelta(event.deltaY, goNext, goPrevious);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.changedTouches[0].clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    touchEndY.current = event.changedTouches[0].clientY;

    if (touchStartY.current === null || touchEndY.current === null) {
      return;
    }

    const delta = touchStartY.current - touchEndY.current;

    if (isSwipeNavigation(delta)) {
      moveByDelta(delta, goNext, goPrevious);
    }

    touchStartY.current = null;
    touchEndY.current = null;
  };

  const transitionClass = getTransitionClass(transitionPhase, direction);

  return (
    <div
      className="relative h-full min-h-0 overflow-hidden animate-in fade-in duration-500"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`h-full min-h-0 overflow-hidden ${transitionClass}`}>
        <AboutSection currentIndex={currentIndex} onAdvanceSection={goNext} onExploreProviders={() => navigate('/providers')} />
      </div>
    </div>
  );
}

function cannotChangeSection(nextIndex: number, currentIndex: number, locked: boolean): boolean {
  if (locked) return true;
  if (nextIndex < 0) return true;
  if (nextIndex >= TOTAL_SECTIONS) return true;
  return nextIndex === currentIndex;
}

function handleAboutKeyDown(event: KeyboardEvent, goNext: () => void, goPrevious: () => void): void {
  if (shouldIgnoreKey(event)) {
    return;
  }

  moveByKey(event, goNext, goPrevious);
}

function shouldIgnoreKey(event: KeyboardEvent): boolean {
  return event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey;
}

function moveByKey(event: KeyboardEvent, goNext: () => void, goPrevious: () => void): void {
  const direction = getKeyboardDirection(event.key);
  if (direction === 0) {
    return;
  }

  event.preventDefault();
  moveByDirection(direction, goNext, goPrevious);
}

function getKeyboardDirection(key: string): Direction | 0 {
  if (key === 'ArrowDown' || key === 'PageDown') return 1;
  if (key === 'ArrowUp' || key === 'PageUp') return -1;
  return 0;
}

function isWheelNavigation(deltaY: number): boolean {
  return Math.abs(deltaY) >= WHEEL_THRESHOLD;
}

function isSwipeNavigation(deltaY: number): boolean {
  return Math.abs(deltaY) >= SWIPE_THRESHOLD;
}

function moveByDelta(deltaY: number, goNext: () => void, goPrevious: () => void): void {
  const direction = deltaY > 0 ? 1 : -1;
  moveByDirection(direction, goNext, goPrevious);
}

function moveByDirection(direction: Direction, goNext: () => void, goPrevious: () => void): void {
  if (direction > 0) {
    goNext();
    return;
  }

  goPrevious();
}

function AboutSection({
  currentIndex,
  onAdvanceSection,
  onExploreProviders,
}: {
  currentIndex: number;
  onAdvanceSection: () => void;
  onExploreProviders: () => void;
}) {
  const sections = [
    <AboutHero key="hero" onAdvanceSection={onAdvanceSection} />,
    <VisionSection key="vision" />,
    <OriginStory key="origin" />,
    <FounderSection key="founder" />,
    <CarePhilosophy key="care" />,
    <TeamIntro key="team" onExploreProviders={onExploreProviders} />,
  ];

  return sections[currentIndex] ?? sections[0];
}

function getTransitionClass(phase: TransitionPhase, direction: Direction): string {
  if (phase === 'idle') {
    return '';
  }

  return getDirectionalTransitionClass(phase, direction);
}

function getDirectionalTransitionClass(phase: Exclude<TransitionPhase, 'idle'>, direction: Direction): string {
  const suffix = direction > 0 ? 'up' : 'down';
  return `animate-about-section-${phase === 'exiting' ? 'exit' : 'enter'}-${suffix}`;
}

export default AboutPage;
