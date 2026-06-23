/**
 * FRAMIX Badge — branded content label components.
 *
 * Exposes:
 *   <FramixOriginalMark />   FRAMIX Original certification (signature element)
 *   <FramixStatusBadge />    one status pill (NEW / HOT / EXCLUSIVE / ...)
 *   <FramixBadgeStack />     auto-derived stack of status pills for a drama
 *
 * Visual language is shared everywhere so the whole service reads as FRAMIX.
 */
import { Flame, Star, Lock, Sparkles, CheckCircle2, RadioTower } from "lucide-react";
import type { Drama } from "../types";
import {
  FRAMIX_BADGES,
  getCardBadgeKeys,
  isFramixOriginal,
  type FramixBadgeKey,
} from "../lib/framixBadges";

type BadgeSize = "xs" | "sm";

const SIZE: Record<BadgeSize, string> = {
  xs: "text-[8px] px-1.5 py-[3px] gap-0.5 rounded-[5px]",
  sm: "text-[10px] px-2 py-1 gap-1 rounded-md",
};

const ICON: Record<BadgeSize, number> = { xs: 8, sm: 11 };

// ── FRAMIX Original certification mark ──────────────────────────────────────

export function FramixOriginalMark({
  size = "xs",
  withWordmark = false,
  className = "",
}: {
  size?: BadgeSize;
  withWordmark?: boolean;
  className?: string;
}) {
  const tile = size === "xs" ? "h-[15px] w-[15px] text-[10px]" : "h-[19px] w-[19px] text-[12px]";
  return (
    <span
      className={[
        "framix-original-mark inline-flex items-center self-start",
        size === "xs" ? "gap-1 pr-1.5 pl-[3px] py-[3px] rounded-[6px]" : "gap-1.5 pr-2 pl-1 py-1 rounded-lg",
        className,
      ].join(" ")}
    >
      {/* Signature FRAMIX "F" tile */}
      <span
        className={[
          "framix-f-tile inline-flex items-center justify-center font-black leading-none rounded-[4px]",
          tile,
        ].join(" ")}
      >
        F
      </span>
      <span
        className={[
          "font-black uppercase tracking-[0.18em] leading-none",
          size === "xs" ? "text-[7.5px]" : "text-[9px]",
        ].join(" ")}
        style={{ color: "var(--color-gold-light)" }}
      >
        {withWordmark ? "FRAMIX ORIGINAL" : "ORIGINAL"}
      </span>
    </span>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────

function badgeIcon(key: FramixBadgeKey, px: number) {
  switch (key) {
    case "hot":
      return <Flame size={px} className="shrink-0" />;
    case "pick":
      return <Star size={px} className="shrink-0 fill-current" />;
    case "exclusive":
      return <Lock size={px} className="shrink-0" />;
    case "recommended":
      return <Sparkles size={px} className="shrink-0" />;
    case "finished":
      return <CheckCircle2 size={px} className="shrink-0" />;
    case "updating":
      return <RadioTower size={px} className="shrink-0" />;
    default:
      return null;
  }
}

function badgeClasses(key: FramixBadgeKey): { cls: string; style?: React.CSSProperties } {
  switch (key) {
    case "exclusive":
      return {
        cls: "text-black font-black",
        style: {
          background: "linear-gradient(135deg, #f0d77b 0%, #D4AF37 55%, #9c7e23 100%)",
          boxShadow: "0 2px 10px rgba(212,175,55,0.35)",
        },
      };
    case "new":
      return {
        cls: "text-white font-black",
        style: {
          background: "linear-gradient(135deg, #ff5a63 0%, #e63946 100%)",
          boxShadow: "0 2px 10px rgba(230,57,70,0.4)",
        },
      };
    case "hot":
      return {
        cls: "text-black font-black framix-badge-hot",
        style: {
          background: "linear-gradient(135deg, #FFD700 0%, #E6C36A 60%, #D4AF37 100%)",
        },
      };
    case "pick":
      return {
        cls: "framix-badge-pick font-black tracking-wide",
        style: {
          color: "var(--color-gold-light)",
          background: "rgba(8,8,8,0.72)",
          border: "1px solid rgba(212,175,55,0.7)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      };
    case "recommended":
      return {
        cls: "text-white/95 font-bold",
        style: {
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.28)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      };
    case "updating":
      return {
        cls: "font-bold framix-badge-updating",
        style: {
          color: "#6ee7b7",
          background: "rgba(6,30,22,0.7)",
          border: "1px solid rgba(52,211,153,0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      };
    case "finished":
      return {
        cls: "text-white/70 font-bold",
        style: {
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.16)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      };
  }
}

export function FramixStatusBadge({
  badgeKey,
  size = "xs",
  korean = false,
  withIcon = true,
}: {
  badgeKey: FramixBadgeKey;
  size?: BadgeSize;
  korean?: boolean;
  withIcon?: boolean;
}) {
  const def = FRAMIX_BADGES[badgeKey];
  const { cls, style } = badgeClasses(badgeKey);
  return (
    <span
      className={[
        "inline-flex items-center uppercase tracking-wider leading-none whitespace-nowrap self-start",
        SIZE[size],
        cls,
      ].join(" ")}
      style={style}
    >
      {withIcon && badgeIcon(badgeKey, ICON[size])}
      {korean ? def.ko : def.label}
    </span>
  );
}

// ── Auto stack for a drama ──────────────────────────────────────────────────

export function FramixBadgeStack({
  drama,
  size = "xs",
  max = 2,
  showOriginal = true,
  korean = false,
  className = "",
}: {
  drama: Drama;
  size?: BadgeSize;
  max?: number;
  showOriginal?: boolean;
  korean?: boolean;
  className?: string;
}) {
  const keys = getCardBadgeKeys(drama, max);
  const original = showOriginal && isFramixOriginal(drama);
  if (!original && keys.length === 0) return null;
  return (
    <div className={["flex flex-col gap-1 items-start", className].join(" ")}>
      {original && <FramixOriginalMark size={size} />}
      {keys.map((k) => (
        <FramixStatusBadge key={k} badgeKey={k} size={size} korean={korean} />
      ))}
    </div>
  );
}
