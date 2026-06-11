import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

// The JWT lives in an httpOnly cookie managed by the backend.
// This store only mirrors the user profile for the UI.
interface AuthStore {
  user: User | null;
  _hasHydrated: boolean;
  authChecked: boolean;
  setHasHydrated: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthChecked: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      _hasHydrated: false,
      authChecked: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setUser: (user) => set({ user }),
      setAuthChecked: (v) => set({ authChecked: v }),
      logout: () => set({ user: null }),
    }),
    {
      name: "tcgmentor_auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
