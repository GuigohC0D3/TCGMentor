"use client";

import { cn } from "@/lib/utils";
import type { TCGContext } from "@/types";

const GAMES: { id: TCGContext; label: string; emoji: string; color: string }[] = [
  { id: null,       label: "General",   emoji: "🌐", color: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-zinc-300 dark:border-zinc-600" },
  { id: "pokemon",  label: "Pokémon",   emoji: "🔴", color: "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700" },
  { id: "magic",    label: "Magic",     emoji: "⚔️", color: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-300 dark:border-blue-700" },
  { id: "yugioh",   label: "Yu-Gi-Oh!", emoji: "⭐", color: "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-300 dark:border-purple-700" },
  { id: "lorcana",  label: "Lorcana",   emoji: "🎭", color: "bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700" },
  { id: "onepiece", label: "One Piece", emoji: "⚓", color: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-300 dark:border-red-700" },
];

const SUGGESTIONS: Record<string, string[]> = {
  default:   ["What is a TCG?", "Which TCG should I start with?", "How does a typical turn work?"],
  pokemon:   ["How does the Energy system work?", "What are Pokémon-V and VMAX?", "How do I build my first deck?"],
  magic:     ["What are the 5 colors of Magic?", "How does Mana work?", "What is a game Format?"],
  yugioh:    ["What is the Extra Deck?", "How does Special Summoning work?", "What's the difference between Spell and Trap cards?"],
  lorcana:   ["How do I win in Lorcana?", "What is the Inkwell mechanic?", "How does Challenging work?"],
  onepiece:  ["How does the Don!! system work?", "What is a Leader card?", "How do I win the game?"],
};

interface Props {
  selected: TCGContext;
  onSelect: (ctx: TCGContext) => void;
  onSuggestion: (text: string) => void;
}

export function TCGSelector({ selected, onSelect, onSuggestion }: Props) {
  const suggestions = SUGGESTIONS[selected ?? "default"] ?? SUGGESTIONS.default;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Which game do you want to learn?
      </p>

      <div className="grid grid-cols-3 gap-2 w-full">
        {GAMES.map((game) => (
          <button
            key={String(game.id)}
            onClick={() => onSelect(game.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-medium transition-all",
              game.color,
              selected === game.id
                ? "ring-2 ring-zinc-500 dark:ring-zinc-300 scale-[1.03] shadow-sm"
                : "opacity-80 hover:opacity-100"
            )}
          >
            <span className="text-xl">{game.emoji}</span>
            <span className="text-zinc-700 dark:text-zinc-300">{game.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">Suggestions to get started</p>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="w-full text-left px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
