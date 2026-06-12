import { cn } from "@/lib/utils";
import type { DeckTier } from "@/types";

const TIER_STYLES: Record<DeckTier, string> = {
  S: "bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-amber-500/30",
  A: "bg-emerald-500 text-white shadow-emerald-500/30",
  B: "bg-sky-500 text-white shadow-sky-500/30",
  C: "bg-zinc-400 dark:bg-zinc-600 text-white shadow-zinc-500/30",
};

export function TierBadge({ tier, size = "md" }: { tier: DeckTier; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold shadow-lg",
        TIER_STYLES[tier] ?? TIER_STYLES.C,
        size === "sm" && "w-6 h-6 text-xs",
        size === "md" && "w-8 h-8 text-sm",
        size === "lg" && "w-14 h-14 text-2xl"
      )}
      title={`Tier ${tier}`}
    >
      {tier}
    </span>
  );
}
