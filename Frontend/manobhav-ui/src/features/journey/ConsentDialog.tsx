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
import TextField from '@mui/material/TextField';
import type { TransitionProps } from '@mui/material/transitions';
import type { IntakeConsentSection } from '../public-data';

type ConsentDialogProps = {
  onClose: () => void;
  onComplete: (typedName: string) => Promise<void> | void;
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
  const [signatureName, setSignatureName] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const consentSections = getCompleteApiConsentSections(sections);
  const isUnavailable = consentSections.length !== requiredConsentSectionNumbers.length;
  const activeSection = consentSections[activeIndex] ?? consentSections[0];
  const isLastSection = !isUnavailable && activeIndex === consentSections.length - 1;
  const signedName = signatureName.trim();
  const isSectionComplete = activeSection ? completedSections[activeSection.sectionNumber] === true : false;
  const canContinue = isLastSection ? signedName.length > 0 && !isCompleting : isSectionComplete;
  const displayItems = getDisplayConsentItems(activeSection, isLastSection);

  const handleCompletionChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setCompletedSections((sections) => ({
      ...sections,
      [activeSection.sectionNumber]: checked,
    }));
  };

  const handlePrimaryAction = async () => {
    if (!canContinue) return;
    if (isLastSection) {
      setIsCompleting(true);
      setCompletionError('');
      try {
        await onComplete(signedName);
      } catch {
        setCompletionError('We could not save your consent just now. Please try again.');
      } finally {
        setIsCompleting(false);
      }
      return;
    }

    setCompletionError('');
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
            I Agree
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
          {activeIndex + 1}/3
        </p>
        <ul className="space-y-3 text-sm leading-6 text-slate-700">
          {displayItems.map((item) => (
            <li className="rounded-md bg-slate-50 px-3 py-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
        {isLastSection && (
          <div className="mt-5 space-y-3">
            <TextField
              autoFocus
              fullWidth
              label="Signature name"
              onChange={(event) => setSignatureName(event.target.value)}
              value={signatureName}
            />
            <p className="text-sm text-slate-600">Date: {formatConsentDate(new Date())}</p>
            {completionError && <p className="text-sm font-medium text-rose-700">{completionError}</p>}
          </div>
        )}
      </DialogContent>
      <DialogActions className="flex flex-col items-stretch gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {!isLastSection && (
          <FormControlLabel
            control={<Checkbox checked={isSectionComplete} onChange={handleCompletionChange} />}
            label="I Agree"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
          <Button disabled={!canContinue} onClick={() => void handlePrimaryAction()} variant="contained">
            {isLastSection ? 'I Agree' : 'Continue'}
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

function formatConsentDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function getDisplayConsentItems(section: IntakeConsentSection | undefined, isSignatureStep: boolean): string[] {
  const items = section?.items ?? [];
  if (!isSignatureStep) {
    return items;
  }

  return items.filter((item) => !/signature\s*:/i.test(item));
}
