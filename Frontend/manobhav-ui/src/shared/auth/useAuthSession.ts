import { useEffect, useState } from 'react';
import { type AuthSession, fetchAuthSession, getStoredAuthSession } from './cognitoAuth';

type AuthSessionState = {
  session: AuthSession | null;
  loading: boolean;
};

export function useAuthSession(): AuthSessionState {
  const cached = getStoredAuthSession();
  const [state, setState] = useState<AuthSessionState>({ session: cached, loading: cached === null });

  useEffect(() => {
    if (cached) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    void fetchAuthSession(controller.signal)
      .then((session) => setActiveSession(active, setState, session))
      .catch(() => setActiveSession(active, setState, null));

    return () => {
      active = false;
      controller.abort();
    };
  }, [cached]);

  return state;
}

function setActiveSession(
  active: boolean,
  setState: (state: AuthSessionState) => void,
  session: AuthSession | null,
): void {
  if (active) {
    setState({ session, loading: false });
  }
}
