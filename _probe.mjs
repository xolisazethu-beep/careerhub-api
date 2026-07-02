import puppeteer from "puppeteer";

const target = process.argv[2] || "http://localhost:3001/";
const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
const msgs = [];
page.on("console", (m) => msgs.push(`[console.${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) =>
  msgs.push(`[requestfailed] ${r.url()} :: ${r.failure()?.errorText}`),
);

try {
  const resp = await page.goto(target, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  console.log("TARGET:", target);
  console.log("HTTP status:", resp?.status());
  await new Promise((r) => setTimeout(r, 3000));

  const signInHref = await page.$$eval("a", (as) => {
    const a = as.find((x) => x.textContent?.trim().includes("Sign in"));
    return a ? a.getAttribute("href") : "(no Sign in link)";
  });
  console.log("Sign in href:", signInHref);

  const menuClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Open menu",
    );
    if (!btn) return "no-menu-button";
    btn.click();
    return "clicked";
  });
  await new Promise((r) => setTimeout(r, 600));
  const menuOpen = await page.$$eval("*", (els) =>
    els.some((e) => e.getAttribute?.("aria-label") === "Close menu"),
  );
  console.log("Menu button:", menuClicked, "| slide-out opened (JS alive):", menuOpen);
} catch (e) {
  console.log("NAV ERROR for", target, "::", e.message);
}

console.log("---- browser messages ----");
console.log(msgs.join("\n") || "(none)");
await browser.close();
