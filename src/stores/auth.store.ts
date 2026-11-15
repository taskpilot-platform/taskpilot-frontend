import axios from "axios";
import { create } from "zustand";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { authStorage } from "@/lib/storage";
import {
  bumpSessionGeneration,
  clearSessionState,
  getSessionGeneration,
  refreshSessionSingleFlight,
  registerAuthBridge,
} from "@/lib/http";
import { disconnectAllRealtime } from "@/lib/realtime";
import { oneSignalLogin, oneSignalLogout } from "@/lib/onesignal";
import { isTokenValid } from "@/lib/utils";
import type { LoginRequest, RegisterRequest } from "@/types/auth";
import type { UserProfile } from "@/types/user";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  role: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  register: (payload: RegisterRequest) => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  loginWithOAuthCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

let inFlightHydration: Promise<void> | null = null;

function prepareNewSessionCleanup(): void {
  const hadPreviousSession = Boolean(
    authStorage.getAccessToken() ||
      authStorage.getRefreshToken() ||
      useAuthStore.getState().user,
  );
  if (hadPreviousSession) {
    disconnectAllRealtime();
    authStorage.clearSessionCaches();
    void oneSignalLogout();
  }
}

async function completeSignIn(
  loginGeneration: number,
  tokens: { token: string; refreshToken: string },
  set: (partial: Partial<AuthState>) => void,
): Promise<void> {
  if (loginGeneration !== getSessionGeneration()) {
    return;
  }

  authStorage.setTokens(tokens.token, tokens.refreshToken);
  set({
    accessToken: tokens.token,
    refreshToken: tokens.refreshToken,
    isAuthenticated: true,
  });

  try {
    const profileRes = await profileService.getMe();
    if (loginGeneration !== getSessionGeneration()) {
      return;
    }
    const profile = profileRes.data;
    set({
      user: profile,
      role: profile.role,
    });
    await oneSignalLogin(profile.id);
  } catch {
    // Do not block sign-in if optional profile/OneSignal sync fails transiently.
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: authStorage.getAccessToken(),
  refreshToken: authStorage.getRefreshToken(),
  user: null,
  role: null,
  isAuthenticated: isTokenValid(authStorage.getAccessToken()),
  isHydrating: false,
  isLoading: false,

  hydrate: async () => {
    if (inFlightHydration) {
      return inFlightHydration;
    }

    const storedAccess = authStorage.getAccessToken();
    const storedRefresh = authStorage.getRefreshToken();

    if (!storedAccess && !storedRefresh) {
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        role: null,
        isAuthenticated: false,
        isHydrating: false,
      });
      return;
    }

    set({ isHydrating: true });
    const hydrateGeneration = getSessionGeneration();

    const runHydration = async () => {
      try {
        let activeAccess = storedAccess;
        let activeRefresh = storedRefresh;

        if (!isTokenValid(activeAccess)) {
          if (!activeRefresh) {
            clearSessionState({ redirectToLogin: false, broadcast: false });
            return;
          }

          const rotated = await refreshSessionSingleFlight({
            redirectOnFailure: false,
          });
          if (!rotated || hydrateGeneration !== getSessionGeneration()) {
            return;
          }
          activeAccess = rotated.accessToken;
          activeRefresh = rotated.refreshToken;
        }

        const profileRes = await profileService.getMe();
        if (hydrateGeneration !== getSessionGeneration()) {
          return;
        }

        const profile = profileRes.data;
        set({
          accessToken: activeAccess,
          refreshToken: activeRefresh,
          user: profile,
          role: profile.role,
          isAuthenticated: true,
        });

        try {
          await oneSignalLogin(profile.id);
        } catch {
          // Do not fail hydration if OneSignal alias sync fails.
        }
      } catch (err) {
        if (hydrateGeneration !== getSessionGeneration()) {
          return;
        }
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401 || status === 403) {
          clearSessionState({ redirectToLogin: false });
          return;
        }
        const currentAccess = authStorage.getAccessToken();
        const currentRefresh = authStorage.getRefreshToken();
        const valid = isTokenValid(currentAccess);
        set({
          accessToken: valid ? currentAccess : null,
          refreshToken: valid ? currentRefresh : null,
          user: null,
          role: null,
          isAuthenticated: valid,
        });
      } finally {
        if (hydrateGeneration === getSessionGeneration()) {
          set({ isHydrating: false });
        }
      }
    };

    inFlightHydration = runHydration().finally(() => {
      inFlightHydration = null;
    });
    return inFlightHydration;
  },

  refreshProfile: async () => {
    const startGeneration = getSessionGeneration();
    try {
      const response = await profileService.getMe();
      if (startGeneration !== getSessionGeneration()) {
        return null;
      }
      const profile = response.data;
      set({
        user: profile,
        role: profile.role,
      });
      void oneSignalLogin(profile.id);
      return profile;
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        (err.response?.status === 401 || err.response?.status === 403)
      ) {
        if (err.response.status === 401 && startGeneration === getSessionGeneration()) {
          clearSessionState({ redirectToLogin: true });
        } else {
          set({ user: null, role: null });
        }
      }
      return null;
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      await authService.register(payload);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (payload) => {
    prepareNewSessionCleanup();
    const loginGeneration = bumpSessionGeneration();
    set({ isLoading: true, user: null, role: null });
    try {
      const response = await authService.login(payload);
      await completeSignIn(loginGeneration, response.data, set);
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithOAuthCode: async (code: string) => {
    prepareNewSessionCleanup();
    const loginGeneration = bumpSessionGeneration();
    set({ isLoading: true, user: null, role: null });
    try {
      const response = await authService.exchangeOAuthCode(code);
      await completeSignIn(loginGeneration, response.data, set);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const currentRefreshToken =
      get().refreshToken ?? authStorage.getRefreshToken();
    const currentAccessToken =
      get().accessToken ?? authStorage.getAccessToken();

    // Invalidate current session synchronously before awaiting network revoke so an
    // in-flight refresh cannot resurrect the logged-out session.
    clearSessionState({ redirectToLogin: false, broadcast: true });
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isHydrating: false,
      isLoading: true,
    });

    try {
      if (currentRefreshToken) {
        await authService.logout(
          { refreshToken: currentRefreshToken },
          currentAccessToken ?? undefined,
        );
      }
    } catch {
      // Session is already cleared locally even if network revoke fails.
    } finally {
      set({ isLoading: false });
    }
  },
}));

registerAuthBridge({
  onTokensUpdated: ({ accessToken, refreshToken }) => {
    useAuthStore.setState({
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },
  onSessionCleared: () => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isHydrating: false,
    });
  },
  onForbidden: () => {
    if (useAuthStore.getState().isAuthenticated) {
      void useAuthStore.getState().refreshProfile();
    }
  },
});
