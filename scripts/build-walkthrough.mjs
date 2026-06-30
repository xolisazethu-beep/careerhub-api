// =============================================================
// scripts/build-walkthrough.mjs
// Captures REAL screenshots of the Assignment 3.2 applicant-profile feature
// from the running dev server, embeds them into a styled HTML walkthrough, and
// renders that HTML to a shareable PDF — all with Puppeteer.
//
// Usage:  node scripts/build-walkthrough.mjs
// Expects the dev server running at BASE (default http://localhost:3100).
// =============================================================

import puppeteer from "puppeteer";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SHOTS = path.join(__dirname, "shots");
const BASE = process.env.WALKTHROUGH_BASE ?? "http://localhost:3100";
const JOB_ID = "a1b2c3d4-0001-4a1b-9c2d-0e1f2a3b4c5d"; // seed: Senior Frontend Engineer @ Yoco

if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

// ---- seed data injected into localStorage so the screenshots show real UI ----
const USER = { id: "demo-1", name: "Xolisa Matsila", email: "xolisa@example.com" };

const AVATAR =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs><rect width="160" height="160" rx="80" fill="url(#g)"/><text x="80" y="104" font-family="Segoe UI,Arial" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">XM</text></svg>`,
  ).toString("base64");

const PDF_STUB =
  "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCg=="; // placeholder

const doc = (name) => ({
  fileName: name,
  dataUrl: PDF_STUB,
  size: 184320,
  uploadedAt: new Date().toISOString(),
});

const PROFILE = {
  email: USER.email,
  photoDataUrl: AVATAR,
  personal: {
    fullName: "Xolisa Matsila",
    email: USER.email,
    phone: "+27 82 555 0142",
    idNumber: "9904155012083",
    dateOfBirth: "1999-04-15",
    nationality: "South African",
    gender: "Female",
  },
  address: {
    line1: "42 Long Street",
    line2: "Unit 7",
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    country: "South Africa",
  },
  qualifications: {
    matric: doc("matric-certificate.pdf"),
    idCopy: doc("id-document.pdf"),
    license: doc("drivers-licence.pdf"),
    tertiary: doc("bsc-computer-science.pdf"),
  },
  completedSteps: [0, 1, 2, 3],
  lastStep: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DRAFT = {
  jobId: JOB_ID,
  jobTitle: "Senior Frontend Engineer",
  company: "Yoco",
  email: USER.email,
  values: {
    fullName: "Xolisa Matsila",
    email: USER.email,
    phone: "+27 82 555 0142",
    nationality: "South African",
    idNumber: "9904155012083",
    hasSkill: true,
    cvFileName: "",
    acceptedTerms: false,
  },
  updatedAt: new Date().toISOString(),
};

const sessionState = { "careerhub.session": JSON.stringify(USER) };
const profileState = {
  ...sessionState,
  careerhub_profiles: JSON.stringify({ [USER.email]: PROFILE }),
};
const draftState = {
  ...profileState,
  careerhub_application_drafts: JSON.stringify({
    [`${USER.email}::${JOB_ID}`]: DRAFT,
  }),
};

// Hide dev-only overlays (Next indicator, React Query devtools button).
const HIDE_DEV_CSS = `nextjs-portal,[data-nextjs-toast],#__next-build-watcher,.tsqd-parent-container{display:none !important}`;

async function setState(page, state) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, state);
}

async function shoot(page, file, { url, state, before, waitFor, waitForText, waitForValue }) {
  if (state) await setState(page, state);
  await page.goto(BASE + url, { waitUntil: "networkidle2" });
  // Wait for the real, hydrated content (not the loading spinner) before we
  // touch or capture the page — dev-mode bundles load after networkidle.
  if (waitFor) await page.waitForSelector(waitFor, { visible: true, timeout: 90000 });
  if (waitForText)
    await page.waitForFunction(
      (t) => document.body && document.body.innerText.includes(t),
      { timeout: 90000 },
      waitForText,
    );
  // For the apply form: the auto-fill / draft-restore runs only after the client
  // auth context hydrates (a few seconds in dev). Wait until the field is filled.
  if (waitForValue)
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.value && el.value.length > 0;
      },
      { timeout: 90000 },
      waitForValue,
    );
  await page.addStyleTag({ content: HIDE_DEV_CSS });
  if (before) await before(page);
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
  console.log("captured", file);
}

