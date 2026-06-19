// Captures screenshots of the NEW features added in this round.
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "shots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const USER = { id: "demo-1", name: "Thandi Mokoena", email: "thandi@example.com" };
const JOB_ID = "a1b2c3d4-0001-4a1b-9c2d-0e1f2a3b4c5d"; // Senior Frontend Engineer @ Yoco (seed)

const APP = {
  id: "app-seed-1",
  jobId: JOB_ID,
  jobTitle: "Senior Frontend Engineer",
  company: "Yoco",
  fullName: USER.name,
  email: USER.email,
  phone: "0821234567",
  nationality: "South African",
  idNumber: "9001011234088",
  hasRequiredSkill: true,
  cvFileName: "thandi-cv.pdf",
  acceptedTerms: true,
  status: "Under review",
  appliedAt: new Date().toISOString(),
};

async function newPage(browser, { loggedIn = false, withApp = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(
    (user, app, sessionKey, appsKey) => {
      try {
        localStorage.setItem("careerhub:theme", "light");
        if (user) localStorage.setItem(sessionKey, JSON.stringify(user));
        if (app) localStorage.setItem(appsKey, JSON.stringify([app]));
      } catch (e) {}
    },
    loggedIn ? USER : null,
    withApp ? APP : null,
    "careerhub.session",
    "careerhub_applications",
  );
  return page;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  });

  // 1. Navbar — LOGGED OUT (no "Track applications")
  let page = await newPage(browser, { loggedIn: false });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await sleep(500);
  await (await page.$("header")).screenshot({ path: path.join(OUT, "navbar-out.png") });
  await page.close();

  // 2. Navbar — LOGGED IN ("Track applications" visible)
  page = await newPage(browser, { loggedIn: true });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await sleep(500);
  await (await page.$("header")).screenshot({ path: path.join(OUT, "navbar-in.png") });
  await page.close();

  // 3. ALREADY APPLIED screen
  page = await newPage(browser, { loggedIn: true, withApp: true });
  await page.goto(`${BASE}/apply/${JOB_ID}`, { waitUntil: "domcontentloaded" });
  await sleep(1200);
  await page.waitForFunction(() => document.body.innerText.includes("already applied"), { timeout: 20000 });
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, "already-applied.png"), fullPage: true });
  await page.close();

  // 4. APPLICATIONS page with Withdraw button
  page = await newPage(browser, { loggedIn: true, withApp: true });
  await page.goto(`${BASE}/applications`, { waitUntil: "domcontentloaded" });
  await sleep(1200);
  await page.waitForFunction(() => document.body.innerText.includes("Withdraw application"), { timeout: 20000 });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "applications-withdraw.png"), fullPage: true });

  // 5. CONFIRM DIALOG (click Withdraw)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Withdraw application"));
    if (btn) btn.click();
  });
  await page.waitForSelector('[role="dialog"]', { timeout: 4000 });
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, "confirm-dialog.png") });

  // 6. AFTER WITHDRAW (toast + empty state)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Yes, withdraw"));
    if (btn) btn.click();
  });
  await page.waitForSelector('[role="status"]', { timeout: 4000 });
  await sleep(350);
  await page.screenshot({ path: path.join(OUT, "withdraw-done.png") });
  await page.close();

  await browser.close();
  console.log("Captured:", fs.readdirSync(OUT).filter((f) => f.startsWith("navbar-") || ["already-applied.png","applications-withdraw.png","confirm-dialog.png","withdraw-done.png"].includes(f)).join(", "));
})().catch((e) => {
  console.error("SHOOT2 ERROR:", e.message);
  process.exit(1);
});
