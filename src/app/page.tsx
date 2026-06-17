"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { JobListing } from "@/types";
import JobList from "@/components/JobList";
import SummaryPanel from "@/components/SummaryPanel";
import FilterBar, { type SortOption } from "@/components/FilterBar";
import ApplyModal from "@/components/ApplyModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { EmploymentType } from "@/types";

/** ISO 8601 string for a date `n` days before now — keeps the demo data fresh. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** ISO 8601 string for a date `n` days after now. */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/**
 * Hardcoded data that mirrors exactly what GET /api/v1/jobs will return.
 * Realistic South African roles, cities and rand salary ranges. Includes:
 *   - a closed listing (isActive: false)
 *   - a listing with zero applicants
 *   - several employment types
 *   - one posted today and one posted more than 30 days ago
 */
const JOBS: JobListing[] = [
  {
    id: "a1b2c3d4-0001-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Senior Frontend Engineer",
    company: "Yoco",
    location: "Cape Town",
    employmentType: "FullTime",
    salaryMin: 75000,
    salaryMax: 95000,
    postedAt: daysAgo(0),
    isActive: true,
    applicantCount: 12,
    description:
      "Join the merchant dashboard team building the tools that thousands of South African small businesses use every day to track sales, payouts and customers. You'll own end-to-end features from design hand-off to production.",
    responsibilities: [
      "Build and ship React features in the merchant dashboard",
      "Collaborate with designers and backend engineers on new product flows",
      "Mentor mid-level engineers in code review and pairing sessions",
      "Improve performance, accessibility and test coverage of existing screens",
    ],
    minimumQualification: "Bachelor's degree in Computer Science, Engineering or a related field",
    minimumExperienceYears: 5,
    skills: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Jest", "REST APIs"],
    closingDate: daysFromNow(21),
  },
  {
    id: "a1b2c3d4-0002-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Backend Developer (.NET)",
    company: "Investec",
    location: "Sandton",
    employmentType: "FullTime",
    salaryMin: 68000,
    salaryMax: 88000,
    postedAt: daysAgo(2),
    isActive: true,
    applicantCount: 0,
    description:
      "Work on the core banking platform that powers Investec's Private Banking products. You'll design and build secure, high-throughput services that move money for thousands of clients every minute.",
    responsibilities: [
      "Design and implement RESTful services in ASP.NET Core",
      "Write SQL Server schemas and tune queries against production-scale data",
      "Participate in architecture reviews and on-call rotations",
      "Work closely with QA to define test plans for new endpoints",
    ],
    minimumQualification: "Bachelor's degree in Computer Science or Information Systems",
    minimumExperienceYears: 4,
    skills: ["C#", ".NET 8", "ASP.NET Core", "SQL Server", "Entity Framework", "Azure", "Git"],
    closingDate: daysFromNow(14),
  },
  {
    id: "a1b2c3d4-0003-4a1b-9c2d-0e1f2a3b4c5d",
    title: "UX Designer",
    company: "Takealot",
    location: "Remote",
    employmentType: "Contract",
    salaryMin: 45000,
    salaryMax: 60000,
    postedAt: daysAgo(5),
    isActive: true,
    applicantCount: 7,
    description:
      "Six-month contract embedded with the checkout team to redesign the cart and payment experience across web and mobile. Heavy emphasis on conversion research and accessible interaction patterns.",
    responsibilities: [
      "Run user research sessions and synthesise findings into design briefs",
      "Produce wireframes, high-fidelity mockups and interactive prototypes",
      "Maintain and extend the existing Figma component library",
      "Partner with engineers to ship designs without losing fidelity",
    ],
    minimumQualification: "Diploma or degree in Design, HCI or a related field",
    minimumExperienceYears: 3,
    skills: ["Figma", "Prototyping", "User research", "Accessibility (WCAG)", "Design systems"],
    closingDate: daysFromNow(10),
  },
  {
    id: "a1b2c3d4-0004-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Software Engineering Intern",
    company: "Standard Bank",
    location: "Johannesburg",
    employmentType: "Internship",
    salaryMin: 18000,
    salaryMax: 22000,
    postedAt: daysAgo(9),
    isActive: true,
    applicantCount: 34,
    description:
      "Twelve-month structured internship rotating across three engineering teams. You'll get formal mentorship, real production code, and a clear path to a graduate offer at the end.",
    responsibilities: [
      "Pair with senior engineers on production tickets",
      "Complete the in-house engineering fundamentals curriculum",
      "Present a capstone project to the broader engineering org",
      "Contribute to internal tooling and developer experience improvements",
    ],
    minimumQualification: "Currently studying toward a BSc/BEng in Computer Science or related (final year or recent graduate)",
    minimumExperienceYears: 0,
    skills: ["Java or Python", "Git", "Basic SQL", "Willingness to learn"],
    closingDate: daysFromNow(7),
  },
  {
    id: "a1b2c3d4-0005-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Part-time Data Analyst",
    company: "Discovery",
    location: "Sandton",
    employmentType: "PartTime",
    salaryMin: 30000,
    salaryMax: 40000,
    postedAt: daysAgo(18),
    isActive: true,
    applicantCount: 4,
    description:
      "Three days a week supporting the Vitality data team. You'll turn raw member activity into the dashboards the product team uses to decide which rewards work and which need rethinking.",
    responsibilities: [
      "Write SQL queries against the analytics warehouse",
      "Build and maintain dashboards in Power BI",
      "Define and track KPIs with product managers",
      "Document data definitions for self-service consumers",
    ],
    minimumQualification: "Bachelor's degree in Statistics, Mathematics, Data Science or a related field",
    minimumExperienceYears: 2,
    skills: ["SQL", "Power BI", "Python (pandas)", "Excel", "Data storytelling"],
    closingDate: daysFromNow(28),
  },
  {
    id: "a1b2c3d4-0006-4a1b-9c2d-0e1f2a3b4c5d",
    title: "DevOps Engineer",
    company: "Luno",
    location: "Cape Town",
    employmentType: "FullTime",
    salaryMin: 80000,
    salaryMax: 110000,
    postedAt: daysAgo(42),
    isActive: false,
    applicantCount: 58,
    description:
      "Own the deployment, observability and reliability of the trading platform. This role partners with every engineering team to keep services fast, safe and 24/7 available across multiple regions.",
    responsibilities: [
      "Operate Kubernetes clusters across multiple AWS regions",
      "Build CI/CD pipelines that ship code safely many times a day",
      "Improve incident response and on-call tooling",
      "Drive cost and performance optimisation across the platform",
    ],
    minimumQualification: "Bachelor's degree in Computer Science or Engineering, or equivalent experience",
    minimumExperienceYears: 5,
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "Prometheus", "Grafana", "Linux"],
    closingDate: daysAgo(7), // already past — pairs with isActive: false
  },
  {
    id: "a1b2c3d4-0007-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Mobile Developer (Flutter)",
    company: "SnapScan",
    location: "Remote",
    employmentType: "Contract",
    salaryMin: 55000,
    salaryMax: 72000,
    postedAt: daysAgo(11),
    isActive: true,
    applicantCount: 9,
    description:
      "Twelve-month contract building merchant-facing features in the SnapScan app. Work closely with product to ship to thousands of small businesses across South Africa.",
    responsibilities: [
      "Build and maintain Flutter screens for iOS and Android",
      "Integrate with internal REST and GraphQL APIs",
      "Write widget and integration tests",
      "Participate in code review and release management",
    ],
    minimumQualification: "Bachelor's degree in Computer Science or equivalent practical experience",
    minimumExperienceYears: 3,
    skills: ["Flutter", "Dart", "REST", "GraphQL", "Firebase", "iOS / Android basics"],
    closingDate: daysFromNow(17),
  },
];

