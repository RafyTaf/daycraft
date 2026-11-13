import puppeteer from "puppeteer-core";
import { mkdirSync } from "fs";
const URL = process.env.DC_URL || "http://localhost:4174/daycraft/";
const SHOT = "shots";
mkdirSync(SHOT, { recursive: true });
const errors = [];
const results = {};
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = (() => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();

async function newPage(scheme) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  page.on("console", (m) => { if (m.type() === "error") errors.push(scheme + ": " + m.text()); });
  page.on("pageerror", (e) => errors.push(scheme + " pageerror: " + e.message));
  return page;
}
const clickText = async (page, text, exact = false) => {
  const ok = await page.evaluate((text, exact) => {
    const el = [...document.querySelectorAll("button")].find((b) => exact ? b.textContent.trim() === text : b.textContent.includes(text));
    if (el) { el.scrollIntoView({ block: "center" }); el.click(); }
    return !!el;
  }, text, exact);
  if (!ok) throw new Error("not found: " + text);
  await sleep(350);
};
const clickLabel = async (page, text) => {
  const ok = await page.evaluate((text) => {
    const el = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").includes(text));
    if (el) { el.scrollIntoView({ block: "center" }); el.click(); }
    return !!el;
  }, text);
  if (!ok) throw new Error("label not found: " + text);
  await sleep(350);
};
const jarEarned = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("daycraft-habits-v1")).jar.earned);
const extrasOf = (page) => page.evaluate((today) => {
  const s = JSON.parse(localStorage.getItem("daycraft-habits-v1"));
  return (s.days[today]?.freestyle || []).filter((f) => f.extra).map((f) => f.text);
}, today);

// ---- 1) MIGRATION: stale $5 + orphan extra, other data kept ----
const p = await newPage("light");
await p.goto(URL, { waitUntil: "networkidle0" });
await sleep(400);
const stale = {
  v: 1,
  started: today,
  onboarded: true,
  music: false,
  sounds: true,
  days: {
    [today]: {
      checks: { brush: 1, pray: 1, zones: 1, mbreak: 1, breakfast: 1, desk: 1, lunch: 1, work: 1, walk: 1 },
      freestyle: [
        { id: "main1", optionId: "swing", text: "Practice golf swing at home (saved in YT)", block: "afternoon", extra: false, at: 1 },
        { id: "orphan", optionId: "berserk", text: "Read Berserk manga", block: "afternoon", extra: true, at: 2 },
      ],
      marketWorked: true,
      afternoonBusy: false,
    },
  },
  jar: { goal: "A new putter", price: 180, earned: 5, spends: [], perExtra: 5, gymBonus: 15, gymWeeks: [] },
  chores: [{ id: "c1", text: "Take out recycling", done: {}, created: 1 }],
};
// First: parent IS fulfilled (afternoon has main freestyle), so extra is NOT an orphan — $5 should STAY.
await p.evaluate((s) => localStorage.setItem("daycraft-habits-v1", JSON.stringify(s)), stale);
await p.reload({ waitUntil: "networkidle0" });
await sleep(700);
results.keptValidExtra = await jarEarned(p);
results.keptValidExtraList = await extrasOf(p);

// Now the bug state: uncheck parent already (no main, no afternoonBusy) but extra remains + $5
const bug = JSON.parse(JSON.stringify(stale));
bug.days[today].freestyle = [bug.days[today].freestyle[1]]; // only the extra, no main
bug.days[today].afternoonBusy = false;
bug.days[today].marketWorked = true;
bug.chores = stale.chores;
bug.jar.goal = "A new putter";
bug.jar.price = 180;
await p.evaluate((s) => localStorage.setItem("daycraft-habits-v1", JSON.stringify(s)), bug);
await p.reload({ waitUntil: "networkidle0" });
await sleep(700);
results.clearedOrphanEarned = await jarEarned(p);
results.clearedOrphanList = await extrasOf(p);
results.goalKept = await p.evaluate(() => JSON.parse(localStorage.getItem("daycraft-habits-v1")).jar.goal);
results.choreKept = await p.evaluate(() => JSON.parse(localStorage.getItem("daycraft-habits-v1")).chores[0].text);
results.checksKept = await p.evaluate((today) => Object.keys(JSON.parse(localStorage.getItem("daycraft-habits-v1")).days[today].checks).length, today);

// ---- 2) Fresh flow: add extra, undo extra surgically ----
const fresh = {
  v: 1, started: today, onboarded: true, music: false, sounds: true,
  days: { [today]: { checks: { brush:1, pray:1, zones:1, mbreak:1, breakfast:1, desk:1, lunch:1, work:1, walk:1 }, freestyle: [], marketWorked: true, afternoonBusy: false } },
  jar: { goal: "A new putter", price: 180, earned: 0, spends: [], perExtra: 5, gymBonus: 15, gymWeeks: [] },
  chores: [],
};
await p.evaluate((s) => localStorage.setItem("daycraft-habits-v1", JSON.stringify(s)), fresh);
await p.reload({ waitUntil: "networkidle0" });
await sleep(700);

