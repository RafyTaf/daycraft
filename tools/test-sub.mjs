import puppeteer from "puppeteer-core";
const URL = "http://localhost:4174/daycraft/";
const errors = [];
const results = {};
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(scheme) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  page.on("console", (m) => { if (m.type() === "error") errors.push(scheme + ": " + m.text()); });
  page.on("pageerror", (e) => errors.push(scheme + " pageerror: " + e.message));
  return page;
}
const clickText = async (page, sel, text) => {
  const ok = await page.evaluate((sel, text) => {
    const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text));
    if (el) el.click();
    return !!el;
  }, sel, text);
  if (!ok) throw new Error("not found: " + text);
  await sleep(450);
};

// LIGHT
const p = await newPage("light");
await p.goto(URL, { waitUntil: "networkidle0" });
await sleep(1200);
await p.screenshot({ path: "/tmp/subshots-01-home-light.png" });
await clickText(p, "button", "SHOULD");
await clickText(p, "button", "Brush your teeth");
await clickText(p, "button", "Pray");
await p.screenshot({ path: "/tmp/subshots-02-log-should-light.png" });
await clickText(p, "button", "Done");
await clickText(p, "button", "COULD");
await clickText(p, "button", "Practice golf");
await clickText(p, "button", "Done");
await p.type("input", "x").catch(() => {});
results.beforeReload = await p.evaluate(() => localStorage.getItem("daycraft-v1"));
results.inputFontSize = await p.evaluate(() => { const i = document.querySelector("input"); return i ? getComputedStyle(i).fontSize : "no input on screen"; });
await p.reload({ waitUntil: "networkidle0" });
await sleep(1000);
results.afterReloadCounts = await p.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].slice(0, 3).map((b) => b.textContent));
results.swControlled = await p.evaluate(async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller || "ready-not-controlling"; });
await p.reload({ waitUntil: "networkidle0" });
results.swControlledAfterReload = await p.evaluate(() => !!navigator.serviceWorker.controller);
await p.setOfflineMode(true);
await p.reload({ waitUntil: "domcontentloaded" });
await sleep(1200);
results.offlineRenders = await p.evaluate(() => document.body.innerText.includes("DAYCRAFT") && document.body.innerText.includes("SHOULD"));
results.offlineCountsKept = await p.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].slice(0, 3).map((b) => b.textContent));
await p.setOfflineMode(false);
await p.screenshot({ path: "/tmp/subshots-03-home-after-reload-light.png" });

// DARK (fresh context shares storage per origin within same browser -> same data)
const d = await newPage("dark");
await d.goto(URL, { waitUntil: "networkidle0" });
await sleep(1200);
await d.screenshot({ path: "/tmp/subshots-04-home-dark.png" });
await d.click('button[aria-label="Settings"]');
await sleep(500);
await clickText(d, "button", "Quiet music off");
results.audioState = await d.evaluate(() => "music toggled; label now: " + [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Quiet music"))?.textContent);
await d.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(400);
await d.screenshot({ path: "/tmp/subshots-05-settings-dark.png" });
await clickText(d, "button", "Quiet music on");
await clickText(d, "button", "Ember");
await d.evaluate(() => window.scrollTo(0, 0));
await sleep(600);
await d.screenshot({ path: "/tmp/subshots-06-ember-dark.png" });
await clickText(d, "button", "Pip");
results.pageOverflowX = await d.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
results.metaThemeColor = await d.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
results.manifest = await d.evaluate(async () => (await (await fetch("./manifest.json")).json()).display);

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
