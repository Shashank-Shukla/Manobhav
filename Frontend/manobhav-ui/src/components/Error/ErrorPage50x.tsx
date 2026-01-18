import { ErrorScreenBase } from './ErrorScreenBase';

type Props = {
  onRetry?: () => void;
  onHome: () => void;
};

export function ErrorPage50x({ onRetry, onHome }: Props) {
  return (
    <ErrorScreenBase
      title="We’re taking a mindful pause"
      message="Our servers need a moment. Try again in a bit, or head back home."
      accentColor="#B0CED6"
      illustration="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
      action={{ label: onRetry ? 'Try again' : 'Back to home', onClick: onRetry || onHome }}
    />
  );
}
