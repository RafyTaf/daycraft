import { useState } from "react";
import type { GrokTheme } from "../grok";
import { ChainLink } from "../icons";
import {
  addDays,
  chainStreak,
  dayMark,
  formatLong,
  keyOf,
  mondayOf,
  parseKey,
  todayKey,
  type DayMark,
  type Store,
} from "../store";
import { Card, craft as makeCraft, fontStack, type Craft } from "./chrome";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarPage({
  theme,
  store,
  viewDate,
  onOpenDay,
}: {
  theme: GrokTheme;
  store: Store;
  viewDate: string;
  onOpenDay: (key: string) => void;
}) {
  const c = makeCraft(theme);
  const today = todayKey();
  const start = parseKey(viewDate);
  const [cursor, setCursor] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const label = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const first = new Date(year, month, 1);
  const firstKey = keyOf(first);
  const gridStart = mondayOf(firstKey);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  // trim trailing week if entirely next month
  if (parseKey(days[35]).getMonth() !== month) days.splice(35, 7);
  const streak = chainStreak(store, today);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 12, animation: "dcIn 280ms ease" }}>
      <header>
        <div style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.medium }}>Calendar</div>
        <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em", marginTop: 1 }}>
          Your chain
        </div>
        <div style={{ ...theme.font.body2, color: theme.text.secondary, marginTop: 6 }}>
          {streak === 0
            ? "Finish today's lines to place the first link."
            : streak === 1
              ? "One link so far. Don't miss twice."
              : streak + "-day chain. Don't miss twice."}
        </div>
      </header>

      <Card theme={theme} c={c} pad={14}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Nav theme={theme} label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            ‹
          </Nav>
          <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>{label}</div>
          <Nav theme={theme} label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            ›
          </Nav>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px 0", textAlign: "center" }}>
          {DOW.map((d, i) => (
            <div key={d + i} style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.semibold, paddingBottom: 4 }}>
              {d}
            </div>
          ))}
          {days.map((key, i) => {
            const inMonth = parseKey(key).getMonth() === month;
            const mark = dayMark(store, key, today);
            const next = days[i + 1];
            const nextMark = next ? dayMark(store, next, today) : "future";
            const sameWeek = i % 7 !== 6;
            const linked = mark === "complete" && nextMark === "complete" && sameWeek;
            return (
              <DayCell
                key={key}
                theme={theme}
                c={c}
                dateKey={key}
                inMonth={inMonth}
                mark={mark}
                linked={linked}
                selected={key === viewDate}
                onOpen={() => onOpenDay(key)}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 16px",
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid " + c.hairline,
            ...theme.font.caption,
            color: theme.text.secondary,
          }}
        >
          <Legend icon={<ChainLink size={20} kind="gold" />} label="Linked" theme={theme} />
          <Legend icon={<ChainLink size={20} kind="miss" />} label="Missed" theme={theme} />
          <Legend icon={<ChainLink size={20} kind="empty" />} label="Today" theme={theme} />
        </div>
      </Card>
    </div>
  );
}

function DayCell({
  theme,
  c,
  dateKey,
  inMonth,
  mark,
  linked,
  selected,
  onOpen,
}: {
  theme: GrokTheme;
  c: Craft;
  dateKey: string;
  inMonth: boolean;
  mark: DayMark;
  linked: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  const d = parseKey(dateKey).getDate();
  const future = mark === "future";
  const clickable = mark !== "future" && mark !== "neutral";
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 58 }}>
      {linked ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 22,
            left: "50%",
            right: "-50%",
            height: 3.5,
            borderRadius: 2,
            background: c.gold,
            opacity: 0.85,
            zIndex: 0,
          }}
        />
      ) : null}
      <button
        type="button"
        onClick={clickable ? onOpen : undefined}
        disabled={!clickable}
        aria-label={formatLong(dateKey) + ", " + (mark === "complete" ? "linked" : mark === "miss" ? "missed" : mark)}
        aria-current={dateKey === todayKey() ? "date" : undefined}
        style={{
          position: "relative",
          zIndex: 1,
          width: 40,
          height: 48,
          padding: 0,
          border: selected ? "1.5px solid " + c.gold : "1.5px solid transparent",
          borderRadius: 14,
          background: mark === "today" ? c.goldSoft : "transparent",
          color: !inMonth || future || mark === "neutral" ? theme.text.tertiary : theme.text.primary,
          opacity: inMonth ? 1 : 0.4,
          fontFamily: fontStack(theme),
          cursor: clickable ? "pointer" : "default",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <span style={{ ...theme.font.caption, fontWeight: theme.weight.semibold, lineHeight: "14px" }}>{d}</span>
        <span style={{ height: 16, display: "flex", alignItems: "center" }}>
          {mark === "complete" ? (
            <ChainLink size={20} kind="gold" />
          ) : mark === "miss" ? (
            <ChainLink size={20} kind="miss" />
          ) : mark === "today" ? (
            <ChainLink size={20} kind="empty" />
          ) : (
            <span style={{ width: 16, height: 8 }} />
          )}
        </span>
      </button>
    </div>
  );
}

function Nav({ children, onClick, theme, label }: { children: string; onClick: () => void; theme: GrokTheme; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        border: "1px solid " + theme.border.default,
        background: "transparent",
        color: theme.text.primary,
        fontSize: 22,
        lineHeight: "32px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Legend({ icon, label, theme }: { icon: React.ReactNode; label: string; theme: GrokTheme }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {icon}
      {label}
    </span>
  );
}
