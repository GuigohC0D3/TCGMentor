"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useAuthInit } from "@/hooks/useAuthInit";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const authChecked = useAuthStore((s) => s.authChecked);
  const router = useRouter();

  useAuthInit();

  useEffect(() => {
    if (!hasHydrated || !authChecked) return;
    if (!user) router.replace("/login");
  }, [hasHydrated, authChecked, user, router]);

  // Persisted user renders immediately (optimistic) while the cookie session
  // is verified in the background; otherwise wait for the /auth/me check.
  if (!hasHydrated || (!user && !authChecked)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-800 dark:border-t-zinc-200 animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
