import { ErrorScreenBase } from './ErrorScreenBase';

type Props = {
  onRetry?: () => void;
  onHome: () => void;
};

export function ErrorPage50x({ onRetry, onHome }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ErrorScreenBase
        title="We’re taking a mindful pause"
        message="Our servers need a moment. Try again in a bit, or head back home."
        accentColor="#B0CED6"
        illustration="/homepage-picture.png"
        action={{ label: onRetry ? 'Try again' : 'Back to home', onClick: onRetry || onHome }}
      />
    </div>
  );
}