// bold habit
results.boldBrush = await p.evaluate(() => {
  const spans = [...document.querySelectorAll("span")];
  const el = spans.find((s) => s.textContent === "brush my teeth" && s.children.length === 0);
  if (!el) return "not found";
  const w = getComputedStyle(el).fontWeight;
  const cue = el.parentElement;
  // cue contains "After I pee, I " + bold + "."
  return { weight: w, parent: cue && cue.textContent, color: getComputedStyle(el).color };
});

await p.screenshot({ path: SHOT + "/70-today-bold-colors-light.png" });

// open afternoon, add required fs + extra
await clickLabel(p, "If I'm caught up");
await sleep(300);
await clickText(p, "Practice golf swing at home");
await sleep(400);
results.earnedAfterMain = await jarEarned(p); // should be 0
await clickText(p, "Can I do one more?");
await sleep(300);
await clickText(p, "Read Berserk manga");
await sleep(600);
results.earnedAfterExtra = await jarEarned(p); // 5
results.extrasAfterAdd = await extrasOf(p);
results.extraVisible = await p.evaluate(() => document.body.innerText.includes("Read Berserk manga") && document.body.innerText.includes("Undo"));
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label")||"").includes("Undo extra")); el && el.scrollIntoView({ block: "center" }); });
await sleep(200);
await p.screenshot({ path: SHOT + "/71-extra-before-undo-light.png" });

// UNDO the extra
await clickLabel(p, "Undo extra: Read Berserk manga");
await sleep(500);
results.earnedAfterUndo = await jarEarned(p); // 0
results.extrasAfterUndo = await extrasOf(p);
results.berserkGone = await p.evaluate(() => !document.body.innerText.includes("Read Berserk manga"));
results.swingStillThere = await p.evaluate(() => document.body.innerText.includes("Practice golf swing"));
await p.screenshot({ path: SHOT + "/72-extra-after-undo-light.png" });

// Add extra again, then undo the WHOLE line — should also refund
await clickText(p, "Can I do one more?");
await sleep(300);
await clickText(p, "Read Berserk manga");
await sleep(500);
results.earnedBeforeLineUndo = await jarEarned(p); // 5
await clickLabel(p, "Undo: If I'm caught up");
await sleep(500);
results.earnedAfterLineUndo = await jarEarned(p); // 0
results.extrasAfterLineUndo = await extrasOf(p);

// ---- 3) Speaker vs settings ----
await p.evaluate(() => window.scrollTo(0, 0));
await sleep(200);
await clickLabel(p, "Sound and music");
await sleep(400);
results.soundPanelOpen = await p.evaluate(() => {
  const t = document.body.innerText;
  // panel has Sound & music and Done, still on Today (Morning visible)
  return t.includes("Sound & music") && t.includes("Quiet music") && t.includes("Morning") && t.includes("Done");
});
results.settingsNotOpened = await p.evaluate(() => !document.body.innerText.includes("DayCraft is your daily reminder"));
await p.screenshot({ path: SHOT + "/73-speaker-panel-light.png" });
await clickText(p, "Done", true);
await sleep(300);
await clickLabel(p, "Settings");
await sleep(400);
results.settingsOpensFull = await p.evaluate(() => document.body.innerText.includes("DayCraft is your daily reminder") && document.body.innerText.includes("Settings"));
results.settingsHasToggles = await p.evaluate(() => document.body.innerText.includes("Sounds") && document.body.innerText.includes("Quiet music"));
await clickText(p, "‹ Today");
await sleep(300);

// overflow
results.pageOverflowX = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

// ---- DARK ----
const d = await newPage("dark");
await d.goto(URL, { waitUntil: "networkidle0" });
await sleep(800);
await d.screenshot({ path: SHOT + "/74-today-bold-colors-dark.png" });
results.darkBold = await d.evaluate(() => {
  const el = [...document.querySelectorAll("span")].find((s) => s.textContent === "brush my teeth");
  return el ? { weight: getComputedStyle(el).fontWeight, color: getComputedStyle(el).color } : "missing";
});
results.darkOverflow = await d.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
await clickLabel(d, "Sound and music");
await sleep(400);
await d.screenshot({ path: SHOT + "/75-speaker-panel-dark.png" });
results.darkPanel = await d.evaluate(() => document.body.innerText.includes("Quiet music") && document.body.innerText.includes("Morning"));

results.swCache = await d.evaluate(async () => (await caches.keys()).join(","));
console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
