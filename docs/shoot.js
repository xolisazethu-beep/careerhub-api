// Drives the already-installed Chrome to capture real screenshots of CareerHub.
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "shots");
const fs = require("fs");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SESSION = JSON.stringify({ id: "demo-1", name: "Thandi Mokoena", email: "thandi@example.com" });

async function newPage(browser, { dark = false, loggedIn = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
  // Seed localStorage BEFORE any app code runs.
  await page.evaluateOnNewDocument(
    (theme, session, sessionKey) => {
      try {
        localStorage.setItem("careerhub:theme", theme);
        if (session) localStorage.setItem(sessionKey, session);
      } catch (e) {}
    },
    dark ? "dark" : "light",
    loggedIn ? SESSION : null,
    "careerhub.session",
  );
  return page;
}

async function waitForCards(page) {
  await page.waitForSelector('article[role="button"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 700)); // let fonts/layout settle
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  });

  // 1. HOME — light, full page
  let page = await newPage(browser);
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await waitForCards(page);
  await page.screenshot({ path: path.join(OUT, "home-light.png"), fullPage: true });

  // 2. NAVBAR — just the top bar
  const header = await page.$("header");
  await header.screenshot({ path: path.join(OUT, "navbar.png") });

  // 3. FILTER BAR
  const fbHandle = await page.evaluateHandle(() => {
    const input = document.querySelector('input[type="search"]');
    return input ? input.closest("div.rounded-2xl") : null;
  });
  if (fbHandle && (await fbHandle.asElement())) {
    await fbHandle.asElement().screenshot({ path: path.join(OUT, "filterbar.png") });
  }

  // 4. SINGLE JOB CARD
  const card = await page.$('article[role="button"]');
  await card.screenshot({ path: path.join(OUT, "jobcard.png") });

  // 5. HOME — a card selected (summary panel appears)
  await card.click();
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, "home-selected.png"), fullPage: true });
  await page.close();

  // 6. HOME — dark mode, full page
  page = await newPage(browser, { dark: true });
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await waitForCards(page);
  await page.screenshot({ path: path.join(OUT, "home-dark.png"), fullPage: true });
  await page.close();

  // 7. TOAST — logged in, click the bookmark -> "Saved to your list."
  page = await newPage(browser, { loggedIn: true });
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await waitForCards(page);
  const saveBtn = await page.$('button[aria-label="Save this job"]');
  if (saveBtn) {
    await saveBtn.click();
    await page.waitForSelector('[role="status"]', { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 350));
  }
  await page.screenshot({ path: path.join(OUT, "toast.png") });
  await page.close();

  // 8. LOGIN page
  page = await newPage(browser);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(OUT, "login.png"), fullPage: true });
  await page.close();

  await browser.close();
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png"));
  console.log("Captured:", files.join(", "));
})().catch((e) => {
  console.error("SHOOT ERROR:", e.message);
  process.exit(1);
});
