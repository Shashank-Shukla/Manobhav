import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { LifeBuoy } from 'lucide-react';
import { focusAreasTaxonomy } from '../provider-onboarding';

const URGENT_EMAIL = 'manobhavcounsellingservices@gmail.com';
const focusAreaLabels = focusAreasTaxonomy.map((category) => category.label);

type UrgentHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function UrgentHelpModal({ open, onClose }: UrgentHelpModalProps) {
  const [reason, setReason] = useState('');
  const [focusArea, setFocusArea] = useState(focusAreaLabels[0]);

  const canSubmit = reason.trim().length > 0;

  // Reset the form whenever the dialog closes (Cancel, backdrop/Escape, or after sending) so reopening
  // always starts fresh. Done in the close handler rather than an effect to avoid setState-in-effect.
  const handleClose = () => {
    setReason('');
    setFocusArea(focusAreaLabels[0]);
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const subject = encodeURIComponent('Urgent help request');
    const body = encodeURIComponent(`Focus area: ${focusArea}\n\nReason:\n${reason.trim()}`);
    window.location.href = `mailto:${URGENT_EMAIL}?subject=${subject}&body=${body}`;
    handleClose();
  };

  return (
    <Dialog
      aria-labelledby="urgent-help-title"
      fullWidth
      maxWidth="sm"
      onClose={handleClose}
      open={open}
      scroll="paper"
      PaperProps={{ style: { backgroundColor: '#EBF5F7' } }}
    >
      <DialogTitle id="urgent-help-title">
        <span className="inline-flex items-center gap-2 text-[#243b6b]">
          <LifeBuoy size={22} />
          Get help urgently
        </span>
      </DialogTitle>
      <DialogContent dividers>
        <p className="mb-5 text-sm leading-6 text-slate-700">
          Tell us briefly what is happening and the area you need support with. We will follow up over email.
        </p>

        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="urgent-reason">
              Reason
            </label>
            <textarea
              autoFocus
              id="urgent-reason"
              name="reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Share what you are going through right now."
              rows={4}
              value={reason}
              className="w-full resize-y rounded-2xl border border-[#B0CED6] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#8BAAB3] focus:ring-2 focus:ring-[#B0CED6]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="urgent-focus-area">
              Focus area
            </label>
            <select
              id="urgent-focus-area"
              name="focusArea"
              onChange={(event) => setFocusArea(event.target.value)}
              value={focusArea}
              className="w-full rounded-2xl border border-[#B0CED6] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#8BAAB3] focus:ring-2 focus:ring-[#B0CED6]"
            >
              {focusAreaLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-[#B0CED6] bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#DCEEF1]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-full bg-[#243b6b] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c2f55] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send request
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
