export type BlockId = "morning" | "market" | "afternoon" | "home";
export type IdentityId = "faith" | "gym" | "cooking" | "trading" | "golf" | "storage" | "hazel";
export type HabitKind = "check" | "freestyle" | "gym" | "dinner";
export type FreestyleGroup = "golf" | "body" | "trading" | "mind" | "home" | "storage";

export interface BlockDef {
  id: BlockId;
  name: string;
  time: string;
  hint: string;
}

export interface HabitDef {
  id: string;
  block: BlockId;
  text: string;
  caption?: string;
  required: boolean;
  kind: HabitKind;
  identities: IdentityId[];
}

export interface FreestyleOption {
  id: string;
  group: FreestyleGroup;
  text: string;
  identities: IdentityId[];
}

export interface IdentityDef {
  id: IdentityId;
  name: string;
  description: string;
}

export const BLOCKS: BlockDef[] = [
  {
    id: "morning",
    name: "Morning",
    time: "7:00–9:30am",
    hint: "Hazel's balcony trips happen whenever she needs them — then come back to the step you were on.",
  },
  {
    id: "market",
    name: "Market hours",
    time: "9:30am–12:00pm",
    hint: "Discord with the guys while a trade is live counts as trading. Hard cutoff at 12 for lunch.",
  },
  {
    id: "afternoon",
    name: "Afternoon",
    time: "12:00–5:00pm",
    hint: "At 12, pause (unless it's truly urgent), cook lunch, eat, then come back.",
  },
  {
    id: "home",
    name: "Home stretch",
    time: "5:00–6:00pm",
    hint: "Gym is for your week, and for the jar bonus — not required for today's chain.",
  },
];

export const HABITS: HabitDef[] = [
  {
    id: "brush",
    block: "morning",
    text: "After I pee, I brush my teeth.",
    caption: "Late still counts.",
    required: true,
    kind: "check",
    identities: [],
  },
  {
    id: "pray",
    block: "morning",
    text: "After I feed Hazel, I sit on the couch and pray.",
    caption: "No time limit. If you grab the phone first, put it down and pray — it still counts.",
    required: true,
    kind: "check",
    identities: ["faith", "hazel"],
  },
  {
    id: "zones",
    block: "morning",
    text: "After I pray, I check the charts and set my zones.",
    required: true,
    kind: "check",
    identities: ["trading"],
  },
  {
    id: "mbreak",
    block: "morning",
    text: "After I set my zones, I get a short controlled phone break.",
    caption: "Reward.",
    required: true,
    kind: "check",
    identities: [],
  },
  {
    id: "breakfast",
    block: "morning",
    text: "After my phone break, I cook breakfast.",
    caption: "Eggs and toast, or a shake on a lazy day.",
    required: true,
    kind: "check",
    identities: ["cooking"],
  },
  {
    id: "desk",
    block: "morning",
    text: "After breakfast, I move to the computer for market + emails.",
    required: true,
    kind: "check",
    identities: ["trading"],
  },
  {
    id: "market-fs",
    block: "market",
    text: "If I'm not busy working or trading, I do at least one freestyle activity.",
    required: true,
    kind: "freestyle",
    identities: [],
  },
  {
    id: "lunch",
    block: "afternoon",
    text: "At 12, I cook lunch.",
    caption: "Eating with YouTube is the reward.",
    required: true,
    kind: "check",
    identities: ["cooking"],
  },
  {
    id: "work",
    block: "afternoon",
    text: "After lunch, I catch up on work and emails.",
    required: true,
    kind: "check",
    identities: ["trading"],
  },
  {
    id: "walk",
    block: "afternoon",
    text: "After that, I walk Hazel.",
    required: true,
    kind: "check",
    identities: ["hazel"],
  },
  {
    id: "abreak",
    block: "afternoon",
    text: "Optional 20-minute phone break after the walk.",
    caption: "Your call — skip if emails pile up.",
    required: false,
    kind: "check",
    identities: [],
  },
  {
    id: "aft-fs",
    block: "afternoon",
    text: "If I'm caught up, I do at least one freestyle activity.",
    caption: "Then ask yourself: can I do one more?",
    required: true,
    kind: "freestyle",
    identities: [],
  },
  {
    id: "gym",
    block: "home",
    text: "When Jordan gets home, we go to the building gym and I walk a mile on the treadmill.",
    caption: "About 20 minutes. Go even if she doesn't. Counts for your week, not today's chain.",
    required: false,
    kind: "gym",
    identities: ["gym"],
  },
  {
    id: "dinner",
    block: "home",
    text: "After the gym, we cook dinner.",
    caption: "Optional. Going out is fine.",
    required: false,
    kind: "dinner",
    identities: ["cooking"],
  },
];

