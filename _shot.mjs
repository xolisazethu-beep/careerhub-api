import puppeteer from "puppeteer";
const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 720 });
for (const [name, url] of [["home", "http://localhost:3000/"], ["login", "http://localhost:3000/login"]]) {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `_shot_${name}.png` });
  console.log("shot", name, "->", page.url());
}
await browser.close();
