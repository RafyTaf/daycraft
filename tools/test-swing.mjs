import puppeteer from "puppeteer-core";
const URL = process.env.DC_URL || "http://localhost:4174/daycraft/";
const SHOT = process.env.DC_SHOT || "shots/12-could-swing-morning.png";
const LABEL = "Practice swing at home (saved in YT)";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await p.goto(URL, { waitUntil: "networkidle0" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// old-format save with an existing day must survive
const k = await p.evaluate(() => { const t = new Date(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); });
await p.evaluate((k) => localStorage.setItem("daycraft-v1", JSON.stringify({ theme: "default", creature: "bean", music: false, days: { [k]: { should: [{ id: "a", text: "Pray", custom: false }], could: [{ id: "b", text: "Practice golf", custom: false, block: "afternoon" }], shouldnt: [] }, "2026-11-03": { should: [{ id: "c", text: "Brush your teeth", custom: false }], could: [], shouldnt: [] } } })), k);
await p.reload({ waitUntil: "networkidle0" });
await sleep(800);
const click = async (t, exact) => { const ok = await p.evaluate((t, exact) => { const el = [...document.querySelectorAll("button")].find((x) => exact ? x.textContent.trim().startsWith(t) : x.textContent.includes(t)); if (el) { el.scrollIntoView({ block: "center" }); el.click(); } return !!el; }, t, exact); if (!ok) throw new Error("missing " + t); await sleep(400); };
await click("COULD");
const perBlock = {};
for (const blk of ["Morning", "Market hours", "Afternoon", "Home stretch"]) {
  await click(blk, true);
  perBlock[blk] = await p.evaluate((L) => [...document.querySelectorAll("button")].some((x) => x.textContent.includes(L)), LABEL);
  if (blk !== "Home stretch") await click(blk, true);
}
await click("Home stretch", true);
await click("Morning", true);
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Morning")); el.scrollIntoView({ block: "start" }); window.scrollBy(0, -90); });
await sleep(400);
await p.screenshot({ path: SHOT });
await click(LABEL);
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("daycraft-v1")));
const counts = await p.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].slice(0, 3).map((x) => x.textContent));
console.log(JSON.stringify({ perBlock, counts, loggedSwing: saved.days[k].could.map((i) => i.text + "@" + i.block), oldDayKept: !!saved.days["2026-11-03"], oldShouldKept: saved.days[k].should.length, errors }));
await b.close();
