import { ErrorScreenBase } from './ErrorScreenBase';

type Props = {
  onHome: () => void;
};

export function ErrorPageGeneric({ onHome }: Props) {
  return (
    <ErrorScreenBase
      title="Something feels off"
      message="We hit a snag while loading this part of Manobhav. Take a breath and try again."
      accentColor="#D6A2AD"
      illustration="/girl-in-pink-panties-with-a-heart-in-her-hand-sitting-on-the-floor-vector.svg"
      action={{ label: 'Back to home', onClick: onHome }}
    />
  );
}
