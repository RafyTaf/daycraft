import { useEffect, useRef, useState } from "react";
import { syncChrome, useGrokTheme } from "./grok";
import { type BlockId } from "./habits";
import { Coin, IconNav } from "./icons";
import { bindAudioWake, playSound, startMusic, stopMusic, wakeAudio, type SoundName } from "./sound";
import {
  afternoonFulfilled,
  chainStreak,
  dayOf,
  formatWeekday,
  habitDone,
  jarBalance,
  loadStore,
  marketFulfilled,
  mondayOf,
  mutateDay,
  newId,
  reconcileJar,
  removeExtra,
  requiredComplete,
  saveStore,
  settleGymBonus,
  todayKey,
  type FreestyleEntry,
  type Store,
} from "./store";
import { CalendarPage } from "./ui/Calendar";
import { ChoresPage } from "./ui/Chores";
import { IdentityDetail, IdentityList } from "./ui/Identity";
import { JarPage } from "./ui/Jar";
import { SettingsPage, SoundPanel } from "./ui/Settings";
import { FreestyleSheet } from "./ui/Sheet";
import { Today } from "./ui/Today";
import { Welcome } from "./ui/Welcome";
import { Money, craft, fontStack } from "./ui/chrome";
import type { IdentityId } from "./habits";

type Tab = "today" | "calendar" | "identity" | "jar";
type Overlay = "settings" | "chores" | "identity-detail" | null;

interface Toast {
  id: string;
  title: string;
  sub?: string;
}

interface Flight {
  id: string;
  dx: number;
  dy: number;
  x: number;
  y: number;
}

interface Sheet {
  block: BlockId;
  extra: boolean;
}

