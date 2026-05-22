"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TCGContext } from "@/types";

const TCG_BADGE: Record<string, { label: string; className: string }> = {
  pokemon:  { label: "🔴 Pokémon",   className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" },
  magic:    { label: "⚔️ Magic",     className: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" },
  yugioh:   { label: "⭐ Yu-Gi-Oh!", className: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300" },
  lorcana:  { label: "🎭 Lorcana",   className: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300" },
  onepiece: { label: "⚓ One Piece", className: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" },
};

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  tcgContext?: TCGContext;
  hasMessages?: boolean;
}

export function MessageInput({ onSend, disabled, tcgContext, hasMessages }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const canSend = !!value.trim() && !disabled;
  const badge = tcgContext ? TCG_BADGE[tcgContext] : null;

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">
        {badge && hasMessages && (
          <div className="mb-2 flex">
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", badge.className)}>
              {badge.label}
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={disabled}
            placeholder={
              tcgContext
                ? `Ask about ${TCG_BADGE[tcgContext]?.label ?? "TCGs"}...`
                : "Ask anything about TCGs..."
            }
            className="flex-1 resize-none bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none max-h-[200px] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors flex-shrink-0",
              canSend
                ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-2">
          TCGMentor can make mistakes. Verify important rules with official sources.
        </p>
      </div>
    </div>
  );
}
