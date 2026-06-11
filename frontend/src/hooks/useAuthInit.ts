"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { authApi } from "@/lib/api";

// Validates the httpOnly cookie session once per app load.
export function useAuthInit() {
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthChecked = useAuthStore((s) => s.setAuthChecked);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, [setUser, setAuthChecked]);
}
