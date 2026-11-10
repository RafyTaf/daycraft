import puppeteer from "puppeteer-core";
const URL = process.env.DC_URL || "http://localhost:4174/daycraft/";
const errors = [];
const results = {};
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();

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
  await sleep(450);
};
const counts = (page) => page.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].slice(0, 3).map((b) => b.textContent));
const removeCount = (page) => page.evaluate(() => document.querySelectorAll('button[aria-label^="Remove "]').length);
const scrollToText = (page, text) => page.evaluate((text) => { const el = [...document.querySelectorAll("div,button")].reverse().find((b) => b.textContent.includes(text)); el && el.scrollIntoView({ block: "start" }); window.scrollBy(0, -12); }, text);

// 1) MIGRATION: seed an old-format save (no blocks), plus an older day
const p = await newPage("light");
await p.goto(URL, { waitUntil: "networkidle0" });
const old = { theme: "default", creature: "bean", music: false, days: {
  [today]: { should: [{ id: "a1", text: "Brush your teeth", custom: false }, { id: "a2", text: "Called mom", custom: true }], could: [], shouldnt: [{ id: "a3", text: "First rip before 7:30pm", custom: false }] },
  "2026-11-02": { should: [{ id: "b1", text: "Pray", custom: false }], could: [{ id: "b2", text: "Practice golf", custom: false }] },
} };
await p.evaluate((o) => localStorage.setItem("daycraft-v1", JSON.stringify(o)), old);
await p.reload({ waitUntil: "networkidle0" });
await sleep(1000);
results.migratedCounts = await counts(p);
await clickText(p, "button", "SHOULD");
results.migratedShouldShows = await p.evaluate(() => { const t = document.body.innerText; return t.includes("Brush your teeth") && t.includes("Called mom") && t.includes("Anytime"); });
results.migratedOldDayKept = await p.evaluate(() => !!JSON.parse(localStorage.getItem("daycraft-v1")).days["2026-11-02"].could.length);
results.removeButtonsInBaseView = await removeCount(p);
await clickText(p, "button", "Close", true);
await p.evaluate(() => localStorage.removeItem("daycraft-v1"));
await p.reload({ waitUntil: "networkidle0" });
await sleep(1000);

// 2) NORMAL FLOW, light
await p.screenshot({ path: "shots/01-home-light.png" });
await clickText(p, "button", "SHOULD");
await sleep(300);
await scrollToText(p, "Should");
await p.screenshot({ path: "shots/09-block-menu-light.png" });
await clickText(p, "button", "Morning");
await clickText(p, "button", "Brush your teeth");
await clickText(p, "button", "Pray");
results.loggedMarkedInBlock = await p.evaluate(() => [...document.querySelectorAll("div")].some((d) => d.textContent.trim().startsWith("Brush your teeth") === false && d.textContent.includes("Brush your teeth") && d.textContent.includes("Logged")));
await scrollToText(p, "Morning");
await p.screenshot({ path: "shots/09b-block-open-light.png" });
// custom in Home stretch
await clickText(p, "button", "Home stretch");
await p.type("input", "Read 10 pages");
await clickText(p, "button", "Add", true);
results.removeButtonsBaseAfterLogging = await removeCount(p);
await clickText(p, "button", "Home stretch"); // collapse
await scrollToText(p, "Should");
await p.screenshot({ path: "shots/08-base-view-light.png" });
await clickText(p, "button", "Add or change");
results.removeButtonsEditMode = await removeCount(p);
await scrollToText(p, "Change your");
await p.screenshot({ path: "shots/10-edit-mode-light.png" });
await p.click('button[aria-label="Remove Pray"]');
await sleep(400);
results.afterRemoveShould = await counts(p);
await clickText(p, "button", "Done", true);
await clickText(p, "button", "COULD");
await clickText(p, "button", "Afternoon");
await clickText(p, "button", "Practice golf");
await clickText(p, "button", "Close", true);
results.beforeReload = await p.evaluate(() => localStorage.getItem("daycraft-v1"));
await p.reload({ waitUntil: "networkidle0" });
await sleep(1000);
results.afterReloadCounts = await counts(p);
results.swControlled = await p.evaluate(async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller || "ready-not-controlling"; });
await p.reload({ waitUntil: "networkidle0" });
results.swCache = await p.evaluate(async () => (await caches.keys()).join(","));
await p.setOfflineMode(true);
await p.reload({ waitUntil: "domcontentloaded" });
await sleep(1200);
results.offlineRenders = await p.evaluate(() => document.body.innerText.includes("DAYCRAFT") && document.body.innerText.includes("SHOULD"));
results.offlineCountsKept = await counts(p);
await p.setOfflineMode(false);

// 3) DARK
const d = await newPage("dark");
await d.goto(URL, { waitUntil: "networkidle0" });
await sleep(1200);
await d.screenshot({ path: "shots/04-home-dark.png" });
await clickText(d, "button", "SHOULD");
await scrollToText(d, "Should");
await d.screenshot({ path: "shots/08-base-view-dark.png" });
await clickText(d, "button", "Market hours");
await scrollToText(d, "Market hours");
await d.screenshot({ path: "shots/09-block-menu-dark.png" });
await clickText(d, "button", "Add or change");
await scrollToText(d, "Change your");
await d.screenshot({ path: "shots/10-edit-mode-dark.png" });
await clickText(d, "button", "Done", true);
await clickText(d, "button", "SHOULDN'T").catch(async () => clickText(d, "button", "SHOULDN"));
await clickText(d, "button", "Afternoon");
await scrollToText(d, "Afternoon");
await d.screenshot({ path: "shots/11-shouldnt-afternoon-dark.png" });
await clickText(d, "button", "Close", true);
await d.click('button[aria-label="Settings"]');
await sleep(500);
await clickText(d, "button", "Quiet music off");
results.audioState = await d.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Quiet music"))?.textContent);
await clickText(d, "button", "Quiet music on");
results.pageOverflowX = await d.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
results.metaThemeColor = await d.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
results.manifest = await d.evaluate(async () => (await (await fetch("./manifest.json")).json()).display);

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
