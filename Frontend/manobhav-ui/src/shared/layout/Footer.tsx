import { useState } from 'react';
import { Logo } from '../Logo';
import { PricingModal } from '../../features/pricing';

export function Footer() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  return (
    <footer className="bg-[#f2f4f5] pt-20 pb-10 px-6 border-t border-slate-200">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-2">
          <Logo className="mb-4" />
          <p className="mt-6 text-gray-500 max-w-xs leading-relaxed">
            Manobhav is dedicated to making mental healthcare accessible, approachable, and effective for everyone.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-6">Platform</h4>
          <ul className="space-y-4 text-gray-500">
            <li><a href="/providers" className="hover:text-[#D6A2AD]">Browse Therapists</a></li>
            <li><a href="/faq" className="hover:text-[#D6A2AD]">FAQ</a></li>
            <li><button type="button" onClick={() => setIsPricingOpen(true)} className="hover:text-[#D6A2AD]">Pricing</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-6">Company</h4>
          <ul className="space-y-4 text-gray-500">
            <li><a href="/about" className="hover:text-[#D6A2AD]">About Us</a></li>
            <li><a href="/disclaimer" className="hover:text-[#D6A2AD]">Disclaimer</a></li>
            <li><a href="/login?mode=sign-up&returnTo=%2Fonboarding%2Fprovider" className="hover:text-[#D6A2AD]">Careers</a></li>
            <li><a href="/contact" className="hover:text-[#D6A2AD]">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 text-sm text-gray-400">
        <p>&copy; 2026 Manobhav Wellbeing. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="/disclaimer?panel=privacy" className="hover:text-[#D6A2AD]">Privacy</a>
          <a href="/disclaimer?panel=terms" className="hover:text-[#D6A2AD]">Terms</a>
          <a href="/disclaimer?panel=refunds" className="hover:text-[#D6A2AD]">Refunds</a>
        </div>
      </div>

      <PricingModal open={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </footer>
  );
}
