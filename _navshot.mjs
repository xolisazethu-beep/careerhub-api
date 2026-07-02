import puppeteer from "puppeteer";
const b = await puppeteer.launch({ headless: "new" });
const page = await b.newPage();
await page.setViewport({ width: 1000, height: 700 });

// Sign in as the demo candidate so the menu shows candidate items.
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.type("input[name=email]", "demo.applicant@careerhub.co.za");
await page.type("input[name=password]", "DemoPass123!");
await Promise.all([
  page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null),
  page.click("button[type=submit]"),
]);
await new Promise((r) => setTimeout(r, 2500));
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

console.log("logged-in url:", page.url());
// Screenshot just the top bar
const header = await page.$("header");
if (header) await header.screenshot({ path: "_nav_topbar.png" });

// Open the menu and screenshot it
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (x) => x.getAttribute("aria-label") === "Open menu",
  );
  if (btn) { btn.click(); return true; }
  return false;
});
console.log("menu opened:", clicked);
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: "_nav_menu.png" });

// Dump the menu link labels for a text-level check
const labels = await page.$$eval("nav a, nav button", (els) =>
  els.map((e) => e.textContent.trim().replace(/\s+/g, " ")).filter(Boolean),
);
console.log("menu entries:", JSON.stringify(labels));
await b.close();
