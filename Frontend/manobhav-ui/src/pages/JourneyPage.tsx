import type { ComponentProps } from 'react';
import { JourneyRoute } from '../features/journey';

export function JourneyPage(props: ComponentProps<typeof JourneyRoute>) {
  return <JourneyRoute {...props} />;
}

export default JourneyPage;
