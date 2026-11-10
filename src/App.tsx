import {
  useState,
  useEffect,
  useRef,
  useGrokTheme,
  ChangeEvent,
  KeyboardEvent,
  getAudioContext,
  unlockAudio,
  syncChrome,
} from "./grok";

type Lane = "should" | "could" | "shouldnt";
type View = "home" | "list" | "edit";
type CreatureId = "bean" | "sprout" | "ember";
type ThemeId = "default" | "warm" | "night" | "soft";

type BlockId = "morning" | "market" | "afternoon" | "home";

interface LogItem {
  id: string;
  text: string;
  custom: boolean;
  block?: BlockId;
}

interface DayLogs {
  should: LogItem[];
  could: LogItem[];
  shouldnt: LogItem[];
}

interface Store {
  theme: ThemeId;
  creature: CreatureId;
  music: boolean;
  days: Record<string, DayLogs>;
}

const STORAGE_KEY = "daycraft-v1";

const OPTIONS: Record<Lane, string[]> = {
  should: [
    "Eat breakfast and log macros",
    "Check premarket and the calendar",
    "Light walk or stretch",
    "Brush your teeth",
    "Pray",
    "Trade the Lucid accounts on weekdays",
    "Catch up on inbox, work, and chores if you don't need to sit the charts",
    "Eat lunch and stay on your macros",
    "Work storage with your brother those 2–3 days",
    "Stay occupied so the afternoon isn't empty",
    "Meal-prep if you're not out",
    "Stay caught up on work",
    "Do chores that couldn't get done earlier",
    "Help cook or do the dishes",
    "Work out with Jordan, including cardio",
  ],
  could: [
    "Backtest or replay if the market is dead",
    "Storage or hustle work if you're not trading that morning",
    "Prep tomorrow's food or trading plan",
    "Groceries or other errands",
    "Go somewhere public if you're home alone",
    "Practice golf",
    "Evolve your trading strategy",
    "Knock out a quick chore if you have extra time",
  ],
  shouldnt: [
    "First rip before 7:30pm",
    "Lie in bed scrolling through the morning",
    "Skip food and run on empty",
    "Wander off the charts into random browsing",
    "Spend long empty stretches home alone",
    "Sit and watch the clock until unlock",
    "Skip brushing your teeth",
    "Ignore your chores",
    "Eat like shit",
  ],
};

interface BlockDef {
  id: BlockId;
  name: string;
  time: string;
}

const BLOCKS: BlockDef[] = [
  { id: "morning", name: "Morning", time: "7:30–9:30am · fuel up, pray, get ready" },
  { id: "market", name: "Market hours", time: "9:30am–12pm · trading period" },
  { id: "afternoon", name: "Afternoon", time: "12–5pm · lunch, storage, stay busy" },
  { id: "home", name: "Home stretch", time: "5–7:30pm · cook, dishes, gym" },
];

const pick = (list: string[], idxs: number[]): string[] => idxs.map((i: number) => list[i]);

// Which of your activities belong to which time block (from your day route).
const BLOCK_OPTIONS: Record<Lane, Record<BlockId, string[]>> = {
  should: {
    morning: pick(OPTIONS.should, [0, 1, 2, 3, 4]),
    market: pick(OPTIONS.should, [5, 6]),
    afternoon: pick(OPTIONS.should, [7, 8, 9, 10, 11, 12]),
    home: pick(OPTIONS.should, [13, 14]),
  },
  could: {
    morning: pick(OPTIONS.could, [7]),
    market: pick(OPTIONS.could, [0, 1, 6]),
    afternoon: pick(OPTIONS.could, [3, 4, 5, 7]),
    home: pick(OPTIONS.could, [2]),
  },
  shouldnt: {
    morning: pick(OPTIONS.shouldnt, [0, 1, 2, 6]),
    market: pick(OPTIONS.shouldnt, [0, 3]),
    afternoon: pick(OPTIONS.shouldnt, [0, 4, 5, 7, 8]),
    home: pick(OPTIONS.shouldnt, [0, 5, 8, 7]),
  },
};

function isBlockId(value: unknown): value is BlockId {
  return value === "morning" || value === "market" || value === "afternoon" || value === "home";
}

function blockName(id: BlockId): string {
  const found = BLOCKS.find((b: BlockDef) => b.id === id);
  return found ? found.name : "";
}

function currentBlock(): BlockId {
  const d = new Date();
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes >= 17 * 60) return "home";
  if (minutes >= 12 * 60) return "afternoon";
  if (minutes >= 9 * 60 + 30) return "market";
  return "morning";
}

// Older saved items have no block: place them only when their text belongs to exactly one block.
function blockOf(lane: Lane, item: LogItem): BlockId | null {
  if (item.block) return item.block;
  const key = item.text.trim().toLowerCase();
  const hits = BLOCKS.filter((b: BlockDef) =>
    BLOCK_OPTIONS[lane][b.id].some((t: string) => t.toLowerCase() === key),
  );
  return hits.length === 1 ? hits[0].id : null;
}

const CREATURES: { id: CreatureId; name: string; note: string }[] = [
  { id: "bean", name: "Pip", note: "Fluffy little birb" },
  { id: "sprout", name: "Sprout", note: "Sleepy seedling" },
  { id: "ember", name: "Ember", note: "Cozy little flame" },
];

const THEMES: { id: ThemeId; name: string }[] = [
  { id: "default", name: "Clear" },
  { id: "warm", name: "Warm" },
  { id: "night", name: "Night" },
  { id: "soft", name: "Soft" },
];

function emptyLogs(): DayLogs {
  return { should: [], could: [], shouldnt: [] };
}

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function formatKey(key: string): string {
  const parts = key.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultStore(): Store {
  return { theme: "default", creature: "bean", music: false, days: {} };
}

function cleanItems(value: unknown): LogItem[] {
  if (!Array.isArray(value)) return [];
  const out: LogItem[] = [];
  value.forEach((raw: unknown, i: number) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text : "";
    if (!text.trim()) return;
    const item: LogItem = {
      id: typeof r.id === "string" && r.id ? r.id : "m" + i + Math.random().toString(36).slice(2, 7),
      text,
      custom: r.custom === true,
    };
    if (isBlockId(r.block)) item.block = r.block;
    out.push(item);
  });
  return out;
}

// Accepts any older save shape; keeps every day and every item (items without a block still count).
function cleanDays(value: unknown): Record<string, DayLogs> {
  const days: Record<string, DayLogs> = {};
  if (!value || typeof value !== "object") return days;
  const source = value as Record<string, unknown>;
  Object.keys(source).forEach((key: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    const day = (source[key] && typeof source[key] === "object" ? source[key] : {}) as Record<string, unknown>;
    days[key] = { should: cleanItems(day.should), could: cleanItems(day.could), shouldnt: cleanItems(day.shouldnt) };
  });
  return days;
}

function loadStore(): Store {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const themeOk = parsed.theme === "default" || parsed.theme === "warm" || parsed.theme === "night" || parsed.theme === "soft";
    const creatureOk = parsed.creature === "bean" || parsed.creature === "sprout" || parsed.creature === "ember";
    return {
      theme: themeOk && parsed.theme ? parsed.theme : "default",
      creature: creatureOk && parsed.creature ? parsed.creature : "bean",
      music: !!parsed.music,
      days: cleanDays(parsed.days),
    };
  } catch {
    // Never silently lose a save we could not read: keep a copy before starting fresh.
    try {
      if (raw) localStorage.setItem(STORAGE_KEY + "-backup-" + Date.now(), raw);
    } catch {
      // storage blocked
    }
    return defaultStore();
  }
}

function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore if storage is blocked
  }
}

function hasLogs(logs: DayLogs | undefined): boolean {
  if (!logs) return false;
  return logs.should.length + logs.could.length + logs.shouldnt.length > 0;
}

type DayVerdict = "success" | "fail" | "lock" | "blank" | "pending" | "future";

interface WeekDay {
  key: string;
  status: DayVerdict;
}

interface WeekHealth {
  hearts: number;
  ko: boolean;
  days: WeekDay[];
}

const LOCK_TEXT = "first rip before 7:30pm";

function judgeDay(logs: DayLogs | undefined): DayVerdict {
  if (!logs || !hasLogs(logs)) return "blank";
  if (logs.shouldnt.some((item: LogItem) => item.text.trim().toLowerCase() === LOCK_TEXT)) return "lock";
  if (logs.shouldnt.length > logs.should.length) return "fail";
  return "success";
}

function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function parseKey(key: string): Date {
  const parts = key.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function weekKeys(key: string): string[] {
  const d = parseKey(key);
  const offset = (d.getDay() + 6) % 7;
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset + i)));
  }
  return out;
}

