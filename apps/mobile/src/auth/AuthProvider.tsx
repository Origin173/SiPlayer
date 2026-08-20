import { useQueryClient } from '@tanstack/react-query';
import {
  QrStartDataSchema,
  QrStatusDataSchema,
  UserProfileSchema,
  type QrStartData,
  type QrStatusData,
  type UserProfile,
} from '@siplayer/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { apiClient } from '../api/client';
import { ApiError } from '../api/clientCore';
import { clearSessionToken, getSessionToken, setSessionToken } from './session';
import { setSessionExpiredListener } from './sessionEvents';

export interface AuthController {
  user: UserProfile | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  startQr: () => Promise<QrStartData>;
  pollQr: (challengeId: string) => Promise<QrStatusData>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthController | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const expireSession = useCallback(async () => {
    try {
      await clearSessionToken();
    } finally {
      queryClient.removeQueries({ queryKey: ['me'] });
      if (mountedRef.current) setUser(null);
    }
  }, [queryClient]);

  useEffect(() => setSessionExpiredListener(expireSession), [expireSession]);

  const refresh = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) {
      if (mountedRef.current) setUser(null);
      return;
    }
    try {
      const response = await apiClient.request('/v1/auth/me', undefined, UserProfileSchema);
      if (mountedRef.current) setUser(response.data);
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'AUTH_EXPIRED' || error.code === 'AUTH_REQUIRED')) {
        await expireSession();
        return;
      }
      throw error;
    }
  }, [expireSession]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh()
      .catch(() => {
        if (mountedRef.current) setUser(null);
      })
      .finally(() => {
        if (mountedRef.current) setIsHydrating(false);
      });
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  const startQr = useCallback(async () => {
    const response = await apiClient.request('/v1/auth/qr/start', { method: 'POST', body: '{}' }, QrStartDataSchema);
    return response.data;
  }, []);

  const pollQr = useCallback(async (challengeId: string) => {
    const response = await apiClient.request(`/v1/auth/qr/${encodeURIComponent(challengeId)}`, undefined, QrStatusDataSchema);
    if (response.data.status === 'AUTHORIZED') {
      await setSessionToken(response.data.sessionToken);
      if (mountedRef.current) setUser(response.data.user);
    }
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (await getSessionToken()) await apiClient.request('/v1/auth/logout', { method: 'POST', body: '{}' });
    } catch {
      // A revoked or expired server session is already logged out.
    } finally {
      await expireSession();
    }
  }, [expireSession]);

  const value = useMemo<AuthController>(
    () => ({ user, isHydrating, isAuthenticated: Boolean(user), refresh, startQr, pollQr, logout }),
    [isHydrating, logout, pollQr, refresh, startQr, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthController {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
