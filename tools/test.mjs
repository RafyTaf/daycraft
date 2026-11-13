import puppeteer from "puppeteer-core";
import { mkdirSync } from "fs";

const URL = process.env.DC_URL || "http://localhost:4174/daycraft/";
const SHOT = process.env.DC_SHOTDIR || "shots";
mkdirSync(SHOT, { recursive: true });
const errors = [];
const results = {};
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = (() => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
})();
const addDays = (key, n) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
};

async function newPage(scheme) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  page.on("console", (m) => { if (m.type() === "error") errors.push(scheme + ": " + m.text()); });
  page.on("pageerror", (e) => errors.push(scheme + " pageerror: " + e.message));
  return page;
}
const clickText = async (page, sel, text, exact = false) => {
  const ok = await page.evaluate((sel, text, exact) => {
    const el = [...document.querySelectorAll(sel)].find((b) => exact ? b.textContent.trim() === text : b.textContent.includes(text));
    if (el) { el.scrollIntoView({ block: "center" }); el.click(); }
    return !!el;
  }, sel, text, exact);
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

// 0) Welcome + old storage left intact
const p = await newPage("light");
await p.goto(URL, { waitUntil: "networkidle0" });
await p.evaluate(() => {
  localStorage.setItem("daycraft-v1", JSON.stringify({ theme: "default", creature: "bean", days: { "2026-11-09": { should: [{ id: "a", text: "Pray", custom: false }], could: [], shouldnt: [] } } }));
});
await p.reload({ waitUntil: "networkidle0" });
await sleep(600);
results.welcome = await p.evaluate(() => document.body.innerText.includes("This is your day"));
await p.screenshot({ path: SHOT + "/20-welcome-light.png" });
await clickText(p, "button", "Begin", true);
await sleep(500);
results.afterBegin = await p.evaluate(() => document.body.innerText.includes("Morning") && document.body.innerText.includes("Market hours"));
results.legacyUntouched = await p.evaluate(() => {
  const raw = localStorage.getItem("daycraft-v1");
  return raw && raw.includes("Pray") && raw.includes("2026-11-09");
});
results.newKeyUsed = await p.evaluate(() => !!localStorage.getItem("daycraft-habits-v1"));
await p.screenshot({ path: SHOT + "/21-today-fresh-light.png" });

// expand all blocks and check morning required
const morning = ["After I pee, I brush my teeth.", "After I feed Hazel", "After I pray, I check the charts", "short controlled phone break", "I cook breakfast", "move to the computer"];
for (const t of morning) {
  await clickLabel(p, t);
}
// meal chip
await clickText(p, "button", "Eggs & toast");
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Morning")); el && el.scrollIntoView({ block: "start" }); });
await sleep(300);
await p.screenshot({ path: SHOT + "/22-morning-done-light.png" });

// market: open sheet, working
await clickLabel(p, "If I'm not busy working or trading");
await sleep(400);
await p.screenshot({ path: SHOT + "/23-freestyle-sheet-light.png" });
await clickText(p, "button", "I was working or trading");
await sleep(300);

// afternoon required
await clickLabel(p, "At 12, I cook lunch");
await clickLabel(p, "catch up on work and emails");
await clickLabel(p, "I walk Hazel");
await clickLabel(p, "If I'm caught up");
await sleep(300);
await clickText(p, "button", "Practice golf swing at home");
await sleep(400);
// should NOT be complete yet? Wait - all required should be done after aft-fs. Gym is not required. Day should be linked!
results.linkedAfterRequired = await p.evaluate(() => document.body.innerText.includes("is linked") || document.body.innerText.includes("Today is linked"));
await p.screenshot({ path: SHOT + "/24-day-linked-light.png" });

// extra credit
const beforeJar = await p.evaluate(() => JSON.parse(localStorage.getItem("daycraft-habits-v1")).jar.earned);
await clickText(p, "button", "Can I do one more?");
await sleep(300);
await clickText(p, "button", "Read Berserk manga");
await sleep(700);
const afterJar = await p.evaluate(() => JSON.parse(localStorage.getItem("daycraft-habits-v1")).jar.earned);
results.extraCredit = afterJar - beforeJar;
results.perExtra = await p.evaluate(() => JSON.parse(localStorage.getItem("daycraft-habits-v1")).jar.perExtra);
await p.screenshot({ path: SHOT + "/25-extra-credit-light.png" });

// gym optional — still linked without needing it; check gym
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("Home stretch") || b.textContent.includes("Home stretch")); el && (el.scrollIntoView({block:"center"}), el.getAttribute("aria-expanded")==="false" && el.click()); });
await new Promise((r) => setTimeout(r, 400));
await clickLabel(p, "building gym");
results.stillLinkedWithGym = await p.evaluate(() => document.body.innerText.includes("linked"));
results.gymWeek = await p.evaluate(() => document.body.innerText.includes("Gym 1/5"));

