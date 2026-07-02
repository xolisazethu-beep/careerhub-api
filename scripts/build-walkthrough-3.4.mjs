// Renders docs/ASSIGNMENT-3.4-WALKTHROUGH.html → .pdf (Puppeteer). Static doc,
// no running app needed. Same pipeline as the other assignment walkthroughs.
import puppeteer from "puppeteer";
import path from "node:path";
import { pathToFileURL } from "node:url";

const html = path.resolve("docs/ASSIGNMENT-3.4-WALKTHROUGH.html");
const pdf = path.resolve("docs/ASSIGNMENT-3.4-WALKTHROUGH.pdf");

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
