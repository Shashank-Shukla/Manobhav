import { Instagram, Mail, Phone } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { ContactMethodRow } from './ContactMethodRow';

const CONTACT_PHONE = '+91 78279 48680';
const CONTACT_EMAIL = 'manobhavcounsellingservices@gmail.com';
const INSTAGRAM_URL = 'https://www.instagram.com/manobhavwellness';
const WHATSAPP_URL = 'https://wa.me/917827948680';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.405z" />
    </svg>
  );
}

export function ContactPage() {
  return (
    <div className="animate-in fade-in duration-500 bg-[#F5F1EC]">
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-28 md:pt-32">
        <Text variant="caption" className="text-[#84956E] tracking-[0.28em]" color="#84956E">
          Contact
        </Text>

        <Text
          variant="h1"
          className="mt-6 max-w-3xl font-playfair text-[2.75rem] leading-tight tracking-tight text-[#4D4037] sm:text-5xl md:text-6xl"
        >
          Don't hesitate to reach out to us
        </Text>

        <Text variant="body" className="mt-6 max-w-xl text-lg text-[#5F5A55]">
          Whether you have a question, need support, or simply want to say hello, we are here and glad to hear from you.
        </Text>

        <div className="mt-14 overflow-hidden rounded-[2rem] border border-[#E8DDD8] bg-white p-8 shadow-[0_30px_80px_rgba(120,100,88,0.08)] md:p-10">
          <ContactMethodRow
            icon={Mail}
            label="Email"
            value={CONTACT_EMAIL}
            href={`mailto:${CONTACT_EMAIL}`}
          />
          <ContactMethodRow
            icon={Instagram}
            label="Instagram"
            value="@manobhavwellness"
            href={INSTAGRAM_URL}
            external
          />
          <ContactMethodRow
            icon={Phone}
            label="Call"
            value={CONTACT_PHONE}
            href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
          />
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="group fixed right-4 bottom-6 z-50 inline-flex items-center gap-3 rounded-full bg-[#9CAF88] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(156,175,136,0.28)] transition-transform duration-300 hover:-translate-y-1 hover:bg-[#7A8C6A] md:right-8 md:bottom-8"
        >
          <WhatsAppIcon className="h-5 w-5" />
          <span>Chat on WhatsApp</span>
        </a>
      </section>
    </div>
  );
}

export default ContactPage;
