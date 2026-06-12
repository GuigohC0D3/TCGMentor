"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, Search, Sparkles, X } from "lucide-react";
import { decksApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Deck, DeckCard } from "@/types";
import { AnalysisPanel } from "./AnalysisPanel";
import { CardBrowser } from "./CardBrowser";

const TCGS = [
  { id: "pokemon", label: "🔴 Pokémon" },
  { id: "magic", label: "⚔️ Magic" },
  { id: "yugioh", label: "⭐ Yu-Gi-Oh!" },
  { id: "lorcana", label: "🎭 Lorcana" },
  { id: "onepiece", label: "⚓ One Piece" },
] as const;

interface Props {
  deck: Deck | null;
  onSaved: (deck: Deck) => void;
}

export function DeckEditor({ deck, onSaved }: Props) {
  const [name, setName] = useState(deck?.name ?? "");
  const [tcg, setTcg] = useState<string>(deck?.tcg ?? "pokemon");
  const [cards, setCards] = useState<DeckCard[]>(deck?.cards ?? []);
  const [analysis, setAnalysis] = useState(deck?.analysis ?? null);

  const [manualName, setManualName] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const isDirty =
    name !== (deck?.name ?? "") || JSON.stringify(cards) !== JSON.stringify(deck?.cards ?? []);
  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);

  const addCard = (cardName: string) => {
    const trimmed = cardName.trim();
    if (!trimmed) return;
    setCards((prev) => {
      const existing = prev.find((c) => c.name === trimmed);
      if (existing) {
        return prev.map((c) =>
          c.name === trimmed ? { ...c, quantity: Math.min(c.quantity + 1, 99) } : c
        );
      }
      return [...prev, { name: trimmed, quantity: 1 }];
    });
  };

  const changeQty = (cardName: string, delta: number) => {
    setCards((prev) =>
      prev
        .map((c) =>
          c.name === cardName ? { ...c, quantity: Math.min(c.quantity + delta, 99) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const handleSave = async (): Promise<Deck | null> => {
    if (!name.trim()) {
      setError("Dê um nome ao deck antes de salvar.");
      return null;
    }
    setError("");
    setSaving(true);
    try {
      const res = deck
        ? await decksApi.update(deck.id, { name: name.trim(), cards })
        : await decksApi.create({ name: name.trim(), tcg, cards });
      onSaved(res.data);
      return res.data;
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Não foi possível salvar o deck.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setError("");
    let target = deck;
    if (!deck || isDirty) {
      target = await handleSave();
      if (!target) return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await decksApi.analyze(target!.id);
      setAnalysis(res.data.analysis);
      onSaved(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Análise indisponível no momento. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name"
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-500 transition-colors"
        />
        <select
          value={tcg}
          onChange={(e) => setTcg(e.target.value)}
          disabled={!!deck}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60 transition-colors"
        >
          {TCGS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {tcg === "onepiece" ? (
        // One Piece has no public card API: manual entry only
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCard(manualName);
                setManualName("");
              }
            }}
            placeholder="Digite o nome da carta e Enter para adicionar"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
      ) : (
        <CardBrowser tcg={tcg} onAdd={addCard} />
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 mb-4">
        <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
          {totalCards} cards · {cards.length} unique
        </div>
        {cards.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-600 px-4 py-6 text-center">
            Nenhuma carta ainda — use a busca acima
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-72 overflow-y-auto">
            {cards.map((card) => (
              <li key={card.name} className="flex items-center gap-2 px-4 py-2">
                <span className="flex-1 min-w-0 text-sm text-zinc-800 dark:text-zinc-200 truncate">
                  {card.name}
                </span>
                <button
                  onClick={() => changeQty(card.name, -1)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm text-zinc-700 dark:text-zinc-300">
                  {card.quantity}
                </span>
                <button
                  onClick={() => changeQty(card.name, 1)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => changeQty(card.name, -card.quantity)}
                  className="p-1 rounded text-zinc-400 hover:text-red-500"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleSave}
          disabled={saving || analyzing || !isDirty}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvando..." : deck ? "Salvar alterações" : "Salvar deck"}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={saving || analyzing || cards.length === 0}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
            "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200"
          )}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando deck...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analisar com IA
            </>
          )}
        </button>
      </div>

      {analyzing && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-6">
          A IA está avaliando tier, combos e matchups — pode levar até um minuto.
        </p>
      )}

      {analysis && !analyzing && <AnalysisPanel analysis={analysis} />}
    </div>
  );
}
