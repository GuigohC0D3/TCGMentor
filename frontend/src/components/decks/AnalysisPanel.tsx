"use client";

import { Lightbulb, Shield, Swords, TrendingUp, Zap } from "lucide-react";
import type { DeckAnalysis } from "@/types";
import { TierBadge } from "./TierBadge";

export function AnalysisPanel({ analysis }: { analysis: DeckAnalysis }) {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-5 py-4">
        <TierBadge tier={analysis.tier} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {analysis.archetype}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{analysis.summary}</p>
        </div>
      </div>

      {analysis.tips.length > 0 && (
        <Section icon={<Lightbulb className="h-4 w-4 text-amber-500" />} title="Dicas">
          <ul className="space-y-1.5">
            {analysis.tips.map((tip, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.combos.length > 0 && (
        <Section icon={<Zap className="h-4 w-4 text-violet-500" />} title="Combos">
          <ul className="space-y-3">
            {analysis.combos.map((combo, i) => (
              <li key={i} className="text-sm">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">
                  {combo.cards.join(" + ")}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{combo.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {analysis.strong_against.length > 0 && (
          <Section icon={<Swords className="h-4 w-4 text-emerald-500" />} title="Forte contra">
            <MatchupList items={analysis.strong_against} />
          </Section>
        )}
        {analysis.weak_against.length > 0 && (
          <Section icon={<Shield className="h-4 w-4 text-red-500" />} title="Fraco contra">
            <MatchupList items={analysis.weak_against} />
          </Section>
        )}
      </div>

      {analysis.improvements.length > 0 && (
        <Section icon={<TrendingUp className="h-4 w-4 text-sky-500" />} title="Melhorias sugeridas">
          <ul className="space-y-1.5">
            {analysis.improvements.map((item, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function MatchupList({ items }: { items: { deck: string; reason: string }[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((m, i) => (
        <li key={i} className="text-sm">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">{m.deck}</p>
          <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{m.reason}</p>
        </li>
      ))}
    </ul>
  );
}