function weekHealth(days: Record<string, DayLogs>, viewKey: string, today: string): WeekHealth {
  let hearts = 3;
  let ko = false;
  const out: WeekDay[] = weekKeys(viewKey).map((key: string) => {
    let status: DayVerdict;
    if (key > viewKey || key > today) status = "future";
    else if (key === today) status = "pending";
    else status = judgeDay(days[key]);
    if (!ko && (status === "success" || status === "fail" || status === "lock")) {
      if (status === "success") hearts = Math.min(5, hearts + 1);
      else hearts -= status === "lock" ? 2 : 1;
      if (hearts <= 0) {
        hearts = 0;
        ko = true;
      }
    }
    return { key, status };
  });
  return { hearts, ko, days: out };
}

function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) {
      setValue(target);
      return;
    }
    let frame = 0;
    const steps = 10;
    const tick = () => {
      frame += 1;
      const next = Math.round(from + ((target - from) * frame) / steps);
      current.current = next;
      setValue(next);
      if (frame < steps) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return value;
}

type Mood = "idle" | "happy" | "hop" | "doze" | "joy";

interface CreaturePalette {
  light: string;
  mid: string;
  deep: string;
  eye: string;
  iris: string;
  blush: string;
  accent: string;
  accentDeep: string;
}

const PALETTES: Record<CreatureId, CreaturePalette> = {
  bean: { light: "#E3ECFF", mid: "#AFC4F8", deep: "#7A90DA", eye: "#29243F", iris: "#5A6CBC", blush: "#FF9BB3", accent: "#FFCBA8", accentDeep: "#EF9370" },
  sprout: { light: "#E6FAEC", mid: "#AFE6C3", deep: "#6FBD91", eye: "#21342B", iris: "#3F8665", blush: "#FF9FB4", accent: "#9FE0AE", accentDeep: "#4FA872" },
  ember: { light: "#FFF3C2", mid: "#FFC48C", deep: "#FF8A7A", eye: "#3E201D", iris: "#A6503C", blush: "#FF6F8F", accent: "#FFD27E", accentDeep: "#FF9A72" },
};

const PIP_BODY = "M120 70 C172 70 204 104 204 142 C204 182 170 204 120 204 C70 204 36 182 36 142 C36 104 68 70 120 70 Z";
const SPROUT_BODY = "M120 80 C148 80 166 98 180 122 C198 152 200 204 120 204 C40 204 42 152 60 122 C74 98 92 80 120 80 Z";

function emberPath(tx: number, ty: number, sway: number): string {
  return (
    "M" + (tx - 3.5) + " " + (ty + 4) +
    " Q" + tx + " " + (ty - 3) + " " + (tx + 3.5) + " " + (ty + 4) +
    " C" + (tx + 10 + sway) + " " + (ty + 25) + " " + (152 + sway * 0.5) + " 92 170 114" +
    " C192 140 192 204 120 204 C48 204 48 140 70 114" +
    " C" + (88 + sway * 0.5) + " 92 " + (tx - 10 + sway) + " " + (ty + 25) + " " + (tx - 3.5) + " " + (ty + 4) + " Z"
  );
}

const EMBER_BODY = emberPath(120, 56, 0);
const EMBER_FLICKER = [
  emberPath(120, 56, 0),
  emberPath(126, 51, 4),
  emberPath(116, 57, -2),
  emberPath(113, 52, -5),
  emberPath(120, 56, 0),
].join(";");

const HEART =
  "M0 9 C-6 4 -13 0 -13 -6 C-13 -11 -7 -13 -4 -11 C-2 -10 -1 -8 0 -6.5 C1 -8 2 -10 4 -11 C7 -13 13 -11 13 -6 C13 0 6 4 0 9 Z";
const STAR = "M0 -9 Q1.6 -1.6 9 0 Q1.6 1.6 0 9 Q-1.6 1.6 -9 0 Q-1.6 -1.6 0 -9 Z";

const SPARKS: { x: number; y: number; r: number; d: number; delay: number; c: string }[] = [
  { x: 98, y: 92, r: 3, d: 3.4, delay: 0, c: "#FFB45C" },
  { x: 146, y: 100, r: 2.4, d: 4.1, delay: 1.2, c: "#FFD77E" },
  { x: 122, y: 66, r: 3.4, d: 3.0, delay: 2.1, c: "#FFC46A" },
  { x: 164, y: 128, r: 2, d: 4.6, delay: 0.6, c: "#FFD77E" },
  { x: 80, y: 122, r: 2.2, d: 3.8, delay: 2.8, c: "#FFB45C" },
];

const COMPANION_CSS = `
  @keyframes dccBreathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.03, 0.97); } }
  @keyframes dccHop {
    0% { transform: translateY(0) scale(1, 1); }
    18% { transform: translateY(0) scale(1.06, 0.93); }
    45% { transform: translateY(-13px) scale(0.97, 1.04); }
    72% { transform: translateY(0) scale(1.05, 0.95); }
    100% { transform: translateY(0) scale(1, 1); }
  }
  @keyframes dccJoy {
    0% { transform: translateY(0) scale(1, 1); }
    14% { transform: translateY(0) scale(1.09, 0.9); }
    42% { transform: translateY(-22px) scale(0.95, 1.06); }
    68% { transform: translateY(0) scale(1.07, 0.93); }
    84% { transform: translateY(-4px) scale(0.99, 1.01); }
    100% { transform: translateY(0) scale(1, 1); }
  }
  @keyframes dccFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @keyframes dccShadowFloat { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.86); opacity: 0.7; } }
  @keyframes dccShadowBreathe { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.035); } }
  @keyframes dccTuft { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(7deg); } }
  @keyframes dccFlapIdleL { 0%, 62%, 100% { transform: rotate(0deg); } 70% { transform: rotate(22deg); } 76% { transform: rotate(-3deg); } 83% { transform: rotate(16deg); } 91% { transform: rotate(0deg); } }
  @keyframes dccFlapIdleR { 0%, 62%, 100% { transform: rotate(0deg); } 70% { transform: rotate(-22deg); } 76% { transform: rotate(3deg); } 83% { transform: rotate(-16deg); } 91% { transform: rotate(0deg); } }
  @keyframes dccFlapL { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(30deg); } }
  @keyframes dccFlapR { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-30deg); } }
  @keyframes dccSway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
  @keyframes dccLeaf { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-9deg); } }
  @keyframes dccZ { 0% { transform: translate(0, 0) scale(0.6); opacity: 0; } 20% { opacity: 0.9; } 100% { transform: translate(10px, -26px) scale(1.1); opacity: 0; } }
  @keyframes dccSpark { 0% { transform: translate(0, 0) scale(0.4); opacity: 0; } 15% { opacity: 1; } 60% { transform: translate(-3px, -28px) scale(0.8); } 100% { transform: translate(4px, -50px) scale(0.1); opacity: 0; } }
  @keyframes dccHeart { 0% { transform: translateY(6px) scale(0); opacity: 0; } 25% { transform: translateY(0) scale(1.15); opacity: 1; } 60% { transform: translateY(-10px) scale(1); opacity: 1; } 100% { transform: translateY(-30px) scale(0.9); opacity: 0; } }
  @keyframes dccTwinkle { 0%, 100% { transform: scale(0.7) rotate(0deg); opacity: 0.55; } 50% { transform: scale(1.1) rotate(25deg); opacity: 1; } }
  @keyframes dccTear { 0% { transform: translateY(0) scale(0.85); opacity: 0.95; } 70% { transform: translateY(9px) scale(1); opacity: 0.95; } 100% { transform: translateY(13px) scale(1); opacity: 0; } }
  @keyframes dccTurn3d { 0%, 100% { transform: rotateY(-7deg) rotateX(2deg); } 50% { transform: rotateY(7deg) rotateX(-1deg); } }
`;

type Vibe = "good" | "droopy" | "sad" | "ko";

const CONFETTI: { x: number; y: number; star: boolean; c: string; d: number }[] = [
  { x: 44, y: 86, star: false, c: "#FF7E9C", d: 0 },
  { x: 200, y: 70, star: true, c: "#FFC94D", d: 0.6 },
  { x: 58, y: 44, star: true, c: "#9FD3FF", d: 1.2 },
  { x: 188, y: 122, star: false, c: "#FF9DB8", d: 1.8 },
  { x: 206, y: 32, star: true, c: "#A8E3A6", d: 0.9 },
];

