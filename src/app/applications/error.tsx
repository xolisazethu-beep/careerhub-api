"use client";

// Assignment 3.4, Part 2 Step 4 — error boundary for the JobSeeker's
// "Track applications" route.
import RouteErrorScreen from "@/components/RouteErrorScreen";

export default function ApplicationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorScreen
      {...props}
      resource="Applications"
      backHref="/jobs"
      backLabel="Browse jobs"
      forbiddenHeading="Job Seeker Access Required"
      forbiddenMessage="Your applications are only visible to job-seeker accounts. Sign in with the account you applied with to see them."
      notFoundMessage="We couldn't load your applications just now."
    />
  );
}
