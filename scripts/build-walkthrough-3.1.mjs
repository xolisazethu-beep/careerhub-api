// =============================================================
// scripts/build-walkthrough-3.1.mjs
// Captures REAL screenshots of the Assignment 3.1 features (toasts, the 3-step
// ApplicationWizard, AlertDialog confirmations, skeleton/empty states) from the
// running dev server, embeds them into a styled HTML walkthrough, and renders a
// shareable PDF — all with Puppeteer.
//
// Usage: dev server on BASE (default http://localhost:3000), then
//   node scripts/build-walkthrough-3.1.mjs
//   SKIP_CAPTURE=1 node scripts/build-walkthrough-3.1.mjs   # re-render PDF only
// =============================================================

import puppeteer from "puppeteer";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SHOTS = path.join(__dirname, "shots-3.1");
const BASE = process.env.WALKTHROUGH_BASE ?? "http://localhost:3000";
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

const HIDE_DEV_CSS =
  "nextjs-portal,[data-nextjs-toast],#__next-build-watcher,.tsqd-parent-container{display:none !important}";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJobId() {
  const res = await fetch(`${BASE}/api/jobs?page=1&pageSize=1`);
  const json = await res.json();
  return json.data?.[0]?.id ?? null;
}

async function login(page, username) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#username", { timeout: 90000 });
  await page.type("#username", username);
  await page.type("#password", "password123");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await sleep(1200);
}

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().includes(t)),
    selector,
    text,
  );
  const el = handle.asElement();
  if (el) {
    await el.click();
    return true;
  }
  return false;
}

// Focused ELEMENT screenshot — keeps the captured content large and crisp in
// the PDF (full-page captures shrink the real content to illegibility). Falls
// back to a viewport screenshot if the element can't be resolved.
async function shotEl(page, getHandle, file) {
  await page.addStyleTag({ content: HIDE_DEV_CSS }).catch(() => {});
  await sleep(450);
  let el = null;
  try {
    const h = await getHandle();
    el = h && h.asElement ? h.asElement() : h;
  } catch {
    /* fall back below */
  }
  if (el) {
    await el.scrollIntoView().catch(() => {});
    await sleep(150);
    await el.screenshot({ path: path.join(SHOTS, file) });
  } else {
    await page.screenshot({ path: path.join(SHOTS, file), fullPage: false });
  }
  console.log("captured", file);
}

// Resolve the wizard card (works with or without the #application-wizard id).
const wizardEl = (page) =>
  page.evaluateHandle(
    () =>
      document.querySelector("#application-wizard") ||
      [...document.querySelectorAll("section")].find((s) =>
        s.textContent.includes("Apply for this role"),
      ),
  );

async function capture() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);
  // 2.5x device scale → sharp text when the focused card is scaled to page width.
  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2.5 });

  const jobId = await getJobId();
  console.log("job id:", jobId);

  await login(page, "alice");

  // Step 1 (filled) — capture just the wizard card.
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#fullName", { timeout: 120000 });
  await page.type("#fullName", "Alice Mokoena");
  await page.type("#email", "alice@example.com");
  await page.type("#phone", "+27 82 555 0142");
  await shotEl(page, () => wizardEl(page), "01-wizard-step1.png");

  // Step 2 (cover letter + valid LinkedIn → live preview + source)
  await clickByText(page, "button", "Next");
  await page.waitForSelector("#coverLetter", { timeout: 30000 });
  await page.type("#coverLetter", "I'm excited to bring my React and TypeScript experience to this role.");
  await page.type("#linkedinUrl", "https://www.linkedin.com/in/alice-mokoena");
  await page.select("#source", "LinkedIn");
  await sleep(700);
  await shotEl(page, () => wizardEl(page), "02-wizard-step2.png");

  // Step 3 (review)
  await clickByText(page, "button", "Next");
  await page.waitForFunction(() => document.body.innerText.includes("Review your application"), { timeout: 30000 });
  await shotEl(page, () => wizardEl(page), "03-wizard-review.png");

  // Submit → success toast (capture the toast element itself — crisp + focused).
  await clickByText(page, "button", "Submit application");
  await page.waitForSelector("[data-sonner-toast]", { timeout: 30000 }).catch(() => {});
  await shotEl(page, () => page.$("[data-sonner-toast]"), "04-wizard-submit-toast.png");

  // Restored-draft banner: seed a draft and reload, then capture the card.
  await page.evaluate(
    (id) =>
      localStorage.setItem(
        `careerhub-application-${id}`,
        JSON.stringify({
          fullName: "Alice Mokoena",
          email: "alice@example.com",
          phone: "+27 82 555 0142",
          coverLetter: "Draft in progress…",
          linkedinUrl: "https://www.linkedin.com/in/alice-mokoena",
          source: "LinkedIn",
        }),
      ),
    jobId,
  );
  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("Restored automatically"), { timeout: 60000 }).catch(() => {});
  await shotEl(page, () => wizardEl(page), "05-wizard-restored.png");

  // Discard-draft AlertDialog — capture just the modal.
  await clickByText(page, "button", "Discard draft");
  await page.waitForSelector('[role="alertdialog"]', { timeout: 30000 }).catch(() => {});
  await sleep(400);
  await shotEl(page, () => page.$('[role="alertdialog"]'), "06-discard-dialog.png");
  await clickByText(page, "button", "Keep draft").catch(() => {});
  await sleep(400);

  // Empty state: filters eliminated all results — capture the empty-state box.
  await page.goto(`${BASE}/jobs?q=zzzzzzzzz`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("No jobs match your search"), { timeout: 60000 }).catch(() => {});
  await shotEl(
    page,
    () =>
      page.evaluateHandle(() => {
        const h = [...document.querySelectorAll("h2")].find((e) =>
          e.textContent.includes("No jobs match"),
        );
        return h ? h.closest("div") : null;
      }),
    "07-empty-filtered.png",
  );

  await browser.close();
}

