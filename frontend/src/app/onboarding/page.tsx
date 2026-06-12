"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logo from "@/assets/TCGMentor.png";
import { usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { AuthGuard } from "@/components/AuthGuard";
import { cn } from "@/lib/utils";

const GAMES = [
  { id: "pokemon", label: "🔴 Pokémon" },
  { id: "magic", label: "⚔️ Magic" },
  { id: "yugioh", label: "⭐ Yu-Gi-Oh!" },
  { id: "lorcana", label: "🎭 Lorcana" },
  { id: "onepiece", label: "⚓ One Piece" },
] as const;

const LEVELS = [
  { id: "beginner", label: "Iniciante", desc: "Nunca joguei ou estou começando agora" },
  { id: "intermediate", label: "Intermediário", desc: "Conheço as regras básicas e já joguei" },
  { id: "advanced", label: "Avançado", desc: "Jogo há tempo e quero dicas competitivas" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [game, setGame] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      if (!skip && (game || level)) {
        const res = await usersApi.updateMe({
          ...(game ? { preferred_tcg: game } : {}),
          ...(level ? { skill_level: level } : {}),
        });
        setUser(res.data);
      }
    } catch {
      // onboarding is optional; never block entry to the app
    } finally {
      router.replace("/chat");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center mb-8 gap-3">
            <Image src={logo} alt="TCGMentor" width={56} height={56} className="rounded-xl" />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Vamos personalizar seu mentor
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              Isso ajuda a IA a adaptar as explicações pra você. Dá pra mudar depois.
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Qual jogo você quer aprender?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGame(game === g.id ? null : g.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition-colors text-left",
                    game === g.id
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-500"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Qual seu nível de experiência?
            </h2>
            <div className="flex flex-col gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(level === l.id ? null : l.id)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    level === l.id
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100"
                      : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-500"
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      level === l.id
                        ? "text-white dark:text-zinc-900"
                        : "text-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    {l.label}
                  </span>
                  <span
                    className={cn(
                      "block text-xs mt-0.5",
                      level === l.id
                        ? "text-zinc-300 dark:text-zinc-600"
                        : "text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {l.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => finish(true)}
              disabled={saving}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Pular
            </button>
            <button
              onClick={() => finish(false)}
              disabled={saving}
              className="flex-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {saving ? "Salvando..." : "Começar"}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
