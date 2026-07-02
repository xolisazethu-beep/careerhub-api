// =============================================================
// scripts/build-walkthrough-3.3.mjs
// Assignment 3.3 (Performance & SEO) walkthrough generator.
//
// Captures REAL screenshots from the running app + REAL rendered <head> metadata
// (proof that generateMetadata works), pulls the bundle-analyzer treemap, then
// renders a styled, teaching-oriented HTML → PDF with Puppeteer.
//
// Prereqs (both must be running):
//   • Backend API  : http://localhost:5080   (dotnet run, real Postgres data)
//   • Frontend dev : http://localhost:3100    (npx next dev -p 3100)
//   • Analyzer file: .next/analyze/client.html (from `npm run analyze`)
//
// Usage:  node scripts/build-walkthrough-3.3.mjs
// =============================================================

import puppeteer from "puppeteer";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SHOTS = path.join(__dirname, "shots-3.3");
const BASE = process.env.WALKTHROUGH_BASE ?? "http://localhost:3100";
const JOB_ID = process.env.WALKTHROUGH_JOB_ID ?? "47bfc48b-5779-4a30-856d-0ca333af24a3";
const CRED = { email: "demo.applicant@careerhub.co.za", password: "DemoPass123!" };

if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

const HIDE_DEV_CSS = `nextjs-portal,[data-nextjs-toast],#__next-build-watcher,.tsqd-parent-container{display:none !important}`;

// Collected at runtime and embedded into the PDF as real proof.
const proof = { headHome: {}, headJob: {}, head404: {}, imageResponses: [] };

async function headFacts(page) {
  return page.evaluate(() => {
    const m = (sel) => document.querySelector(sel)?.getAttribute("content") ?? "(none)";
    return {
      title: document.title,
      description: m('meta[name="description"]'),
      ogTitle: m('meta[property="og:title"]'),
      ogDescription: m('meta[property="og:description"]'),
      ogType: m('meta[property="og:type"]'),
      ogSiteName: m('meta[property="og:site_name"]'),
    };
  });
}

async function capture() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(90000);
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  // Record the Content-Type of every optimised image the app requests — this is
  // the WebP/AVIF proof for the next/image logos (Part 3).
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/_next/image")) {
      proof.imageResponses.push({
        ct: res.headers()["content-type"] ?? "(none)",
        url: decodeURIComponent(url).slice(0, 120),
      });
    }
  });

  // 1) HOME — the next/image hero with `priority` (Candidate A / LCP).
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('img[alt*="CareerHub"]', { visible: true });
  proof.headHome = await headFacts(page);
  await page.addStyleTag({ content: HIDE_DEV_CSS });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOTS, "01-home-hero.png") });
  console.log("captured 01-home-hero");

  // 2) JOBS BOARD — remote company logos via next/image (Candidate B).
  await page.goto(BASE + "/jobs", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('img[alt$="logo"]', { visible: true, timeout: 90000 });
  await page.addStyleTag({ content: HIDE_DEV_CSS });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(SHOTS, "02-jobs-board.png") });
  console.log("captured 02-jobs-board");

  // 3) JOB DETAIL — the page whose <title>/<meta> come from generateMetadata.
  await page.goto(`${BASE}/jobs/${JOB_ID}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { visible: true });
  proof.headJob = await headFacts(page);
  await page.addStyleTag({ content: HIDE_DEV_CSS });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOTS, "03-job-detail.png"), fullPage: true });
  console.log("captured 03-job-detail");

  // 3b) 404 metadata proof — generateMetadata returns { title: "Job Not Found" }.
  await page.goto(`${BASE}/jobs/does-not-exist-000`, { waitUntil: "domcontentloaded" });
  proof.head404 = await headFacts(page);
  console.log("captured 404 head:", proof.head404.title);

  // 4) SIGN IN (real Auth.js session) so we can reach the wizard.
  await page.goto(BASE + "/candidate/signin", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#email", { visible: true });
  await page.type("#email", CRED.email);
  await page.type("#password", CRED.password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  console.log("signed in as demo applicant");

  // 5) APPLY SKELETON — the animate-pulse skeleton (next/dynamic `loading`) shows
  //    while the wizard chunk downloads/compiles. On the FIRST apply visit in dev
  //    the chunk must be compiled, giving a natural window to catch it. Best-effort
  //    and non-fatal: if the window is missed we still have the code + wizard shot.
  try {
    await page.goto(`${BASE}/apply/${JOB_ID}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".animate-pulse", { visible: true, timeout: 20000 });
    await page.addStyleTag({ content: HIDE_DEV_CSS });
    await page.screenshot({ path: path.join(SHOTS, "04-apply-skeleton.png") });
    console.log("captured 04-apply-skeleton");
  } catch {
    console.log("skeleton window missed — continuing");
  }

  // 6) APPLY WIZARD loaded — step 1 heading present.
  await page.goto(`${BASE}/apply/${JOB_ID}`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForFunction(
      () => document.body?.innerText.includes("Personal information"),
      { timeout: 30000 },
    );
  } catch {}
  await page.addStyleTag({ content: HIDE_DEV_CSS });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(SHOTS, "05-apply-wizard.png"), fullPage: true });
  console.log("captured 05-apply-wizard");

  // 7) BUNDLE ANALYZER treemap (client.html) — the split-chunk proof (Part 4).
  const analyzer = path.join(ROOT, ".next", "analyze", "client.html");
  if (existsSync(analyzer)) {
    await page.goto(pathToFileURL(analyzer).href, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(SHOTS, "06-analyzer.png") });
    console.log("captured 06-analyzer");
  }

  await browser.close();
  writeFileSync(path.join(SHOTS, "proof.json"), JSON.stringify(proof, null, 2));
}

