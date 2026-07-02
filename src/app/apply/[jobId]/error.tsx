"use client";

// Assignment 3.4, Part 2 Step 4 — error boundary for the JobSeeker apply route.
import RouteErrorScreen from "@/components/RouteErrorScreen";

export default function ApplyError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorScreen
      {...props}
      resource="Job"
      backHref="/jobs"
      backLabel="Browse jobs"
      forbiddenHeading="Job Seeker Access Required"
      forbiddenMessage="Applying is for job-seeker accounts. Employers can't apply for roles — switch to a job-seeker account to continue."
      notFoundMessage="We couldn't load this listing to apply for. It may have been removed or closed."
    />
  );
}
