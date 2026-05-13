import type { ComponentProps } from 'react';
import { LoginRoute } from '../features/login';

export function LoginPage(props: ComponentProps<typeof LoginRoute>) {
  return <LoginRoute {...props} />;
}

export default LoginPage;