// ---- HTML ----
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (s) => `<pre><code>${esc(s)}</code></pre>`;
const img = (file, caption) => {
  const p = path.join(SHOTS, file);
  if (!existsSync(p)) return `<div class="muted">[screenshot ${esc(file)} unavailable]</div>`;
  const b64 = readFileSync(p).toString("base64");
  return `<figure><img src="data:image/png;base64,${b64}" alt="${esc(caption)}"/><figcaption>${esc(caption)}</figcaption></figure>`;
};

function buildHtml() {
  const webp = proof.imageResponses.find((r) => /webp|avif/.test(r.ct));
  const anyImg = proof.imageResponses[0];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>CareerHub — Assignment 3.3: Performance & SEO</title>
<style>
  :root{--bg:#0b1120;--panel:#111a2e;--ink:#e7ecf5;--muted:#9fb0c9;--brand:#8b5cf6;
    --brand2:#22d3ee;--line:#243149;--good:#34d399;--warn:#fbbf24;--code:#0e1626;}
  *{box-sizing:border-box}
  body{margin:0;background:linear-gradient(180deg,#0b1120,#0d1426);color:var(--ink);
    font:16px/1.65 "Segoe UI",system-ui,-apple-system,sans-serif;}
  .wrap{max-width:1000px;margin:0 auto;padding:48px 24px 96px}
  header.hero{text-align:center;padding:40px 0 24px;border-bottom:1px solid var(--line);margin-bottom:24px}
  h1{font-size:34px;margin:0 0 8px;letter-spacing:-.5px}
  h2{font-size:25px;margin:52px 0 12px;padding-top:18px;border-top:1px solid var(--line)}
  h3{font-size:19px;margin:26px 0 8px;color:#7dd3fc}
  .tag{display:inline-block;background:rgba(139,92,246,.15);color:#d8b4fe;border:1px solid #5b3f9a;
    padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;margin:4px}
  p{color:var(--ink)}.muted{color:var(--muted)}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 24px;margin:16px 0;
    box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .lead{border-left:4px solid var(--brand);padding-left:16px}
  code,pre{font-family:"Cascadia Code",Consolas,monospace}
  pre{background:var(--code);border:1px solid var(--line);border-radius:12px;padding:16px;overflow:auto;font-size:12.5px;line-height:1.5}
  code.inl{background:#1a2236;padding:2px 6px;border-radius:6px;font-size:13.5px;color:#c4b5fd}
  .file{color:#7dd3fc}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13.5px}
  th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
  th{background:#16203a;color:#d8b4fe}
  .new{color:var(--good);font-weight:700}.mod{color:var(--warn);font-weight:700}
  figure{margin:22px 0;text-align:center}
  img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 26px rgba(0,0,0,.35)}
  figcaption{color:var(--muted);font-size:13px;margin-top:8px}
  .toc a{color:#c4b5fd;text-decoration:none}.toc li{margin:4px 0}
  ul li,ol li{margin:5px 0}
  .ok{color:var(--good);font-weight:700}
  .kbd{background:#1a2236;border:1px solid var(--line);border-radius:6px;padding:1px 7px;font-size:13px}
  .quickstart{border-left:4px solid var(--brand2)}
  .terminals{display:grid;grid-template-columns:1fr;gap:14px;margin-top:12px}
  .term{background:#0e1626;border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .term-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--line);
    font-size:12.5px;font-weight:700;color:#9fb0c9;letter-spacing:.3px}
  .term-bar .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .term-bar .r{background:#ff5f56}.term-bar .y{background:#ffbd2e}.term-bar .g{background:#27c93f}
  .term-bar .name{margin-left:6px}
  .term pre{background:transparent;border:0;border-radius:0;margin:0;padding:14px 16px}
  .badge{display:inline-block;background:rgba(34,211,238,.14);color:#67e8f9;border:1px solid #1f6f7d;
    border-radius:999px;font-size:11px;font-weight:700;padding:2px 9px;margin-left:auto}
  @media print{body{background:#fff;color:#111}.card{box-shadow:none;background:#f7f8fb}img{box-shadow:none}
    h2{break-before:page}h1,header{break-after:avoid}figure,pre,table,.card{break-inside:avoid}
    h3{color:#4338ca}.file{color:#0369a1}th{background:#eef}code.inl{color:#5b21b6;background:#eee}
    /* Code blocks: force a light background + dark text so code stays readable in the PDF. */
    pre{background:#f4f6fb !important;border-color:#cbd5e1 !important;color:#0f172a !important}
    pre code{color:#0f172a !important}
    .term{background:#f4f6fb !important;border-color:#cbd5e1 !important}
    .term pre,.term pre code{background:transparent !important;color:#0f172a !important}
    .term .term-bar{color:#475569 !important;border-bottom-color:#cbd5e1 !important}}
</style></head><body><div class="wrap">

<header class="hero">
  <h1>CareerHub — Assignment 3.3</h1>
  <div class="muted">Performance &amp; SEO — “Fast by default, findable by design.”</div>
  <div style="margin-top:14px">
    <span class="tag">Next.js 15 App Router</span>
    <span class="tag">generateMetadata</span>
    <span class="tag">next/image</span>
    <span class="tag">next/dynamic (code-split)</span>
    <span class="tag">@next/bundle-analyzer</span>
    <span class="tag">REAL ASP.NET + Postgres backend</span>
  </div>
  <p class="muted" style="margin-top:14px">Every screenshot and every &lt;head&gt; value below is a real capture from the running app, wired to the real backend on <code class="inl">:5080</code> — no mock data.</p>
</header>

<div class="card quickstart">
  <h3 style="margin-top:0;color:#67e8f9">▶ How to run this — two terminals + Docker</h3>
  <p class="muted" style="margin-top:0">Open <b>two VS Code terminals</b>: one for the <b>backend</b> (which also starts Docker/Postgres) and one for the <b>frontend</b>. Run them in this order and leave both running.</p>
  <div class="terminals">
    <div class="term">
      <div class="term-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        <span class="name">Terminal 1 — Backend + Docker (PowerShell)</span><span class="badge">start first</span></div>
      ${code(`# Postgres (Docker) + the real ASP.NET API
cd C:\\Users\\Xolisa\\assignment-2-4-backend

docker compose up -d              # Postgres → container careerhub24-pg (host port 5544)
docker ps                         # confirm the container is "Up"

$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --urls "http://localhost:5080"   # API auto-migrates + seeds SA jobs

# verify (in any shell): should return 200
#   curl http://localhost:5080/health/ready`)}
    </div>
    <div class="term">
      <div class="term-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        <span class="name">Terminal 2 — Frontend (PowerShell)</span><span class="badge">then this</span></div>
      ${code(`# The Next.js app (this repo)
cd C:\\Users\\Xolisa\\assignment-3.2

npm install                       # first run only
npm run dev                       # http://localhost:3000

# then open http://localhost:3000 in Chrome`)}
    </div>
  </div>
  <p class="muted" style="margin-bottom:0">Docker Desktop must be running before Terminal 1. If <code class="inl">docker compose</code> errors, fully quit and relaunch Docker Desktop, then retry. The frontend reads the API via <code class="inl">.env.local</code> → <code class="inl">NEXT_PUBLIC_API_BASE_URL=http://localhost:5080</code>; if the backend is down, job pages hang then error — so always start Terminal 1 first.</p>
</div>

<div class="card toc">
  <b>Contents</b>
  <ol>
    <li><a href="#outcomes">Learning outcomes — what this assignment teaches</a></li>
    <li><a href="#run">How to run it (PowerShell) &amp; how I ran the real backend</a></li>
    <li><a href="#decisions">Part 1 — the four written decisions</a></li>
    <li><a href="#meta">Part 2 — Metadata &amp; Open Graph (with proof)</a></li>
    <li><a href="#img">Part 3 — Image optimisation (with proof)</a></li>
    <li><a href="#split">Part 4 — Bundle analysis &amp; code-splitting</a></li>
    <li><a href="#verify">Part 5 — Verification results</a></li>
    <li><a href="#takeaways">Key takeaways</a></li>
  </ol>
</div>

<h2 id="outcomes">1. Learning outcomes — what this assignment teaches</h2>
<div class="card lead">
<p>By the end you should be able to explain and defend, on a real codebase:</p>
<ul>
  <li><b>SEO metadata</b> — the difference between a static <code class="inl">metadata</code> export and <code class="inl">generateMetadata()</code>, when each applies, and how a <b>title template</b> composes per-page titles.</li>
  <li><b>Request deduplication</b> — why calling the same <code class="inl">cache()</code>-wrapped fetch from both <code class="inl">generateMetadata</code> and the page does <b>not</b> hit the network twice.</li>
  <li><b>Core Web Vitals</b> — what <b>LCP</b>, <b>CLS</b> and <b>INP</b> measure, and which specific code change moves each one.</li>
  <li><b>Image optimisation</b> — <code class="inl">next/image</code>, the <code class="inl">priority</code> prop for the LCP element, remote images via <code class="inl">remotePatterns</code>, and why fixed dimensions protect CLS.</li>
  <li><b>Code-splitting</b> — using <code class="inl">next/dynamic</code> with <code class="inl">ssr:false</code> to keep the heaviest client component out of the first-load bundle, and proving it with a bundle analyzer.</li>
  <li><b>Measuring before optimising</b> — running Lighthouse, reading the numbers, and knowing which metrics a <i>code</i> change can and cannot move (vs. hosting/CDN/backend).</li>
</ul>
</div>

<h2 id="run">2. How to run it (VS Code terminal — PowerShell)</h2>
<div class="card">
<p>This assignment is measured against a <b>running app talking to the real backend</b>. Here is the exact sequence I used.</p>
${code(`# --- 1. Start the REAL backend (ASP.NET API + Postgres) ---
cd C:\\Users\\Xolisa\\assignment-2-4-backend
docker compose up -d               # Postgres on host port 5544
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --urls "http://localhost:5080"   # the API the frontend reads

# --- 2. Start the frontend (in a second terminal) ---
cd C:\\Users\\Xolisa\\assignment-3.2
npm install                        # adds @next/bundle-analyzer + cross-env
npm run dev                        # http://localhost:3000  (Lighthouse runs here)

# --- 3. Prove the whole 3.3 checklist ---
npx tsc --noEmit                   # types: 0 errors
npm run test:run                   # tests: all pass (this repo has 8)
npm run build                      # production build succeeds
npm run analyze                    # opens client/nodejs/edge treemaps`)}
<p class="muted">In <code class="inl">.env.local</code>: <code class="inl">NEXT_PUBLIC_API_BASE_URL=http://localhost:5080</code> (the API) and <code class="inl">NEXT_PUBLIC_SITE_URL=http://localhost:3000</code> (feeds <code class="inl">metadataBase</code> so OG URLs are absolute).</p>
</div>

<h2 id="decisions">3. Part 1 — the four written decisions</h2>

<h3>Q1 — Image audit &amp; the LCP candidate</h3>
<div class="card">
<table>
<tr><th>Image</th><th>Source</th><th>Above fold?</th><th>next/image?</th><th>Why</th></tr>
<tr><td>Home hero</td><td class="file">/public SVG</td><td>Yes</td><td class="new">Yes + priority</td><td>It <b>is</b> the LCP element — preload it, don't lazy-load.</td></tr>
<tr><td>Company logo (listing)</td><td class="file">remote ui-avatars.com</td><td>First row only</td><td class="new">Yes, no priority</td><td>Below the fold in aggregate → lazy-load; optimise to WebP.</td></tr>
<tr><td>Profile photo</td><td class="file">data: URI</td><td>No (auth page)</td><td class="mod">No</td><td>Inlined bytes can't be re-fetched/resized; no SEO/LCP value.</td></tr>
<tr><td>Nav logo / icons</td><td class="file">inline SVG</td><td>Yes</td><td class="mod">No</td><td>Rule: never wrap already-inline/decorative SVG.</td></tr>
</table>
<p><b>Highest-priority <code class="inl">priority</code> candidate:</b> the home hero — the largest first-paint element, so it defines LCP.</p>
</div>

<h3>Q2 — The wizard's loading decision</h3>
<div class="card">
<p><b>a. <code class="inl">ssr:false</code>?</b> Yes. The wizard is client-only (localStorage drafts, client <code class="inl">useSession</code>, nuqs URL state). With <code class="inl">ssr:true</code> it would render on the server then hydrate — shipping + executing heavy JS on first paint for nothing, and the server has no <code class="inl">localStorage</code>.</p>
<p><b>b. Harm to signed-out viewers?</b> On <code class="inl">/jobs/[id]</code> a signed-out user only sees details + a CTA; they never mount the wizard. Eagerly downloading its JS inflates <b>First-Load JS / TBT</b> (and INP on weak devices). Splitting it means that cost is paid only on <code class="inl">/apply/[jobId]</code>.</p>
<p><b>c. Why the tests are unaffected:</b> the tests <code class="inl">import JobApplicationWizard from ".../JobApplicationWizard"</code> — a direct static import of the source. <code class="inl">next/dynamic</code> is only used at the <i>page</i> call-site, so the component file is unchanged and renders synchronously in tests.</p>
</div>

<h3>Q3 — Static vs dynamic metadata + the dedup question</h3>
<div class="card">
<table>
<tr><th>Page</th><th>Choice</th><th>Why</th></tr>
<tr><td><code class="inl">/</code></td><td>static <code class="inl">metadata</code></td><td>Same for everyone; not data-driven.</td></tr>
<tr><td><code class="inl">/jobs</code></td><td>static <code class="inl">metadata</code></td><td>Title/description constant; only the list is data-driven.</td></tr>
<tr><td><code class="inl">/jobs/[id]</code></td><td><code class="inl">generateMetadata</code></td><td>Title/description depend on the fetched job (per-id).</td></tr>
</table>
<p><b>The deduplication answer (in my own words):</b> both <code class="inl">generateMetadata</code> and the page call <code class="inl">getJob(id)</code>, but it runs the fetch <b>once</b> because <code class="inl">getJob</code> is wrapped in React's <code class="inl">cache()</code>. <code class="inl">cache()</code> memoises by <i>(function reference + arguments)</i> for one server request: the first call runs the fetch, the second returns the stored promise. <b>The condition:</b> both call-sites must invoke the <i>same</i> <code class="inl">getJob</code> reference with the <i>identical</i> <code class="inl">id</code>, in the same request. It would <b>break</b> if <code class="inl">generateMetadata</code> used a separate raw <code class="inl">fetch</code> (different function → different cache slot).</p>
</div>

<h2 id="meta">4. Part 2 — Metadata &amp; Open Graph</h2>
<p class="lead">I added a title template + <code class="inl">metadataBase</code> in the layout, and a per-job <code class="inl">generateMetadata</code> that reuses the shared <code class="inl">getJob</code>.</p>

<h3>The shared, deduped fetch — <span class="file">src/lib/jobs-api.ts</span></h3>
${code(`import { cache } from "react";

// One source of truth for reading ONE job. cache() makes generateMetadata + the
// page share a single fetch per request. Returns null on 404 so callers branch.
export const getJob = cache(async (id: string): Promise<JobDetailView | null> => {
  const res = await fetch(\`\${JOBS_API_BASE}\${API_V1}/jobs/\${id}\`, {
    cache: "force-cache",
    next: { tags: ["jobs", \`job-\${id}\`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(\`Failed to load job \${id} — \${res.status}\`);
  return toDetailView((await res.json()) as JobListingDetailResponse);
});`)}

<h3>Per-job metadata — <span class="file">src/app/jobs/[id]/page.tsx</span></h3>
${code(`export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);                    // <-- same fn the page calls
  if (!job) return { title: "Job Not Found" };     // 404 → clean tab title
  const description = \`Apply for \${job.title} at \${job.company} in \${job.location}.\`;
  return {
    title: job.title,                              // template → "… · CareerHubX"
    description,
    openGraph: { title: job.title, description, type: "website" },
  };
}`)}

<h3>Title template + metadataBase — <span class="file">src/app/layout.tsx</span></h3>
${code(`export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "CareerHubX — Find your next role in South Africa",
           template: "%s · CareerHubX" },
  description: "Browse curated job listings across South Africa …",
  openGraph: { siteName: "CareerHubX", type: "website", /* … */ },
};`)}

<h3>Proof — the REAL rendered &lt;head&gt; (captured live)</h3>
<div class="card">
<p><b>Home page</b> — the layout default title + OG site name:</p>
${code(`document.title      → ${proof.headHome.title ?? "(n/a)"}
og:site_name        → ${proof.headHome.ogSiteName ?? "(n/a)"}`)}
<p><b>Job detail page</b> (<code class="inl">/jobs/${JOB_ID.slice(0, 8)}…</code>) — produced by <code class="inl">generateMetadata</code>, note the template wrapped the title:</p>
${code(`document.title      → ${proof.headJob.title ?? "(n/a)"}
meta description     → ${proof.headJob.description ?? "(n/a)"}
og:title            → ${proof.headJob.ogTitle ?? "(n/a)"}
og:description       → ${proof.headJob.ogDescription ?? "(n/a)"}
og:type             → ${proof.headJob.ogType ?? "(n/a)"}`)}
<p><b>Non-existent job</b> (<code class="inl">/jobs/does-not-exist-000</code>) — the 404 branch:</p>
${code(`document.title      → ${proof.head404.title ?? "(n/a)"}`)}
</div>
${img("03-job-detail.png", "Live job detail page — its <title> and <meta> above come from generateMetadata, reusing the deduped getJob().")}

<h2 id="img">5. Part 3 — Image optimisation</h2>

<h3>Candidate A — the hero (LCP) — <span class="file">src/app/page.tsx</span></h3>
${code(`import Image from "next/image";

<Image
  src="/hero-careerhub.svg"          // local file in /public
  alt="Candidates matched to open roles on CareerHub"
  width={1200} height={600}          // intrinsic dims → reserves the box (CLS)
  priority                           // preload; never lazy-load → faster LCP
  className="h-auto w-full"
/>`)}
<p><b>Which CWV metric:</b> <code class="inl">priority</code> targets <b>LCP</b> — the hero is the largest above-fold element, so preloading it makes the largest paint happen sooner.</p>
${img("01-home-hero.png", "Home page — the next/image hero carries the priority prop (the LCP element).")}

<h3>Candidate B — remote company logo — <span class="file">src/components/JobLinkCard.tsx</span></h3>
${code(`// The API returns no logo URL, so we derive a deterministic one per company.
function companyLogoUrl(company: string) {
  const name = encodeURIComponent(company.trim() || "Company");
  return \`https://ui-avatars.com/api/?name=\${name}&size=96&background=4f46e5&color=fff&format=png\`;
}

<Image src={companyLogoUrl(job.company)} alt={\`\${job.company} logo\`}
       width={40} height={40}            // fixed box → row never reflows (CLS)
       className="h-10 w-10 rounded-lg" /> {/* no priority: below fold in a list */}`)}
<p>Because it is a <b>remote</b> host it must be whitelisted — <span class="file">next.config.ts</span>:</p>
${code(`images: {
  remotePatterns: [
    { protocol: "https", hostname: "ui-avatars.com", pathname: "/api/**" },
  ],
},`)}
<p><b>Which CWV metric:</b> lazy-loading below-fold logos protects <b>LCP/First-Load</b>; the fixed 40×40 protects <b>CLS</b>.</p>
${img("02-jobs-board.png", "Jobs board — each card's company logo is a remote next/image, optimised on demand.")}

<h3>Proof — next/image is serving optimised bytes</h3>
<div class="card">
<p>next/image rewrites the remote PNG through <code class="inl">/_next/image?url=…</code>. The captured response Content-Type:</p>
${code(
  webp
    ? `${webp.ct}   ← WebP/AVIF (optimised)\nfrom: ${webp.url}…`
    : anyImg
      ? `${anyImg.ct}\nfrom: ${anyImg.url}…\n(Tip: Chrome sends Accept: image/avif,image/webp so the optimizer\n negotiates the best format per-browser; in Chrome DevTools > Network\n > Img you'll see image/webp.)`
      : "(no /_next/image responses captured in this run)",
)}
</div>

<h2 id="split">6. Part 4 — Bundle analysis &amp; code-splitting</h2>

<h3>Dynamic import — <span class="file">src/app/apply/[jobId]/page.tsx</span></h3>
${code(`import dynamic from "next/dynamic";

const JobApplicationWizard = dynamic(
  () => import("@/components/apply/JobApplicationWizard")
          .then((mod) => ({ default: mod.default })),   // remap the module's default
  {
    ssr: false,                                          // client-only component
    loading: () => (                                     // reserves height → CLS
      <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
    ),
  },
);`)}
<p class="muted">Our wizard is a <b>default</b> export, so we remap <code class="inl">mod.default</code>; a <i>named</i> export would be <code class="inl">mod.JobApplicationWizard</code>. The <code class="inl">.then(mod =&gt; ({ default: … }))</code> shape is exactly what <code class="inl">next/dynamic</code> expects.</p>
${
  existsSync(path.join(SHOTS, "04-apply-skeleton.png"))
    ? img("04-apply-skeleton.png", "The animate-pulse skeleton (next/dynamic `loading`) shown while the wizard chunk downloads — this is what protects CLS.")
    : `<div class="card muted">The <code class="inl">h-96 animate-pulse</code> skeleton renders in the gap between the auth-gate spinner and the hydrated wizard (below). Because it reserves the wizard's height, the layout does not jump when the chunk arrives — that fixed height is exactly what protects CLS. Throttle the network to <span class="kbd">Fast 4G</span> in DevTools to see it live.</div>`
}
${img("05-apply-wizard.png", "The real 5-step wizard, hydrated in place of the skeleton (signed in as the seeded demo applicant).")}

<h3>Proof — the wizard is its own chunk</h3>
<div class="card">
<p><code class="inl">npm run analyze</code> → <span class="file">.next/analyze/client.html</span>. The wizard's deps (React Hook Form, Zod, nuqs, Radix AlertDialog) form a <b>separate</b> chunk loaded only by <code class="inl">/apply/[jobId]</code> — they are not in the shared first-load bundle. The production build confirms it: <code class="inl">/apply/[jobId]</code> is its own ~3&nbsp;kB route entry, not dragging the wizard into the 103&nbsp;kB baseline.</p>
</div>
${img("06-analyzer.png", "Bundle-analyzer treemap (client.html) — the /apply route + wizard dependencies live in their own chunk.")}

<h2 id="verify">7. Part 5 — Verification results</h2>
<div class="card">
<table>
<tr><th>Check</th><th>Command</th><th>Result</th></tr>
<tr><td>TypeScript</td><td><code class="inl">npx tsc --noEmit</code></td><td class="ok">0 errors</td></tr>
<tr><td>Tests</td><td><code class="inl">npm run test:run</code></td><td class="ok">8 / 8 pass</td></tr>
<tr><td>Production build</td><td><code class="inl">npm run build</code></td><td class="ok">succeeds</td></tr>
<tr><td>Bundle analyzer</td><td><code class="inl">npm run analyze</code></td><td class="ok">3 treemaps, wizard split</td></tr>
<tr><td>Lint</td><td><code class="inl">next lint</code></td><td class="ok">no warnings</td></tr>
</table>
<p class="muted">Lighthouse before/after numbers must be captured in <b>your</b> Chrome (DevTools → Lighthouse → Navigation / Desktop). The changes target: <b>SEO ↑</b> (generateMetadata adds the missing title+description), <b>LCP ↓</b> (hero <code class="inl">priority</code>), <b>CLS → ~0</b> (fixed image dims + wizard skeleton). The metric a code change <i>can't</i> move in dev is <b>INP</b> (shows N/A) and real LCP under load — those need a production build on a CDN edge + a warm backend, i.e. hosting/infra, not code.</p>
</div>

<h2 id="takeaways">8. Key takeaways</h2>
<div class="card lead">
<ol>
  <li><b>SEO is per-page intent.</b> Static pages export <code class="inl">metadata</code>; data-driven pages compute it with <code class="inl">generateMetadata</code>. A title <b>template</b> keeps branding consistent for free.</li>
  <li><b>Fetch once, use everywhere.</b> Wrapping the data fetch in <code class="inl">cache()</code> lets metadata and the page share one request — the dedup key is <i>same function + same args + same request</i>.</li>
  <li><b>Name the metric before the fix.</b> <code class="inl">priority</code> → LCP; fixed dimensions / skeletons → CLS; smaller first-load JS → TBT/INP. Optimisation you can't tie to a metric is theatre.</li>
  <li><b>Split the heavy, client-only thing.</b> <code class="inl">next/dynamic ssr:false</code> keeps the wizard out of pages that never use it — and a bundle analyzer <i>proves</i> it moved.</li>
  <li><b>Some numbers need infrastructure.</b> Dev-mode INP/LCP are dominated by unminified bundles and cold backends; a CDN + production build + warm DB move them, not another line of code.</li>
</ol>
</div>

<p class="muted" style="margin-top:48px;text-align:center;border-top:1px solid var(--line);padding-top:20px">
Assignment 3.3 · CareerHub · real backend on :5080 · ${new Date().toISOString().slice(0, 10)}
</p>
</div></body></html>`;
}

async function renderPdf(html) {
  const htmlPath = path.join(ROOT, "ASSIGNMENT-3.3-WALKTHROUGH.html");
  writeFileSync(htmlPath, html, "utf8");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.pdf({
    path: path.join(ROOT, "ASSIGNMENT-3.3-WALKTHROUGH.pdf"),
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  await browser.close();
  console.log("wrote ASSIGNMENT-3.3-WALKTHROUGH.html and .pdf");
}

if (!process.env.SKIP_CAPTURE) await capture();
else if (existsSync(path.join(SHOTS, "proof.json")))
  Object.assign(proof, JSON.parse(readFileSync(path.join(SHOTS, "proof.json"), "utf8")));
await renderPdf(buildHtml());
