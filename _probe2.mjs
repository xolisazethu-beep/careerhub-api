import puppeteer from "puppeteer";

const base = process.argv[2] || "http://localhost:3001";
const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
const msgs = [];
page.on("console", (m) => msgs.push(`[console.${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) =>
  msgs.push(`[requestfailed] ${r.url()} :: ${r.failure()?.errorText}`),
);

async function step(label, fn) {
  try {
    const r = await fn();
    console.log(`✓ ${label}: ${r ?? ""}`);
  } catch (e) {
    console.log(`✗ ${label}: ${e.message}`);
  }
}

// 1. Home → click the actual "Sign in" link and verify navigation
await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
await step("click Sign in navigates", async () => {
  await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((x) =>
      x.textContent?.trim().includes("Sign in"),
    );
    a.click();
  });
  await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  return page.url();
});

// 2. On /login, submit demo employer credentials
await page.goto(base + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));
await step("login form present", async () =>
  (await page.$("form input[name=email]")) ? "yes" : "NO FORM",
);
await step("submit demo employer login", async () => {
  await page.type("input[name=email]", "demo.employer@takealot.co.za");
  await page.type("input[name=password]", "DemoPass123!");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null),
    page.click("button[type=submit]"),
  ]);
  await new Promise((r) => setTimeout(r, 2000));
  return "landed on -> " + page.url();
});

// 3. Jobs board renders listings?
await page.goto(base + "/jobs", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 4000));
await step("jobs board content", async () => {
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, " "));
  return txt;
});

console.log("\n---- browser messages ----");
console.log(msgs.join("\n") || "(none)");
await browser.close();