export default function App() {
  const theme = useGrokTheme();
  const c = craft(theme);
  const [store, setStore] = useState<Store>(loadStore);
  const [viewDate, setViewDate] = useState(todayKey);
  const [tab, setTab] = useState<Tab>("today");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [identity, setIdentity] = useState<IdentityId | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [soundPanel, setSoundPanel] = useState(false);
  const [fresh, setFresh] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const today = todayKey();
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    syncChrome(c.paper);
  });

  useEffect(() => bindAudioWake(), []);

  useEffect(() => {
    if (!store.music) {
      stopMusic();
      return;
    }
    startMusic();
    return () => stopMusic();
  }, [store.music]);

  const fx = (name: SoundName) => {
    wakeAudio();
    playSound(name, storeRef.current.sounds);
  };

  const flash = (id: string) => {
    setFresh((p) => ({ ...p, [id]: true }));
    window.setTimeout(() => setFresh((p) => ({ ...p, [id]: false })), 600);
  };

  const toast = (title: string, sub?: string) => {
    const id = newId();
    setToasts((t) => [...t, { id, title, sub }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };

  const flyCoin = () => {
    const src = document.getElementById("freestyle-anchor") || document.body;
    const dst = document.getElementById("treat-jar-target");
    const a = (src as HTMLElement).getBoundingClientRect();
    const b = dst ? dst.getBoundingClientRect() : { left: 24, top: 80, width: 48, height: 48 };
    const x = a.left + a.width / 2 - 14;
    const y = a.top + 8;
    const dx = b.left + b.width / 2 - 14 - x;
    const dy = b.top + b.height / 2 - 14 - y;
    const id = newId();
    setFlights((f) => [...f, { id, x, y, dx, dy }]);
    window.setTimeout(() => setFlights((f) => f.filter((k) => k.id !== id)), 700);
  };

  const afterChange = (prev: Store, next: Store, optedFx: SoundName[], key: string) => {
    const was = requiredComplete(dayOf(prev, key));
    const now = requiredComplete(dayOf(next, key));
    const sounds: SoundName[] = optedFx.slice();
    if (!was && now) {
      sounds.push("chain");
      flash("__chain");
      const streak = chainStreak(next, todayKey());
      toast(formatWeekday(key) + " is linked.", streak <= 1 ? "First link of a new chain." : streak + "-day chain.");
    }
    const mon = mondayOf(key);
    const hadBonus = prev.jar.gymWeeks.includes(mon);
    const hasBonus = next.jar.gymWeeks.includes(mon);
    if (!hadBonus && hasBonus) {
      sounds.push("bonus");
      toast("Full gym week.", "+" + Money(next.jar.gymBonus) + " in the treat jar.");
      flyCoin();
    }
    if (sounds[0]) fx(sounds[0]);
    if (sounds[1]) window.setTimeout(() => fx(sounds[1]), 160);
    if (sounds[2]) window.setTimeout(() => fx(sounds[2]), 420);
    return next;
  };

  const setDay = (key: string, fn: (s: Store) => Store, sounds: SoundName[]) => {
    setStore((prev) => {
      const next = fn(prev);
      return afterChange(prev, next, sounds, key);
    });
  };

  const onToggle = (habitId: string) => {
    const key = viewDate;
    setDay(
      key,
      (prev) => {
        let next = mutateDay(prev, key, (day) => {
          if (habitId === "market-fs") {
            if (marketFulfilled(day)) {
              // Full reverse: drop this block's required pick AND any extras (and their credit, via reconcile).
              return { ...day, marketWorked: false, freestyle: day.freestyle.filter((f) => f.block !== "market") };
            }
            return day;
          }
          if (habitId === "aft-fs") {
            if (afternoonFulfilled(day)) {
              return { ...day, afternoonBusy: false, freestyle: day.freestyle.filter((f) => f.block !== "afternoon") };
            }
            return day;
          }
          if (habitId === "dinner") {
            if (day.dinner || day.checks.dinner) {
              const checks = { ...day.checks };
              delete checks.dinner;
              return { ...day, dinner: undefined, checks };
            }
            return { ...day, dinner: "cooked", checks: { ...day.checks, dinner: Date.now() } };
          }
          const checks = { ...day.checks };
          if (checks[habitId]) delete checks[habitId];
          else checks[habitId] = Date.now();
          return { ...day, checks };
        });
        if (habitId === "gym") next = settleGymBonus(next, key);
        return reconcileJar(next);
      },
      habitDone(dayOf(store, key), habitId) ? ["undo"] : ["check"],
    );
    if (!habitDone(dayOf(store, key), habitId)) flash(habitId);
  };

  const onBreakfast = (v: "eggs" | "shake") => {
    setStore((prev) =>
      mutateDay(prev, viewDate, (day) => ({
        ...day,
        breakfast: day.breakfast === v ? undefined : v,
        checks: day.checks.breakfast ? day.checks : { ...day.checks, breakfast: Date.now() },
      })),
    );
  };

  const onDinner = (v: "cooked" | "out") => {
    const key = viewDate;
    const already = !!dayOf(store, key).dinner;
    setDay(
      key,
      (prev) =>
        mutateDay(prev, key, (day) => ({
          ...day,
          dinner: day.dinner === v ? undefined : v,
          checks: { ...day.checks, dinner: Date.now() },
        })),
      already ? [] : ["check"],
    );
    flash("dinner");
  };

  const addFreestyle = (block: BlockId, optionId: string, text: string, extra: boolean) => {
    const key = viewDate;
    setDay(
      key,
      (prev) =>
        reconcileJar(
          mutateDay(prev, key, (day) => {
            const entry: FreestyleEntry = { id: newId(), optionId, text, block, extra, at: Date.now() };
            return { ...day, freestyle: [...day.freestyle, entry] };
          }),
        ),
      extra ? ["check", "coin"] : ["check"],
    );
    flash(block === "market" ? "market-fs" : "aft-fs");
    if (extra) {
      flyCoin();
      toast("+" + Money(store.jar.perExtra), "Extra credit in the jar.");
    }
    setSheet(null);
  };

  const onWorked = () => {
    const key = viewDate;
    setDay(key, (prev) => mutateDay(prev, key, (day) => ({ ...day, marketWorked: true })), ["check"]);
    flash("market-fs");
    setSheet(null);
  };

  const onBusy = () => {
    const key = viewDate;
    setDay(key, (prev) => mutateDay(prev, key, (day) => ({ ...day, afternoonBusy: true })), ["check"]);
    flash("aft-fs");
    setSheet(null);
  };

  const onRemoveExtra = (id: string) => {
    const key = viewDate;
    const before = store.jar.earned;
    setDay(key, (prev) => removeExtra(prev, key, id), ["undo"]);
    const after = removeExtra(store, key, id);
    if (after.jar.earned < before) {
      toast(Money(before - after.jar.earned) + " returned", "Taken back out of the jar.");
    }
  };

  const openFreestyle = (block: BlockId, extra: boolean) => {
    fx("open");
    setSheet({ block, extra });
  };

  const toggleSounds = () => {
    wakeAudio();
    const next = !store.sounds;
    setStore((s) => ({ ...s, sounds: next }));
    if (next) playSound("check", true);
  };
  const toggleMusic = () => {
    wakeAudio();
    setStore((s) => ({ ...s, music: !s.music }));
  };

  const pageBg = c.paper;
  const font = fontStack(theme);
  const showingIdentity = overlay === "identity-detail" && identity;

  if (!store.onboarded) {
    return (
      <Welcome
        theme={theme}
        onBegin={() => {
          wakeAudio();
          fx("check");
          setStore((s) => ({ ...s, onboarded: true }));
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: pageBg,
        color: theme.text.primary,
        fontFamily: font,
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <main
        style={{
          flex: "1 1 auto",
          overflow: "auto",
          padding: "16px 16px 8px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {overlay === "settings" ? (
          <SettingsPage
            theme={theme}
            store={store}
            onToggleSounds={toggleSounds}
            onToggleMusic={toggleMusic}
            onBack={() => setOverlay(null)}
          />
        ) : overlay === "chores" ? (
          <ChoresPage
            theme={theme}
            store={store}
            onAdd={(text) => setStore((s) => ({ ...s, chores: [...s.chores, { id: newId(), text, done: {}, created: Date.now() }] }))}
            onToggle={(id) => {
              const t = todayKey();
              const ch = store.chores.find((x) => x.id === id);
              const on = ch && ch.done[t];
              fx(on ? "undo" : "check");
              setStore((s) => ({
                ...s,
                chores: s.chores.map((x) => {
                  if (x.id !== id) return x;
                  const done = { ...x.done };
                  if (done[t]) delete done[t];
                  else done[t] = true;
                  return { ...x, done };
                }),
              }));
            }}
            onRemove={(id) => setStore((s) => ({ ...s, chores: s.chores.filter((x) => x.id !== id) }))}
            onBack={() => setOverlay(null)}
          />
        ) : showingIdentity ? (
          <IdentityDetail theme={theme} store={store} id={identity} onBack={() => { setOverlay(null); setIdentity(null); }} />
        ) : tab === "today" ? (
          <Today
            theme={theme}
            store={store}
            viewDate={viewDate}
            fresh={fresh}
            onToggle={onToggle}
            onOpenFreestyle={openFreestyle}
            onOneMore={(block) => openFreestyle(block, true)}
            onBreakfast={onBreakfast}
            onDinner={onDinner}
            onOpenJar={() => setTab("jar")}
            onOpenSound={() => { setOverlay(null); setSoundPanel((v) => !v); }}
            onOpenSettings={() => { setSoundPanel(false); setOverlay("settings"); }}
            onOpenChores={() => { setSoundPanel(false); setOverlay("chores"); }}
            onRemoveExtra={onRemoveExtra}
            onOpenIdentity={(id) => {
              if (id) {
                setIdentity(id as IdentityId);
                setOverlay("identity-detail");
              } else setTab("identity");
            }}
            onBackToday={() => setViewDate(today)}
          />
        ) : tab === "calendar" ? (
          <CalendarPage
            theme={theme}
            store={store}
            viewDate={viewDate}
            onOpenDay={(key) => {
              setViewDate(key);
              setTab("today");
            }}
          />
        ) : tab === "identity" ? (
          <IdentityList
            theme={theme}
            store={store}
            onOpen={(id) => {
              setIdentity(id);
              setOverlay("identity-detail");
            }}
          />
        ) : (
          <JarPage
            theme={theme}
            jar={store.jar}
            onSaveGoal={(goal, price) => setStore((s) => ({ ...s, jar: { ...s.jar, goal, price } }))}
            onSpend={(text, amount) =>
              setStore((s) => {
                const bal = jarBalance(s.jar);
                const amt = Math.min(amount, bal);
                if (amt <= 0) return s;
                return { ...s, jar: { ...s.jar, spends: [...s.jar.spends, { id: newId(), text, amount: amt, at: Date.now() }] } };
              })
            }
            onAmounts={(perExtra, gymBonus) => setStore((s) => ({ ...s, jar: { ...s.jar, perExtra, gymBonus } }))}
          />
        )}
      </main>

      <nav
        style={{
          display: "flex",
          borderTop: "1px solid " + c.hairline,
          background: c.card,
          padding: "6px 8px calc(6px + env(safe-area-inset-bottom))",
          flex: "0 0 auto",
        }}
      >
        {(["today", "calendar", "identity", "jar"] as Tab[]).map((t) => {
          const active = (overlay === "identity-detail" ? "identity" : overlay ? "" : tab) === t;
          const label = t === "today" ? "Today" : t === "calendar" ? "Calendar" : t === "identity" ? "Identity" : "Jar";
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setOverlay(null);
                setIdentity(null);
                setSoundPanel(false);
                setTab(t);
                      }}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              style={{
                flex: "1 1 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minHeight: 48,
                padding: "6px 0 4px",
                border: "none",
                background: "transparent",
                color: active ? c.goldDeep : theme.text.tertiary,
                fontFamily: font,
                ...theme.font.caption,
                fontWeight: theme.weight.semibold,
                cursor: "pointer",
              }}
            >
              <IconNav name={t} active={active} />
              {label}
            </button>
          );
        })}
      </nav>

      {soundPanel ? (
        <>
          <div
            onClick={() => setSoundPanel(false)}
            style={{ position: "fixed", inset: 0, zIndex: 35, background: "transparent" }}
          />
          <div
            style={{
              position: "fixed",
              top: "calc(8px + env(safe-area-inset-top) + 52px)",
              right: 16,
              zIndex: 36,
            }}
          >
            <SoundPanel
              theme={theme}
              store={store}
              onToggleSounds={toggleSounds}
              onToggleMusic={toggleMusic}
              onClose={() => setSoundPanel(false)}
            />
          </div>
        </>
      ) : null}

      {sheet ? (
        <div id="freestyle-anchor">
          <FreestyleSheet
            theme={theme}
            block={sheet.block}
            extra={sheet.extra}
            chores={store.chores}
            onPick={(optionId, text) => addFreestyle(sheet.block, optionId, text, sheet.extra)}
            onWorked={onWorked}
            onBusy={onBusy}
            onClose={() => setSheet(null)}
          />
        </div>
      ) : null}

      {flights.map((f) => (
        <div
          key={f.id}
          style={{
            position: "fixed",
            left: f.x,
            top: f.y,
            zIndex: 60,
            pointerEvents: "none",
            animation: "dcCoinArc 620ms cubic-bezier(.2,.7,.3,1) forwards",
            // @ts-expect-error CSS var
            "--dx": f.dx + "px",
            "--dy": f.dy + "px",
          }}
        >
          <Coin size={28} />
        </div>
      ))}

      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            zIndex: 50,
            minWidth: 220,
            maxWidth: "86vw",
            padding: "14px 18px",
            borderRadius: theme.radius.xl,
            background: theme.kind === "dark" ? "#2A1616" : "#FFFFFF",
            border: "1px solid " + c.gold,
            boxShadow: c.shadow,
            color: theme.text.primary,
            animation: "dcToast 2.7s ease forwards",
            textAlign: "center",
            fontFamily: font,
          }}
        >
          <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>{t.title}</div>
          {t.sub ? <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 3 }}>{t.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
