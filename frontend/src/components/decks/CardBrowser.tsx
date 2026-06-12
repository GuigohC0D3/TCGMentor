"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { cardsApi, type CardFilters } from "@/lib/api";
import type { CardResult } from "@/types";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  type?: FilterOption[];
  color?: { label: string; options: FilterOption[] };
  rarity?: FilterOption[];
}

const opts = (...values: string[]): FilterOption[] =>
  values.map((v) => ({ value: v, label: v }));

// Filter vocab per game, mapped to each API's query syntax on the backend
const FILTERS: Record<string, FilterConfig> = {
  pokemon: {
    type: opts("Pokémon", "Trainer", "Energy"),
    color: {
      label: "Energia",
      options: opts(
        "Grass", "Fire", "Water", "Lightning", "Psychic",
        "Fighting", "Darkness", "Metal", "Dragon", "Colorless"
      ),
    },
    rarity: opts("Common", "Uncommon", "Rare", "Rare Holo", "Rare Ultra", "Illustration Rare"),
  },
  magic: {
    type: opts("Creature", "Instant", "Sorcery", "Enchantment", "Artifact", "Planeswalker", "Land"),
    color: {
      label: "Cor",
      options: [
        { value: "W", label: "White" },
        { value: "U", label: "Blue" },
        { value: "B", label: "Black" },
        { value: "R", label: "Red" },
        { value: "G", label: "Green" },
        { value: "C", label: "Colorless" },
        { value: "M", label: "Multicolor" },
      ],
    },
    rarity: opts("Common", "Uncommon", "Rare", "Mythic"),
  },
  yugioh: {
    type: opts(
      "Effect Monster", "Normal Monster", "Ritual Monster", "Fusion Monster",
      "Synchro Monster", "XYZ Monster", "Link Monster", "Spell Card", "Trap Card"
    ),
    color: {
      label: "Atributo",
      options: opts("DARK", "LIGHT", "EARTH", "WATER", "FIRE", "WIND", "DIVINE"),
    },
    // YGOPRODeck has no rarity filter
  },
  lorcana: {
    type: opts("Character", "Action", "Item", "Location", "Song"),
    color: {
      label: "Tinta",
      options: opts("Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"),
    },
    rarity: opts("Common", "Uncommon", "Rare", "Super Rare", "Legendary"),
  },
};

interface Props {
  tcg: string;
  onAdd: (name: string) => void;
}

export function CardBrowser({ tcg, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [rarity, setRarity] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Guards against out-of-order responses: a slow previous search must never
  // overwrite the results of the current one
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const config = FILTERS[tcg];

  // Reset filters when switching games; invalidate any in-flight search
  useEffect(() => {
    requestIdRef.current++;
    abortRef.current?.abort();
    setQuery("");
    setType("");
    setColor("");
    setRarity("");
    setResults([]);
    setSearched(false);
    setLoading(false);
  }, [tcg]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const hasCriteria = query.trim().length >= 2 || type || color || rarity;
    if (!config || !hasCriteria) {
      requestIdRef.current++;
      abortRef.current?.abort();
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const filters: CardFilters = { type, color, rarity };
        const res = await cardsApi.search(tcg, query.trim(), filters, 20, controller.signal);
        if (requestId !== requestIdRef.current) return; // stale response
        setResults(res.data);
        setSearched(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setSearched(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, type, color, rarity, tcg, config]);

  if (!config) return null;

  const selectClass =
    "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-zinc-500 transition-colors";

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 mb-4">
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar carta pelo nome..."
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {config.type && (
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              <option value="">Tipo: todos</option>
              {config.type.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {config.color && (
            <select value={color} onChange={(e) => setColor(e.target.value)} className={selectClass}>
              <option value="">{config.color.label}: todas</option>
              {config.color.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {config.rarity && (
            <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={selectClass}>
              <option value="">Raridade: todas</option>
              {config.rarity.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="p-3 min-h-[80px] max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {results.map((card, i) => (
              <button
                key={`${card.name}-${i}`}
                onClick={() => onAdd(card.name)}
                title={card.text ?? card.name}
                className="group relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors text-left"
              >
                {card.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} className="w-full h-auto" loading="lazy" />
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 px-2">
                    <span className="text-xs text-zinc-500 text-center">{card.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex items-center gap-1 rounded-full bg-white text-zinc-900 px-3 py-1 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </span>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{card.name}</p>
                  {card.rarity && (
                    <p className="text-[10px] text-zinc-400 truncate">{card.rarity}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-6">
            {searched
              ? "Nenhuma carta encontrada — tente outro nome ou filtro"
              : "Digite um nome ou escolha um filtro para buscar cartas"}
          </p>
        )}
      </div>
    </div>
  );
}
