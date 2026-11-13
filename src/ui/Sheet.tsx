import { useState } from "react";
import type { GrokTheme } from "../grok";
import { FREESTYLE, FREESTYLE_GROUPS, categoryOfGroup, categoryOfOption, tone, type BlockId, type FreestyleOption } from "../habits";
import { IconClose } from "../icons";
import type { Chore } from "../store";
import { Field, Pill, craft as makeCraft, fontStack } from "./chrome";

export function FreestyleSheet({
  theme,
  block,
  extra,
  chores,
  onPick,
  onWorked,
  onBusy,
  onClose,
}: {
  theme: GrokTheme;
  block: BlockId;
  extra: boolean;
  chores: Chore[];
  onPick: (optionId: string, text: string) => void;
  onWorked: () => void;
  onBusy: () => void;
  onClose: () => void;
}) {
  const c = makeCraft(theme);
  const [custom, setCustom] = useState("");
  const [choreOpen, setChoreOpen] = useState(false);
  const today = new Date();
  const key = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const openChores = chores.filter((ch) => !ch.done[key]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(10,8,8,.45)",
        animation: "dcFade 180ms ease",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={extra ? "One more freestyle" : "Choose a freestyle activity"}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: "88dvh",
          overflow: "auto",
          background: c.card,
          borderRadius: "20px 20px 0 0",
          padding: "12px 16px calc(18px + env(safe-area-inset-bottom))",
          animation: "dcSheet 280ms cubic-bezier(.2,.9,.3,1)",
          color: theme.text.primary,
          fontFamily: fontStack(theme),
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border.default, margin: "2px auto 12px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ ...theme.font.heading3, fontWeight: theme.weight.semibold }}>
              {extra ? "One more." : "Freestyle"}
            </div>
            <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 3 }}>
              {extra
                ? "This one is extra credit. A coin goes in the jar."
                : block === "market"
                  ? "If you were working or trading, that's enough. Otherwise, pick one."
                  : "If you're caught up, pick one. Then ask: can I do one more?"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: "1px solid " + theme.border.default,
              background: "transparent",
              color: theme.text.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            <IconClose />
          </button>
        </div>

        {!extra && block === "market" ? (
          <Choice theme={theme} c={c} title="I was working or trading" hint="That counts." onClick={onWorked} accent />
        ) : null}

        {FREESTYLE_GROUPS.map((g) => {
          const opts = FREESTYLE.filter((o) => o.group === g.id);
          return (
            <div key={g.id} style={{ marginTop: 14 }}>
              <div
                style={{
                  ...theme.font.caption,
                  fontWeight: theme.weight.semibold,
                  color: tone(theme.kind, categoryOfGroup(g.id)).ink,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  margin: "0 2px 6px",
                }}
              >
                {g.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {opts.map((o: FreestyleOption) =>
                  o.id === "tidy" && openChores.length > 0 ? (
                    <div key={o.id}>
                      <Choice
                        theme={theme}
                        c={c}
                        title={o.text}
                        hint={choreOpen ? "Pick a chore, or log a quick tidy-up." : undefined}
                        onClick={() => setChoreOpen(!choreOpen)}
                        ink={tone(theme.kind, categoryOfOption(o.id)).ink}
                        soft={tone(theme.kind, categoryOfOption(o.id)).soft}
                      />
                      {choreOpen ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 0 4px 12px" }}>
                          {openChores.map((ch) => (
                            <Choice key={ch.id} theme={theme} c={c} title={ch.text} onClick={() => onPick("tidy", ch.text)} />
                          ))}
                          <Choice theme={theme} c={c} title="Quick tidy-up" onClick={() => onPick(o.id, o.text)} />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <Choice key={o.id} theme={theme} c={c} title={o.text} onClick={() => onPick(o.id, o.text)} ink={tone(theme.kind, categoryOfOption(o.id)).ink} soft={tone(theme.kind, categoryOfOption(o.id)).soft} />
                  ),
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field
            theme={theme}
            value={custom}
            onChange={setCustom}
            placeholder="Something else"
            onSubmit={() => {
              if (custom.trim()) onPick("custom", custom.trim());
            }}
          />
          <Pill
            theme={theme}
            strong
            color={c.gold}
            onClick={() => {
              if (custom.trim()) onPick("custom", custom.trim());
            }}
          >
            Add
          </Pill>
        </div>

        {!extra && block === "afternoon" ? (
          <div style={{ marginTop: 16 }}>
            <Choice theme={theme} c={c} title="Still catching up" hint="That's okay. This line still counts." onClick={onBusy} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Choice({
  theme,
  c,
  title,
  hint,
  onClick,
  accent,
  ink,
  soft,
}: {
  theme: GrokTheme;
  c: ReturnType<typeof makeCraft>;
  title: string;
  hint?: string;
  onClick: () => void;
  accent?: boolean;
  ink?: string;
  soft?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        minHeight: 48,
        padding: "12px 14px",
        borderRadius: theme.radius.lg,
        border: "1px solid " + (accent ? c.gold : theme.border.default),
        borderLeft: "3.5px solid " + (accent ? c.gold : ink || theme.border.default),
        background: accent ? c.goldSoft : theme.bg.base,
        color: theme.text.primary,
        fontFamily: fontStack(theme),
        cursor: "pointer",
      }}
    >
      <span style={{ display: "block", ...theme.font.body1, fontWeight: accent ? theme.weight.semibold : theme.weight.medium }}>
        {title}
      </span>
      {hint ? (
        <span style={{ display: "block", ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}>{hint}</span>
      ) : null}
    </button>
  );
}
