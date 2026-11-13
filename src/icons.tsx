import type { CSSProperties, ReactNode } from "react";

export function GoldDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id + "g"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFB4B0" />
        <stop offset="38%" stopColor="#E53935" />
        <stop offset="72%" stopColor="#C62828" />
        <stop offset="100%" stopColor="#8E1818" />
      </linearGradient>
      <linearGradient id={id + "h"} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
        <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#5A1010" stopOpacity="0.25" />
      </linearGradient>
      <linearGradient id={id + "miss"} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#C8C4BC" />
        <stop offset="100%" stopColor="#8E8A84" />
      </linearGradient>
    </defs>
  );
}

/** A single oval chain link, drawn in gold (or muted for a miss). */
export function ChainLink({
  size = 28,
  kind = "gold",
  style,
  title,
}: {
  size?: number;
  kind?: "gold" | "miss" | "empty" | "ghost";
  style?: CSSProperties;
  title?: string;
}) {
  const id = "lnk" + size + kind + (title || "");
  const stroke =
    kind === "gold" ? "url(#" + id + "g)" : kind === "miss" ? "url(#" + id + "miss)" : kind === "ghost" ? "currentColor" : "currentColor";
  const opacity = kind === "empty" ? 0.4 : kind === "ghost" ? 0.45 : 1;
  const dash = kind === "miss" ? "4 3.5" : undefined;
  const small = size <= 22;
  const sw = small ? 4.5 : Math.max(2.4, size * 0.18);
  const rot = small ? -24 : -32;
  const box = small ? { x: 4, y: 9, w: 24, h: 14, r: 7 } : { x: 8, y: 5.2, w: 16, h: 21.6, r: 8 };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block", opacity, ...style }} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <GoldDefs id={id} />
      <g transform={"rotate(" + rot + " 16 16)"}>
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={box.r}
          ry={box.r}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
        {kind === "gold" ? (
          <rect
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx={box.r}
            ry={box.r}
            fill="none"
            stroke={"url(#" + id + "h)"}
            strokeWidth={sw * 0.4}
            opacity="0.85"
          />
        ) : null}
      </g>
    </svg>
  );
}

/** Two interlocking links, used as the app mark and for "linked" moments. */
export function ChainPair({ size = 40, kind = "gold" }: { size?: number; kind?: "gold" | "ghost" }) {
  const id = "pair" + size + kind;
  const stroke = kind === "gold" ? "url(#" + id + "g)" : "currentColor";
  const sw = 3.4;
  return (
    <svg width={size} height={size} viewBox="0 0 48 32" style={{ display: "block" }} aria-hidden="true">
      <GoldDefs id={id} />
      <g transform="translate(1,0)">
        <g transform="rotate(-32 14 16)">
          <rect x="6" y="4.5" width="16" height="23" rx="8" ry="8" fill="none" stroke={stroke} strokeWidth={sw} />
          {kind === "gold" ? (
            <rect x="6" y="4.5" width="16" height="23" rx="8" ry="8" fill="none" stroke={"url(#" + id + "h)"} strokeWidth={1.5} />
          ) : null}
        </g>
        <g transform="rotate(32 32 16)">
          <rect x="24" y="4.5" width="16" height="23" rx="8" ry="8" fill="none" stroke={stroke} strokeWidth={sw} />
          {kind === "gold" ? (
            <rect x="24" y="4.5" width="16" height="23" rx="8" ry="8" fill="none" stroke={"url(#" + id + "h)"} strokeWidth={1.5} />
          ) : null}
        </g>
      </g>
    </svg>
  );
}

/** A short run of interlocking links for the streak header. */
export function ChainRun({ count, size = 22, max = 7 }: { count: number; size?: number; max?: number }) {
  const shown = Math.min(Math.max(count, 0), max);
  const leftover = count > max ? count - max : 0;
  const links: ReactNode[] = [];
  const w = size * 0.62;
  const width = Math.max(size, shown * w + size * 0.4);
  for (let i = 0; i < shown; i++) {
    links.push(
      <g key={i} transform={"translate(" + i * w + ",0)"} className="dc-link-in" style={{ animationDelay: i * 40 + "ms" }}>
        <foreignObject width={size} height={size} x={0} y={0}>
          <ChainLink size={size} kind="gold" />
        </foreignObject>
      </g>,
    );
  }
  if (count === 0) {
    return <ChainLink size={size} kind="empty" />;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <svg width={width} height={size} viewBox={"0 0 " + width + " " + size} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
        {links}
      </svg>
      {leftover > 0 ? <span style={{ fontSize: 12, fontWeight: 600 }}>+{leftover}</span> : null}
    </span>
  );
}

export function Coin({ size = 28 }: { size?: number }) {
  const id = "coin" + size;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(90,50,0,.35))" }} aria-hidden="true">
      <defs>
        <radialGradient id={id + "r"} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FFF3C2" />
          <stop offset="45%" stopColor="#E8C056" />
          <stop offset="100%" stopColor="#B07A18" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={"url(#" + id + "r)"} stroke="#8E1818" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#F6E4A8" strokeWidth="1.1" opacity="0.85" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#8E1818" strokeWidth="0.5" opacity="0.45" />
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fill="#7A4E0C"
      >
        $
      </text>
    </svg>
  );
}

