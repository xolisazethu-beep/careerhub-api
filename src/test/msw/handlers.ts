import { http, HttpResponse } from "msw";

// Happy-path network handlers for the CareerHub tests.
// URLs are built from the SAME env var the API client reads, so a handler can
// never drift from what the code actually fetches.
const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const BOARD = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** A minimal job-detail payload shaped like JobListingDetailResponse. */
const mockJob = {
  id: "job-1",
  title: "Senior Frontend Engineer",
  location: "Cape Town",
  type: "FullTime",
  salaryMin: 60000,
  salaryMax: 90000,
  status: "Active",
  createdAt: "2026-01-01T00:00:00Z",
  expiresAt: "2026-12-31T00:00:00Z",
  companyId: "c1",
  companyName: "Acme",
  companyCity: "Cape Town",
  companyProvince: "Western Cape",
  companyWebsite: "https://acme.test",
  minimumExperienceYears: 3,
  responsibilities: ["Build UI"],
  skills: ["React"],
  applicantCount: 4,
  description: "A great role.",
  minimumRequirements: "Bachelor's degree",
};

export const handlers = [
  // POST a job application — the ApplicationForm submit (Tests 8 & 9 happy path).
  http.post(`${API}/api/applications`, async () => {
    return HttpResponse.json(
      {
        id: "app-123",
        jobId: "job-1",
        email: "candidate@example.com",
        submittedAt: "2026-06-30T10:00:00Z",
      },
      { status: 201 },
    );
  }),

  // GET a single job — used when a page hydrates job details on mount.
  http.get(`${BOARD}/api/jobs/:id`, () => HttpResponse.json(mockJob)),

  // GET the job board — TanStack Query invalidates ["jobs"] after a submit.
  http.get(`${BOARD}/api/jobs`, () =>
    HttpResponse.json({
      data: [],
      page: 1,
      pageSize: 50,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    }),
  ),
];
