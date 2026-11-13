import { useEffect, useRef, useState } from "react";
import type { GrokTheme } from "../grok";
import { BLOCKS, HABITS, WEEKLY, currentBlock, habitsIn, isAfter, type BlockId, type HabitDef } from "../habits";
import {
  blockFreestyle,
  chainStreak,
  completedCount,
  dayOf,
  formatLong,
  gymDaysInWeek,
  habitDone,
  identityCountInWeek,
  jarBalance,
  jarProgress,
  missedYesterday,
  mondayOf,
  requiredComplete,
  todayKey,
  type DayState,
  type Store,
} from "../store";
import { ChainLink, ChainPair, IconChevron, IconGear, IconList, IconSound, TreatJar } from "../icons";
import { Card, CheckMark, Money, craft as makeCraft, type Craft, fontStack } from "./chrome";

export function Today({
  theme,
  store,
  viewDate,
  fresh,
  onToggle,
  onOpenFreestyle,
  onOneMore,
  onBreakfast,
  onDinner,
  onOpenJar,
  onOpenSettings,
  onOpenChores,
  onOpenIdentity,
  onBackToday,
}: {
  theme: GrokTheme;
  store: Store;
  viewDate: string;
  fresh: Record<string, boolean>;
  onToggle: (habitId: string) => void;
  onOpenFreestyle: (block: BlockId, extra: boolean) => void;
  onOneMore: (block: BlockId) => void;
  onBreakfast: (v: "eggs" | "shake") => void;
  onDinner: (v: "cooked" | "out") => void;
  onOpenJar: () => void;
  onOpenSettings: () => void;
  onOpenChores: () => void;
  onOpenIdentity: (id?: string) => void;
  onBackToday: () => void;
}) {
  const c = makeCraft(theme);
  const today = todayKey();
  const isToday = viewDate === today;
  const day = dayOf(store, viewDate);
  const done = requiredComplete(day);
  const counts = completedCount(day);
  const streak = chainStreak(store, today);
  const miss = missedYesterday(store, today) && isToday && !done;
  const nowBlock = isToday ? currentBlock() : null;
  const lunchCue = isToday && isAfter(12) && !habitDone(day, "lunch");
  const cartOpen = isAfter(18);
  const mon = mondayOf(viewDate);
  const gymN = gymDaysInWeek(store, mon);
  const golfN = identityCountInWeek(store, viewDate, "golf");
  const storN = identityCountInWeek(store, viewDate, "storage");
  const jarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isToday) return;
    if (nowBlock === "morning" || !nowBlock) return;
    const el = document.getElementById("block-" + nowBlock);
    if (el) {
      const t = window.setTimeout(() => el.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
      return () => window.clearTimeout(t);
    }
  }, []); // only on first mount

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.medium }}>
            {isToday ? "Today" : "Looking back"}
          </div>
          <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em", marginTop: 1 }}>
            {formatLong(viewDate)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <IconBtn theme={theme} label={store.sounds ? "Sounds on" : "Sounds off"} onClick={onOpenSettings}>
            <IconSound on={store.sounds} />
          </IconBtn>
          <IconBtn theme={theme} label="Chores" onClick={onOpenChores}>
            <IconList />
          </IconBtn>
          <IconBtn theme={theme} label="Settings" onClick={onOpenSettings}>
            <IconGear />
          </IconBtn>
        </div>
      </header>

      {!isToday ? (
        <button
          type="button"
          onClick={onBackToday}
          style={quietBtn(theme)}
        >
          Back to today
        </button>
      ) : null}

      <Card theme={theme} c={c} pad={14} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            flex: "0 0 auto",
            animation: done && fresh["__chain"] ? "dcLinkIn 560ms cubic-bezier(.2,1.2,.3,1)" : undefined,
          }}
        >
          {done ? <ChainPair size={44} /> : <ChainLink size={36} kind={miss ? "miss" : "empty"} />}
        </div>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          {miss ? (
            <>
              <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>Don't miss twice.</div>
              <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}>
                Yesterday's chain broke. Finish today's lines and start a new one.
              </div>
            </>
          ) : done ? (
            <>
              <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>
                {isToday ? "Today is linked." : "This day is linked."}
              </div>
              <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}>
                {streak === 1 ? "First link of a new chain." : streak + "-day chain."}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>
                {streak > 0 ? streak + "-day chain" : "Start today's chain"}
              </div>
              <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}>
                {counts.done} of {counts.required} lines · finish them all to add a link
              </div>
            </>
          )}
        </div>
      </Card>

      <button
        ref={jarRef}
        id="treat-jar-target"
        type="button"
        onClick={onOpenJar}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: theme.radius.xl,
          border: "1px solid " + c.hairline,
          background: c.card,
          boxShadow: c.shadow,
          color: theme.text.primary,
          fontFamily: fontStack(theme),
          cursor: "pointer",
        }}
      >
        <TreatJar size={48} progress={jarProgress(store.jar)} />
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          {store.jar.goal && store.jar.price ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ ...theme.font.body2, fontWeight: theme.weight.semibold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {store.jar.goal}
                </span>
                <span style={{ ...theme.font.caption, color: theme.text.secondary, flex: "0 0 auto", fontWeight: theme.weight.semibold }}>
                  {Money(jarBalance(store.jar))} / {Money(store.jar.price)}
                </span>
              </div>
              <div
                style={{
                  marginTop: 7,
                  height: 6,
                  borderRadius: 3,
                  background: c.goldSoft,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: jarProgress(store.jar) * 100 + "%",
                    height: "100%",
                    borderRadius: 3,
                    background: c.gold,
                    transition: "width 500ms ease",
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ ...theme.font.body2, fontWeight: theme.weight.semibold }}>Treat jar</div>
              <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}>
                Set a goal. Extra credit fills it, {Money(store.jar.perExtra)} at a time.
              </div>
            </>
          )}
        </div>
        <span style={{ color: theme.text.tertiary, flex: "0 0 auto" }}>
          <IconChevron />
        </span>
      </button>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <WeekChip theme={theme} c={c} label="Gym" n={gymN} of={WEEKLY.gym} onClick={() => onOpenIdentity("gym")} />
        <WeekChip theme={theme} c={c} label="Golf" n={golfN} of={WEEKLY.golf} onClick={() => onOpenIdentity("golf")} />
        <WeekChip theme={theme} c={c} label="Storage" n={storN} of={WEEKLY.storage} onClick={() => onOpenIdentity("storage")} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {BLOCKS.map((b) => (
          <BlockCard
            key={b.id}
            theme={theme}
            c={c}
            block={b.id}
            day={day}
            isNow={nowBlock === b.id}
            isToday={isToday}
            lunchCue={lunchCue && b.id === "afternoon"}
            cartOpen={cartOpen}
            fresh={fresh}
            onToggle={onToggle}
            onOpenFreestyle={onOpenFreestyle}
            onOneMore={onOneMore}
            onBreakfast={onBreakfast}
            onDinner={onDinner}
          />
        ))}
      </div>
    </div>
  );
}

