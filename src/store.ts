import { FREESTYLE, HABITS, WEEKLY, optionById, requiredHabits, type BlockId, type IdentityId } from "./habits";

export const STORAGE_KEY = "daycraft-habits-v1";
export const LEGACY_KEY = "daycraft-v1";

export interface FreestyleEntry {
  id: string;
  optionId: string;
  text: string;
  block: BlockId;
  extra: boolean;
  at: number;
}

export interface DayState {
  checks: Record<string, number>;
  freestyle: FreestyleEntry[];
  marketWorked: boolean;
  afternoonBusy: boolean;
  breakfast?: "eggs" | "shake";
  dinner?: "cooked" | "out";
}

export interface Chore {
  id: string;
  text: string;
  done: Record<string, boolean>;
  created: number;
}

export interface Spend {
  id: string;
  text: string;
  amount: number;
  at: number;
}

export interface Jar {
  goal: string;
  price: number;
  earned: number;
  spends: Spend[];
  perExtra: number;
  gymBonus: number;
  gymWeeks: string[];
}

export interface Store {
  v: 1;
  started: string;
  onboarded: boolean;
  music: boolean;
  sounds: boolean;
  days: Record<string, DayState>;
  jar: Jar;
  chores: Chore[];
}

export type DayMark = "complete" | "miss" | "today" | "future" | "neutral";

export function todayKey(now: Date = new Date()): string {
  return keyOf(now);
}

export function keyOf(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLong(key: string): string {
  return parseKey(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function formatWeekday(key: string): string {
  return parseKey(key).toLocaleDateString("en-US", { weekday: "long" });
}

export function formatShort(key: string): string {
  return parseKey(key).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

export function mondayOf(key: string): string {
  const d = parseKey(key);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return keyOf(d);
}

export function newId(): string {
  return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function emptyDay(): DayState {
  return { checks: {}, freestyle: [], marketWorked: false, afternoonBusy: false };
}

export function defaultJar(): Jar {
  return { goal: "", price: 0, earned: 0, spends: [], perExtra: 5, gymBonus: 15, gymWeeks: [] };
}

export function defaultStore(now: Date = new Date()): Store {
  return {
    v: 1,
    started: todayKey(now),
    onboarded: false,
    music: false,
    sounds: true,
    days: {},
    jar: defaultJar(),
    chores: [],
  };
}

export function dayOf(store: Store, key: string): DayState {
  return store.days[key] || emptyDay();
}

function isBlock(v: unknown): v is BlockId {
  return v === "morning" || v === "market" || v === "afternoon" || v === "home";
}

function cleanFreestyle(value: unknown): FreestyleEntry[] {
  if (!Array.isArray(value)) return [];
  const out: FreestyleEntry[] = [];
  value.forEach((raw: unknown, i: number) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text.trim() : "";
    if (!text) return;
    const block: BlockId = isBlock(r.block) ? r.block : "afternoon";
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : "fs" + i + newId(),
      optionId: typeof r.optionId === "string" ? r.optionId : "custom",
      text,
      block,
      extra: r.extra === true,
      at: typeof r.at === "number" ? r.at : 0,
    });
  });
  return out;
}

function cleanChecks(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== "object") return out;
  const src = value as Record<string, unknown>;
  Object.keys(src).forEach((k) => {
    const v = src[k];
    if (typeof v === "number" && v > 0) out[k] = v;
    else if (v) out[k] = 1;
  });
  return out;
}

function cleanDay(value: unknown): DayState {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const day: DayState = {
    checks: cleanChecks(raw.checks),
    freestyle: cleanFreestyle(raw.freestyle),
    marketWorked: raw.marketWorked === true,
    afternoonBusy: raw.afternoonBusy === true,
  };
  if (raw.breakfast === "eggs" || raw.breakfast === "shake") day.breakfast = raw.breakfast;
  if (raw.dinner === "cooked" || raw.dinner === "out") day.dinner = raw.dinner;
  return day;
}

function cleanDays(value: unknown): Record<string, DayState> {
  const days: Record<string, DayState> = {};
  if (!value || typeof value !== "object") return days;
  const src = value as Record<string, unknown>;
  Object.keys(src).forEach((key) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    days[key] = cleanDay(src[key]);
  });
  return days;
}

