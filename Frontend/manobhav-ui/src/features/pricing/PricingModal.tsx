import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';

const WHATSAPP_NUMBER = '917827948680';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// lucide-react ships no WhatsApp brand glyph, so we inline the official logo (24×24, currentColor).
function WhatsAppIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.405z" />
    </svg>
  );
}

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
            <WhatsAppIcon size={30} />
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
            <WhatsAppIcon size={18} />
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
