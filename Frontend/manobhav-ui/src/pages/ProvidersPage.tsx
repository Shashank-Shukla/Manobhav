import type { ComponentProps } from 'react';
import { ProvidersRoute } from '../features/providers';

export function ProvidersPage(props: ComponentProps<typeof ProvidersRoute>) {
  return <ProvidersRoute {...props} />;
}

export default ProvidersPage;