function cleanSpends(value: unknown): Spend[] {
  if (!Array.isArray(value)) return [];
  const out: Spend[] = [];
  value.forEach((raw: unknown, i: number) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const amount = typeof r.amount === "number" && r.amount > 0 ? r.amount : 0;
    if (!amount) return;
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : "sp" + i,
      text: typeof r.text === "string" ? r.text : "",
      amount,
      at: typeof r.at === "number" ? r.at : 0,
    });
  });
  return out;
}

function cleanJar(value: unknown): Jar {
  const j = defaultJar();
  if (!value || typeof value !== "object") return j;
  const r = value as Record<string, unknown>;
  if (typeof r.goal === "string") j.goal = r.goal;
  if (typeof r.price === "number" && r.price >= 0) j.price = r.price;
  if (typeof r.earned === "number" && r.earned >= 0) j.earned = r.earned;
  if (typeof r.perExtra === "number" && r.perExtra >= 0) j.perExtra = r.perExtra;
  if (typeof r.gymBonus === "number" && r.gymBonus >= 0) j.gymBonus = r.gymBonus;
  j.spends = cleanSpends(r.spends);
  if (Array.isArray(r.gymWeeks)) j.gymWeeks = r.gymWeeks.filter((w): w is string => typeof w === "string");
  return j;
}

function cleanChores(value: unknown): Chore[] {
  if (!Array.isArray(value)) return [];
  const out: Chore[] = [];
  value.forEach((raw: unknown, i: number) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text.trim() : "";
    if (!text) return;
    const done: Record<string, boolean> = {};
    if (r.done && typeof r.done === "object") {
      Object.keys(r.done as object).forEach((k) => {
        if ((r.done as Record<string, unknown>)[k]) done[k] = true;
      });
    }
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : "ch" + i,
      text,
      done,
      created: typeof r.created === "number" ? r.created : 0,
    });
  });
  return out;
}

export function loadStore(): Store {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const started =
      typeof parsed.started === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.started)
        ? parsed.started
        : todayKey();
    return {
      v: 1,
      started,
      onboarded: parsed.onboarded === true,
      music: parsed.music === true,
      sounds: parsed.sounds !== false,
      days: cleanDays(parsed.days),
      jar: cleanJar(parsed.jar),
      chores: cleanChores(parsed.chores),
    };
  } catch {
    try {
      if (raw) localStorage.setItem(STORAGE_KEY + "-backup-" + Date.now(), raw);
    } catch {
      // storage blocked
    }
    return defaultStore();
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage blocked
  }
}

export function mutateDay(store: Store, key: string, fn: (day: DayState) => DayState): Store {
  const current = dayOf(store, key);
  return { ...store, days: { ...store.days, [key]: fn({ ...current, checks: { ...current.checks }, freestyle: current.freestyle.slice() }) } };
}

export function marketFulfilled(day: DayState): boolean {
  return day.marketWorked || day.freestyle.some((f) => f.block === "market" && !f.extra);
}

export function afternoonFulfilled(day: DayState): boolean {
  return day.afternoonBusy || day.freestyle.some((f) => f.block === "afternoon" && !f.extra);
}

export function habitDone(day: DayState, habitId: string): boolean {
  if (habitId === "market-fs") return marketFulfilled(day);
  if (habitId === "aft-fs") return afternoonFulfilled(day);
  if (habitId === "dinner") return day.dinner === "cooked" || day.dinner === "out" || !!day.checks.dinner;
  return !!day.checks[habitId];
}

export function requiredComplete(day: DayState): boolean {
  return requiredHabits().every((h) => habitDone(day, h.id));
}

export function completedCount(day: DayState): { done: number; required: number; optional: number; optionalDone: number } {
  const req = requiredHabits();
  const opt = HABITS.filter((h) => !h.required);
  return {
    done: req.filter((h) => habitDone(day, h.id)).length,
    required: req.length,
    optional: opt.length,
    optionalDone: opt.filter((h) => habitDone(day, h.id)).length,
  };
}