// persistence
await p.reload({ waitUntil: "networkidle0" });
await sleep(700);
results.afterReloadLinked = await p.evaluate(() => document.body.innerText.includes("Today is linked") || document.body.innerText.includes("is linked"));
results.afterReloadSwing = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("daycraft-habits-v1"));
  const day = s.days[Object.keys(s.days).sort().pop()];
  const texts = (day.freestyle || []).map((f) => f.text).join(" ");
  return texts.includes("Practice golf swing") && texts.includes("Berserk");
});
results.legacyStill = await p.evaluate(() => localStorage.getItem("daycraft-v1").includes("Pray"));

// jar page
await clickText(p, "button", "Treat jar").catch(() => clickText(p, "button", "Jar"));
await sleep(400);
// nav Jar
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Jar").click());
await sleep(500);
await p.screenshot({ path: SHOT + "/26-jar-light.png" });
results.jarShowsCredit = await p.evaluate(() => document.body.innerText.includes("$5"));

// calendar
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Calendar").click());
await sleep(500);
await p.screenshot({ path: SHOT + "/27-calendar-light.png" });
results.calendarHasLink = await p.evaluate(() => document.body.innerText.includes("Your chain") || document.body.innerText.includes("chain"));

// identity
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Identity").click());
await sleep(500);
await p.screenshot({ path: SHOT + "/28-identity-list-light.png" });
await clickText(p, "button", "Faith");
await sleep(400);
results.faithDesc = await p.evaluate(() => document.body.innerText.includes("God is the foundation"));
await p.screenshot({ path: SHOT + "/29-identity-faith-light.png" });

// settings + music/sounds
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Today").click());
await sleep(400);
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Settings").click());
await sleep(400);
await p.screenshot({ path: SHOT + "/30-settings-light.png" });
results.soundsDefaultOn = await p.evaluate(() => document.body.innerText.includes("Sounds") && document.body.innerText.includes("On"));
await clickText(p, "button", "Quiet music");
await sleep(300);
results.musicOn = await p.evaluate(() => {
  const t = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Quiet music"))?.textContent;
  return t && t.includes("On");
});
await clickText(p, "button", "Quiet music"); // off again
await clickText(p, "button", "Sounds"); // toggle off then we'll leave? turn back on
await clickText(p, "button", "Sounds"); // on

// chores
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Today").click());
await sleep(200);
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Chores").click());
await sleep(400);
await p.type("input", "Take out recycling");
await clickLabel(p, "Add chore");
await sleep(200);
results.choreAdded = await p.evaluate(() => document.body.innerText.includes("Take out recycling"));
await p.screenshot({ path: SHOT + "/31-chores-light.png" });

// never miss twice: seed yesterday miss, today incomplete
const yest = addDays(today, -1);
await p.evaluate((today, yest) => {
  const s = JSON.parse(localStorage.getItem("daycraft-habits-v1"));
  s.started = yest;
  s.days[today] = { checks: {}, freestyle: [], marketWorked: false, afternoonBusy: false };
  s.days[yest] = { checks: {}, freestyle: [], marketWorked: false, afternoonBusy: false };
  localStorage.setItem("daycraft-habits-v1", JSON.stringify(s));
}, today, yest);
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Today").click());
await p.reload({ waitUntil: "networkidle0" });
await sleep(700);
results.dontMissTwice = await p.evaluate(() => document.body.innerText.includes("Don't miss twice"));
await p.screenshot({ path: SHOT + "/32-dont-miss-twice-light.png" });

// SW / offline / overflow
results.swControlled = await p.evaluate(async () => {
  await navigator.serviceWorker.ready;
  return !!navigator.serviceWorker.controller || "ready-not-controlling";
});
await p.reload({ waitUntil: "networkidle0" });
results.swCache = await p.evaluate(async () => (await caches.keys()).join(","));
results.pageOverflowX = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
await p.setOfflineMode(true);
await p.reload({ waitUntil: "domcontentloaded" });
await sleep(1000);
results.offlineRenders = await p.evaluate(() => document.body.innerText.includes("DayCraft") || document.body.innerText.includes("Morning") || document.body.innerText.includes("chain") || document.body.innerText.includes("Don't miss"));
await p.setOfflineMode(false);
results.manifest = await p.evaluate(async () => (await (await fetch("./manifest.json")).json()).display);
results.metaThemeColor = await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content);

// DARK
const d = await newPage("dark");
await d.goto(URL, { waitUntil: "networkidle0" });
await sleep(800);
// already onboarded via shared origin storage — but we just overwrote days. Welcome shouldn't show (onboarded true).
results.darkHasContent = await d.evaluate(() => document.body.innerText.length > 40);
await d.screenshot({ path: SHOT + "/40-today-dark.png" });
await d.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Calendar")?.click());
await sleep(400);
await d.screenshot({ path: SHOT + "/41-calendar-dark.png" });
await d.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Identity")?.click());
await sleep(400);
await d.screenshot({ path: SHOT + "/42-identity-dark.png" });
await d.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Jar")?.click());
await sleep(400);
await d.screenshot({ path: SHOT + "/43-jar-dark.png" });
await d.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Today")?.click());
await sleep(300);
// check one item in dark for the red checkbox
await clickLabel(d, "After I pee, I brush my teeth.");
await d.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label")||"").includes("brush")); el && el.scrollIntoView({ block: "center" }); });
await sleep(300);
await d.screenshot({ path: SHOT + "/44-check-dark.png" });
results.darkOverflow = await d.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
