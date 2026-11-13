import { useState } from "react";
import type { GrokTheme } from "../grok";
import { IconPlus } from "../icons";
import { todayKey, type Chore, type Store } from "../store";
import { Card, CheckMark, Field, Pill, craft as makeCraft, fontStack } from "./chrome";

export function ChoresPage({
  theme,
  store,
  onAdd,
  onToggle,
  onRemove,
  onBack,
}: {
  theme: GrokTheme;
  store: Store;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}) {
  const c = makeCraft(theme);
  const [draft, setDraft] = useState("");
  const today = todayKey();
  const add = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16, animation: "dcIn 280ms ease" }}>
      <header>
        <button type="button" onClick={onBack} style={{ alignSelf: "flex-start", minHeight: 36, padding: "6px 4px", border: "none", background: "transparent", color: theme.text.primary, fontFamily: fontStack(theme), ...theme.font.label, fontWeight: theme.weight.semibold, cursor: "pointer" }}>‹ Today</button>
        <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em", marginTop: 4 }}>
          Chores
        </div>
        <div style={{ ...theme.font.body2, color: theme.text.secondary, marginTop: 6 }}>
          A simple list, ready when you are.
        </div>
      </header>
      <Card theme={theme} c={c}>
        <div style={{ display: "flex", gap: 8 }}>
          <Field theme={theme} value={draft} onChange={setDraft} placeholder="Add a chore" onSubmit={add} />
          <Pill theme={theme} strong color={c.gold} onClick={add} ariaLabel="Add chore">
            <IconPlus />
          </Pill>
        </div>
      </Card>
      {store.chores.length === 0 ? (
        <div style={{ ...theme.font.body2, color: theme.text.tertiary, padding: "12px 4px" }}>Nothing here yet.</div>
      ) : (
        <Card theme={theme} c={c} pad={8}>
          {store.chores.map((ch: Chore) => {
            const on = !!ch.done[today];
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onToggle(ch.id)}
                  aria-pressed={on}
                  aria-label={(on ? "Undo: " : "Check off: ") + ch.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: "1 1 auto",
                    minWidth: 0,
                    minHeight: 52,
                    padding: "10px 8px 10px 10px",
                    border: "none",
                    background: "transparent",
                    color: on ? theme.text.secondary : theme.text.primary,
                    fontFamily: fontStack(theme),
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <CheckMark on={on} theme={theme} color={c.gold} />
                  <span style={{ ...theme.font.body1 }}>{ch.text}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(ch.id)}
                  aria-label={"Remove " + ch.text}
                  style={{
                    minHeight: 36,
                    padding: "6px 12px",
                    border: "none",
                    background: "transparent",
                    color: theme.text.tertiary,
                    fontFamily: fontStack(theme),
                    ...theme.font.caption,
                    fontWeight: theme.weight.semibold,
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