// ---- HTML walkthrough ----
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (s) => `<pre><code>${esc(s)}</code></pre>`;
function img(file, caption) {
  const p = path.join(SHOTS, file);
  if (!existsSync(p)) return `<p class="muted">[screenshot ${esc(file)} unavailable]</p>`;
  const b64 = readFileSync(p).toString("base64");
  return `<figure><img src="data:image/png;base64,${b64}" alt="${esc(caption)}"/><figcaption>${esc(caption)}</figcaption></figure>`;
}

function buildHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CareerHub — Assignment 3.1: Rich UI &amp; Form Patterns</title>
<style>
  :root{--bg:#0b1120;--panel:#111a2e;--ink:#e7ecf5;--muted:#9fb0c9;--brand:#8b5cf6;--line:#243149;--code:#0e1626;--good:#34d399;--warn:#fbbf24;}
  *{box-sizing:border-box}
  body{margin:0;background:linear-gradient(180deg,#0b1120,#0d1426);color:var(--ink);font:16px/1.65 "Segoe UI",system-ui,sans-serif;}
  .wrap{max-width:1000px;margin:0 auto;padding:48px 24px 96px}
  header.hero{text-align:center;padding:40px 0 24px;border-bottom:1px solid var(--line);margin-bottom:32px}
  h1{font-size:34px;margin:0 0 8px}h2{font-size:25px;margin:52px 0 12px;padding-top:18px;border-top:1px solid var(--line)}
  h3{font-size:19px;margin:28px 0 8px;color:#d8b4fe}
  .tag{display:inline-block;background:rgba(139,92,246,.15);color:#d8b4fe;border:1px solid #5b3f9a;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;margin:4px}
  .muted{color:var(--muted)}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 24px;margin:16px 0}
  pre{background:var(--code);border:1px solid var(--line);border-radius:12px;padding:16px;overflow:auto;font-size:13px;line-height:1.5;font-family:"Cascadia Code",Consolas,monospace}
  code.inl{background:#1a2236;padding:2px 6px;border-radius:6px;font-size:13.5px;color:#c4b5fd;font-family:"Cascadia Code",Consolas,monospace}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
  th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}th{background:#16203a;color:#d8b4fe}
  figure{margin:22px 0;text-align:center}
  img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 26px rgba(0,0,0,.35)}
  figcaption{color:var(--muted);font-size:13px;margin-top:8px}
  .toc a{color:#c4b5fd;text-decoration:none}.toc li{margin:4px 0}
  ul li{margin:5px 0}.new{color:var(--good);font-weight:700}.mod{color:var(--warn);font-weight:700}
  @media print{body{background:#fff;color:#111}.card{box-shadow:none}img{box-shadow:none}figure,pre{break-inside:avoid}}
</style></head><body><div class="wrap">

<header class="hero">
  <h1>CareerHub — Assignment 3.1</h1>
  <div class="muted">Rich UI &amp; Form Patterns — toasts, a 3-step wizard, AlertDialog confirmations, skeletons &amp; empty states</div>
  <div style="margin-top:14px">
    <span class="tag">sonner</span><span class="tag">React Hook Form + Zod</span>
    <span class="tag">Radix AlertDialog</span><span class="tag">nuqs</span><span class="tag">Next.js 15</span>
  </div>
  <p class="muted" style="margin-top:14px">All screenshots are real captures of the running app.</p>
</header>

<div class="card toc"><b>Contents</b><ol>
  <li><a href="#sum">What I built</a></li>
  <li><a href="#files">Files added &amp; changed</a></li>
  <li><a href="#toasts">Part 2 — Toasts</a></li>
  <li><a href="#wizard">Part 3 — Application wizard</a></li>
  <li><a href="#dialogs">Part 4 — AlertDialog confirmations</a></li>
  <li><a href="#empty">Part 5 — Skeletons &amp; empty states</a></li>
  <li><a href="#stretch">Stretch goals</a></li>
</ol></div>

<h2 id="sum">1. What I built</h2>
<div class="card">
<ul>
  <li><b>Toasts (sonner)</b> for mutations — closing a job and submitting the wizard fire toasts; field errors stay inline.</li>
  <li><b>Three-step ApplicationWizard</b> on <code class="inl">/jobs/[id]</code> (alongside the existing apply panel): Details → Application → Review, one Zod schema, per-step <code class="inl">trigger()</code>, localStorage draft auto-save + restore, role gating.</li>
  <li><b>AlertDialog confirmations</b> for the two destructive actions: closing a listing and discarding a draft.</li>
  <li><b>Skeletons &amp; two distinct empty states</b> on <code class="inl">/jobs</code>.</li>
  <li><b>Stretch A/B/C</b>: cross-tab draft sync, animated step transitions, LinkedIn live preview.</li>
</ul>
</div>

<h2 id="files">2. Files added &amp; changed</h2>
<div class="card"><table>
<tr><th>File</th><th></th><th>Purpose</th></tr>
<tr><td>src/components/ApplicationWizard.tsx</td><td class="new">NEW</td><td>The 3-step wizard + draft autosave + discard dialog + stretch A/B/C.</td></tr>
<tr><td>src/components/ui/alert-dialog.tsx</td><td class="new">NEW</td><td>shadcn/Radix AlertDialog primitive.</td></tr>
<tr><td>src/components/ClearFiltersButton.tsx</td><td class="new">NEW</td><td>Resets every nuqs filter param (filtered empty state).</td></tr>
<tr><td>src/components/CloseJobButton.tsx</td><td class="mod">CHANGED</td><td>AlertDialog + useTransition Server Action + sonner toast (no inline banner).</td></tr>
<tr><td>src/app/layout.tsx</td><td class="mod">CHANGED</td><td>Added the sonner &lt;Toaster/&gt;.</td></tr>
<tr><td>src/app/jobs/[id]/page.tsx</td><td class="mod">CHANGED</td><td>Renders the wizard alongside the apply panel; passes isCandidate.</td></tr>
<tr><td>src/app/jobs/(board)/page.tsx</td><td class="mod">CHANGED</td><td>Two distinct empty states from unfiltered vs filtered counts.</td></tr>
<tr><td>src/app/jobs/(board)/loading.tsx</td><td class="mod">CHANGED</td><td>Uses the paired JobCardSkeleton (6 cards).</td></tr>
</table></div>

<h2 id="toasts">3. Part 2 — Toasts</h2>
<div class="card">
<p>The <code class="inl">&lt;Toaster/&gt;</code> sits in the root layout, bottom-right so it never overlaps the sticky top nav:</p>
${code(`<Toaster position="bottom-right" richColors closeButton />`)}
<p>Mutations fire toasts; validation stays inline. The wizard's submit:</p>
${code(`toast.success("Application submitted", {
  description: \`Your application for \${jobTitle} is on its way.\`,
});`)}
</div>
${img("04-wizard-submit-toast.png", "Submitting the wizard fires a success toast, then resets to step 1.")}

<h2 id="wizard">4. Part 3 — The application wizard</h2>
<div class="card">
<p>One Zod schema covers all three steps, with a cross-step refine on the LinkedIn URL. Navigation validates only the current step via <code class="inl">trigger()</code> with an explicit field list:</p>
${code(`const STEP_FIELDS = [
  ["fullName", "email", "phone"],        // step 1
  ["coverLetter", "linkedinUrl", "source"], // step 2
  [],                                     // step 3 (review only)
];
const valid = await trigger(STEP_FIELDS[step], { shouldFocus: true });
if (!valid) return;          // Next does not advance on invalid current step`)}
<p>Draft auto-save uses a <code class="inl">form.watch()</code> subscription (with cleanup), keyed to the job:</p>
${code(`const sub = watch((values) => {
  localStorage.setItem(\`careerhub-application-\${jobId}\`, JSON.stringify(values));
  setHasDraft(true);
});
return () => sub.unsubscribe();   // unsubscribe so it can't fire after unmount`)}
</div>
${img("01-wizard-step1.png", "Step 1 — Your details.")}
${img("02-wizard-step2.png", "Step 2 — cover letter, LinkedIn (with live preview), and how they heard.")}
${img("03-wizard-review.png", "Step 3 — Review (every field; 'Not provided' for empty optionals).")}
${img("05-wizard-restored.png", "On reload a saved draft is restored with a dismissible banner + a Discard option.")}

<h2 id="dialogs">5. Part 4 — AlertDialog confirmations</h2>
<div class="card">
<p><b>Closing a job</b> is a Server Action. AlertDialogAction renders in a portal outside any form, so <code class="inl">type="submit"</code> there does nothing. The fix: control the dialog with state and call the action programmatically in a transition:</p>
${code(`function handleConfirm() {
  const fd = new FormData();
  fd.set("jobId", jobId);
  startTransition(async () => {
    const result = await closeJobListing(null, fd);   // called, not submitted
    result?.status === "success"
      ? toast.success(\`Closed "\${result.jobTitle}"\`)
      : toast.error(result?.message ?? "Couldn't close the listing.");
    setOpen(false);
  });
}`)}
</div>
${img("06-discard-dialog.png", "The shared AlertDialog component — here guarding 'Discard draft' (Part 4b). Closing a listing (Part 4a) uses the same modal with the 'Close this listing?' copy; it can't be dismissed by an outside click.")}

<h2 id="empty">6. Part 5 — Skeletons &amp; empty states</h2>
<div class="card">
<p>The two empty states are decided server-side from the unfiltered vs filtered counts:</p>
${code(`const databaseEmpty = totalUnfiltered === 0;   // → no action
// else if filtered length 0 → "No jobs match your search" + <ClearFiltersButton/>`)}
<p>The loading skeleton uses the paired <code class="inl">JobCardSkeleton</code> (6 cards) so dimensions match the real <code class="inl">JobCard</code> and nothing shifts on swap-in.</p>
</div>
${img("07-empty-filtered.png", "Filtered-out empty state with a 'Clear all filters' button that resets every nuqs param.")}

<h2 id="stretch">7. Stretch goals</h2>
<div class="card">
<ul>
  <li><b>A — Cross-tab sync:</b> a <code class="inl">window 'storage'</code> listener updates the draft/banner when another tab edits the same key. The event fires only in <i>other</i> tabs of the origin, never the one that wrote the change.</li>
  <li><b>B — Animated transitions:</b> library-free CSS keyframes; a direction state picks slide-from-right (Next) vs slide-from-left (Back) on an overflow-hidden container.</li>
  <li><b>C — LinkedIn preview:</b> best-effort preview from the URL slug with an <code class="inl">&lt;img onError&gt;</code> fallback to initials (LinkedIn has no public image API).</li>
</ul>
</div>

<p class="muted" style="margin-top:48px;text-align:center;border-top:1px solid var(--line);padding-top:20px">
Generated for Assignment 3.1 · CareerHub · ${new Date().toISOString().slice(0, 10)}
</p>
</div></body></html>`;
}

async function renderPdf(html) {
  const htmlPath = path.join(ROOT, "ASSIGNMENT-3.1-WALKTHROUGH.html");
  writeFileSync(htmlPath, html, "utf8");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(180000);
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.pdf({
    path: path.join(ROOT, "ASSIGNMENT-3.1-WALKTHROUGH.pdf"),
    format: "A4",
    printBackground: true,
    timeout: 0, // large data-URL images on a loaded machine exceed the 30s default
    margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  await browser.close();
  console.log("wrote ASSIGNMENT-3.1-WALKTHROUGH.html and .pdf");
}

if (!process.env.SKIP_CAPTURE) await capture();
await renderPdf(buildHtml());
