"use client";

import { BADGES, BadgeKey } from "@/lib/badges";

type Badge = {
  badge_key: string;
  badge_label: string;
  tournament_id: string | null;
  awarded_at: string;
};

const BADGE_ICONS: { [key: string]: string } = {
  champion: "Trophy",
  top_scorer: "Goal",
  hat_trick: "Hat",
  undefeated: "Shield",
  veteran: "Star",
  serial_winner: "Crown",
  finalist: "Medal",
};

export default function BadgeDisplay({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;

  // Deduplicate by badge_key (show each badge type once)
  const unique = Object.values(
    badges.reduce((acc: any, b) => {
      if (!acc[b.badge_key]) acc[b.badge_key] = b;
      return acc;
    }, {})
  ) as Badge[];

  return (
    <div className="flex flex-wrap gap-2">
      {unique.map((badge) => {
        const meta = BADGES[badge.badge_key as BadgeKey];
        if (!meta) return null;
        return (
          <div key={badge.badge_key}
            className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold " + meta.bg + " " + meta.color}
            title={meta.desc}>
            <span>{badge.badge_label}</span>
          </div>
        );
      })}
    </div>
  );
}
