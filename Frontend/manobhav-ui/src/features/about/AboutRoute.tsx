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
    if (nextIndex < 0 || nextIndex >= TOTAL_SECTIONS || nextIndex === currentIndex || transitionLockRef.current) {
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        goNext();
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrevious]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) {
      return;
    }

    if (event.deltaY > 0) {
      goNext();
    } else {
      goPrevious();
    }
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

    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta > 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    touchStartY.current = null;
    touchEndY.current = null;
  };

  const activeSection =
    currentIndex === 0 ? (
      <AboutHero onAdvanceSection={goNext} />
    ) : currentIndex === 1 ? (
      <VisionSection />
    ) : currentIndex === 2 ? (
      <OriginStory />
    ) : currentIndex === 3 ? (
      <FounderSection />
    ) : currentIndex === 4 ? (
      <CarePhilosophy />
    ) : (
      <TeamIntro onExploreProviders={() => navigate('/providers')} />
    );

  const transitionClass =
    transitionPhase === 'exiting'
      ? direction > 0
        ? 'animate-about-section-exit-up'
        : 'animate-about-section-exit-down'
      : transitionPhase === 'entering'
        ? direction > 0
          ? 'animate-about-section-enter-up'
          : 'animate-about-section-enter-down'
        : '';

  return (
    <div
      className="relative h-full min-h-0 overflow-hidden animate-in fade-in duration-500"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`h-full min-h-0 overflow-hidden ${transitionClass}`}>{activeSection}</div>
    </div>
  );
}

export default AboutPage;
