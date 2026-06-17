import { forwardRef, useState } from 'react';
import type { ChangeEvent, ReactElement, Ref } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slide from '@mui/material/Slide';
import type { TransitionProps } from '@mui/material/transitions';
import type { IntakeConsentSection } from '../public-data';

type ConsentDialogProps = {
  onClose: () => void;
  onComplete: () => void;
  open: boolean;
  sections?: IntakeConsentSection[];
};

const requiredConsentSectionNumbers = [5, 6, 7] as const;

const DialogTransition = forwardRef(function DialogTransition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function ConsentDialog({ onClose, onComplete, open, sections }: ConsentDialogProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Record<number, boolean>>({});
  const consentSections = getCompleteApiConsentSections(sections);
  const isUnavailable = consentSections.length !== requiredConsentSectionNumbers.length;
  const activeSection = consentSections[activeIndex] ?? consentSections[0];
  const isLastSection = !isUnavailable && activeIndex === consentSections.length - 1;
  const isSectionComplete = activeSection ? completedSections[activeSection.sectionNumber] === true : false;

  const handleCompletionChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setCompletedSections((sections) => ({
      ...sections,
      [activeSection.sectionNumber]: checked,
    }));
  };

  const handlePrimaryAction = () => {
    if (!isSectionComplete) return;
    if (isLastSection) {
      onComplete();
      return;
    }

    setActiveIndex((index) => index + 1);
  };

  if (isUnavailable) {
    return (
      <Dialog
        aria-labelledby="intake-consent-title"
        fullWidth
        maxWidth="sm"
        onClose={onClose}
        open={open}
        scroll="paper"
        TransitionComponent={DialogTransition}
      >
        <DialogTitle id="intake-consent-title">Consent terms unavailable</DialogTitle>
        <DialogContent dividers>
          <p className="text-sm leading-6 text-slate-700">
            Consent terms are temporarily unavailable. Please close this window and try again in a moment.
          </p>
        </DialogContent>
        <DialogActions className="flex justify-end gap-2 px-6 py-4">
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
          <Button disabled variant="contained">
            Finish consent
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      aria-labelledby="intake-consent-title"
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
      scroll="paper"
      TransitionComponent={DialogTransition}
    >
      <DialogTitle id="intake-consent-title">{activeSection.title}</DialogTitle>
      <DialogContent dividers>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Section {activeSection.sectionNumber} of 7
        </p>
        <ul className="space-y-3 text-sm leading-6 text-slate-700">
          {activeSection.items.map((item) => (
            <li className="rounded-md bg-slate-50 px-3 py-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </DialogContent>
      <DialogActions className="flex flex-col items-stretch gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <FormControlLabel
          control={<Checkbox checked={isSectionComplete} onChange={handleCompletionChange} />}
          label={`Section ${activeSection.sectionNumber} complete`}
        />
        <div className="flex justify-end gap-2">
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
          <Button disabled={!isSectionComplete} onClick={handlePrimaryAction} variant="contained">
            {isLastSection ? 'Finish consent' : 'Continue'}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}

function getCompleteApiConsentSections(sections: IntakeConsentSection[] | undefined): IntakeConsentSection[] {
  if (!sections) {
    return [];
  }

  const sectionsByNumber = new Map(sections.map((section) => [section.sectionNumber, section]));
  return requiredConsentSectionNumbers
    .map((sectionNumber) => sectionsByNumber.get(sectionNumber))
    .filter((section): section is IntakeConsentSection => Boolean(section));
}
