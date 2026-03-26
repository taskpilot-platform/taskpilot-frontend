import { create } from "zustand";
import { authService } from "@/services/auth.service";
import { authStorage } from "@/lib/storage";
import type { LoginRequest, RegisterRequest } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => void;
  register: (payload: RegisterRequest) => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

function applyTokens(accessToken: string, refreshToken: string): void {
  authStorage.setAccessToken(accessToken);
  authStorage.setRefreshToken(refreshToken);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: authStorage.getAccessToken(),
  refreshToken: authStorage.getRefreshToken(),
  isAuthenticated: Boolean(authStorage.getAccessToken()),
  isLoading: false,

  hydrate: () => {
    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();

    set({
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken),
    });
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
    set({ isLoading: true });
    try {
      const response = await authService.login(payload);
      const { token, refreshToken } = response.data;

      applyTokens(token, refreshToken);
      set({
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const currentRefreshToken = get().refreshToken;

    set({ isLoading: true });
    try {
      if (currentRefreshToken) {
        await authService.logout({ refreshToken: currentRefreshToken });
      }
    } finally {
      authStorage.clear();
      set({
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
