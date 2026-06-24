import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { useDatabase } from '@/db';
import { settingsRepository } from '@/db/repositories';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthValue {
  user: AuthUser | null;
  accessToken: string | null;
  serverUrl: string;
  isLoading: boolean;
  setServerUrl: (url: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (code: string, redirectUri: string) => Promise<void>;
  loginWithGitHub: (code: string) => Promise<void>;
  getValidToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used within <AuthProvider>');
  return v;
}

// ── JWT helpers (no external lib — just decode payload for expiry check) ──────

function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    const seg = token.split('.')[1];
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenFresh(token: string | null): boolean {
  if (!token) return false;
  const p = jwtPayload(token);
  if (!p || typeof p.exp !== 'number') return false;
  return p.exp * 1000 > Date.now() + 30_000; // 30 s buffer
}

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const p = jwtPayload(token);
  if (!p || typeof p.sub !== 'string' || typeof p.email !== 'string') return null;
  return { id: p.sub, email: p.email };
}

// ── Secure storage — web falls back to localStorage ───────────────────────────

const KEY_ACCESS = 'auth.accessToken';
const KEY_REFRESH = 'auth.refreshToken';

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? (window.localStorage.getItem(key) ?? null) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
}

async function loadStoredTokens() {
  const [access, refresh] = await Promise.all([secureGet(KEY_ACCESS), secureGet(KEY_REFRESH)]);
  return { access, refresh };
}

// Strip trailing /sync (P12 legacy) and trailing slashes from the server URL.
function normalizeUrl(url: string): string {
  return url
    .trim()
    .replace(/\/sync\/?$/, '')
    .replace(/\/+$/, '');
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const db = useDatabase();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [serverUrl, setServerUrlState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Refs so async callbacks always see the latest values without stale closures.
  const refreshTokenRef = useRef<string | null>(null);
  const serverUrlRef = useRef('');
  // useLayoutEffect updates refs synchronously after render so that event-handler
  // callbacks fired in the same paint see the current values.
  useLayoutEffect(() => {
    refreshTokenRef.current = refreshToken;
    serverUrlRef.current = serverUrl;
  });

  // Deduplicates concurrent refresh calls — prevents double-rotating a session.
  const inflightRefresh = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      settingsRepository
        .getAll(db)
        .then((s) => normalizeUrl((s['sync.serverUrl'] as string | undefined) ?? '')),
      loadStoredTokens(),
    ]).then(([url, { access, refresh }]) => {
      if (cancelled) return;
      setServerUrlState(url);
      setAccessToken(access);
      setRefreshToken(refresh);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const storeTokens = useCallback(async (access: string, refresh: string) => {
    await Promise.all([secureSet(KEY_ACCESS, access), secureSet(KEY_REFRESH, refresh)]);
    setAccessToken(access);
    setRefreshToken(refresh);
  }, []);

  const clearTokens = useCallback(async () => {
    await Promise.all([secureDelete(KEY_ACCESS), secureDelete(KEY_REFRESH)]);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const setServerUrl = useCallback(
    (url: string) => {
      const normalized = normalizeUrl(url);
      setServerUrlState(normalized);
      settingsRepository.set(db, 'sync.serverUrl', normalized);
    },
    [db],
  );

  // ── Auth API calls ───────────────────────────────────────────────────────────

  async function authPost(
    path: string,
    body: object,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const base = serverUrlRef.current;
    if (!base) throw new Error('No server URL configured');
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, string>;
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data as { accessToken: string; refreshToken: string };
  }

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authPost('/auth/login', { email, password });
      await storeTokens(data.accessToken, data.refreshToken);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeTokens],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const data = await authPost('/auth/register', { email, password });
      await storeTokens(data.accessToken, data.refreshToken);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeTokens],
  );

  const loginWithGoogle = useCallback(
    async (code: string, redirectUri: string) => {
      const data = await authPost('/auth/oauth/google', { code, redirectUri });
      await storeTokens(data.accessToken, data.refreshToken);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeTokens],
  );

  const loginWithGitHub = useCallback(
    async (code: string) => {
      const data = await authPost('/auth/oauth/github', { code });
      await storeTokens(data.accessToken, data.refreshToken);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeTokens],
  );

  const logout = useCallback(async () => {
    const rt = refreshTokenRef.current;
    const base = serverUrlRef.current;
    if (rt && base) {
      fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    await clearTokens();
  }, [clearTokens]);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    // Fast path: current access token is still fresh.
    if (isTokenFresh(accessToken)) return accessToken;

    const rt = refreshTokenRef.current;
    const base = serverUrlRef.current;
    if (!rt || !base) return null;

    // Deduplicate: share the in-flight refresh promise so we never rotate a session twice.
    if (inflightRefresh.current) return inflightRefresh.current;

    const promise = (async (): Promise<string | null> => {
      try {
        const res = await fetch(`${base}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) {
          await clearTokens();
          return null;
        }
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        await storeTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        inflightRefresh.current = null;
      }
    })();

    inflightRefresh.current = promise;
    return promise;
  }, [accessToken, clearTokens, storeTokens]);

  const user = useMemo(() => userFromToken(accessToken), [accessToken]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      accessToken,
      serverUrl,
      isLoading,
      setServerUrl,
      login,
      register,
      logout,
      loginWithGoogle,
      loginWithGitHub,
      getValidToken,
    }),
    [
      user,
      accessToken,
      serverUrl,
      isLoading,
      setServerUrl,
      login,
      register,
      logout,
      loginWithGoogle,
      loginWithGitHub,
      getValidToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
