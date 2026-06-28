// Captures real screenshots of the Assignment 2.3 flows by driving the actual
// Auth.js credentials login (so sessions/cookies are genuine, not seeded).
// Run with the prod server up:  node docs/assignment-2.3/shoot-2.3.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "img");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: path.join(OUT, name), ...opts });
  console.log("  ✓", name);
};

async function ctx(browser) {
  const c = await browser.createBrowserContext();
  const page = await c.newPage();
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
  return { c, page };
}

async function login(page, username) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#username", { timeout: 15000 });
  await page.type("#username", username);
  await page.type("#password", "password123");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await wait(1200);
}

async function firstJobId(page) {
  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle2" });
  await wait(800);
  return page.$$eval("a", (as) => {
    const a = as.find((x) => /^\/jobs\/[^/]+$/.test(x.getAttribute("href") || ""));
    return a ? a.getAttribute("href") : null;
  });
}

async function clickButtonByText(page, label) {
  await page.$$eval(
    "button",
    (btns, label) => {
      const b = btns.find((x) => x.textContent.trim() === label);
      if (b) b.click();
    },
    label,
  );
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  });

  // Discover a real job id (public context).
  let probe = await ctx(browser);
  const jobHref = await firstJobId(probe.page);
  console.log("job:", jobHref);
  await probe.c.close();

  // ---- SIGNED OUT ----
  console.log("signed-out:");
  let s = await ctx(browser);
  await s.page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await wait(700);
  await shot(s.page, "01-login.png");

  // login error
  await s.page.type("#username", "alice");
  await s.page.type("#password", "wrongpass");
  await Promise.all([
    s.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }).catch(() => {}),
    s.page.click('button[type="submit"]'),
  ]);
  await wait(900);
  await shot(s.page, "02-login-error.png");

  // signed-out nav + public job board
  await s.page.goto(`${BASE}/jobs`, { waitUntil: "networkidle2" });
  await wait(800);
  const h1 = await s.page.$("header");
  if (h1) await h1.screenshot({ path: path.join(OUT, "03-nav-signedout.png") });

  // signed-out job detail (form + sign-in note)
  if (jobHref) {
    await s.page.goto(`${BASE}${jobHref}`, { waitUntil: "networkidle2" });
    await wait(900);
    await shot(s.page, "04-jobdetail-signedout.png", { fullPage: true });
  }
  await s.c.close();

  // ---- EMPLOYER ----
  console.log("employer:");
  let e = await ctx(browser);
  await login(e.page, "employer1");
  await e.page.waitForSelector("table, .grid", { timeout: 20000 }).catch(() => {});
  await wait(1000);
  await shot(e.page, "05-dashboard-table.png", { fullPage: true });
  const eh = await e.page.$("header");
  if (eh) await eh.screenshot({ path: path.join(OUT, "06-nav-employer.png") });
  // grid view
  await clickButtonByText(e.page, "Grid");
  await wait(900);
  await shot(e.page, "07-dashboard-grid.png", { fullPage: true });
  // show-closed off
  await e.page.$$eval('input[type="checkbox"]', (b) => b[0] && b[0].click());
  await wait(700);
  await shot(e.page, "08-dashboard-grid-noclosed.png", { fullPage: true });
  // employer cannot apply
  if (jobHref) {
    await e.page.goto(`${BASE}${jobHref}`, { waitUntil: "networkidle2" });
    await wait(800);
    await shot(e.page, "09-jobdetail-employer.png", { fullPage: true });
  }
  await e.c.close();

  // ---- CANDIDATE ----
  console.log("candidate:");
  let c = await ctx(browser);
  await login(c.page, "alice");
  await c.page.goto(`${BASE}/jobs`, { waitUntil: "networkidle2" });
  await wait(800);
  const ch = await c.page.$("header");
  if (ch) await ch.screenshot({ path: path.join(OUT, "10-nav-candidate.png") });
  // type a keyword -> debounced URL filter
  await c.page.waitForSelector("#filter-q", { timeout: 10000 }).catch(() => {});
  await c.page.type("#filter-q", "developer");
  await wait(1200); // debounce + server nav
  await shot(c.page, "11-jobs-filtered.png", { fullPage: true });
  console.log("  filtered url:", c.page.url());
  // candidate sees the form
  if (jobHref) {
    await c.page.goto(`${BASE}${jobHref}`, { waitUntil: "networkidle2" });
    await wait(900);
    await shot(c.page, "12-jobdetail-candidate.png", { fullPage: true });
  }
  await c.c.close();

  await browser.close();
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png"));
  console.log("\nCaptured", files.length, "images:", files.join(", "));
})().catch((e) => {
  console.error("SHOOT ERROR:", e.message);
  process.exit(1);
});
