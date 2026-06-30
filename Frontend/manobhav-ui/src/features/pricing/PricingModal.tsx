import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { MessageCircle } from 'lucide-react';

// TODO: replace with real WhatsApp business number
const PLACEHOLDER_WHATSAPP = '910000000000';
const WHATSAPP_URL = `https://wa.me/${PLACEHOLDER_WHATSAPP}`;

type PricingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PricingModal({ open, onClose }: PricingModalProps) {
  return (
    <Dialog
      aria-labelledby="pricing-title"
      fullWidth
      maxWidth="xs"
      onClose={onClose}
      open={open}
      PaperProps={{ style: { borderRadius: 24 } }}
    >
      <DialogContent>
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <span className="inline-flex items-center justify-center rounded-2xl bg-[#E6EDE8] p-4 text-[#7A8C6A]">
            <MessageCircle size={30} />
          </span>

          <h2 id="pricing-title" className="mt-6 text-2xl font-semibold tracking-tight text-[#2D3748]">
            Personalized pricing
          </h2>

          <p className="mt-3 max-w-xs leading-relaxed text-gray-600">
            Reach out to our team to get a personalized pricing plan catering to your exact needs.
          </p>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#9CAF88] px-7 py-3 font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <MessageCircle size={18} />
            Chat on WhatsApp
          </a>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