export const FREESTYLE_GROUPS: { id: FreestyleGroup; name: string }[] = [
  { id: "golf", name: "Golf" },
  { id: "body", name: "Body" },
  { id: "trading", name: "Trading" },
  { id: "mind", name: "Mind" },
  { id: "home", name: "Home & Hazel" },
  { id: "storage", name: "Storage" },
];

export const FREESTYLE: FreestyleOption[] = [
  { id: "swing", group: "golf", text: "Practice golf swing at home (saved in YT)", identities: ["golf"] },
  { id: "putting", group: "golf", text: "Putting practice on my putting green", identities: ["golf"] },
  { id: "chipping", group: "golf", text: "Chipping practice at home", identities: ["golf"] },
  { id: "lesson", group: "golf", text: "Watch a short golf lesson", identities: ["golf"] },
  { id: "range", group: "golf", text: "Chip, putt, or drive at the range (2 min away; up to ~1.5h)", identities: ["golf"] },
  { id: "prep", group: "body", text: "Prep lunch ingredients early", identities: ["cooking"] },
  { id: "backtest", group: "trading", text: "Backtest session", identities: ["trading"] },
  { id: "strategy", group: "trading", text: "Work on improving my strategy", identities: ["trading"] },
  { id: "read", group: "mind", text: "Read", identities: [] },
  { id: "berserk", group: "mind", text: "Read Berserk manga", identities: [] },
  { id: "tidy", group: "home", text: "Quick tidy-up / chore from chores list", identities: [] },
  { id: "train-hazel", group: "home", text: "Train Hazel", identities: ["hazel"] },
  { id: "ryan", group: "storage", text: "Help Ryan at the storage (organizing boxes, Lego shows)", identities: ["storage"] },
];

export const IDENTITIES: IdentityDef[] = [
  {
    id: "faith",
    name: "Faith",
    description: "God is the foundation of everything in my life and my provider. I never want to be where He isn't.",
  },
  {
    id: "gym",
    name: "Gym",
    description:
      "I'm an athletic person who loves being active. I want my body to reflect that, and if someone else can build their dream body, so can I.",
  },
  {
    id: "cooking",
    name: "Cooking",
    description: "Cooking supports my goal of being in shape. It's a good activity, and it's fun.",
  },
  {
    id: "trading",
    name: "Trading",
    description: "Trading gives me the lifestyle I want: a great income and a good work-life balance.",
  },
  {
    id: "golf",
    name: "Golf",
    description: "I'm obsessed with golf. I love playing it and watching it, and I love being good at the things I love.",
  },
  {
    id: "storage",
    name: "Storage with Ryan",
    description:
      "I'm giving my brother a chance to grow a professional career, building discipline and motivation together while spending time with him.",
  },
  {
    id: "hazel",
    name: "Hazel",
    description: "She's everything. It goes without saying.",
  },
];

export const WEEKLY = {
  gym: 5,
  golf: 2,
  storage: 2,
} as const;

export function habitsIn(block: BlockId): HabitDef[] {
  return HABITS.filter((h) => h.block === block);
}

export function requiredHabits(): HabitDef[] {
  return HABITS.filter((h) => h.required);
}

export function optionById(id: string): FreestyleOption | undefined {
  return FREESTYLE.find((o) => o.id === id);
}

export function currentBlock(now: Date = new Date()): BlockId {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= 17 * 60) return "home";
  if (minutes >= 12 * 60) return "afternoon";
  if (minutes >= 9 * 60 + 30) return "market";
  return "morning";
}

export function isAfter(hour: number, minute = 0, now: Date = new Date()): boolean {
  return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}
