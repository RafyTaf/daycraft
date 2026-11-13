import type { CSSProperties, ReactNode } from "react";
import type { GrokTheme } from "../grok";
import { IconCheck } from "../icons";

export function craft(theme: GrokTheme) {
  const dark = theme.kind === "dark";
  return {
    dark,
    paper: dark ? "#12110F" : "#F3F1EC",
    card: dark ? "#1C1B18" : "#FFFFFF",
    gold: dark ? "#FF6B6B" : "#E53935",
    goldDeep: dark ? "#FF9A9A" : "#B71C1C",
    goldSoft: dark ? "#3A191B" : "#FDECEA",
    miss: dark ? "#6A6460" : "#9A9590",
    missSoft: dark ? "#2A2624" : "#EDE9E4",
    shadow: dark ? "0 1px 2px rgba(0,0,0,.4)" : "0 1px 2px rgba(40,32,16,.06), 0 8px 24px rgba(40,32,16,.05)",
    hairline: dark ? "rgba(255,255,255,.08)" : "rgba(40,32,16,.08)",
  };
}

export type Craft = ReturnType<typeof craft>;

export function fontStack(theme: GrokTheme): string {
  return theme.font.family;
}

export function CheckMark({
  on,
  fresh,
  theme,
  color,
}: {
  on: boolean;
  fresh?: boolean;
  theme: GrokTheme;
  color?: string;
}) {
  const fill = color || theme.text.success;
  return (
    <span
      aria-hidden="true"
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        border: on ? "1.5px solid " + fill : "1.5px solid " + theme.border.strong,
        background: on ? fill : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        animation: fresh && on ? "dcPop 320ms cubic-bezier(.2,1.4,.4,1)" : undefined,
        transition: "background 180ms ease, border-color 180ms ease",
      }}
    >
      {on ? <IconCheck size={14} color={theme.text.onColor} /> : null}
    </span>
  );
}

export function Pill({
  children,
  onClick,
  theme,
  strong,
  color,
  disabled,
  ariaLabel,
  ariaPressed,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  theme: GrokTheme;
  strong?: boolean;
  color?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  type?: "button";
}) {
  const accent = color || theme.text.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      style={{
        minHeight: 40,
        padding: "8px 16px",
        borderRadius: theme.radius.full,
        border: "1px solid " + (strong ? accent : theme.border.default),
        background: strong ? accent : "transparent",
        color: strong ? theme.text.onColor : theme.text.primary,
        fontFamily: fontStack(theme),
        ...theme.font.label,
        fontWeight: theme.weight.semibold,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  theme,
  c,
  style,
  pad = 14,
}: {
  children: ReactNode;
  theme: GrokTheme;
  c: Craft;
  style?: CSSProperties;
  pad?: number;
}) {
  return (
    <div
      style={{
        background: c.card,
        borderRadius: theme.radius.xl,
        border: "1px solid " + c.hairline,
        boxShadow: c.shadow,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  theme,
  label,
  pressed,
}: {
  children: ReactNode;
  onClick: () => void;
  theme: GrokTheme;
  label: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        border: "1px solid " + theme.border.default,
        background: theme.bg.elevated,
        color: theme.text.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

export function Field({
  value,
  onChange,
  placeholder,
  theme,
  onSubmit,
  type = "text",
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  theme: GrokTheme;
  onSubmit?: () => void;
  type?: string;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onSubmit) onSubmit();
      }}
      style={{
        flex: "1 1 auto",
        minWidth: 0,
        width: "100%",
        minHeight: 46,
        padding: "10px 14px",
        borderRadius: theme.radius.lg,
        border: "1px solid " + theme.border.default,
        background: theme.bg.base,
        color: theme.text.primary,
        fontFamily: fontStack(theme),
        ...theme.font.body1,
      }}
    />
  );
}

export function SectionLabel({ children, theme }: { children: ReactNode; theme: GrokTheme }) {
  return (
    <div
      style={{
        ...theme.font.caption,
        fontWeight: theme.weight.semibold,
        color: theme.text.tertiary,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        margin: "4px 2px 8px",
      }}
    >
      {children}
    </div>
  );
}

export function Money(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  return sign + "$" + (Number.isInteger(abs) ? String(abs) : abs.toFixed(2));
}
