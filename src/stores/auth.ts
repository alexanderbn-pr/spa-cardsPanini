import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string | number;
  email: string;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  expiresAt: number | null;
  setSession: (token: string, user: AuthUser, expiresIn?: number) => void;
  logout: () => void;
}

/**
 * Session store: JWT + user persisted to localStorage under `ligae-auth` so a
 * refresh restores the session. Only token/user are persisted (partialize) —
 * actions and any future transient fields stay out of storage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: null,
      setSession: (token, user, expiresIn?) =>
        set({
          token,
          user,
          expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
        }),
      logout: () => set({ token: null, user: null, expiresAt: null }),
    }),
    {
      name: "ligae-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
