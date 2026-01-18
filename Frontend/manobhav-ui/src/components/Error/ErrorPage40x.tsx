import { ErrorScreenBase } from './ErrorScreenBase';

type Props = {
  onHome: () => void;
};

export function ErrorPage40x({ onHome }: Props) {
  return (
    <ErrorScreenBase
      title="We can't find that"
      message="This page wandered off the path. Let’s get you back to a calm place."
      accentColor="#9CAF88"
      illustration="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
      action={{ label: 'Back to home', onClick: onHome }}
    />
  );
}
