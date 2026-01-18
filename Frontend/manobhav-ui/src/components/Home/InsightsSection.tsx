import { ShieldCheck } from 'lucide-react';
import { AbstractShape } from '../../shared/primitives/AbstractShape';

export function InsightsSection() {
  return (
    <section id="insights" className="py-24 px-6 bg-transparent">
      <div className="max-w-7xl mx-auto bg-[#9CAF88] rounded-[3rem] p-12 md:p-20 relative overflow-hidden text-center md:text-left shadow-xl">
        <AbstractShape color="#FFFFFF" className="top-0 right-0 w-96 h-96 opacity-10" />

        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">Nurture your mind with daily insights</h2>
            <p className="text-green-50 text-lg">
              Join 25,000+ subscribers receiving our weekly newsletter on mental wellness, productivity, and happiness.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-green-100 focus:outline-none focus:bg-white/20 backdrop-blur-md"
              />
              <button className="px-8 py-4 rounded-full bg-white text-[#9CAF88] font-bold hover:bg-green-50 transition-colors shadow-lg">
                Subscribe
              </button>
            </div>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 max-w-sm shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-white">
                  <div className="font-bold">Daily Tip</div>
                  <div className="text-xs text-green-100">Just now</div>
                </div>
              </div>
              <p className="text-white text-lg font-medium">"Be kind to yourself. You are doing the best you can."</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
