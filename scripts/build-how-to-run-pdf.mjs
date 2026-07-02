// Renders docs/HOW-TO-RUN.html → docs/HOW-TO-RUN.pdf (Puppeteer, same pipeline
// as the assignment walkthroughs). No running app needed — it's a static doc.
import puppeteer from "puppeteer";
import path from "node:path";
import { pathToFileURL } from "node:url";

const html = path.resolve("docs/HOW-TO-RUN.html");
const pdf = path.resolve("docs/HOW-TO-RUN.pdf");

const exe =
  "C:/Users/Xolisa/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: exe,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  timeout: 90000,
  protocolTimeout: 120000,
});
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: "load", timeout: 60000 });
await page.pdf({
  path: pdf,
  format: "A4",
  printBackground: true,
  margin: { top: "0", bottom: "0", left: "0", right: "0" },
});
await browser.close();
console.log("PDF written:", pdf);
