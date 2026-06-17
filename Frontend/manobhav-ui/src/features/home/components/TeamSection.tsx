import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Text } from '../../../shared/primitives/Text';
import { Button } from '../../../shared/primitives/Button';
import { TherapistCard } from '../../../shared/cards/TherapistCard';
import { getLandingContent, type FeaturedExpert } from '../../public-data';

export function TeamSection() {
  const [therapists, setTherapists] = useState<FeaturedExpert[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    getLandingContent(controller.signal)
      .then((content) => {
        setTherapists(content.featuredExperts);
        setStatus(content.featuredExperts.length > 0 ? 'ready' : 'empty');
      })
      .catch(() => {
        setTherapists([]);
        setStatus('error');
      });

    return () => controller.abort();
  }, []);

  if (status === 'empty') {
    return null;
  }

  return (
    <section className="py-24 bg-white/50 px-6 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-[#F5F5F5] to-transparent" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <Text variant="caption" className="text-[#9CAF88] mb-2">
              Our Specialists
            </Text>
            <Text variant="h2" className="text-slate-800">
              Meet our compassionate experts
            </Text>
          </div>
          <Button variant="secondary" icon={ArrowRight}>
            View all specialists
          </Button>
        </div>

        {status === 'loading' && (
          <div className="grid md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-3xl border border-gray-100 bg-white/70" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-800">
            Unable to load specialists from the API.
          </div>
        )}

        {status === 'ready' && (
          <div className="grid md:grid-cols-4 gap-6">
            {therapists.map((therapist) => (
              <TherapistCard key={therapist.id} {...therapist} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