function Companion(props: { kind: CreatureId; mini?: boolean; health?: number; celebrate?: boolean }) {
  const theme = useGrokTheme();
  const kind = props.kind;
  const mini = props.mini === true;
  const hp = mini || typeof props.health !== "number" ? 5 : props.health;
  const vibe: Vibe = hp <= 0 ? "ko" : hp === 1 ? "sad" : hp === 2 ? "droopy" : "good";
  const celebrate = props.celebrate === true && vibe !== "ko";
  const p = PALETTES[kind];
  const uid = "dcc-" + kind + (mini ? "-mini" : "");
  const u = (name: string): string => "url(#" + uid + "-" + name + ")";
  const gid = (name: string): string => uid + "-" + name;

  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState(0);
  const [mood, setMood] = useState<Mood>("idle");
  const [joyKey, setJoyKey] = useState(0);
  const moodRef = useRef<Mood>("idle");
  const joyTimer = useRef<number | undefined>(undefined);

  const setMoodBoth = (m: Mood) => {
    moodRef.current = m;
    setMood(m);
  };

  useEffect(() => {
    if (mini) return;
    setBlink(false);
    setMoodBoth("idle");
    if (vibe === "ko") {
      setLook(0);
      return;
    }
    let alive = true;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };
    const rand = (a: number, b: number): number => a + Math.random() * (b - a);

    const blinkLoop = () => {
      later(() => {
        if (moodRef.current === "idle" || moodRef.current === "hop") {
          setBlink(true);
          later(() => setBlink(false), 120);
          if (Math.random() < 0.25) {
            later(() => setBlink(true), 270);
            later(() => setBlink(false), 390);
          }
        }
        blinkLoop();
      }, rand(2200, 5600));
    };
    const lookLoop = () => {
      later(() => {
        const opts = [-1, 0, 1, 0, -1, 1];
        if (moodRef.current !== "doze") setLook(opts[Math.floor(Math.random() * opts.length)]);
        lookLoop();
      }, rand(2600, 6200));
    };
    const moodLoop = () => {
      const wait = celebrate
        ? rand(3200, 6000)
        : vibe === "good"
          ? rand(5200, 9800)
          : vibe === "droopy"
            ? rand(8000, 14000)
            : rand(9000, 15000);
      later(() => {
        if (moodRef.current === "idle") {
          const r = Math.random();
          let next: Mood | null = null;
          let dur = 1700;
          if (vibe === "good") {
            if (kind === "sprout" && r < 0.32 && !celebrate) {
              next = "doze";
              dur = 5600;
            } else if (r < 0.66) {
              next = "hop";
              dur = 780;
            } else {
              next = "happy";
            }
          } else if (vibe === "droopy") {
            if (r < 0.18) {
              next = "hop";
              dur = 780;
            } else if (r < 0.5) {
              next = "happy";
            } else if (kind === "sprout" && r < 0.8) {
              next = "doze";
              dur = 6400;
            }
          } else if (r < 0.45) {
            next = "doze";
            dur = 6000;
          }
          if (next !== null) {
            const chosen: Mood = next;
            setMoodBoth(chosen);
            if (chosen === "doze") setLook(0);
            later(() => {
              if (moodRef.current === chosen) setMoodBoth("idle");
            }, dur);
          }
        }
        moodLoop();
      }, wait);
    };
    blinkLoop();
    lookLoop();
    moodLoop();
    return () => {
      alive = false;
      timers.forEach((id: number) => window.clearTimeout(id));
    };
  }, [kind, mini, vibe, celebrate]);

  useEffect(() => {
    return () => {
      if (joyTimer.current !== undefined) window.clearTimeout(joyTimer.current);
    };
  }, []);

  const poke = () => {
    if (mini || vibe === "ko") return;
    setBlink(false);
    setMoodBoth("joy");
    setJoyKey((k: number) => k + 1);
    if (joyTimer.current !== undefined) window.clearTimeout(joyTimer.current);
    joyTimer.current = window.setTimeout(() => setMoodBoth("idle"), 1300);
  };

  const joy = mood === "joy";
  const happyEyes = mood === "happy" || joy;
  const sleepy = mood === "doze";
  const anim = (value: string): string => (mini ? "none" : value);
  const dark = theme.kind === "dark";
  const shadowInk = dark ? "#000000" : "#3A3156";
  const ko = vibe === "ko";
  const sad = vibe === "sad";
  const slow = vibe === "good" ? 1 : vibe === "droopy" ? 1.3 : vibe === "sad" ? 1.6 : 2.2;
  const breathe = ((kind === "bean" ? 3.6 : kind === "sprout" ? 4.8 : 3.2) * slow).toFixed(2) + "s";
  const tilt = mini
    ? 0
    : ko
      ? 12
      : look * 3 + (mood === "happy" ? 5 : 0) + (sleepy ? 5 : 0) + (sad ? 4 : vibe === "droopy" ? 2 : 0);
  const wilt = ko ? 24 : sad ? 14 : vibe === "droopy" ? 6 : 0;
  const lid = sad ? 0.5 : vibe === "droopy" ? 0.2 : 0;
  const lidColor = kind === "bean" ? "#B9CCF8" : kind === "sprout" ? "#FFF9EC" : "#FFE8B4";
  const bodyD = kind === "bean" ? PIP_BODY : kind === "sprout" ? SPROUT_BODY : EMBER_BODY;
  const name = (CREATURES.find((c: { id: CreatureId; name: string; note: string }) => c.id === kind) || CREATURES[0]).name;

  const flicker =
    kind === "ember" && !mini ? (
      <animate
        attributeName="d"
        dur="2.6s"
        repeatCount="indefinite"
        values={EMBER_FLICKER}
        keyTimes="0;0.25;0.5;0.75;1"
        calcMode="spline"
        keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
      />
    ) : null;

  const eye = (cx: number, cy: number, rx: number, ry: number) => {
    if (ko) {
      const r = rx * 0.68;
      return (
        <g stroke={p.eye} strokeWidth="3.4" strokeLinecap="round">
          <path d={"M" + (cx - r) + " " + (cy - r) + " L" + (cx + r) + " " + (cy + r)} />
          <path d={"M" + (cx + r) + " " + (cy - r) + " L" + (cx - r) + " " + (cy + r)} />
        </g>
      );
    }
    if (happyEyes) {
      return (
        <path
          d={"M" + (cx - rx) + " " + (cy + 3) + " Q" + cx + " " + (cy - ry * 0.95) + " " + (cx + rx) + " " + (cy + 3)}
          stroke={p.eye}
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    if (sleepy) {
      return (
        <path
          d={"M" + (cx - rx) + " " + cy + " Q" + cx + " " + (cy + ry * 0.6) + " " + (cx + rx) + " " + cy}
          stroke={p.eye}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    const side = cx < 120 ? -1 : 1;
    const outerX = cx + side * (rx + 2);
    const innerX = cx - side * (rx + 2);
    const base = cy - ry + 2 * ry * lid;
    const outerY = base + ry * (sad ? 0.3 : 0.32);
    const innerY = base - ry * (sad ? 0.18 : 0.3);
    const clipId = uid + "-lid" + cx;
    return (
      <g>
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transform: blink ? "scaleY(0.1)" : "scaleY(1)",
            transition: "transform 80ms ease",
          }}
        >
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={u("eye")} />
          <circle cx={cx - rx * 0.34} cy={cy - ry * 0.36} r={rx * 0.42} fill="#FFFFFF" />
          <circle cx={cx + rx * 0.4} cy={cy + ry * 0.42} r={rx * 0.17} fill="#FFFFFF" opacity={0.85} />
          {lid > 0 ? (
            <g clipPath={"url(#" + clipId + ")"}>
              <clipPath id={clipId}>
                <ellipse cx={cx} cy={cy} rx={rx + 0.6} ry={ry + 0.6} />
              </clipPath>
              <path
                d={"M" + outerX + " " + (cy - ry - 3) + " L" + innerX + " " + (cy - ry - 3) + " L" + innerX + " " + innerY + " L" + outerX + " " + outerY + " Z"}
                fill={lidColor}
              />
              <path
                d={"M" + outerX + " " + outerY + " L" + innerX + " " + innerY}
                stroke={p.eye}
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : null}
        </g>
        {sad && side < 0 && !mini ? (
          <g transform={"translate(" + (cx - rx * 0.55) + " " + (cy + ry + 3) + ")"}>
            <path
              d="M0 -6 C2.6 -1.5 4 1.5 4 3.4 A4 4 0 0 1 -4 3.4 C-4 1.5 -2.6 -1.5 0 -6 Z"
              fill="#8FD0FF"
              stroke="#5AA9E6"
              strokeWidth="0.9"
              style={{ animation: "dccTear 3.4s ease-in infinite" }}
            />
          </g>
        ) : null}
      </g>
    );
  };

  const openMouth = (x: number, y: number) => (
    <path
      d={"M" + (x - 6.5) + " " + (y - 1) + " Q" + x + " " + (y + 10) + " " + (x + 6.5) + " " + (y - 1) + " Q" + x + " " + (y + 1.5) + " " + (x - 6.5) + " " + (y - 1) + " Z"}
      fill="#E8667E"
      stroke={p.eye}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );

  const blush = (cx: number, cy: number) => (
    <ellipse cx={cx} cy={cy} rx="10.5" ry="6.2" fill={p.blush} opacity={ko ? 0.2 : happyEyes ? 0.75 : sad ? 0.32 : 0.5} filter={u("b1")} />
  );

  const nub = (cx: number, cy: number, rot: number, inward: number) => (
    <g>
      <ellipse
        cx={cx + inward}
        cy={cy + 2}
        rx="9.5"
        ry="7.5"
        transform={"rotate(" + rot + " " + (cx + inward) + " " + (cy + 2) + ")"}
        fill={p.deep}
        opacity="0.4"
        filter={u("b2")}
      />
      <ellipse cx={cx} cy={cy} rx="9.5" ry="7.5" transform={"rotate(" + rot + " " + cx + " " + cy + ")"} fill={u("limb")} />
      <ellipse cx={cx - 2} cy={cy - 3} rx="3.6" ry="2" fill="#FFFFFF" opacity="0.5" filter={u("b1")} />
    </g>
  );

  const spec =
    kind === "bean" ? { x: 86, y: 100, r: -28 } : kind === "sprout" ? { x: 92, y: 110, r: -32 } : { x: 102, y: 112, r: -38 };

  const shading = (
    <g clipPath={u("clip")}>
      {kind === "bean" ? <ellipse cx="120" cy="198" rx="62" ry="40" fill={u("patch")} filter={u("b1")} /> : null}
      {kind === "sprout" ? <ellipse cx="120" cy="166" rx="60" ry="40" fill={u("patch")} /> : null}
      {kind === "bean" ? <ellipse cx="122" cy="72" rx="13" ry="5" fill={p.deep} opacity="0.4" filter={u("b1")} /> : null}
      {kind === "sprout" ? <ellipse cx="120" cy="82" rx="9" ry="4" fill={p.deep} opacity="0.45" filter={u("b1")} /> : null}
      <ellipse cx="120" cy="226" rx="100" ry="30" fill={p.deep} opacity={kind === "ember" ? 0.18 : 0.32} filter={u("b3")} />
      <ellipse cx="200" cy="150" rx="26" ry="78" fill={p.deep} opacity={kind === "ember" ? 0.35 : 0.28} filter={u("b3")} />
      {kind === "ember" ? <ellipse cx="120" cy="170" rx="46" ry="30" fill="#FFFBE0" opacity="0.75" filter={u("b3")} /> : null}
      <ellipse cx="172" cy="188" rx="20" ry="8" fill="#FFFFFF" opacity="0.3" filter={u("b2")} />
      <ellipse
        cx={spec.x}
        cy={spec.y}
        rx="26"
        ry="14"
        transform={"rotate(" + spec.r + " " + spec.x + " " + spec.y + ")"}
        fill="#FFFFFF"
        opacity="0.55"
        filter={u("b2")}
      />
      <ellipse
        cx={spec.x - 6}
        cy={spec.y - 4}
        rx="7"
        ry="4"
        transform={"rotate(" + spec.r + " " + (spec.x - 6) + " " + (spec.y - 4) + ")"}
        fill="#FFFFFF"
        opacity="0.85"
        filter={u("b1")}
      />
    </g>
  );

  const faceShift = {
    transform: "translate(" + look * 5 + "px, " + (sleepy ? 2 : 0) + "px)",
    transition: "transform 600ms cubic-bezier(.4,0,.2,1)",
  };

  const pip = (
    <g>
      <g style={{ transformOrigin: "120px 80px", transform: "rotate(" + wilt + "deg)", transition: "transform 900ms ease" }}>
      <g
        style={{
          transformOrigin: "120px 80px",
          animation: anim(joy ? "dccTuft 0.45s ease-in-out infinite" : "dccTuft 2.8s ease-in-out infinite"),
        }}
      >
        <path d="M113 82 C105 68 107 58 115 53" stroke={p.mid} strokeWidth="6" strokeLinecap="round" fill="none" />
        <path
          d="M120 80 C116 60 124 46 136 48 C146 50 146 62 137 63 C131 64 129 57 134 55"
          stroke={u("tuft")}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M120.5 70 C119 59 124 52 132 51" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
      </g>
      <ellipse cx="98" cy="206" rx="13" ry="7.5" fill={u("acc")} />
      <ellipse cx="142" cy="206" rx="13" ry="7.5" fill={u("acc")} />
      <path d={PIP_BODY} fill={u("body")} />
      {shading}
      <g
        style={{
          transformOrigin: "50px 150px",
          animation: anim(joy ? "dccFlapL 0.34s ease-in-out infinite" : "dccFlapIdleL 3.4s ease-in-out infinite"),
        }}
      >
        <ellipse cx="49" cy="171" rx="10.5" ry="17" transform="rotate(38 49 171)" fill={p.deep} opacity="0.4" filter={u("b2")} />
        <ellipse cx="44" cy="167" rx="10.5" ry="17" transform="rotate(38 44 167)" fill={u("limb")} />
        <ellipse cx="44" cy="160" rx="3" ry="6.5" transform="rotate(38 44 160)" fill="#FFFFFF" opacity="0.4" filter={u("b1")} />
      </g>
      <g
        style={{
          transformOrigin: "190px 150px",
          animation: anim(joy ? "dccFlapR 0.34s ease-in-out infinite" : "dccFlapIdleR 3.4s ease-in-out infinite"),
        }}
      >
        <ellipse cx="191" cy="171" rx="10.5" ry="17" transform="rotate(-38 191 171)" fill={p.deep} opacity="0.4" filter={u("b2")} />
        <ellipse cx="196" cy="167" rx="10.5" ry="17" transform="rotate(-38 196 167)" fill={u("limb")} />
        <ellipse cx="194" cy="160" rx="3" ry="6.5" transform="rotate(-38 194 160)" fill="#FFFFFF" opacity="0.35" filter={u("b1")} />
      </g>
      <g style={faceShift}>
        {eye(90, 138, 10.5, 12.5)}
        {eye(150, 138, 10.5, 12.5)}
        {blush(72, 155)}
        {blush(168, 155)}
        {happyEyes ? <path d="M114.5 152 Q120 163 125.5 152 Z" fill="#E8667E" /> : null}
        <path d="M111 146 Q120 141 129 146 Q124 155 120 156 Q116 155 111 146 Z" fill={u("acc")} />
        <ellipse cx="117" cy="145.5" rx="3.2" ry="1.3" fill="#FFFFFF" opacity="0.65" />
      </g>
    </g>
  );

  const sprout = (
    <g>
      <g style={{ transformOrigin: "120px 90px", transform: "rotate(" + wilt + "deg)", transition: "transform 900ms ease" }}>
      <g
        style={{
          transformOrigin: "120px 86px",
          animation: anim(
            sleepy
              ? "dccSway 6.5s ease-in-out infinite"
              : joy
                ? "dccSway 0.6s ease-in-out infinite"
                : "dccSway 4.4s ease-in-out infinite",
          ),
        }}
      >
        <path d="M120 90 C119 76 121 63 126 55" stroke={p.accentDeep} strokeWidth="5" strokeLinecap="round" fill="none" />
        <g style={{ transformOrigin: "126px 55px", animation: anim("dccLeaf 3.1s ease-in-out infinite") }}>
          <path d="M126 55 C112 39 92 38 84 48 C96 60 114 63 126 55 Z" fill={u("leaf")} />
          <path d="M124 54 Q106 47 90 47" stroke={p.accentDeep} strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M98 43 Q106 41 113 45" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </g>
        <path d="M126 55 C134 35 156 28 168 36 C162 52 143 61 126 55 Z" fill={u("leaf")} />
        <path d="M128 54 Q146 45 162 38" stroke={p.accentDeep} strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M140 38 Q148 34 156 33" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
      </g>
      <ellipse cx="100" cy="206" rx="13" ry="7" fill={u("limb")} />
      <ellipse cx="140" cy="206" rx="13" ry="7" fill={u("limb")} />
      <path d={SPROUT_BODY} fill={u("body")} />
      {shading}
      {nub(47, 174, -20, 4)}
      {nub(193, 174, 20, -4)}
      <g transform="translate(158 104)">
        {[0, 72, 144, 216, 288].map((a: number) => (
          <ellipse key={a} cx="0" cy="-5" rx="3.6" ry="5" fill="#FFC3D5" transform={"rotate(" + a + ")"} />
        ))}
        <circle r="3.2" fill="#FFD978" />
        <circle cx="-1" cy="-1" r="1.1" fill="#FFFFFF" opacity="0.8" />
      </g>
      <g style={faceShift}>
        {eye(94, 152, 9, 11)}
        {eye(146, 152, 9, 11)}
        {blush(79, 167)}
        {blush(161, 167)}
        <circle cx="74" cy="165" r="1.1" fill="#D98A78" opacity="0.75" />
        <circle cx="79" cy="162" r="1.1" fill="#D98A78" opacity="0.75" />
        <circle cx="84" cy="165" r="1.1" fill="#D98A78" opacity="0.75" />
        <circle cx="156" cy="165" r="1.1" fill="#D98A78" opacity="0.75" />
        <circle cx="161" cy="162" r="1.1" fill="#D98A78" opacity="0.75" />
        <circle cx="166" cy="165" r="1.1" fill="#D98A78" opacity="0.75" />
        {ko ? (
          <path d="M112 169 Q116 165.5 120 169 Q124 172.5 128 169" stroke={p.eye} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : happyEyes ? (
          openMouth(120, 167)
        ) : sad ? (
          <path d="M114.5 170 Q120 165 125.5 170" stroke={p.eye} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : sleepy ? (
          <ellipse cx="120" cy="168" rx="2.6" ry="3.2" fill={p.eye} opacity="0.8" />
        ) : (
          <path
            d="M113 166 Q116.5 170.5 120 166 Q123.5 170.5 127 166"
            stroke={p.eye}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </g>
    </g>
  );

  const ember = (
    <g>
      <path d={EMBER_BODY} fill="#FFB27A" opacity={dark ? 0.55 : 0.45} filter={u("b3")}>
        {flicker}
      </path>
      <path d={EMBER_BODY} fill={u("body")}>
        {flicker}
      </path>
      {shading}
      {nub(57, 164, -25, 4)}
      {nub(183, 164, 25, -4)}
      <g style={faceShift}>
        {eye(96, 150, 9.5, 11.5)}
        {eye(144, 150, 9.5, 11.5)}
        {blush(80, 166)}
        {blush(160, 166)}
        {ko ? (
          <path d="M112 167 Q116 163.5 120 167 Q124 170.5 128 167" stroke={p.eye} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : sad ? (
          <path d="M114.5 168 Q120 163 125.5 168" stroke={p.eye} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : happyEyes ? (
          openMouth(120, 165)
        ) : (
          <path d="M114 164 Q120 170 126 164" stroke={p.eye} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        )}
      </g>
    </g>
  );

  const svg = (
    <svg
      width="100%"
      viewBox={mini ? "24 36 192 184" : "0 0 240 230"}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        {kind === "ember" ? (
          <radialGradient id={gid("body")} cx="50%" cy="76%" r="80%">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="35%" stopColor="#FFDB8E" />
            <stop offset="72%" stopColor="#FFB282" />
            <stop offset="100%" stopColor="#FF8E7E" />
          </radialGradient>
        ) : (
          <radialGradient id={gid("body")} cx="36%" cy="30%" r="78%">
            <stop offset="0%" stopColor={p.light} />
            <stop offset="55%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.deep} />
          </radialGradient>
        )}
        <radialGradient id={gid("limb")} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="45%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.deep} />
        </radialGradient>
        <radialGradient id={gid("eye")} cx="50%" cy="80%" r="70%">
          <stop offset="0%" stopColor={p.iris} />
          <stop offset="68%" stopColor={p.eye} />
        </radialGradient>
        <linearGradient id={gid("acc")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.accent} />
          <stop offset="100%" stopColor={p.accentDeep} />
        </linearGradient>
        <linearGradient id={gid("tuft")} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={p.deep} />
          <stop offset="55%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.light} />
        </linearGradient>
        <linearGradient id={gid("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CBF2CF" />
          <stop offset="45%" stopColor={p.accent} />
          <stop offset="100%" stopColor={p.accentDeep} />
        </linearGradient>
        {kind === "bean" ? (
          <radialGradient id={gid("patch")} cx="50%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#FFFCF4" />
            <stop offset="100%" stopColor="#F4DEC0" />
          </radialGradient>
        ) : (
          <radialGradient id={gid("patch")} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#FFFCF2" stopOpacity="1" />
            <stop offset="62%" stopColor="#FFF8E6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFF8E6" stopOpacity="0" />
          </radialGradient>
        )}
        <filter id={gid("b1")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={gid("b2")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={gid("b3")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={gid("grey")}>
          <feColorMatrix type="saturate" values="0.12" />
        </filter>
        <clipPath id={gid("clip")}>
          <path d={bodyD}>{flicker}</path>
        </clipPath>
      </defs>

      <g
        style={{
          transformOrigin: "120px 212px",
          animation: anim(
            kind === "ember" ? "dccShadowFloat 3.2s ease-in-out infinite" : "dccShadowBreathe " + breathe + " ease-in-out infinite",
          ),
        }}
      >
        {kind === "ember" ? (
          <ellipse cx="120" cy="216" rx="62" ry="11" fill="#FFAE6E" opacity={dark ? 0.35 : 0.3} filter={u("b2")} />
        ) : null}
        <ellipse cx="120" cy={kind === "ember" ? 216 : 213} rx="70" ry="10" fill={shadowInk} opacity={dark ? 0.5 : 0.16} filter={u("b2")} />
        <ellipse
          cx="120"
          cy={kind === "ember" ? 215 : 211}
          rx={kind === "ember" ? 36 : 46}
          ry="5"
          fill={shadowInk}
          opacity={dark ? 0.55 : kind === "ember" ? 0.14 : 0.22}
          filter={u("b1")}
        />
      </g>

      <g
        key={"hop" + joyKey}
        filter={ko ? u("grey") : undefined}
        style={{
          transformOrigin: "120px 210px",
          animation: anim(
            joy ? "dccJoy 720ms cubic-bezier(.3,.7,.4,1)" : mood === "hop" ? "dccHop 780ms cubic-bezier(.3,.7,.4,1)" : "none",
          ),
        }}
      >
        <g
          style={{
            animation: anim(kind === "ember" && !ko ? "dccFloat 3.2s ease-in-out infinite" : "none"),
            transform: kind === "ember" && ko ? "translateY(7px)" : undefined,
          }}
        >
          <g
            style={{
              transformOrigin: "120px 206px",
              transform: "rotate(" + tilt + "deg)" + (ko ? " scale(1.06, 0.9)" : ""),
              transition: "transform 700ms cubic-bezier(.4,0,.2,1)",
            }}
          >
            <g style={{ transformOrigin: "120px 206px", animation: anim("dccBreathe " + breathe + " ease-in-out infinite") }}>
              {kind === "bean" ? pip : kind === "sprout" ? sprout : ember}
            </g>
          </g>
        </g>
      </g>

      {kind === "ember" && !mini && !ko ? (
        <g>
          {SPARKS.slice(0, sad ? 2 : SPARKS.length).map((s: { x: number; y: number; r: number; d: number; delay: number; c: string }) => (
            <circle
              key={s.x}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.c}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "dccSpark " + (joy ? 1.1 : s.d) + "s ease-out " + (joy ? s.delay * 0.15 : s.delay) + "s infinite both",
              }}
            />
          ))}
        </g>
      ) : null}

      {sleepy && !mini ? (
        <g fill={theme.text.tertiary} style={{ fontFamily: theme.font.family, fontWeight: 600 }}>
          <text x="170" y="98" fontSize="15" style={{ animation: "dccZ 2.4s ease-out infinite both" }}>
            z
          </text>
          <text x="181" y="84" fontSize="12" style={{ animation: "dccZ 2.4s ease-out 0.8s infinite both" }}>
            z
          </text>
          <text x="190" y="72" fontSize="10" style={{ animation: "dccZ 2.4s ease-out 1.6s infinite both" }}>
            z
          </text>
        </g>
      ) : null}

      {ko && !mini ? (
        <g>
          {[
            { x: 86, y: 46, s: 0.95, d: 0 },
            { x: 120, y: 30, s: 1.2, d: 0.4 },
            { x: 154, y: 46, s: 0.95, d: 0.8 },
          ].map((st: { x: number; y: number; s: number; d: number }) => (
            <g key={st.x} transform={"translate(" + st.x + " " + st.y + ") scale(" + st.s + ")"}>
              <path
                d={STAR}
                fill="#FFD36E"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "dccTwinkle 1.8s ease-in-out " + st.d + "s infinite both",
                }}
              />
            </g>
          ))}
        </g>
      ) : null}

      {celebrate && !mini ? (
        <g>
          {CONFETTI.map((c: { x: number; y: number; star: boolean; c: string; d: number }) => (
            <g key={c.x} transform={"translate(" + c.x + " " + c.y + ") scale(0.7)"}>
              <path
                d={c.star ? STAR : HEART}
                fill={c.c}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "dccHeart 2.6s ease-out " + c.d + "s infinite both",
                }}
              />
            </g>
          ))}
        </g>
      ) : null}

      {joy && !mini ? (
        <g key={"joy" + joyKey}>
          <g transform="translate(184 84)">
            <path
              d={HEART}
              fill="#FF7E9C"
              style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dccHeart 1.2s ease-out both" }}
            />
          </g>
          <g transform="translate(58 98)">
            <path
              d={STAR}
              fill="#FFC94D"
              style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dccHeart 1.1s ease-out 0.12s both" }}
            />
          </g>
          <g transform="translate(200 126) scale(0.6)">
            <path
              d={STAR}
              fill="#FFD978"
              style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dccHeart 1s ease-out 0.24s both" }}
            />
          </g>
        </g>
      ) : null}
    </svg>
  );

  if (mini) return svg;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ko ? name + " is knocked out" : name + ", tap to say hi"}
      onClick={poke}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          poke();
        }
      }}
      style={{
        width: "100%",
        maxWidth: 250,
        perspective: "800px",
        cursor: ko ? "default" : "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <style>{COMPANION_CSS}</style>
      <div
        style={{
          animation: "dccTurn3d 11s ease-in-out infinite",
          filter: sad ? "saturate(0.8)" : "none",
          opacity: ko ? 0.9 : 1,
          transition: "filter 700ms ease, opacity 700ms ease",
        }}
      >
        {svg}
      </div>
    </div>
  );
}

export default function App() {
  const theme = useGrokTheme();
  const font = theme.font.family;
  const [store, setStore] = useState<Store>(loadStore);
  const [viewDate, setViewDate] = useState(todayKey);
  const [selected, setSelected] = useState<Lane | null>(null);
  const [view, setView] = useState<View>("home");
  const [draft, setDraft] = useState("");
  const [settings, setSettings] = useState(false);
  const [openBlock, setOpenBlock] = useState<BlockId | null>(null);

  const today = todayKey();
  const logs = store.days[viewDate] || emptyLogs();

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    syncChrome(pageBg);
  });

  useEffect(() => {
    if (!store.music) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    void ctx.resume();
    const wake = () => {
      if (ctx.state !== "running") void ctx.resume();
    };
    document.addEventListener("touchend", wake);
    document.addEventListener("pointerdown", wake);
    document.addEventListener("visibilitychange", wake);
    const master = ctx.createGain();
    master.gain.value = 0.03;
    master.connect(ctx.destination);

    const make = (freq: number, type: OscillatorType, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      return osc;
    };

    const a = make(174.61, "sine", 0.55);
    const b = make(220, "sine", 0.32);
    const c = make(261.63, "triangle", 0.08);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    return () => {
      a.stop();
      b.stop();
      c.stop();
      lfo.stop();
      master.disconnect();
      document.removeEventListener("touchend", wake);
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [store.music]);

  const shouldN = useCountUp(logs.should.length);
  const couldN = useCountUp(logs.could.length);
  const avoidN = useCountUp(logs.shouldnt.length);

  const pageBg =
    store.theme === "warm"
      ? theme.fill.warningSubtle
      : store.theme === "night"
        ? theme.bg.subtle
        : store.theme === "soft"
          ? theme.fill.accentSubtle
          : theme.bg.base;

  const laneColor = (lane: Lane): string => {
    if (lane === "shouldnt") return theme.text.danger;
    if (lane === "should") return theme.text.success;
    return theme.dataviz.categorical[0];
  };

  const laneTint = (lane: Lane): string => {
    if (lane === "shouldnt") return theme.fill.dangerSubtle;
    if (lane === "should") return theme.fill.successSubtle;
    return theme.fill.accentSubtle;
  };

  const laneTitle = (lane: Lane): string => {
    if (lane === "should") return "Should";
    if (lane === "could") return "Could";
    return "Shouldn't";
  };

  const mutateLane = (lane: Lane, fn: (items: LogItem[]) => LogItem[]) => {
    const key = viewDate;
    setStore((prev: Store) => {
      const current = prev.days[key] || emptyLogs();
      return { ...prev, days: { ...prev.days, [key]: { ...current, [lane]: fn(current[lane]) } } };
    });
  };

  const openLane = (lane: Lane) => {
    if (selected === lane && view !== "home") {
      closeHome();
      return;
    }
    setSelected(lane);
    setDraft("");
    setView("list");
    setOpenBlock(null);
  };

  const closeHome = () => {
    setSelected(null);
    setView("home");
    setDraft("");
    setOpenBlock(null);
  };

  const addText = (lane: Lane, text: string, custom: boolean, block: BlockId) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    mutateLane(lane, (items: LogItem[]) =>
      items.some((item: LogItem) => item.text.trim().toLowerCase() === cleaned.toLowerCase())
        ? items
        : [...items, { id: newId(), text: cleaned, custom, block }],
    );
  };

  const removeItem = (lane: Lane, id: string) => {
    mutateLane(lane, (items: LogItem[]) => items.filter((item: LogItem) => item.id !== id));
  };

  const submitDraft = (block: BlockId) => {
    if (!selected) return;
    addText(selected, draft, true, block);
    setDraft("");
  };

  const pastDays = Object.keys(store.days)
    .filter((key: string) => hasLogs(store.days[key]))
    .sort()
    .reverse();

  const health = weekHealth(store.days, viewDate, today);
  const creatureName = (CREATURES.find((c: { id: CreatureId; name: string; note: string }) => c.id === store.creature) || CREATURES[0]).name;
  const viewEntry = health.days.find((d: WeekDay) => d.key === viewDate);
  const viewStatus: DayVerdict = viewEntry ? viewEntry.status : "blank";
  const viewWeekday = parseKey(viewDate).toLocaleDateString("en-US", { weekday: "long" });
  const weekDone = parseKey(viewDate).getDay() === 0 && viewDate < today && !health.ko;
  const heartsPrefix = health.hearts + " of 5 hearts · ";
  const healthLine = health.ko
    ? creatureName + " got knocked out this week. Fresh start Monday."
    : weekDone
      ? creatureName + " made it through the week"
      : viewStatus === "pending"
        ? heartsPrefix + "Judged tonight"
        : viewStatus === "success"
          ? heartsPrefix + creatureName + " made it through " + viewWeekday
          : viewStatus === "lock"
            ? heartsPrefix + "The lock broke on " + viewWeekday
            : viewStatus === "fail"
              ? heartsPrefix + "More Shouldn'ts than Shoulds on " + viewWeekday
              : heartsPrefix + "Nothing logged on " + viewWeekday + ", no change";

  const dotStyle = (status: DayVerdict) => {
    const base = { width: 8, height: 8, borderRadius: theme.radius.full, boxSizing: "border-box" as const, display: "block" };
    if (status === "success") return { ...base, background: theme.text.success };
    if (status === "fail" || status === "lock") return { ...base, background: theme.text.danger };
    if (status === "blank") return { ...base, border: "1.5px solid " + theme.border.strong };
    if (status === "pending") return { ...base, border: "1.5px dashed " + theme.text.tertiary };
    return { ...base, background: theme.border.default };
  };

  const statusWord = (status: DayVerdict): string => {
    if (status === "success") return "made it";
    if (status === "lock") return "lock broke";
    if (status === "fail") return "slipped";
    if (status === "blank") return "nothing logged";
    if (status === "pending") return "judged tonight";
    return "not yet";
  };

  const counter = (lane: Lane, value: number) => {
    const color = laneColor(lane);
    const on = selected === lane;
    return (
      <button
        key={lane}
        onClick={() => openLane(lane)}
        aria-pressed={on}
        style={{
          flex: "1 1 0",
          minWidth: 0,
          minHeight: 132,
          padding: "18px 6px",
          borderRadius: theme.radius.xl,
          border: on ? "2px solid " + color : "1px solid " + theme.border.default,
          background: on ? laneTint(lane) : theme.bg.elevated,
          color: theme.text.primary,
          fontFamily: font,
          cursor: "pointer",
          textAlign: "center",
          transition: "transform 220ms ease, border-color 200ms ease, background-color 200ms ease",
          transform: on ? "translateY(-4px)" : "none",
        }}
      >
        <div
          style={{
            ...theme.font.label,
            color: lane === "shouldnt" ? theme.text.danger : theme.text.tertiary,
            letterSpacing: "0.06em", fontSize: "12px",
            fontWeight: theme.weight.semibold,
          }}
        >
          {laneTitle(lane).toUpperCase()}
        </div>
        <div
          key={lane + viewDate + String(value)}
          style={{
            ...theme.font.metric,
            fontSize: "clamp(44px, 13vw, 64px)",
            lineHeight: "1",
            fontWeight: theme.weight.semibold,
            color: color,
            marginTop: 16,
            animation: "dcPop 400ms ease",
          }}
        >
          {value}
        </div>
      </button>
    );
  };

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        minHeight: 40,
        padding: "8px 14px",
        borderRadius: theme.radius.full,
        border: "1px solid " + (on ? theme.dataviz.categorical[0] : theme.border.default),
        background: on ? theme.fill.accentSubtle : theme.bg.base,
        color: theme.text.primary,
        fontFamily: font,
        ...theme.font.label,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const logged = selected ? logs[selected] : [];
  const editing = view === "edit";
  const color = selected ? laneColor(selected) : theme.text.primary;
  const unblocked = selected ? logged.filter((item: LogItem) => blockOf(selected, item) === null) : [];

  const pill = (label: string, onClick: () => void, strong: boolean) => (
    <button
      onClick={onClick}
      style={{
        minHeight: 40,
        padding: "8px 16px",
        borderRadius: theme.radius.full,
        border: "1px solid " + (strong ? color : theme.border.default),
        background: strong ? color : theme.bg.base,
        color: strong ? theme.text.onColor : theme.text.primary,
        fontFamily: font,
        ...theme.font.label,
        fontWeight: theme.weight.semibold,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const checkMark = (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: theme.radius.full,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6.2 L5 8.6 L9.6 3.6" fill="none" stroke={theme.text.onColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );

  const removeButton = (lane: Lane, item: LogItem) => (
    <button
      onClick={() => removeItem(lane, item.id)}
      aria-label={"Remove " + item.text}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        minHeight: 38,
        padding: "6px 14px 6px 10px",
        borderRadius: theme.radius.full,
        border: "1px solid " + theme.text.danger,
        background: theme.text.danger,
        color: theme.text.onColor,
        fontFamily: font,
        ...theme.font.label,
        fontWeight: theme.weight.semibold,
        cursor: "pointer",
        flex: "0 0 auto",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 3 L9 9 M9 3 L3 9" stroke={theme.text.onColor} strokeWidth="2" strokeLinecap="round" />
      </svg>
      Remove
    </button>
  );

  const loggedRow = (lane: Lane, item: LogItem, context: BlockId | null) => {
    const where = blockOf(lane, item);
    const elsewhere = context && where && where !== context ? blockName(where) : null;
    return (
      <div
        key={item.id + (context || "")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 48,
          padding: "8px 10px 8px 12px",
          borderRadius: theme.radius.lg,
          border: "1.5px solid " + (editing ? theme.text.danger : color),
          background: editing ? theme.fill.dangerSubtle : laneTint(lane),
        }}
      >
        {checkMark}
        <span style={{ flex: "1 1 0", minWidth: 0, overflowWrap: "anywhere" }}>
          <span style={{ display: "block", ...theme.font.body1 }}>{item.text}</span>
          {elsewhere ? (
            <span style={{ display: "block", ...theme.font.caption, color: theme.text.secondary }}>Logged in {elsewhere}</span>
          ) : null}
        </span>
        {editing ? (
          removeButton(lane, item)
        ) : (
          <span style={{ ...theme.font.label, fontWeight: theme.weight.semibold, color, flex: "0 0 auto" }}>Logged</span>
        )}
      </div>
    );
  };

  const optionRow = (lane: Lane, block: BlockId, text: string) => {
    const hit = logs[lane].find((item: LogItem) => item.text.trim().toLowerCase() === text.toLowerCase());
    if (hit) return loggedRow(lane, hit, block);
    return (
      <button
        key={text}
        onClick={() => addText(lane, text, false, block)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          minHeight: 48,
          padding: "10px 12px",
          borderRadius: theme.radius.lg,
          border: "1px solid " + theme.border.default,
          background: theme.bg.elevated,
          color: theme.text.primary,
          fontFamily: font,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: theme.radius.full,
            border: "2px solid " + theme.border.strong,
            flex: "0 0 auto",
            boxSizing: "border-box",
          }}
        />
        <span style={{ flex: "1 1 auto", minWidth: 0, ...theme.font.body1 }}>{text}</span>
      </button>
    );
  };

  const blockCard = (lane: Lane, b: BlockDef) => {
    const items = logs[lane].filter((item: LogItem) => blockOf(lane, item) === b.id);
    const options = BLOCK_OPTIONS[lane][b.id];
    const extras = items.filter(
      (item: LogItem) => !options.some((t: string) => t.toLowerCase() === item.text.trim().toLowerCase()),
    );
    const open = openBlock === b.id;
    return (
      <div
        key={b.id}
        style={{
          borderRadius: theme.radius.lg,
          border: "1px solid " + (open ? color : theme.border.default),
          background: theme.bg.base,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => {
            setOpenBlock(open ? null : b.id);
            setDraft("");
          }}
          aria-expanded={open}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            minHeight: 60,
            padding: "10px 14px",
            background: "transparent",
            border: "none",
            color: theme.text.primary,
            fontFamily: font,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={{ flex: "1 1 auto", minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, ...theme.font.body1, fontWeight: theme.weight.semibold }}>
              {b.name}
              {viewDate === today && currentBlock() === b.id ? (
                <span
                  style={{
                    ...theme.font.caption,
                    fontWeight: theme.weight.semibold,
                    color,
                    border: "1px solid " + color,
                    borderRadius: theme.radius.full,
                    padding: "0 8px",
                  }}
                >
                  Now
                </span>
              ) : null}
            </span>
            <span style={{ display: "block", ...theme.font.caption, color: theme.text.tertiary }}>{b.time}</span>
          </span>
          {items.length > 0 ? (
            <span
              style={{
                minWidth: 26,
                height: 26,
                padding: "0 8px",
                boxSizing: "border-box",
                borderRadius: theme.radius.full,
                background: color,
                color: theme.text.onColor,
                ...theme.font.label,
                fontWeight: theme.weight.semibold,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {items.length}
            </span>
          ) : null}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease", flex: "0 0 auto" }}
          >
            <path d="M4 6 L8 10 L12 6" fill="none" stroke={theme.text.secondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {!open && items.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 10px 10px" }}>
            {items.map((item: LogItem) => loggedRow(lane, item, null))}
          </div>
        ) : null}
        {open ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 10px 12px", animation: "dcIn 220ms ease" }}>
            {options.map((text: string) => optionRow(lane, b.id, text))}
            {extras.map((item: LogItem) => loggedRow(lane, item, b.id))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <input
                value={draft}
                placeholder="Add your own"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") submitDraft(b.id);
                }}
                style={{
                  flex: "1 1 200px",
                  minWidth: 0,
                  minHeight: 46,
                  padding: "10px 12px",
                  borderRadius: theme.radius.lg,
                  border: "1px solid " + theme.border.default,
                  background: theme.bg.elevated,
                  color: theme.text.primary,
                  fontFamily: font,
                  ...theme.font.body1,
                }}
              />
              <button
                onClick={() => submitDraft(b.id)}
                style={{
                  minHeight: 46,
                  padding: "10px 18px",
                  borderRadius: theme.radius.lg,
                  border: "1px solid " + color,
                  background: color,
                  color: theme.text.onColor,
                  fontFamily: font,
                  ...theme.font.label,
                  fontWeight: theme.weight.semibold,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: pageBg,
        color: theme.text.primary,
        fontFamily: font,
        minHeight: "100dvh",
        padding:
          "calc(env(safe-area-inset-top) + 20px) calc(env(safe-area-inset-right) + 16px) calc(env(safe-area-inset-bottom) + 32px) calc(env(safe-area-inset-left) + 16px)",
        position: "relative",
        transition: "background-color 280ms ease",
      }}
    >
      <style>{`
        @keyframes dcPop {
          0% { transform: scale(0.76); opacity: 0.4; }
          55% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dcHeartPop {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dcHeartDim {
          0% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dcIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dcHop {
          0% { transform: translateY(0) rotateY(-6deg); }
          40% { transform: translateY(-14px) rotateY(4deg); }
          100% { transform: translateY(0) rotateY(-6deg); }
        }
        @keyframes dcTurn {
          0%, 100% { transform: translateY(0) rotateY(-8deg); }
          50% { transform: translateY(-5px) rotateY(8deg); }
        }
        @keyframes dcShadow {
          0%, 100% { transform: scaleX(1); opacity: 0.14; }
          50% { transform: scaleX(0.84); opacity: 0.08; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          position: "relative",
        }}
      >
        <button
          onClick={() => setSettings(true)}
          aria-label="Settings"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 40,
            height: 40,
            borderRadius: theme.radius.full,
            border: "1px solid " + theme.border.default,
            background: theme.bg.elevated,
            color: theme.text.secondary,
            fontFamily: font,
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M9 2.2 L9.7 4.3 L11.8 3.6 L12.7 5.6 L14.9 5.6 L14.6 7.8 L16.4 8.8 L15.2 10.6 L16.4 12.4 L14.6 13.4 L14.9 15.6 L12.7 15.6 L11.8 17.6 L9.7 16.9 L9 19 L8.3 16.9 L6.2 17.6 L5.3 15.6 L3.1 15.6 L3.4 13.4 L1.6 12.4 L2.8 10.6 L1.6 8.8 L3.4 7.8 L3.1 5.6 L5.3 5.6 L6.2 3.6 L8.3 4.3 Z"
              transform="translate(0,-1.2)"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <header style={{ textAlign: "center", paddingRight: 44, paddingLeft: 44 }}>
          <div style={{ ...theme.font.label, color: theme.text.tertiary, letterSpacing: "0.12em" }}>DAYCRAFT</div>
          <div style={{ ...theme.font.heading1, fontWeight: theme.weight.semibold, marginTop: 8 }}>{formatKey(viewDate)}</div>
          {viewDate !== today ? (
            <button
              onClick={() => {
                setViewDate(today);
                closeHome();
              }}
              style={{
                marginTop: 10,
                minHeight: 36,
                padding: "6px 12px",
                borderRadius: theme.radius.full,
                border: "1px solid " + theme.border.default,
                background: theme.bg.elevated,
                color: theme.text.primary,
                fontFamily: font,
                ...theme.font.label,
                cursor: "pointer",
              }}
            >
              Back to today
            </button>
          ) : null}
        </header>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
          <Companion kind={store.creature} health={health.hearts} celebrate={weekDone} />
          <div role="img" aria-label={health.hearts + " of 5 hearts"} style={{ display: "flex", gap: 4, marginTop: -4 }}>
            {[0, 1, 2, 3, 4].map((i: number) => {
              const filled = i < health.hearts;
              return (
                <svg
                  key={i + (filled ? "f" : "e")}
                  width="20"
                  height="18"
                  viewBox="-15 -14 30 25"
                  aria-hidden="true"
                  style={{
                    display: "block",
                    animation: filled
                      ? "dcHeartPop 480ms cubic-bezier(.3,1.6,.5,1) " + i * 50 + "ms both"
                      : "dcHeartDim 320ms ease both",
                  }}
                >
                  {filled ? (
                    <>
                      <path d={HEART} fill="#FF6F91" />
                      <path d={HEART} fill="none" stroke="#E2517A" strokeWidth="1.2" opacity="0.6" />
                      <ellipse cx="-6" cy="-6" rx="3.4" ry="2.2" fill="#FFFFFF" opacity="0.65" transform="rotate(-30 -6 -6)" />
                    </>
                  ) : (
                    <path d={HEART} fill="none" stroke={theme.border.strong} strokeWidth="2" />
                  )}
                </svg>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {health.days.map((d: WeekDay, i: number) => (
              <div
                key={d.key}
                title={formatKey(d.key) + " · " + statusWord(d.status)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <span
                  style={{
                    ...theme.font.caption,
                    fontSize: "10px",
                    lineHeight: "12px",
                    color: d.key === viewDate ? theme.text.primary : theme.text.tertiary,
                    fontWeight: d.key === viewDate ? theme.weight.semibold : theme.weight.regular,
                  }}
                >
                  {"MTWTFSS".charAt(i)}
                </span>
                <span style={dotStyle(d.status)} />
              </div>
            ))}
          </div>
          <div style={{ ...theme.font.caption, color: theme.text.secondary, textAlign: "center" }}>{healthLine}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, width: "100%" }}>
          {counter("should", shouldN)}
          {counter("could", couldN)}
          {counter("shouldnt", avoidN)}
        </div>

        {selected ? (
          <section
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: theme.radius.xl,
              border: "1px solid " + (editing ? theme.text.danger : theme.border.default),
              background: theme.bg.elevated,
              padding: "18px 14px 14px",
              animation: "dcIn 260ms ease",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ ...theme.font.heading3, fontWeight: theme.weight.semibold, color }}>
                  {editing ? "Change your " + laneTitle(selected) + " logs" : laneTitle(selected)}
                </div>
                <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 4 }}>
                  {editing
                    ? "Tap Remove on anything you want off this day."
                    : logged.length > 0
                      ? logged.length + " logged · tap a time block to add more"
                      : "Tap a time block to log what you did."}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {editing
                  ? pill("Done", () => setView("list"), true)
                  : logged.length > 0
                    ? pill("Add or change", () => setView("edit"), false)
                    : null}
                {editing ? null : pill("Close", closeHome, false)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {BLOCKS.map((b: BlockDef) => blockCard(selected, b))}
              {unblocked.length > 0 ? (
                <div
                  style={{
                    borderRadius: theme.radius.lg,
                    border: "1px solid " + theme.border.default,
                    background: theme.bg.base,
                    padding: "10px 10px 10px",
                  }}
                >
                  <div style={{ padding: "2px 4px 8px" }}>
                    <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold }}>Anytime</div>
                    <div style={{ ...theme.font.caption, color: theme.text.tertiary }}>Logged before time blocks existed</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {unblocked.map((item: LogItem) => loggedRow(selected, item, null))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {settings ? (
          <section
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: theme.radius.xl,
              border: "1px solid " + theme.border.default,
              background: theme.bg.elevated,
              padding: "18px",
              animation: "dcIn 260ms ease",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ ...theme.font.heading3, fontWeight: theme.weight.semibold }}>Settings</div>
              <button
                onClick={() => setSettings(false)}
                style={{
                  minHeight: 40,
                  padding: "8px 14px",
                  borderRadius: theme.radius.full,
                  border: "1px solid " + theme.border.default,
                  background: theme.bg.base,
                  color: theme.text.primary,
                  fontFamily: font,
                  ...theme.font.label,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 18, marginBottom: 8 }}>Creature</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CREATURES.map((item: { id: CreatureId; name: string; note: string }) => {
                const on = store.creature === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setStore((prev: Store) => ({ ...prev, creature: item.id }))}
                    aria-pressed={on}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      minHeight: 56,
                      padding: "6px 16px 6px 8px",
                      borderRadius: theme.radius.full,
                      border: "1px solid " + (on ? theme.dataviz.categorical[0] : theme.border.default),
                      background: on ? theme.fill.accentSubtle : theme.bg.base,
                      color: theme.text.primary,
                      fontFamily: font,
                      ...theme.font.label,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "block", width: 44, flex: "0 0 auto" }}>
                      <Companion kind={item.id} mini />
                    </span>
                    <span style={{ display: "block" }}>
                      <span style={{ display: "block", fontWeight: theme.weight.semibold }}>{item.name}</span>
                      <span style={{ display: "block", color: theme.text.secondary }}>{item.note}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 10 }}>
              Each night your day gets judged. If the lock held and you had at least as many Shoulds as Shouldn'ts, {creatureName} gains a heart; otherwise it loses one, or two if the lock broke. Blank days don't count, and every Monday starts fresh at 3 of 5.
            </div>

            <div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 18, marginBottom: 8 }}>Theme</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {THEMES.map((item: { id: ThemeId; name: string }) =>
                chip(store.theme === item.id, item.name, () => setStore((prev: Store) => ({ ...prev, theme: item.id }))),
              )}
            </div>

            <div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 18, marginBottom: 8 }}>Music</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chip(store.music, store.music ? "Quiet music on" : "Quiet music off", () =>
                {
                unlockAudio();
                setStore((prev: Store) => ({ ...prev, music: !prev.music }));
              },
              )}
            </div>

            {pastDays.length > 0 ? (
              <div>
                <div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 18, marginBottom: 8 }}>Past days</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {pastDays.map((key: string) =>
                    chip(viewDate === key, formatKey(key), () => {
                      setViewDate(key);
                      closeHome();
                      setSettings(false);
                    }),
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}


export { Companion };