export function dayMark(store: Store, key: string, today: string): DayMark {
  if (key > today) return "future";
  if (key < store.started) return "neutral";
  const day = store.days[key];
  const done = day ? requiredComplete(day) : false;
  if (key === today) return done ? "complete" : "today";
  return done ? "complete" : "miss";
}

export function chainStreak(store: Store, today: string): number {
  let key = requiredComplete(dayOf(store, today)) ? today : addDays(today, -1);
  let n = 0;
  while (true) {
    if (key < store.started) break;
    if (!requiredComplete(dayOf(store, key))) break;
    n += 1;
    key = addDays(key, -1);
  }
  return n;
}

export function identityDone(day: DayState, id: IdentityId): boolean {
  if (id === "faith") return habitDone(day, "pray");
  if (id === "gym") return !!day.checks.gym;
  if (id === "cooking") return habitDone(day, "breakfast") && habitDone(day, "lunch");
  if (id === "trading") return habitDone(day, "zones") && habitDone(day, "desk");
  if (id === "golf") return day.freestyle.some((f) => identitiesOf(f).includes("golf"));
  if (id === "storage") return day.freestyle.some((f) => identitiesOf(f).includes("storage"));
  if (id === "hazel") return habitDone(day, "pray") && habitDone(day, "walk");
  return false;
}

export function identitiesOf(entry: FreestyleEntry): IdentityId[] {
  const opt = optionById(entry.optionId);
  return opt ? opt.identities : [];
}

export function identityStreak(store: Store, today: string, id: IdentityId): number {
  let key = identityDone(dayOf(store, today), id) ? today : addDays(today, -1);
  let n = 0;
  while (true) {
    if (key < store.started) break;
    if (key > today) break;
    if (!identityDone(dayOf(store, key), id)) break;
    n += 1;
    key = addDays(key, -1);
  }
  return n;
}

export function identityCountInWeek(store: Store, today: string, id: IdentityId): number {
  const mon = mondayOf(today);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(mon, i);
    if (identityDone(dayOf(store, k), id)) n += 1;
  }
  return n;
}

export function missedYesterday(store: Store, today: string): boolean {
  const y = addDays(today, -1);
  return dayMark(store, y, today) === "miss";
}

export function jarBalance(jar: Jar): number {
  const spent = jar.spends.reduce((s, x) => s + x.amount, 0);
  return Math.max(0, Math.round((jar.earned - spent) * 100) / 100);
}

export function jarProgress(jar: Jar): number {
  const bal = jarBalance(jar);
  if (bal <= 0) return 0;
  if (!jar.price) return Math.min(0.62, 0.18 + bal / 70);
  return Math.min(1, bal / jar.price);
}

export function weekKeys(monday: string): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
}

export function gymDaysInWeek(store: Store, monday: string): number {
  return weekKeys(monday).filter((k) => !!dayOf(store, k).checks.gym).length;
}

/** Apply gym-week bonus if this check reaches 5 days; retract if a later uncheck drops below. */
export function settleGymBonus(store: Store, aroundKey: string): Store {
  const mon = mondayOf(aroundKey);
  const count = gymDaysInWeek(store, mon);
  const awarded = store.jar.gymWeeks.includes(mon);
  if (count >= WEEKLY.gym && !awarded) {
    return {
      ...store,
      jar: {
        ...store.jar,
        earned: store.jar.earned + store.jar.gymBonus,
        gymWeeks: [...store.jar.gymWeeks, mon],
      },
    };
  }
  if (count < WEEKLY.gym && awarded) {
    return {
      ...store,
      jar: {
        ...store.jar,
        earned: Math.max(0, store.jar.earned - store.jar.gymBonus),
        gymWeeks: store.jar.gymWeeks.filter((w) => w !== mon),
      },
    };
  }
  return store;
}

export function blockFreestyle(day: DayState, block: BlockId): FreestyleEntry[] {
  return day.freestyle.filter((f) => f.block === block);
}

export function FREESTYLE_TEXT(id: string): string {
  const o = FREESTYLE.find((x) => x.id === id);
  return o ? o.text : "";
}
