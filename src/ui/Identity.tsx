import type { GrokTheme } from "../grok";
import { IDENTITIES, WEEKLY, tone, type IdentityId } from "../habits";
import { ChainLink, IconChevron } from "../icons";
import {
  addDays,
  dayMark,
  dayOf,
  identityCountInWeek,
  identityDone,
  identityStreak,
  keyOf,
  mondayOf,
  parseKey,
  todayKey,
  type Store,
} from "../store";
import { Card, craft as makeCraft, fontStack, type Craft } from "./chrome";

export function IdentityList({
  theme,
  store,
  onOpen,
}: {
  theme: GrokTheme;
  store: Store;
  onOpen: (id: IdentityId) => void;
}) {
  const c = makeCraft(theme);
  const today = todayKey();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12, animation: "dcIn 280ms ease" }}>
      <header>
        <div style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.medium }}>Identity</div>
        <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em", marginTop: 1 }}>
          Who you're becoming
        </div>
        <div style={{ ...theme.font.body2, color: theme.text.secondary, marginTop: 6 }}>
          Each part has its own chain. It can stay unbroken even if a day's overall chain breaks.
        </div>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {IDENTITIES.map((iden) => {
          const streak = identityStreak(store, today, iden.id);
          const todayOn = identityDone(dayOf(store, today), iden.id);
          const color = identColor(theme, iden.id);
          const weekish = iden.id === "gym" || iden.id === "golf" || iden.id === "storage";
          const of = iden.id === "gym" ? WEEKLY.gym : iden.id === "golf" ? WEEKLY.golf : WEEKLY.storage;
          const weekN = weekish ? identityCountInWeek(store, today, iden.id) : 0;
          return (
            <button
              key={iden.id}
              type="button"
              onClick={() => onOpen(iden.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "14px 14px",
                borderRadius: theme.radius.xl,
                border: "1px solid " + c.hairline,
                background: c.card,
                boxShadow: c.shadow,
                color: theme.text.primary,
                fontFamily: fontStack(theme),
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: color,
                  flex: "0 0 auto",
                }}
              />
              <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>{iden.name}</span>
                  {todayOn ? <ChainLink size={16} kind="gold" /> : null}
                </span>
                <span style={{ display: "block", ...theme.font.caption, color: theme.text.secondary, marginTop: 3 }}>
                  {weekish
                    ? weekN + " of " + of + " this week"
                    : streak === 0
                      ? "No chain yet"
                      : streak + (streak === 1 ? "-day chain" : "-day chain")}
                </span>
              </span>
              <span style={{ color: theme.text.tertiary, flex: "0 0 auto" }}>
                <IconChevron />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IdentityDetail({
  theme,
  store,
  id,
  onBack,
}: {
  theme: GrokTheme;
  store: Store;
  id: IdentityId;
  onBack: () => void;
}) {
  const c = makeCraft(theme);
  const def = IDENTITIES.find((x) => x.id === id)!;
  const today = todayKey();
  const streak = identityStreak(store, today, id);
  const color = identColor(theme, id);
  const start = parseKey(today);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const label = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstKey = keyOf(new Date(year, month, 1));
  const gridStart = mondayOf(firstKey);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  if (parseKey(days[35]).getMonth() !== month) days.splice(35, 7);
  const weekish = id === "gym" || id === "golf" || id === "storage";
  const of = id === "gym" ? WEEKLY.gym : id === "golf" ? WEEKLY.golf : WEEKLY.storage;
  const weekN = weekish ? identityCountInWeek(store, today, id) : 0;
  const how =
    id === "faith"
      ? "A link on any day you pray."
      : id === "gym"
        ? "A link on gym days. Five in a week adds a bonus to your treat jar."
        : id === "cooking"
          ? "A link when you cook breakfast and lunch. Dinner is a bonus, and optional."
          : id === "trading"
            ? "A link when you set your zones and sit down at the computer."
            : id === "golf"
              ? "A link on days you log a golf freestyle. Aim for a couple a week."
              : id === "storage"
                ? "A link on days you help Ryan at the storage. Aim for a couple a week."
                : "A link on days you feed Hazel and walk her.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 12, animation: "dcIn 280ms ease" }}>
      <button type="button" onClick={onBack} style={backStyle(theme)}>
        ‹ Identity
      </button>
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: color, flex: "0 0 auto" }} />
          <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em" }}>{def.name}</div>
        </div>
        <p
          style={{
            ...theme.font.body1,
            color: theme.text.primary,
            lineHeight: "24px",
            margin: "12px 0 0",
            WebkitUserSelect: "text",
            userSelect: "text",
          }}
        >
          {def.description}
        </p>
        <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 10 }}>{how}</div>
        <div style={{ ...theme.font.body2, fontWeight: theme.weight.semibold, marginTop: 12, color: color }}>
          {weekish ? weekN + " of " + of + " this week" : streak === 0 ? "No chain yet" : streak + "-day chain"}
        </div>
      </header>
      <Card theme={theme} c={c} pad={14}>
        <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold, marginBottom: 12 }}>{label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px 0", textAlign: "center" }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={d + i} style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.semibold, paddingBottom: 4 }}>
              {d}
            </div>
          ))}
          {days.map((key, i) => {
            const inMonth = parseKey(key).getMonth() === month;
            const on = identityDone(dayOf(store, key), id);
            const overall = dayMark(store, key, today);
            const next = days[i + 1];
            const nextOn = next ? identityDone(dayOf(store, next), id) : false;
            const linked = on && nextOn && i % 7 !== 6;
            const future = overall === "future";
            return (
              <div key={key} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 50 }}>
                {linked ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 18,
                      left: "50%",
                      right: "-50%",
                      height: 3,
                      borderRadius: 2,
                      background: color,
                      opacity: 0.8,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    position: "relative",
                    width: 40,
                    height: 44,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: inMonth ? 1 : 0.35,
                    color: future ? theme.text.tertiary : theme.text.primary,
                  }}
                >
                  <span style={{ ...theme.font.caption, fontWeight: theme.weight.semibold, lineHeight: "14px" }}>
                    {parseKey(key).getDate()}
                  </span>
                  <span style={{ height: 16, display: "flex", alignItems: "center" }}>
                    {on ? (
                      <ChainLink size={16} kind="gold" />
                    ) : overall === "miss" || overall === "today" || overall === "complete" ? (
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.border.default }} />
                    ) : (
                      <span style={{ width: 16, height: 8 }} />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function identColor(theme: GrokTheme, id: IdentityId): string {
  return tone(theme.kind, id).ink;
}

function backStyle(theme: GrokTheme): React.CSSProperties {
  return {
    alignSelf: "flex-start",
    minHeight: 36,
    padding: "6px 4px",
    border: "none",
    background: "transparent",
    color: theme.text.primary,
    fontFamily: fontStack(theme),
    ...theme.font.label,
    fontWeight: theme.weight.semibold,
    cursor: "pointer",
  };
}
