import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, "shots-3.3");
const BASE = "http://localhost:3100";
const JOB = "47bfc48b-5779-4a30-856d-0ca333af24a3";
const HIDE = `nextjs-portal,[data-nextjs-toast],#__next-build-watcher,.tsqd-parent-container{display:none !important}`;
const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
p.setDefaultTimeout(90000); p.setDefaultNavigationTimeout(90000);
await p.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

// --- 404 metadata (valid route, job absent → getJob null → "Job Not Found") ---
await p.goto(`${BASE}/jobs/does-not-exist`, { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 1500));
const title404 = await p.evaluate(() => document.title);
console.log("404 title:", title404);
const proof = JSON.parse(readFileSync(path.join(SHOTS, "proof.json"), "utf8"));
proof.head404 = { title: title404 };
writeFileSync(path.join(SHOTS, "proof.json"), JSON.stringify(proof, null, 2));

// --- skeleton (sign in, first apply visit compiles → skeleton lingers) ---
await p.goto(BASE + "/candidate/signin", { waitUntil: "domcontentloaded" });
await p.waitForSelector("#email", { visible: true });
await p.type("#email", "demo.applicant@careerhub.co.za");
await p.type("#password", "DemoPass123!");
await Promise.all([p.click('button[type="submit"]'), p.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(()=>{})]);
await new Promise(r => setTimeout(r, 1500));
console.log("signed in");
const cdp = await p.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });
await p.goto(`${BASE}/apply/${JOB}`, { waitUntil: "domcontentloaded" });
try {
  await p.waitForSelector(".animate-pulse", { visible: true, timeout: 60000 });
  await p.addStyleTag({ content: HIDE });
  await p.screenshot({ path: path.join(SHOTS, "04-apply-skeleton.png") });
  console.log("captured 04-apply-skeleton");
} catch (e) { console.log("skeleton missed:", e.message); }
await b.close();
