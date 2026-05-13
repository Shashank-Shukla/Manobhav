import type { ComponentProps } from 'react';
import { HomeRoute } from '../features/home';

export function HomePage(props: ComponentProps<typeof HomeRoute>) {
  return <HomeRoute {...props} />;
}

export default HomePage;
