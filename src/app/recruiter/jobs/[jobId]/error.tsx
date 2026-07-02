"use client";

// Assignment 3.4, Part 2 Step 4 — error boundary for the Employer's
// per-listing applicants review page. (Assignment path:
// /dashboard/listings/[id]/applicants; this repo: /recruiter/jobs/[jobId].)
import RouteErrorScreen from "@/components/RouteErrorScreen";

export default function ApplicantsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorScreen
      {...props}
      resource="Listing"
      backHref="/recruiter"
      backLabel="Back to dashboard"
      forbiddenHeading="Employer Access Required"
      forbiddenMessage="Only the employer who owns this listing can review its applicants. If this is your listing, sign in with the owning employer account."
      notFoundMessage="We couldn't find that listing or its applicants. It may have been removed."
    />
  );
}
