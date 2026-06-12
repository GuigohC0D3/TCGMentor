"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { decksApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Deck, DeckSummary } from "@/types";
import { DeckEditor } from "./DeckEditor";
import { TierBadge } from "./TierBadge";

const TCG_LABELS: Record<string, string> = {
  pokemon: "🔴 Pokémon",
  magic: "⚔️ Magic",
  yugioh: "⭐ Yu-Gi-Oh!",
  lorcana: "🎭 Lorcana",
  onepiece: "⚓ One Piece",
};

export function DecksView() {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [selected, setSelected] = useState<Deck | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDecks = () => decksApi.list().then((res) => setDecks(res.data)).catch(() => {});

  useEffect(() => {
    loadDecks();
  }, []);

  const handleSelect = async (id: string) => {
    setCreating(false);
    try {
      const res = await decksApi.get(id);
      setSelected(res.data);
    } catch {}
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await decksApi.remove(id);
      setDecks(decks.filter((d) => d.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (deck: Deck) => {
    setSelected(deck);
    setCreating(false);
    loadDecks();
  };

  return (
    <div className="h-screen flex bg-white dark:bg-zinc-900 overflow-hidden">
      <aside className="w-72 flex-shrink-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
          <Link
            href="/chat"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">My Decks</span>
        </div>

        <div className="px-3 mb-2 flex-shrink-0">
          <button
            onClick={() => {
              setSelected(null);
              setCreating(true);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Deck
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {decks.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-600 px-3 py-8 text-center">
              No decks yet — create your first one
            </p>
          ) : (
            decks.map((deck) => (
              <div
                key={deck.id}
                className={cn(
                  "group flex items-center rounded-lg transition-colors cursor-pointer",
                  selected?.id === deck.id
                    ? "bg-zinc-200 dark:bg-zinc-800"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                )}
                onClick={() => handleSelect(deck.id)}
              >
                <div className="flex flex-1 min-w-0 items-center gap-2 px-3 py-2.5">
                  {deck.tier && <TierBadge tier={deck.tier} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 truncate">{deck.name}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                      {TCG_LABELS[deck.tcg]} · {deck.card_count} cards
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, deck.id)}
                  disabled={deletingId === deck.id}
                  className="mr-2 flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all disabled:opacity-30"
                  aria-label="Delete deck"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto">
        {creating || selected ? (
          <DeckEditor key={selected?.id ?? "new"} deck={selected} onSaved={handleSaved} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center px-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                Monte e analise seus decks
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                Crie um deck e a IA avalia o tier (S/A/B/C), sugere combos, dicas e mostra contra
                quais decks você é forte ou fraco.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
