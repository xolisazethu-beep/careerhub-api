const puppeteer = require("puppeteer-core");
const path = require("path");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const USER = { id: "demo-1", name: "Thandi Mokoena", email: "thandi@example.com" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument((u) => {
    localStorage.setItem("careerhub:theme", "light");
    localStorage.setItem("careerhub.session", JSON.stringify(u));
  }, USER);
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  // Wait until the auth effect has restored the session (navbar shows "Sign out").
  await page.waitForFunction(() => document.querySelector("header") &&
    document.querySelector("header").innerText.includes("Track applications"), { timeout: 20000 });
  await sleep(400);
  await (await page.$("header")).screenshot({ path: path.join(__dirname, "shots", "navbar-in.png") });
  await browser.close();
  console.log("navbar-in re-captured");
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
