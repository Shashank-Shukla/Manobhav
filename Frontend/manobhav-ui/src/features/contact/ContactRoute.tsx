import { useState } from 'react';
import { Instagram, LifeBuoy, Mail, Phone } from 'lucide-react';
import { Text } from '../../shared/primitives/Text';
import { ContactMethodRow } from './ContactMethodRow';
import { UrgentHelpModal } from './UrgentHelpModal';

// TODO: replace with real business number
const PLACEHOLDER_PHONE = '+91 00000 00000';

const CONTACT_EMAIL = 'manobhavcounsellingservices@gmail.com';
const INSTAGRAM_URL = 'https://www.instagram.com/manobhavwellness';

export function ContactPage() {
  const [isUrgentOpen, setIsUrgentOpen] = useState(false);

  return (
    <div className="animate-in fade-in duration-500 bg-white">
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-28 md:pt-32">
        <Text variant="caption" className="text-[#8BAAB3]">
          Contact
        </Text>

        <Text variant="h1" className="mt-6 max-w-3xl text-[#243b6b]">
          Don't hesitate to reach out to us
        </Text>

        <Text variant="body" className="mt-6 max-w-xl text-lg text-gray-600">
          Whether you have a question, need support, or simply want to say hello, we are here and glad to hear from you.
        </Text>

        <div className="mt-14 md:mt-20">
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
            value={PLACEHOLDER_PHONE}
            href={`tel:${PLACEHOLDER_PHONE.replace(/\s/g, '')}`}
          />
        </div>

        <div className="mt-14">
          <button
            type="button"
            onClick={() => setIsUrgentOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black bg-[#FACC15] px-7 py-4 text-base font-semibold text-black transition-colors duration-300 hover:bg-black hover:text-white"
          >
            <LifeBuoy size={20} />
            Get help urgently
          </button>
        </div>
      </section>

      <UrgentHelpModal open={isUrgentOpen} onClose={() => setIsUrgentOpen(false)} />
    </div>
  );
}

export default ContactPage;
