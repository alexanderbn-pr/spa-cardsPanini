import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserResponse } from "@/types/api";

export interface AuthUser {
  id: string | number;
  email: string;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const fromUserResponse = (user: UserResponse): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

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
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "ligae-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
