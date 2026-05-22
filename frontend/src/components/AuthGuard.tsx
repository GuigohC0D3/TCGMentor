"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useAuthInit } from "@/hooks/useAuthInit";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();

  useAuthInit();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.replace("/login");
  }, [hasHydrated, token, router]);

  // Show nothing until the store has read from localStorage
  if (!hasHydrated) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-800 dark:border-t-zinc-200 animate-spin" />
      </div>
    );
  }

  if (!token) return null;
  return <>{children}</>;
}