function WeekChip({
  theme,
  c,
  label,
  n,
  of,
  onClick,
}: {
  theme: GrokTheme;
  c: Craft;
  label: string;
  n: number;
  of: number;
  onClick: () => void;
}) {
  const full = n >= of;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 32,
        padding: "4px 11px",
        borderRadius: theme.radius.full,
        border: "1px solid " + (full ? c.gold : c.hairline),
        background: full ? c.goldSoft : c.card,
        color: full ? c.goldDeep : theme.text.secondary,
        fontFamily: fontStack(theme),
        ...theme.font.caption,
        fontWeight: theme.weight.semibold,
        cursor: "pointer",
      }}
    >
      {label} {n}/{of}
    </button>
  );
}

function BlockCard({
  theme,
  c,
  block,
  day,
  isNow,
  isToday,
  lunchCue,
  cartOpen,
  fresh,
  onToggle,
  onOpenFreestyle,
  onOneMore,
  onBreakfast,
  onDinner,
}: {
  theme: GrokTheme;
  c: Craft;
  block: BlockId;
  day: DayState;
  isNow: boolean;
  isToday: boolean;
  lunchCue: boolean;
  cartOpen: boolean;
  fresh: Record<string, boolean>;
  onToggle: (habitId: string) => void;
  onOpenFreestyle: (block: BlockId, extra: boolean) => void;
  onOneMore: (block: BlockId) => void;
  onBreakfast: (v: "eggs" | "shake") => void;
  onDinner: (v: "cooked" | "out") => void;
}) {
  const def = BLOCKS.find((b) => b.id === block)!;
  const items = habitsIn(block);
  const required = items.filter((h) => h.required);
  const blockDone = required.length > 0
    ? required.every((h) => habitDone(day, h.id))
    : items.length > 0 && items.every((h) => habitDone(day, h.id));
  const [open, setOpen] = useState(!blockDone || isNow);
  useEffect(() => {
    // Open the current block if it still has work. Never auto-collapse after
    // a check — "can I do one more?" lives inside a just-finished block.
    if (isNow && !blockDone) setOpen(true);
  }, [blockDone, isNow]);
  const doneN = items.filter((h) => habitDone(day, h.id)).length;

  return (
    <Card
      theme={theme}
      c={c}
      pad={0}
      style={{
        borderColor: isNow ? c.gold : c.hairline,
        boxShadow: isNow ? "0 0 0 1px " + c.gold + ", " + c.shadow : c.shadow,
        overflow: "hidden",
        animation: "dcIn 320ms ease",
      }}
    >
      <div id={"block-" + block}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            minHeight: 58,
            padding: "12px 14px",
            border: "none",
            background: "transparent",
            color: theme.text.primary,
            fontFamily: fontStack(theme),
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>{def.name}</span>
              {isNow ? (
                <span
                  style={{
                    ...theme.font.caption,
                    fontWeight: theme.weight.semibold,
                    color: c.goldDeep,
                    border: "1px solid " + c.gold,
                    borderRadius: theme.radius.full,
                    padding: "0 8px",
                    lineHeight: "18px",
                  }}
                >
                  Now
                </span>
              ) : null}
              {blockDone ? (
                <span style={{ ...theme.font.caption, fontWeight: theme.weight.semibold, color: c.goldDeep }}>Done</span>
              ) : null}
            </div>
            <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 1 }}>{def.time}</div>
          </div>
          <span
            style={{
              minWidth: 26,
              height: 26,
              padding: "0 7px",
              borderRadius: 13,
              background: blockDone ? c.gold : theme.fill.secondary,
              color: blockDone ? theme.text.onColor : theme.text.secondary,
              ...theme.font.caption,
              fontWeight: theme.weight.semibold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {doneN}/{items.length}
          </span>
          <span style={{ color: theme.text.tertiary, transform: open ? "rotate(90deg)" : "none", transition: "transform 200ms ease" }}>
            <IconChevron />
          </span>
        </button>
      </div>
      {open ? (
        <div style={{ padding: "0 8px 12px", display: "flex", flexDirection: "column", gap: 2, animation: "dcIn 220ms ease" }}>
          <div style={{ ...theme.font.caption, color: theme.text.tertiary, padding: "0 8px 8px" }}>{def.hint}</div>
          {lunchCue ? (
            <div
              style={{
                margin: "0 6px 8px",
                padding: "8px 12px",
                borderRadius: theme.radius.lg,
                background: theme.fill.warningSubtle,
                color: theme.text.warningDeep,
                ...theme.font.caption,
                fontWeight: theme.weight.semibold,
              }}
            >
              It's 12. Time to cook lunch.
            </div>
          ) : null}
          {block === "home" ? (
            <div
              style={{
                margin: "0 6px 8px",
                padding: "8px 12px",
                borderRadius: theme.radius.lg,
                background: cartOpen ? theme.fill.successSubtle : theme.fill.secondary,
                color: cartOpen ? theme.text.successDeep : theme.text.secondary,
                ...theme.font.caption,
                fontWeight: theme.weight.semibold,
              }}
            >
              {cartOpen ? "Cart is unlocked." : "Cart unlocks at 6:00pm."}
            </div>
          ) : null}
          {items.map((h) => (
            <HabitRow
              key={h.id}
              theme={theme}
              c={c}
              habit={h}
              day={day}
              fresh={!!fresh[h.id]}
              isToday={isToday}
              onToggle={onToggle}
              onOpenFreestyle={onOpenFreestyle}
              onOneMore={onOneMore}
              onBreakfast={onBreakfast}
              onDinner={onDinner}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function HabitRow({
  theme,
  c,
  habit,
  day,
  fresh,
  isToday,
  onToggle,
  onOpenFreestyle,
  onOneMore,
  onBreakfast,
  onDinner,
}: {
  theme: GrokTheme;
  c: Craft;
  habit: HabitDef;
  day: DayState;
  fresh: boolean;
  isToday: boolean;
  onToggle: (habitId: string) => void;
  onOpenFreestyle: (block: BlockId, extra: boolean) => void;
  onOneMore: (block: BlockId) => void;
  onBreakfast: (v: "eggs" | "shake") => void;
  onDinner: (v: "cooked" | "out") => void;
}) {
  const on = habitDone(day, habit.id);
  const isFs = habit.kind === "freestyle";
  const extras = isFs ? blockFreestyle(day, habit.block).filter((f) => f.extra) : [];
  const mains = isFs ? blockFreestyle(day, habit.block).filter((f) => !f.extra) : [];
  const click = () => {
    if (isFs) {
      if (on) onToggle(habit.id);
      else onOpenFreestyle(habit.block, false);
      return;
    }
    onToggle(habit.id);
  };
  const sub =
    isFs && day.marketWorked && habit.id === "market-fs"
      ? "I was working or trading"
      : isFs && day.afternoonBusy && habit.id === "aft-fs"
        ? "Still catching up"
        : isFs && mains[0]
          ? mains[0].text
          : habit.id === "breakfast" && day.breakfast
            ? day.breakfast === "eggs"
              ? "Eggs and toast"
              : "Shake"
            : habit.id === "dinner" && day.dinner
              ? day.dinner === "cooked"
                ? "We cooked"
                : "We went out"
              : null;

  return (
    <div
      style={{
        borderRadius: theme.radius.lg,
        background: on ? c.goldSoft : "transparent",
        padding: "2px 0",
      }}
    >
      <button
        type="button"
        onClick={click}
        aria-pressed={on}
        aria-label={(on ? "Undo: " : "Check off: ") + habit.text}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          width: "100%",
          textAlign: "left",
          minHeight: 52,
          padding: "10px 8px",
          border: "none",
          background: "transparent",
          color: on ? theme.text.secondary : theme.text.primary,
          fontFamily: fontStack(theme),
          cursor: "pointer",
        }}
      >
        <span style={{ marginTop: 1 }}>
          <CheckMark on={on} fresh={fresh} theme={theme} color={c.gold} />
        </span>
        <span style={{ flex: "1 1 auto", minWidth: 0 }}>
          <span
            style={{
              display: "block",
              ...theme.font.body1,
              lineHeight: "22px",
              textDecoration: on ? "none" : "none",
              fontWeight: on ? theme.weight.regular : theme.weight.medium,
            }}
          >
            {habit.text}
          </span>
          {!on && habit.caption ? (
            <span style={{ display: "block", ...theme.font.caption, color: theme.text.tertiary, marginTop: 2 }}>{habit.caption}</span>
          ) : null}
          {on && sub ? (
            <span style={{ display: "block", ...theme.font.caption, color: c.goldDeep, marginTop: 3, fontWeight: theme.weight.semibold }}>
              {sub}
            </span>
          ) : null}
        </span>
      </button>
      {habit.id === "breakfast" && on ? (
        <div style={{ display: "flex", gap: 8, padding: "0 8px 10px 46px" }}>
          <MiniChip theme={theme} c={c} on={day.breakfast === "eggs"} onClick={() => onBreakfast("eggs")}>
            Eggs & toast
          </MiniChip>
          <MiniChip theme={theme} c={c} on={day.breakfast === "shake"} onClick={() => onBreakfast("shake")}>
            Shake
          </MiniChip>
        </div>
      ) : null}
      {habit.id === "dinner" && !on ? (
        <div style={{ display: "flex", gap: 8, padding: "0 8px 10px 46px" }}>
          <MiniChip theme={theme} c={c} on={false} onClick={() => onDinner("cooked")}>
            We cooked
          </MiniChip>
          <MiniChip theme={theme} c={c} on={false} onClick={() => onDinner("out")}>
            We went out
          </MiniChip>
        </div>
      ) : null}
      {isFs && mains.slice(1).map((f) => (
        <div key={f.id} style={{ ...theme.font.caption, color: c.goldDeep, padding: "0 8px 6px 46px", fontWeight: theme.weight.semibold }}>
          {f.text}
        </div>
      ))}
      {extras.map((f) => (
        <div
          key={f.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px 8px 46px",
            ...theme.font.caption,
            color: c.goldDeep,
            fontWeight: theme.weight.semibold,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 7px",
              borderRadius: theme.radius.full,
              background: c.goldSoft,
              color: c.goldDeep,
              fontWeight: theme.weight.semibold,
            }}
          >
            +{Money(5).replace("$", "$")} extra
          </span>
          <span style={{ flex: "1 1 auto", minWidth: 0 }}>{f.text}</span>
        </div>
      ))}
      {isFs && on && isToday ? (
        <div style={{ padding: "0 8px 10px 46px" }}>
          <button
            type="button"
            onClick={() => onOneMore(habit.block)}
            style={{
              minHeight: 36,
              padding: "6px 12px",
              borderRadius: theme.radius.full,
              border: "1px solid " + c.gold,
              background: "transparent",
              color: c.goldDeep,
              fontFamily: fontStack(theme),
              ...theme.font.label,
              fontWeight: theme.weight.semibold,
              cursor: "pointer",
            }}
          >
            Can I do one more?
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MiniChip({
  theme,
  c,
  on,
  onClick,
  children,
}: {
  theme: GrokTheme;
  c: Craft;
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        minHeight: 32,
        padding: "4px 12px",
        borderRadius: theme.radius.full,
        border: "1px solid " + (on ? c.gold : theme.border.default),
        background: on ? c.goldSoft : "transparent",
        color: on ? c.goldDeep : theme.text.secondary,
        fontFamily: fontStack(theme),
        ...theme.font.caption,
        fontWeight: theme.weight.semibold,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  theme,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  theme: GrokTheme;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
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

function quietBtn(theme: GrokTheme): React.CSSProperties {
  return {
    alignSelf: "flex-start",
    minHeight: 36,
    padding: "6px 12px",
    borderRadius: theme.radius.full,
    border: "1px solid " + theme.border.default,
    background: "transparent",
    color: theme.text.primary,
    fontFamily: fontStack(theme),
    ...theme.font.label,
    fontWeight: theme.weight.semibold,
    cursor: "pointer",
  };
}
