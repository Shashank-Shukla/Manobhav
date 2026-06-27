import { useEffect, useState, useSyncExternalStore } from 'react';
import { type AuthSession, fetchAuthSession, getStoredAuthSession, subscribeAuthSession } from './cognitoAuth';

type AuthSessionState = {
  session: AuthSession | null;
  loading: boolean;
};

/**
 * Reads the shared auth session. Every consumer subscribes to the same external store, so once any
 * instance (a route guard, the NavBar, a dashboard) loads the session, all of them reflect it — no
 * more stale per-component copies showing "Login" while the user is actually signed in.
 *
 * `loading` is derived (not setState'd inside the effect) and only true while the first lookup is
 * still pending: there is no session yet and we haven't finished an attempt to fetch one.
 */
export function useAuthSession(): AuthSessionState {
  const session = useSyncExternalStore(subscribeAuthSession, getStoredAuthSession, getStoredAuthSession);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (getStoredAuthSession() !== null) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    void fetchAuthSession(controller.signal).finally(() => {
      if (active) {
        setAttempted(true);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return { session, loading: session === null && !attempted };
}
