import { ArrowRight, Heart, MessageCircle, Smile } from 'lucide-react';
import { AbstractShape } from '../../shared/primitives/AbstractShape';
import { Button } from '../../shared/primitives/Button';
import { Text } from '../../shared/primitives/Text';
import { theme } from '../../utils/theme';

export function HeroSection() {
  return (
    <section id="about" className="relative min-h-screen pt-32 pb-20 px-6 flex items-center overflow-hidden">
      <div className="absolute top-0 right-0 w-2/3 h-full bg-[#E6EDE8]/30 -z-10 rounded-l-[100px] translate-x-20" />
      <AbstractShape color={theme.colors.dustyRose.DEFAULT} className="top-20 left-10 w-64 h-64 animate-blob" />
      <AbstractShape color={theme.colors.powderBlue.DEFAULT} className="bottom-20 right-20 w-96 h-96 animate-blob animation-delay-2000" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 z-10">
          <Text variant="h1" className="leading-tight text-slate-800">
            Find your{' '}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-[#9CAF88] text-5xl md:text-7xl">inner peace</span>
              <svg className="absolute bottom-1 left-0 w-full h-3 -z-10 text-[#D6A2AD]/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
            <br />
            today.
          </Text>
          <Text variant="body" className="text-lg text-gray-600 max-w-lg">
            Connect with licensed therapists and discover a harmonious path to mental clarity. Your journey to a balanced mind starts here.
          </Text>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" icon={ArrowRight}>Get Started</Button>
            <Button variant="secondary" icon={MessageCircle}>How it works</Button>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div className="relative w-full aspect-square max-w-lg mx-auto">
            <div className="absolute inset-4 bg-white/40 backdrop-blur-sm rounded-full border border-white/60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
                alt="Calm illustration"
                className="w-[82%] h-[82%] object-contain drop-shadow-xl"
                loading="lazy"
              />
            </div>

            <div className="absolute top-10 right-0 bg-white p-4 rounded-2xl shadow-lg animate-bounce duration-[3000ms] border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <Smile size={20} />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Mood</div>
                  <div className="text-sm font-bold text-gray-700">Excellent</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-20 left-0 bg-white p-4 rounded-2xl shadow-lg animate-pulse border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                  <Heart size={20} />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Heart Rate</div>
                  <div className="text-sm font-bold text-gray-700">72 bpm</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
