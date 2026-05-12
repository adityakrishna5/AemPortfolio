import { useState, useEffect } from 'react';
import { getUserInfo, refreshToken, AuthUser } from './authService';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * React hook that fetches the current auth state once on mount.
 * On a 401 (expired access token) it first attempts a silent refresh using
 * the HttpOnly refresh-token cookie before marking the user as unauthenticated.
 *
 * Usage:
 *   const { user, isAuthenticated, isLoading } = useAuth();
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    getUserInfo()
      .then(async (user) => {
        if (user !== null) {
          setState({ user, isAuthenticated: true, isLoading: false });
        } else {
          // Access token may be expired — try a silent refresh then retry once.
          const refreshed = await refreshToken();
          if (refreshed) {
            const retried = await getUserInfo();
            setState({ user: retried, isAuthenticated: retried !== null, isLoading: false });
          } else {
            setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        }
      })
      .catch(() =>
        setState({ user: null, isAuthenticated: false, isLoading: false }),
      );
  }, []);

  return state;
}

