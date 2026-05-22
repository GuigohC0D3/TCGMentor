"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { authApi } from "@/lib/api";

export function useAuthInit() {
  const { token, setAuth, logout } = useAuthStore();
  const verified = useRef(false);

  useEffect(() => {
    if (!token || verified.current) return;
    verified.current = true;

    let cancelled = false;
    authApi.me().then((res) => {
      if (!cancelled) setAuth(res.data, token);
    }).catch(() => {
      if (!cancelled) logout();
    });

    return () => { cancelled = true; };
  }, [token]);
}