// Click the n-th step circle in the wizard stepper, then settle.
async function gotoStep(page, n) {
  const btns = await page.$$("main ol li > button");
  if (btns[n]) {
    await btns[n].click();
    await new Promise((r) => setTimeout(r, 450));
  }
}

async function capture() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(90000);
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  const STEPPER = "main ol li > button";

  // 1) Signed-out: the profile feature's own sign-in gate.
  await shoot(page, "01-signin.png", {
    url: "/profile",
    state: { x: "" },
    waitForText: "Sign in to build your profile",
  });

  // 2-5) Profile wizard, each step (full profile seeded so every step renders).
  await shoot(page, "02-profile-personal.png", {
    url: "/profile",
    state: profileState,
    waitFor: STEPPER,
    before: (p) => gotoStep(p, 0),
  });
  await shoot(page, "03-profile-address.png", {
    url: "/profile",
    state: profileState,
    waitFor: STEPPER,
    before: (p) => gotoStep(p, 1),
  });
  await shoot(page, "04-profile-qualifications.png", {
    url: "/profile",
    state: profileState,
    waitFor: STEPPER,
    before: (p) => gotoStep(p, 2),
  });
  await shoot(page, "05-profile-review.png", {
    url: "/profile",
    state: profileState,
    waitFor: STEPPER,
    before: (p) => gotoStep(p, 3),
  });

  // 6) Apply page auto-filled from the profile (no draft).
  await shoot(page, "06-apply-autofill.png", {
    url: `/apply/${JOB_ID}`,
    state: profileState,
    waitFor: "#fullName",
    waitForValue: "#fullName",
  });

  // 7) Resume banner on the profile page (unfinished application present).
  await shoot(page, "07-resume-banner.png", {
    url: "/profile",
    state: draftState,
    waitFor: STEPPER,
    before: (p) => gotoStep(p, 3),
  });

  // 8) Apply page with restored draft.
  await shoot(page, "08-apply-restored.png", {
    url: `/apply/${JOB_ID}`,
    state: draftState,
    waitFor: "#fullName",
    waitForValue: "#fullName",
  });

  await browser.close();
}

// ---- HTML walkthrough ----
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const img = (file, caption) => {
  const b64 = readFileSync(path.join(SHOTS, file)).toString("base64");
  return `<figure><img src="data:image/png;base64,${b64}" alt="${esc(caption)}"/><figcaption>${esc(caption)}</figcaption></figure>`;
};

const code = (s) => `<pre><code>${esc(s)}</code></pre>`;

function buildHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CareerHub — Assignment 3.2: Applicant Profile, Auto-fill & Resume</title>
<style>
  :root{--bg:#0b1120;--panel:#111a2e;--ink:#e7ecf5;--muted:#9fb0c9;--brand:#8b5cf6;
    --brand2:#d946ef;--line:#243149;--good:#34d399;--warn:#fbbf24;--code:#0e1626;}
  *{box-sizing:border-box}
  body{margin:0;background:linear-gradient(180deg,#0b1120,#0d1426);color:var(--ink);
    font:16px/1.65 "Segoe UI",system-ui,-apple-system,sans-serif;}
  .wrap{max-width:1000px;margin:0 auto;padding:48px 24px 96px}
  header.hero{text-align:center;padding:40px 0 24px;border-bottom:1px solid var(--line);margin-bottom:32px}
  h1{font-size:34px;margin:0 0 8px;letter-spacing:-.5px}
  h2{font-size:25px;margin:52px 0 12px;padding-top:18px;border-top:1px solid var(--line)}
  h3{font-size:19px;margin:28px 0 8px;color:#d8b4fe}
  .tag{display:inline-block;background:rgba(139,92,246,.15);color:#d8b4fe;border:1px solid #5b3f9a;
    padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;margin:4px}
  p{color:var(--ink)}.muted{color:var(--muted)}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 24px;margin:16px 0;
    box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:760px){.grid2{grid-template-columns:1fr}}
  code,pre{font-family:"Cascadia Code",Consolas,monospace}
  pre{background:var(--code);border:1px solid var(--line);border-radius:12px;padding:16px;overflow:auto;font-size:13px;line-height:1.5}
  code.inl{background:#1a2236;padding:2px 6px;border-radius:6px;font-size:13.5px;color:#c4b5fd}
  .file{color:#7dd3fc}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
  th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
  th{background:#16203a;color:#d8b4fe}
  .new{color:var(--good);font-weight:700}.mod{color:var(--warn);font-weight:700}
  .step{display:flex;gap:14px;align-items:flex-start;margin:14px 0}
  .num{flex:0 0 34px;height:34px;width:34px;border-radius:50%;background:var(--brand);color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:700}
  figure{margin:22px 0;text-align:center}
  img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 26px rgba(0,0,0,.35)}
  figcaption{color:var(--muted);font-size:13px;margin-top:8px}
  .toc a{color:#c4b5fd;text-decoration:none}.toc a:hover{text-decoration:underline}.toc li{margin:4px 0}
  ul li{margin:5px 0}
  @media print{body{background:#fff;color:#111}.card{box-shadow:none}img{box-shadow:none}
    h2{break-before:auto}figure{break-inside:avoid}pre{break-inside:avoid}}
</style></head><body><div class="wrap">

<header class="hero">
  <h1>CareerHub — Assignment 3.2</h1>
  <div class="muted">Applicant Profile · Document uploads · Auto-fill on apply · Resume where you stopped</div>
  <div style="margin-top:14px">
    <span class="tag">Next.js 15 App Router</span>
    <span class="tag">React 19</span>
    <span class="tag">TypeScript strict</span>
    <span class="tag">Tailwind v4</span>
    <span class="tag">localStorage data layer</span>
  </div>
  <p class="muted" style="margin-top:14px">All screenshots below are real captures of the running app.</p>
</header>

<div class="card toc">
  <b>What's in here</b>
  <ol>
    <li><a href="#summary">1. What I built (summary)</a></li>
    <li><a href="#flow">2. How the pieces fit together</a></li>
    <li><a href="#files">3. Files I added &amp; changed</a></li>
    <li><a href="#data">4. The data layer — profile &amp; drafts</a></li>
    <li><a href="#wizard">5. The profile wizard (the UI)</a></li>
    <li><a href="#uploads">6. Photo &amp; PDF uploads</a></li>
    <li><a href="#autofill">7. Auto-fill when applying</a></li>
    <li><a href="#resume">8. Resume where you stopped</a></li>
    <li><a href="#use">9. How to use it</a></li>
  </ol>
</div>

<h2 id="summary">1. What I built</h2>
<div class="card">
<p>A signed-in job-seeker now has a <b>profile</b> they fill in <b>once</b>, through a guided multi-step form:</p>
<ul>
  <li><b>Personal details</b> — name, email, phone, ID number, date of birth, nationality, gender, and a <b>profile photo</b>.</li>
  <li><b>Address</b> — street, city, province (South African list), postal code, country.</li>
  <li><b>Qualifications</b> — four document slots uploaded as <b>PDF</b>: <i>Matric certificate, ID copy, Driver's licence, Tertiary qualification</i>.</li>
  <li><b>Review</b> — a read-back of everything with quick "Edit" jumps.</li>
</ul>
<p>Everything is saved as the user goes, so the three headline requirements are met:</p>
<ul>
  <li><span class="new">Stored on the profile</span> — all the information lives in one profile record (per account).</li>
  <li><span class="new">Auto-fill on apply</span> — the application form is pre-filled from the profile, and saved documents attach in one click, so you never start from the beginning.</li>
  <li><span class="new">Resume where you stopped</span> — if you start an application (or the profile) and leave without finishing, your answers are saved and you're shown exactly where you stopped when you come back.</li>
</ul>
</div>

<h2 id="flow">2. How the pieces fit together</h2>
<div class="card">
<p>One client-side data layer (<code class="inl">src/lib/profile-store.ts</code>, backed by <code class="inl">localStorage</code> — the same approach as the existing app) is the single source of truth. The profile wizard writes to it; the apply form reads from it for auto-fill and writes a <i>draft</i> back to it on every change.</p>
${code(`  Profile wizard ───writes──►  profile-store (localStorage)
                                  │  profiles[email]
                                  │  drafts[email::jobId]
                                  ▼
  Apply form  ◄──auto-fill── reads profile
  Apply form  ───autosave──► writes draft   ──► Resume banner reads latest draft`)}
</div>

<h2 id="files">3. Files I added &amp; changed</h2>
<div class="card">
<table>
<tr><th>File</th><th></th><th>Purpose</th></tr>
<tr><td class="file">src/lib/profile-store.ts</td><td class="new">NEW</td><td>Profile + draft data layer (localStorage): types, get/save, completion %, file→data-URL, draft get/save/clear.</td></tr>
<tr><td class="file">src/app/profile/page.tsx</td><td class="new">NEW</td><td>The 4-step profile wizard with stepper, per-step save and resume-to-last-step.</td></tr>
<tr><td class="file">src/components/profile/DocUpload.tsx</td><td class="new">NEW</td><td>Reusable PDF upload slot (validate, preview, view/replace/remove).</td></tr>
<tr><td class="file">src/components/profile/ResumeBanner.tsx</td><td class="new">NEW</td><td>"Unfinished application" banner driven by the latest saved draft.</td></tr>
<tr><td class="file">src/app/apply/[jobId]/page.tsx</td><td class="mod">CHANGED</td><td>Auto-fill from profile, attach saved documents, autosave + restore a draft, clear on submit.</td></tr>
<tr><td class="file">src/components/Navbar.tsx</td><td class="mod">CHANGED</td><td>Added a "My profile" link for candidates (desktop + mobile menu).</td></tr>
</table>
</div>

<h2 id="data">4. The data layer — profile &amp; drafts</h2>
<div class="card">
<p>The profile is one record per user, keyed by email. Files (photo + PDFs) are stored inline as base64 data URLs so they survive a reload with no backend. The shape:</p>
${code(`export interface ApplicantProfile {
  email: string;            // owner key (lower-cased)
  photoDataUrl: string;     // profile picture (base64, "" when none)
  personal: PersonalDetails;
  address: Address;
  qualifications: Qualifications;  // matric / idCopy / license / tertiary
  completedSteps: number[];  // which wizard steps are done
  lastStep: number;          // where the user was last — used to resume
  createdAt: string; updatedAt: string;
}`)}
<p>Completion is derived (not stored), driving the progress bar and the "complete" gate:</p>
${code(`export function profileCompletion(profile) {
  const personalDone = !!(p.fullName && p.email && p.phone && p.idNumber);
  const addressDone  = !!(a.line1 && a.city && a.province && a.postalCode);
  const qualificationsDone = REQUIRED_QUALIFICATIONS.every(k => quals[k] !== null);
  const percent = Math.round((done3 / 3) * 100);
  return { percent, personalDone, addressDone, qualificationsDone, complete };
}`)}
<p>Uploads go through one helper that enforces type + size and returns a stored doc:</p>
${code(`export function fileToDataUrl(file, { accept, maxBytes }) {
  // reject if wrong type ("pdf" | "image") or over maxBytes,
  // else FileReader.readAsDataURL → { fileName, dataUrl, size, uploadedAt }
}`)}
</div>

<h2 id="wizard">5. The profile wizard (the UI)</h2>
<p>A four-step stepper. Each "Save &amp; continue" persists the step and remembers it as <code class="inl">lastStep</code>, so a returning user lands back on the right step automatically.</p>
${img("02-profile-personal.png", "Step 1 — Personal details, with profile-photo upload.")}
${img("03-profile-address.png", "Step 2 — Address (province is a South-African dropdown).")}
${img("04-profile-qualifications.png", "Step 3 — Qualification documents: Matric, ID copy, Driver's licence, Tertiary (PDF).")}
${img("05-profile-review.png", "Step 4 — Review everything, with quick Edit jumps back to any step.")}
<div class="card">
<p>The step is saved like this — the current step is marked complete and the next becomes <code class="inl">lastStep</code>:</p>
${code(`function persist(current, nextStep) {
  setProfile((p) => {
    const completedSteps = [...new Set([...p.completedSteps, current])].sort();
    return saveProfile({ ...p, completedSteps, lastStep: nextStep });
  });
}
// On load we resume to where they stopped:
setStep(Math.min(savedProfile.lastStep, STEPS.length - 1));`)}
</div>

<h2 id="uploads">6. Photo &amp; PDF uploads</h2>
<div class="card">
<p>The four qualification slots reuse one controlled <code class="inl">DocUpload</code> component. It validates (PDF, ≤ 4 MB), shows the uploaded state, and offers View / Replace / Remove. The profile photo uses the same <code class="inl">fileToDataUrl</code> helper with <code class="inl">accept: "image"</code>.</p>
${code(`<DocUpload
  label={QUALIFICATION_LABELS[key]}              // e.g. "Matric certificate"
  hint={REQUIRED_QUALIFICATIONS.includes(key) ? "(required)" : "(optional)"}
  value={qualifications[key]}
  onChange={(doc) => setQualification(key, doc)} // null clears it
/>`)}
</div>

<h2 id="autofill">7. Auto-fill when applying</h2>
<p>When a job-seeker with a profile opens an application, the form is pre-filled from their profile and their saved documents can be attached with a single checkbox — so they never re-type anything.</p>
${img("06-apply-autofill.png", "Applying — name, email, phone, ID and nationality pre-filled; saved documents attachable in one click.")}
<div class="card">
${code(`// One-time load on the apply page:
const prof = getProfile(user.email);
if (prof) {
  setFullName(prof.personal.fullName || user.name);
  setEmail(prof.personal.email || user.email);
  setPhone(prof.personal.phone);
  setNationality(prof.personal.nationality);
  setIdNumber(prof.personal.idNumber);
  setPrefilled(true);   // shows the "pre-filled from your profile" banner
}`)}
</div>

<h2 id="resume">8. Resume where you stopped</h2>
<p>Every change on the apply form is written to a per-job <b>draft</b>. If the user leaves without submitting, the next time they sign in the profile page greets them with an "unfinished application" banner, and reopening the form restores their answers. The draft is cleared on a successful submit.</p>
${img("07-resume-banner.png", "On return: the profile page shows exactly where you stopped, with a one-click Resume.")}
${img("08-apply-restored.png", "Reopening the application restores every answer you'd entered.")}
<div class="card">
<p>The autosave only writes once something actually changes (a fresh, untouched pre-fill never creates a draft):</p>
${code(`useEffect(() => {
  if (!user || !job || submitted || alreadyApplied) return;
  const snapshot = JSON.stringify({ fullName, email, phone, ... });
  if (snapshot === baselineRef.current) return;   // nothing changed yet
  saveDraft({ jobId: job.id, jobTitle: job.title, company: job.company,
              email: user.email, values: { ...current fields } });
}, [user, job, submitted, alreadyApplied, fullName, email, ...]);

// On submit:
saveApplication(application);
clearDraft(user.email, job.id);   // draft gone → banner clears`)}
</div>

<h2 id="use">9. How to use it</h2>
<div class="card">
<div class="step"><span class="num">1</span><div>Sign in as a candidate, then open <b>My profile</b> from the top bar.</div></div>
<div class="step"><span class="num">2</span><div>Work through Personal → Address → Qualifications, uploading your photo and the four PDFs. Each step saves as you go.</div></div>
<div class="step"><span class="num">3</span><div>Open any job and click <b>Apply</b> — the form is already filled from your profile; tick "Attach my saved documents".</div></div>
<div class="step"><span class="num">4</span><div>If you close the tab mid-application, just sign back in: the profile page shows your unfinished application and reopening it restores everything.</div></div>
</div>

<p class="muted" style="margin-top:48px;text-align:center;border-top:1px solid var(--line);padding-top:20px">
Generated for Assignment 3.2 · CareerHub · ${new Date().toISOString().slice(0, 10)}
</p>

</div></body></html>`;
}

async function renderPdf(html) {
  const htmlPath = path.join(ROOT, "ASSIGNMENT-3.2-WALKTHROUGH.html");
  writeFileSync(htmlPath, html, "utf8");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.pdf({
    path: path.join(ROOT, "ASSIGNMENT-3.2-WALKTHROUGH.pdf"),
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  await browser.close();
  console.log("wrote ASSIGNMENT-3.2-WALKTHROUGH.html and .pdf");
}

if (!process.env.SKIP_CAPTURE) await capture();
await renderPdf(buildHtml());
