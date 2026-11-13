import type { GrokTheme } from "../grok";
import { IconSound } from "../icons";
import type { Store } from "../store";
import { Card, craft as makeCraft, fontStack } from "./chrome";

export function SettingsPage({
  theme,
  store,
  onToggleSounds,
  onToggleMusic,
  onBack,
}: {
  theme: GrokTheme;
  store: Store;
  onToggleSounds: () => void;
  onToggleMusic: () => void;
  onBack: () => void;
}) {
  const c = makeCraft(theme);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16, animation: "dcIn 280ms ease" }}>
      <header>
        <button type="button" onClick={onBack} style={{ alignSelf: "flex-start", minHeight: 36, padding: "6px 4px", border: "none", background: "transparent", color: theme.text.primary, fontFamily: fontStack(theme), ...theme.font.label, fontWeight: theme.weight.semibold, cursor: "pointer" }}>‹ Today</button>
        <div style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.medium, marginTop: 4 }}>Settings</div>
        <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em", marginTop: 1 }}>
          Sound & music
        </div>
      </header>
      <Card theme={theme} c={c} pad={8}>
        <Toggle
          theme={theme}
          c={c}
          label="Sounds"
          hint="Check-off, chain link, and coin in the jar."
          on={store.sounds}
          onClick={onToggleSounds}
        />
        <div style={{ height: 1, background: c.hairline, margin: "0 12px" }} />
        <Toggle
          theme={theme}
          c={c}
          label="Quiet music"
          hint="A soft background pad. Optional, off until you turn it on."
          on={store.music}
          onClick={onToggleMusic}
        />
      </Card>
      <div style={{ ...theme.font.caption, color: theme.text.tertiary, padding: "0 4px", lineHeight: "20px" }}>
        DayCraft is your daily reminder. Beat the app, link the day. The jar fills only when you do more than the day asks.
        Old Should / Could logs stay saved on this phone and are left untouched.
      </div>
    </div>
  );
}

export function Toggle({
  theme,
  c,
  label,
  hint,
  on,
  onClick,
}: {
  theme: GrokTheme;
  c: ReturnType<typeof makeCraft>;
  label: string;
  hint: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        minHeight: 64,
        padding: "12px",
        border: "none",
        background: "transparent",
        color: theme.text.primary,
        fontFamily: fontStack(theme),
        cursor: "pointer",
      }}
    >
      <span style={{ color: on ? c.gold : theme.text.tertiary, flex: "0 0 auto" }}>
        <IconSound on={on} size={22} />
      </span>
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <span style={{ display: "block", ...theme.font.body1, fontWeight: theme.weight.semibold }}>
          {label}
          <span style={{ fontWeight: theme.weight.regular, color: theme.text.secondary }}> · {on ? "On" : "Off"}</span>
        </span>
        <span style={{ display: "block", ...theme.font.caption, color: theme.text.tertiary, marginTop: 2 }}>{hint}</span>
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          background: on ? c.gold : theme.fill.secondary,
          position: "relative",
          flex: "0 0 auto",
          transition: "background 180ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 23 : 3,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: theme.text.onColor,
            boxShadow: "0 1px 2px rgba(0,0,0,.2)",
            transition: "left 180ms ease",
          }}
        />
      </span>
    </button>
  );
}

export function SoundPanel({
  theme,
  store,
  onToggleSounds,
  onToggleMusic,
  onClose,
}: {
  theme: GrokTheme;
  store: Store;
  onToggleSounds: () => void;
  onToggleMusic: () => void;
  onClose: () => void;
}) {
  const c = makeCraft(theme);
  return (
    <div
      role="dialog"
      aria-label="Sound and music"
      style={{
        width: 300,
        maxWidth: "calc(100vw - 32px)",
        background: c.card,
        borderRadius: theme.radius.xl,
        border: "1px solid " + c.hairline,
        boxShadow: c.shadow,
        padding: 8,
        animation: "dcIn 180ms ease",
        fontFamily: fontStack(theme),
        color: theme.text.primary,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 4px" }}>
        <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>Sound & music</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            minHeight: 32,
            padding: "4px 10px",
            border: "none",
            background: "transparent",
            color: theme.text.secondary,
            fontFamily: fontStack(theme),
            ...theme.font.label,
            fontWeight: theme.weight.semibold,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
      <Toggle
        theme={theme}
        c={c}
        label="Sounds"
        hint="Check-off, chain link, and the coin in the jar."
        on={store.sounds}
        onClick={onToggleSounds}
      />
      <div style={{ height: 1, background: c.hairline, margin: "0 12px" }} />
      <Toggle
        theme={theme}
        c={c}
        label="Quiet music"
        hint="A soft background pad. Off until you turn it on."
        on={store.music}
        onClick={onToggleMusic}
      />
    </div>
  );
}