export default function Home() {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Filter / sort UI state.
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmploymentType | "All">("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [activeOnly, setActiveOnly] = useState(false);

  const visibleJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = JOBS.filter((job) => {
      if (typeFilter !== "All" && job.employmentType !== typeFilter) return false;
      if (activeOnly && !job.isActive) return false;
      if (
        term &&
        !job.title.toLowerCase().includes(term) &&
        !job.company.toLowerCase().includes(term) &&
        !job.location.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "newest") {
      sorted.sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt));
    } else if (sort === "salaryHigh") {
      sorted.sort((a, b) => b.salaryMax - a.salaryMax);
    } else {
      sorted.sort((a, b) => a.salaryMin - b.salaryMin);
    }
    return sorted;
  }, [query, typeFilter, sort, activeOnly]);

  const selectedJob = useMemo(
    () => JOBS.find((job) => job.id === selectedId) ?? null,
    [selectedId],
  );

  const applyingJob = useMemo(
    () => JOBS.find((job) => job.id === applyingId) ?? null,
    [applyingId],
  );

  // Clicking the already-selected card deselects it.
  const handleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  };

  const handleToggleSave = (id: string) => {
    if (!user) {
      notify("Sign in to save jobs.", "info");
      router.push("/login");
      return;
    }
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        notify("Removed from saved jobs.", "info");
      } else {
        next.add(id);
        notify("Saved to your list.", "success");
      }
      return next;
    });
  };

  const handleApply = (id: string) => {
    if (!user) {
      notify("Sign in to apply for roles.", "info");
      router.push("/login");
      return;
    }
    setApplyingId(id);
  };

  const confirmApply = (id: string) => {
    setApplyingId(null);
    const job = JOBS.find((j) => j.id === id);
    notify(`Application sent to ${job?.company ?? "the employer"}.`, "success");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Find your next role in South Africa
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse {JOBS.length} curated openings from leading local employers.
          {user ? " Save the ones you like and apply in a click." : " Sign in to save roles and apply."}
        </p>
      </section>

      <div className="mb-6">
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          sort={sort}
          onSortChange={setSort}
          activeOnly={activeOnly}
          onActiveOnlyChange={setActiveOnly}
        />
      </div>

      {/* Summary panel renders ONLY when a job is selected — otherwise it is
          absent from the DOM entirely (not hidden, not an empty node). */}
      {selectedJob ? (
        <div className="mb-6">
          <SummaryPanel
            job={selectedJob}
            onClear={() => setSelectedId(null)}
            onApply={handleApply}
          />
        </div>
      ) : null}

      <JobList
        jobs={visibleJobs}
        selectedId={selectedId}
        onSelect={handleSelect}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
        onApply={handleApply}
      />

      <ApplyModal
        job={applyingJob}
        onClose={() => setApplyingId(null)}
        onConfirm={confirmApply}
      />
    </div>
  );
}