/** Glass treat jar whose fill rises with progress (0–1). */
export function TreatJar({ size = 56, progress = 0, pulse = false }: { size?: number; progress?: number; pulse?: boolean }) {
  const id = "jar" + Math.round(size) + Math.round(progress * 100);
  const p = Math.max(0, Math.min(1, progress));
  const fillTop = 58 - p * 38;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 72"
      style={{ display: "block", animation: pulse ? "dcJarPulse 480ms ease" : undefined }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id + "glass"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D9E3EA" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#F7FBFD" stopOpacity="0.15" />
          <stop offset="70%" stopColor="#C5D0D8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#9AA8B2" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={id + "gold"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8A80" />
          <stop offset="100%" stopColor="#C62828" />
        </linearGradient>
        <clipPath id={id + "clip"}>
          <path d="M16 22 L18 62 Q32 68 46 62 L48 22 Z" />
        </clipPath>
        <linearGradient id={id + "lid"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB4B0" />
          <stop offset="100%" stopColor="#E53935" />
        </linearGradient>
      </defs>
      {/* lid */}
      <rect x="18" y="6" width="28" height="6" rx="2" fill={"url(#" + id + "lid)"} stroke="#8E1818" strokeWidth="0.8" />
      <rect x="22" y="3" width="20" height="5" rx="2" fill={"url(#" + id + "lid)"} stroke="#8E1818" strokeWidth="0.7" />
      {/* neck */}
      <path d="M22 12 L22 20 L42 20 L42 12" fill="#E8EEF2" stroke="#8AA0AE" strokeWidth="0.9" />
      {/* coins (clipped) */}
      <g clipPath={"url(#" + id + "clip)"}>
        {p > 0 ? <rect x="14" y={fillTop} width="36" height={70} fill={"url(#" + id + "gold)"} /> : null}
        {p > 0.08 ? <ellipse cx="32" cy={fillTop} rx="15" ry="3.4" fill="#FFC4C0" opacity="0.9" /> : null}
        {p > 0.2 ? <ellipse cx="24" cy={fillTop + 7} rx="5" ry="2.2" fill="#FF9A94" opacity="0.85" /> : null}
        {p > 0.35 ? <ellipse cx="38" cy={fillTop + 10} rx="5.5" ry="2.3" fill="#E53935" opacity="0.8" /> : null}
      </g>
      {/* glass body */}
      <path
        d="M16 22 L18 62 Q32 68 46 62 L48 22 Q32 18 16 22 Z"
        fill={"url(#" + id + "glass)"}
        stroke="#6F8490"
        strokeWidth="1.3"
      />
      {/* shine */}
      <path d="M22 26 Q22 44 23 58" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M26 28 Q26 42 27 54" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function IconCheck({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ display: "block" }}>
      <path
        className="dc-check-draw"
        d="M3.2 8.3 L6.4 11.3 L12.8 4.6"
        fill="none"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconNav({ name, size = 24, active = false }: { name: "today" | "calendar" | "identity" | "jar"; size?: number; active?: boolean }) {
  const sw = active ? 1.9 : 1.6;
  const c = "currentColor";
  if (name === "today") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke={c} strokeWidth={sw} />
        <path d="M8 12.2 L10.6 14.7 L16.3 8.8" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke={c} strokeWidth={sw} />
        <path d="M3.5 9.5 H20.5" fill="none" stroke={c} strokeWidth={sw} />
        <path d="M8 3.5 V6.5 M16 3.5 V6.5" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "identity") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.1" fill="none" stroke={c} strokeWidth={sw} />
        <path d="M5.5 19.2 Q5.5 14.2 12 14.2 Q18.5 14.2 18.5 19.2" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.5 H16 V8.5 H8 Z" fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M9 8.5 L8 19 Q12 21 16 19 L15 8.5" fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  );
}

export function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevron({ size = 16, dir = "right" }: { size?: number; dir?: "right" | "down" | "up" | "left" }) {
  const rot = dir === "down" ? 90 : dir === "left" ? 180 : dir === "up" ? 270 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ transform: "rotate(" + rot + "deg)", display: "block" }}>
      <path d="M6 3.5 L11 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGear({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.5 L13.2 6.2 L16.2 5.2 L17.5 8.1 L20.4 8.6 L19.5 11.6 L21.5 13.8 L19 16 L19.8 19 L16.7 18.6 L14.8 21 L12 19.4 L9.2 21 L7.3 18.6 L4.2 19 L5 16 L2.5 13.8 L4.5 11.6 L3.6 8.6 L6.5 8.1 L7.8 5.2 L10.8 6.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconList({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7 H20 M8 12 H20 M8 17 H20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconSound({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10 H7 L12 6 V18 L7 14 H4 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      {on ? (
        <>
          <path d="M15 9.5 Q17 12 15 14.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M17.5 7.5 Q21 12 17.5 16.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <path d="M16 9 L20 15 M20 9 L16 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

export const IDENTITY_COLOR: Record<string, { light: string; dark: string }> = {
  faith: { light: "#8B6914", dark: "#E0B85A" },
  gym: { light: "#C44B2B", dark: "#F08A6C" },
  cooking: { light: "#C4841A", dark: "#F0B84A" },
  trading: { light: "#2A5DB0", dark: "#7AA3FF" },
  golf: { light: "#1B7A45", dark: "#4ECF86" },
  storage: { light: "#5A6570", dark: "#B0B8C0" },
  hazel: { light: "#B04A6A", dark: "#F09AB0" },
};
