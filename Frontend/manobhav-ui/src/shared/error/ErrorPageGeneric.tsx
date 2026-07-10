import { ErrorScreenBase } from './ErrorScreenBase';

type Props = {
  onHome: () => void;
};

export function ErrorPageGeneric({ onHome }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ErrorScreenBase
        title="Something feels off"
        message="We hit a snag while loading this part of Manobhav. Take a breath and try again."
        accentColor="#D6A2AD"
        illustration="/homepage-picture.png"
        action={{ label: 'Back to home', onClick: onHome }}
      />
    </div>
  );
}
